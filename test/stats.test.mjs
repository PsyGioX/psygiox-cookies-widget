/*
 * PGX Cookies Widget — tests for the anonymous live usage counter (api/stats.js) and its landing section.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { parseEvent, createHandler, memoryStore, redisStore, limited } from '../api/stats.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

/* a fake req/res pair, enough for the handler */
function call(handler, { method = 'GET', body, headers = {} } = {}) {
  return new Promise((resolve) => {
    const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { resolve({ code: this.statusCode, headers: this.headers, json: b ? JSON.parse(b) : null }); } };
    handler({ method, headers: { host: 'x.test', ...headers }, body, socket: { remoteAddress: '203.0.113.7' } }, res);
  });
}

test('parseEvent: whitelist only, nothing free-form gets through', () => {
  assert.deepEqual(parseEvent({ e: 'view', r: 'eu', l: 'de' }), { e: 'view', r: 'eu', l: 'de' });
  assert.deepEqual(parseEvent({ e: 'block', r: 'us', l: 'en', c: 'analytics', extra: 'x', ua: 'Mozilla' }), { e: 'block', r: 'us', l: 'en', c: 'analytics' });
  assert.equal(parseEvent({ e: 'block', r: 'us', l: 'en', c: '<script>' }).c, 'unknown');
  for (const bad of [null, [], 'x', {}, { e: 'view' }, { e: 'hack', r: 'eu', l: 'en' }, { e: 'view', r: 'mars', l: 'en' }, { e: 'view', r: 'eu', l: 'xx' }]) assert.equal(parseEvent(bad), null);
});

test('handler: counts events, returns a snapshot, stores nothing personal', async () => {
  const now = Date.UTC(2026, 9, 30, 12, 30);
  const h = createHandler(memoryStore(), () => now);
  for (const body of [{ e: 'view', r: 'eu', l: 'de' }, { e: 'view', r: 'ru', l: 'ru' }, { e: 'accept', r: 'eu', l: 'de' }, { e: 'reject', r: 'ru', l: 'ru' }, { e: 'block', r: 'ru', l: 'ru', c: 'marketing' }]) {
    const r = await call(h, { method: 'POST', body, headers: { 'user-agent': 'Secret UA', origin: 'https://x.test' } }); assert.equal(r.code, 204);
  }
  const g = await call(h); assert.equal(g.code, 200);
  const s = g.json;
  assert.equal(s.ok, true); assert.equal(s.persistent, false);
  assert.deepEqual(s.total, { view: 2, accept: 1, reject: 1, custom: 0, block: 1 });
  assert.deepEqual(s.last24h, s.total); assert.equal(s.hours.length, 24); assert.equal(s.hours[23].view, 2); assert.equal(s.viewsLast15m, 2);
  assert.deepEqual(s.region, { eu: 1, ru: 1 }); assert.deepEqual(s.lang, { de: 1, ru: 1 });
  assert.equal(s.feed.length, 5); assert.equal(s.feed[0].e, 'block');
  const dump = JSON.stringify(s); assert.ok(!/Secret UA|203\.0\.113|x\.test/.test(dump), 'no UA / IP / host in the snapshot');
  for (const row of s.feed) assert.ok(Object.keys(row).every((k) => ['t', 'e', 'r', 'l', 'c'].includes(k)), Object.keys(row).join());
  assert.match(g.headers['cache-control'], /s-maxage=3/);
});

test('handler: DNT / GPC are not counted; bad input, other origins and wrong methods are refused', async () => {
  const h = createHandler(memoryStore(), () => 1e12), ev = { e: 'view', r: 'eu', l: 'en' };
  assert.equal((await call(h, { method: 'POST', body: ev, headers: { dnt: '1' } })).code, 204);
  assert.equal((await call(h, { method: 'POST', body: ev, headers: { 'sec-gpc': '1' } })).code, 204);
  assert.equal((await call(h)).json.total.view, 0, 'DNT/GPC requests must not be counted');
  assert.equal((await call(h, { method: 'POST', body: { e: 'nope' } })).code, 400);
  assert.equal((await call(h, { method: 'POST', body: '{broken' })).code, 400);
  assert.equal((await call(h, { method: 'POST', body: 'x'.repeat(600) })).code, 400);
  assert.equal((await call(h, { method: 'POST', body: ev, headers: { origin: 'https://evil.example' } })).code, 403);
  assert.equal((await call(h, { method: 'DELETE' })).code, 405);
  assert.equal((await call(h)).json.total.view, 0);
});

test('handler: the abuse limiter caps one caller per minute (memory only)', async () => {
  const h = createHandler(memoryStore(), () => Date.UTC(2030, 0, 1)), codes = [];
  for (let i = 0; i < 45; i++) codes.push((await call(h, { method: 'POST', body: { e: 'view', r: 'eu', l: 'en' } })).code);
  assert.equal(codes.filter((c) => c === 204).length, 40); assert.equal(codes.at(-1), 429);
  assert.equal(limited({ headers: {}, socket: { remoteAddress: '198.51.100.1' } }, Date.UTC(2031, 0, 1)), false, 'a new minute starts a new bucket');
});

test('handler: a failing store answers 503 instead of crashing', async () => {
  const h = createHandler({ persistent: true, async read() { throw new Error('down'); }, async record() { throw new Error('down'); } });
  assert.equal((await call(h)).code, 503);
  assert.equal((await call(h, { method: 'POST', body: { e: 'view', r: 'eu', l: 'en' }, headers: { 'x-forwarded-for': '192.0.2.99' } })).code, 503);
});

/* a tiny Upstash-compatible server: enough commands to run the real redisStore code */
function fakeUpstash() {
  const hashes = new Map(), lists = new Map(), strs = new Map(), ttl = new Map(), seen = [];
  const H = (k) => hashes.get(k) || hashes.set(k, new Map()).get(k);
  const run = ([cmd, ...a]) => {
    seen.push(cmd);
    switch (cmd) {
      case 'HINCRBY': { const h = H(a[0]); const v = (+h.get(a[1]) || 0) + +a[2]; h.set(a[1], String(v)); return v; }
      case 'HGETALL': return [...H(a[0])].flat();
      case 'EXPIRE': ttl.set(a[0], +a[1]); return 1;
      case 'INCR': strs.set(a[0], String((+strs.get(a[0]) || 0) + 1)); return +strs.get(a[0]);
      case 'LPUSH': { const l = lists.get(a[0]) || []; l.unshift(a[1]); lists.set(a[0], l); return l.length; }
      case 'LTRIM': lists.set(a[0], (lists.get(a[0]) || []).slice(+a[1], +a[2] + 1)); return 'OK';
      case 'LRANGE': return (lists.get(a[0]) || []).slice(+a[1], +a[2] + 1);
      case 'MGET': return a.map((k) => strs.get(k) ?? null);
      default: return { error: 'ERR unknown ' + cmd };
    }
  };
  const srv = createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      if (req.headers.authorization !== 'Bearer secret' || req.url !== '/pipeline') { res.writeHead(401); return res.end('{}'); }
      const out = JSON.parse(b).map((c) => { const r = run(c); return r && r.error ? r : { result: r }; });
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
    });
  });
  return { srv, seen, ttl, lists };
}

test('redisStore: round-trips through an Upstash-style REST pipeline, with expiry on the time buckets', async () => {
  const f = fakeUpstash(); await new Promise((r) => f.srv.listen(0, '127.0.0.1', r));
  try {
    const now = Date.UTC(2026, 9, 30, 12, 30), h = createHandler(redisStore(`http://127.0.0.1:${f.srv.address().port}`, 'secret'), () => now);
    for (const body of [{ e: 'view', r: 'us', l: 'en' }, { e: 'view', r: 'us', l: 'en' }, { e: 'custom', r: 'us', l: 'en' }, { e: 'block', r: 'us', l: 'en', c: 'analytics' }]) assert.equal((await call(h, { method: 'POST', body, headers: { 'x-forwarded-for': '192.0.2.5' } })).code, 204);
    const s = (await call(h)).json;
    assert.equal(s.persistent, true); assert.deepEqual(s.total, { view: 2, accept: 0, reject: 0, custom: 1, block: 1 });
    assert.equal(s.hours[23].view, 2); assert.equal(s.viewsLast15m, 2); assert.deepEqual(s.region, { us: 2 }); assert.deepEqual(s.lang, { en: 2 });
    assert.equal(s.feed.length, 4); assert.equal(s.feed[0].c, 'analytics');
    assert.ok([...f.ttl.values()].every((v) => v >= 1200 && v <= 27 * 3600), 'every hour/minute bucket expires');
    assert.ok(f.lists.get('pgx:feed').length <= 30);
  } finally { f.srv.close(); }
});

/* ---------- landing section ---------- */
let site, base, api; const doms = [];
before(async () => {
  api = createHandler(memoryStore());
  site = createServer((req, res) => {
    if (req.url.startsWith('/api/stats')) return api(req, res);
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = join(ROOT, p);
    if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
  });
  await new Promise((r) => site.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${site.address().port}`;
});
after(() => { doms.forEach((d) => d.window.close()); site.close(); });
async function open(path, { noApi = false, dnt = false } = {}) {
  const dom = await JSDOM.fromURL(base + path, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, beforeParse(w) {
    w.fetch = (u, o) => fetch(new URL(noApi && String(u).startsWith('/api/') ? '/nope' : u, w.location.href), o);
    if (dnt) Object.defineProperty(w.navigator, 'doNotTrack', { value: '1' });
  } });
  doms.push(dom); if (dom.window.document.readyState !== 'complete') await new Promise((r) => dom.window.addEventListener('load', r));
  await tick(2300); return dom.window;
}

test('landing: the Live section counts this visit, goes LIVE and shows it in the feed', async () => {
  const w = await open('/'), d = w.document;
  assert.ok(d.getElementById('usage'), 'section exists'); assert.equal(d.getElementById('usage-status').dataset.state, 'live');
  const total = (await (await fetch(base + '/api/stats')).json()).total;
  assert.ok(total.view >= 1, 'the page view reached the API');
  assert.ok(+d.querySelector('[data-u="views"]').textContent.replace(/\D/g, '') >= 1);
  assert.ok(d.querySelectorAll('#usage-feed li').length >= 1); assert.equal(d.querySelectorAll('#usage-spark rect').length > 0, true);
});

test('landing: a banner choice is classified and counted (reject / accept / custom)', async () => {
  const before = (await (await fetch(base + '/api/stats')).json()).total;
  const w = await open('/'); w.PsyCookies.open('banner'); await tick(300);
  w.document.querySelector('.pc-banner [data-pc-act="reject"], .pc-banner button').click(); await tick(1200);
  const after = (await (await fetch(base + '/api/stats')).json()).total;
  assert.ok(after.reject + after.accept + after.custom > before.reject + before.accept + before.custom, JSON.stringify({ before, after }));
});

test('landing: Do Not Track visits are shown the numbers but never counted', async () => {
  const b = (await (await fetch(base + '/api/stats')).json()).total.view;
  const w = await open('/', { dnt: true });
  assert.equal((await (await fetch(base + '/api/stats')).json()).total.view, b, 'no view was recorded');
  assert.equal(w.document.getElementById('usage-optout').checked, true); assert.equal(w.document.getElementById('usage-optout').disabled, true);
  assert.equal(w.document.getElementById('usage-status').dataset.state, 'live');
});

test('landing: without the API the section falls back to this tab and says so', async () => {
  const w = await open('/', { noApi: true }), d = w.document;
  assert.equal(d.getElementById('usage-status').dataset.state, 'local');
  assert.ok(+d.querySelector('[data-u="views"]').textContent.replace(/\D/g, '') >= 1, 'own view is shown');
  assert.match(d.getElementById('usage-note').textContent, /\/api\/stats/);
});

test('landing (EN): the Live section is fully translated', async () => {
  const w = await open('/en/', { noApi: true }), t = w.document.getElementById('usage').textContent;
  assert.ok(!/[А-Яа-яЁё]/.test(t), 'Russian text left: ' + t.match(/.{0,20}[А-Яа-яЁё]+.{0,20}/));
  assert.equal(w.document.getElementById('usage-status').textContent, 'THIS TAB');
});

test('landing: the automatic tracker imitation at start-up is not counted as visitor activity', async () => {
  const b = (await (await fetch(base + '/api/stats')).json()).total;
  const w = await open('/'); await tick(2500);                                    // the page imitates _ga/_fbp by itself after ~1.4 s
  assert.ok(w.PsyCookies.cookies.list().length > 0, 'the demo did write cookies');
  const a = (await (await fetch(base + '/api/stats')).json()).total;
  assert.equal(a.block, b.block, 'no "block" event for the page’s own imitation');
  assert.equal(a.view, b.view + 1);
  w.document.querySelector('.sim[data-sim="_fbp"]').click(); await tick(1500);   // a visitor pressing the button does count
  assert.equal((await (await fetch(base + '/api/stats')).json()).total.block, b.block + 1);
});
