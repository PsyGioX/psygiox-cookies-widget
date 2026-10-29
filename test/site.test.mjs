/*
 * PGX Cookies Widget — landing page, SEO, PWA and CSP tests.
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const fileFor = (path) => { let p = decodeURIComponent(path.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'; return join(ROOT, p); };
let server, base; const doms = [];
before(async () => {
  server = createServer((req, res) => { const f = fileFor(req.url); if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { doms.forEach((d) => d.window.close()); server.close(); });
const tick = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(path, wait = 2300) {
  const dom = await JSDOM.fromURL(base + path, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, beforeParse(w) { w.fetch = (u, o) => fetch(new URL(u, w.location.href), o); } });
  doms.push(dom);
  if (dom.window.document.readyState !== 'complete') await new Promise((r) => dom.window.addEventListener('load', r));
  await tick(wait); return dom.window;
}
const html = { ru: readFileSync(join(ROOT, 'index.html'), 'utf8'), en: readFileSync(join(ROOT, 'en/index.html'), 'utf8') };
const parse = (s) => new JSDOM(s).window.document;

test('landing (RU): widget runs, banner is localised, hero log shows real events', async () => {
  const w = await open('/'), d = w.document;
  assert.ok(w.PsyCookies, 'widget loaded');
  assert.match(d.querySelector('.pc-banner').textContent, /куки-файлы/);
  assert.match(d.querySelector('.pc-banner [data-pc=accept]').textContent, /Принять все/);
  const log = d.querySelector('#hero-log').textContent;
  assert.match(log, /region=/);
  assert.ok(d.querySelector('#hero-log .tag--block'), 'guard blocked the simulated tracker before consent');
  assert.ok(d.querySelector('#hero-log .tag--set'), 'necessary cookie was set');
});

test('landing: hashes, SRI and gzip size come from integrity.json', async () => {
  const w = await open('/', 600), d = w.document, integ = JSON.parse(readFileSync(join(ROOT, 'widget/dist/integrity.json'), 'utf8'));
  const rows = [...d.querySelectorAll('#hash-rows tr')];
  assert.equal(rows.length, Object.keys(integ.files).length);
  assert.ok(rows.some((r) => r.textContent.includes(integ.files['psygiox-cookies.min.js'].sha256)));
  assert.ok(d.querySelector('#snip-cdn').textContent.includes(integ.files['psygiox-cookies.min.js'].integrity));
  assert.match(d.querySelector('#ver').textContent, new RegExp('v' + integ.version.replace(/\./g, '\\.')));
  assert.ok(d.querySelector('[data-fill-href=zip]').href.endsWith(`psygiox-cookies-widget-${integ.version}.zip`));
  assert.match(d.querySelector('[data-fill=sha-zip]').textContent, /^[0-9a-f]{64}$/);
});

test('landing: playground drives the real widget', async () => {
  const w = await open('/', 500), d = w.document;
  d.querySelector('#r-us').click(); d.querySelector('#r-us').dispatchEvent(new w.Event('change', { bubbles: true }));
  assert.equal(w.PsyCookies.region(), 'us');
  assert.match(d.querySelector('#cfg-out').textContent, /region: 'us'/);
  d.querySelector('#pl-n').value = '5'; d.querySelector('#pl-n').dispatchEvent(new w.Event('input', { bubbles: true }));
  w.PsyCookies.i18n.set('ru');
  assert.equal(d.querySelector('#pl-out').textContent, '5 куки-файлов на странице');
  assert.ok(d.querySelector('#live-embed .pc-live'), 'live panel is mounted');
});

test('landing (EN): generated page is English and fully translated', async () => {
  const w = await open('/en/', 600), d = w.document;
  assert.equal(d.documentElement.lang, 'en');
  assert.match(d.querySelector('.pc-banner [data-pc=accept]').textContent, /Accept all/);
  const text = [...d.body.querySelectorAll('*')].filter((e) => !e.closest('.marquee') && e.tagName !== 'OPTION' && e.id !== 'langlink' && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && /[А-Яа-яЁё]/.test(n.nodeValue)));
  assert.deepEqual(text.map((e) => e.textContent.slice(0, 40)), ['Русская версия'].filter(() => false));
  assert.equal(d.querySelector('#langlink').getAttribute('hreflang'), 'ru');
  assert.equal(d.querySelector('#langlink').getAttribute('href'), '/');
});

for (const [lang, url] of [['ru', 'https://psygiox-cookies-widget.vercel.app/'], ['en', 'https://psygiox-cookies-widget.vercel.app/en/']]) {
  test(`SEO (${lang}): title, description, canonical, hreflang, Open Graph, JSON-LD`, () => {
    const d = parse(html[lang]);
    assert.ok(d.title.length >= 25 && d.title.length <= 70, `title length ${d.title.length}`);
    const desc = d.querySelector('meta[name=description]').content; assert.ok(desc.length >= 90 && desc.length <= 175, `description length ${desc.length}`);
    assert.equal(d.querySelectorAll('h1').length, 1);
    assert.equal(d.querySelector('link[rel=canonical]').href, url);
    assert.deepEqual([...d.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => l.hreflang).sort(), ['en', 'ru', 'x-default']);
    for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'og:locale']) assert.ok(d.querySelector(`meta[property="${p}"]`)?.content, p);
    assert.equal(d.querySelector('meta[property="og:url"]').content, url);
    assert.match(d.querySelector('meta[property="og:image"]').content, /^https:\/\/.+\/og-image\.png$/);
    assert.equal(d.querySelector('meta[name="twitter:card"]').content, 'summary_large_image');
    assert.equal(d.documentElement.lang, lang);
    const ld = JSON.parse(d.getElementById('ld').textContent), types = ld['@graph'].map((n) => n['@type']);
    for (const t of ['WebSite', 'WebPage', 'SoftwareApplication', 'SoftwareSourceCode', 'Person', 'FAQPage']) assert.ok(types.includes(t), t);
    assert.equal(ld['@graph'].find((n) => n['@type'] === 'FAQPage').mainEntity.length, d.querySelectorAll('.faq details').length);
    for (const img of d.querySelectorAll('img')) assert.ok(img.getAttribute('alt'), 'img alt');
    assert.ok(d.querySelector('main#main') && d.querySelector('header') && d.querySelector('footer'));
  });

  test(`CSP-safe markup (${lang}): no inline scripts, styles or handlers`, () => {
    const d = parse(html[lang]);
    assert.equal(d.querySelectorAll('style').length, 0);
    assert.equal(d.querySelectorAll('[style]').length, 0);
    assert.ok(![...d.querySelectorAll('*')].some((e) => [...e.attributes].some((a) => /^on/i.test(a.name))));
    for (const s of d.querySelectorAll('script')) assert.ok(s.src || s.type === 'application/ld+json', 'inline script');
    assert.equal(d.head.querySelector('script').src.endsWith('/widget/dist/psygiox-cookies.min.js'), true, 'the widget is the first script');
  });

  test(`links (${lang}): every local href/src exists on disk`, () => {
    const d = parse(html[lang]), seen = new Set();
    for (const e of d.querySelectorAll('[href],[src]')) for (const a of ['href', 'src']) {
      const v = e.getAttribute(a); if (!v || !v.startsWith('/') || seen.has(v)) continue; seen.add(v);
      assert.ok(existsSync(fileFor(v)), `${a}=${v} is missing`);
    }
    assert.ok(seen.size > 8);
  });
}

test('PWA: manifest is complete and every icon has the declared size', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons', 'id']) assert.ok(m[k], k);
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some((i) => i.purpose === 'maskable') && m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'));
  for (const i of m.icons.filter((i) => i.type === 'image/png')) {
    const b = readFileSync(join(ROOT, i.src)), [w, h] = [b.readUInt32BE(16), b.readUInt32BE(20)];
    assert.equal(`${w}x${h}`, i.sizes, i.src);
  }
  for (const s of m.shortcuts) assert.ok(existsSync(fileFor(s.url.split('#')[0])), s.url);
  assert.equal(parse(html.ru).querySelector('meta[name=theme-color]').content, m.theme_color);
  const og = readFileSync(join(ROOT, 'og-image.png')); assert.equal(`${og.readUInt32BE(16)}x${og.readUInt32BE(20)}`, '1200x630');
  const ico = readFileSync(join(ROOT, 'favicon.ico')); assert.equal(ico.readUInt16LE(2), 1); assert.equal(ico.readUInt16LE(4), 3);
});

test('PWA: service worker pre-caches only files that exist; build stamp is set', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  for (const u of shell) assert.ok(existsSync(fileFor(u)), u);
  assert.match(sw, /const BUILD = 'v\d+\.\d+\.\d+-[0-9a-f]{10}';/);
});

test('sitemap and robots point to both language versions', () => {
  const sm = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  assert.match(sm, /<loc>https:\/\/[^<]+\/<\/loc>/); assert.match(sm, /<loc>https:\/\/[^<]+\/en\/<\/loc>/);
  assert.equal((sm.match(/hreflang="x-default"/g) || []).length, 2);
  assert.match(readFileSync(join(ROOT, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/[^\s]+\/sitemap\.xml/);
});

test('Russian wording: «куки-файл(ы)», never the feminine «кука/куки» on its own', () => {
  const bad = /(?<![А-Яа-яёA-Za-z_.-])(кук[аиуе]|куками|куках|куки)(?![-А-Яа-я])/i;
  for (const [name, text] of [['index.html', html.ru.replace(/data-en(-[a-z-]+)?=("[^"]*"|'[^']*')/g, '')], ['ru.js', readFileSync(join(ROOT, 'widget/src/i18n/ru.js'), 'utf8')], ['README.ru.md', existsSync(join(ROOT, 'README.ru.md')) ? readFileSync(join(ROOT, 'README.ru.md'), 'utf8') : ''], ['docs/API.ru.md', existsSync(join(ROOT, 'docs/API.ru.md')) ? readFileSync(join(ROOT, 'docs/API.ru.md'), 'utf8') : '']])
    for (const l of text.split('\n')) assert.ok(!bad.test(l), `${name}: ${l.trim().slice(0, 90)}`);
});
