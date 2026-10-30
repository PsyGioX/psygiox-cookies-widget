/*
 * PGX Cookies Widget — anonymous live usage counters for the project landing page.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 *
 * Vercel serverless function (Node). Endpoints:
 *   POST /api/stats   { e, r, l, c? }   count one event (view | accept | reject | custom | block)
 *   GET  /api/stats                     aggregate snapshot (totals, last 24 h, regions, languages, last events)
 *
 * What is stored: integer counters per event / region / language / hour, and the last 30 events as
 * { time, event, region, language, category }. Nothing else. No cookies, no IP addresses, no user agents,
 * no identifiers. Requests with DNT: 1 or Sec-GPC: 1 are ignored. The abuse limiter keeps a salted hash
 * of the caller in memory only, for one minute; it is never written to the database.
 *
 * Storage: Upstash Redis / Vercel KV over REST when UPSTASH_REDIS_REST_URL + _TOKEN (or KV_REST_API_URL + _TOKEN)
 * are set. Without them the counters live in the memory of the function instance: still "live", but they reset
 * on a cold start, and the snapshot says so (persistent: false).
 */
import { createHash, randomBytes } from 'node:crypto';

export const EVENTS = ['view', 'accept', 'reject', 'custom', 'block'];
export const REGIONS = ['eu', 'us', 'ru', 'global'];
export const LANGS = ['ru', 'en', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'uk'];
export const CATEGORIES = ['functional', 'analytics', 'marketing', 'unknown'];
const FEED_MAX = 30, HOURS = 24, MINUTES = 15, RATE_PER_MIN = 40, BODY_MAX = 512;
const ok = (list, v) => (list.includes(v) ? v : null);

/* ---------- validation ---------- */
export function parseEvent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = ok(EVENTS, raw.e), r = ok(REGIONS, raw.r), l = ok(LANGS, raw.l);
  if (!e || !r || !l) return null;
  const ev = { e, r, l };
  if (e === 'block') ev.c = ok(CATEGORIES, raw.c) || 'unknown';
  return ev;
}

/* ---------- stores: same interface, two implementations ---------- */
const hourKey = (ms) => new Date(ms).toISOString().slice(0, 13).replace(/\D/g, '');   // YYYYMMDDHH (UTC)
const minuteKey = (ms) => Math.floor(ms / 60000);
const zero = () => Object.fromEntries(EVENTS.map((k) => [k, 0]));
const num = (v) => (Number.isFinite(+v) ? +v : 0);

export function memoryStore() {
  const total = zero(), region = {}, lang = {}, hours = new Map(), minutes = new Map(); let feed = [];
  return {
    persistent: false,
    async record(ev, now) {
      total[ev.e]++;
      if (ev.e === 'view') { region[ev.r] = (region[ev.r] || 0) + 1; lang[ev.l] = (lang[ev.l] || 0) + 1; }
      const hk = hourKey(now); hours.set(hk, hours.get(hk) || zero()); hours.get(hk)[ev.e]++;
      if (ev.e === 'view') minutes.set(minuteKey(now), (minutes.get(minuteKey(now)) || 0) + 1);
      feed.unshift({ t: now, ...ev }); feed = feed.slice(0, FEED_MAX);
      for (const k of hours.keys()) if (k < hourKey(now - 26 * 3600e3)) hours.delete(k);
      for (const k of minutes.keys()) if (k < minuteKey(now) - 20) minutes.delete(k);
    },
    async read(now) {
      return {
        total: { ...total }, region: { ...region }, lang: { ...lang }, feed: feed.slice(),
        hours: Array.from({ length: HOURS }, (_, i) => hours.get(hourKey(now - (HOURS - 1 - i) * 3600e3)) || zero()),
        minutes: Array.from({ length: MINUTES }, (_, i) => minutes.get(minuteKey(now) - (MINUTES - 1 - i)) || 0),
      };
    },
  };
}

export function redisStore(url, token) {
  const call = async (cmds) => {
    const r = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(cmds), signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error('redis ' + r.status);
    return (await r.json()).map((x) => { if (x && x.error) throw new Error(x.error); return x.result; });
  };
  const hash = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = num(flat[i + 1]); return o; };
  return {
    persistent: true,
    async record(ev, now) {
      const hk = 'pgx:h:' + hourKey(now), cmds = [['HINCRBY', 'pgx:total', ev.e, 1], ['HINCRBY', hk, ev.e, 1], ['EXPIRE', hk, 27 * 3600]];
      if (ev.e === 'view') { cmds.push(['HINCRBY', 'pgx:region', ev.r, 1], ['HINCRBY', 'pgx:lang', ev.l, 1]); const mk = 'pgx:m:' + minuteKey(now); cmds.push(['INCR', mk], ['EXPIRE', mk, 1200]); }
      cmds.push(['LPUSH', 'pgx:feed', JSON.stringify({ t: now, ...ev })], ['LTRIM', 'pgx:feed', 0, FEED_MAX - 1]);
      await call(cmds);
    },
    async read(now) {
      const hs = Array.from({ length: HOURS }, (_, i) => 'pgx:h:' + hourKey(now - (HOURS - 1 - i) * 3600e3));
      const ms = Array.from({ length: MINUTES }, (_, i) => 'pgx:m:' + (minuteKey(now) - (MINUTES - 1 - i)));
      const res = await call([['HGETALL', 'pgx:total'], ['HGETALL', 'pgx:region'], ['HGETALL', 'pgx:lang'], ['LRANGE', 'pgx:feed', 0, FEED_MAX - 1], ['MGET', ...ms], ...hs.map((k) => ['HGETALL', k])]);
      const feed = (res[3] || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).map((x) => x && { t: num(x.t), ...parseEvent(x) }).filter((x) => x && x.e);
      return { total: { ...zero(), ...hash(res[0]) }, region: hash(res[1]), lang: hash(res[2]), feed, minutes: (res[4] || []).map(num), hours: res.slice(5).map((h) => ({ ...zero(), ...hash(h) })) };
    },
  };
}

function pickStore(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL, token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? redisStore(url, token) : memoryStore();
}

/* ---------- snapshot shape sent to the browser ---------- */
export function snapshot(raw, persistent, now) {
  const sum = (arr) => arr.reduce((a, h) => { for (const k of EVENTS) a[k] += h[k] || 0; return a; }, zero());
  return { ok: true, persistent, now, total: raw.total, last24h: sum(raw.hours), hours: raw.hours.map((h, i) => ({ h: new Date(now - (HOURS - 1 - i) * 3600e3).toISOString().slice(0, 13), ...h })),
    viewsLast15m: raw.minutes.reduce((a, b) => a + b, 0), region: raw.region, lang: raw.lang, feed: raw.feed };
}

/* ---------- abuse limiter (memory only, salted hash, one minute) ---------- */
const salt = randomBytes(16).toString('hex'); let bucket = new Map(), bucketMinute = 0;
export function limited(req, now) {
  const m = minuteKey(now); if (m !== bucketMinute) { bucket = new Map(); bucketMinute = m; }
  const h = req.headers || {}, ip = String(h['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  const id = createHash('sha256').update(salt + ip).digest('hex').slice(0, 16), n = (bucket.get(id) || 0) + 1;
  bucket.set(id, n); return n > RATE_PER_MIN;
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) { if (typeof req.body === 'string') return req.body.length > BODY_MAX ? null : JSON.parse(req.body); if (Buffer.isBuffer(req.body)) return req.body.length > BODY_MAX ? null : JSON.parse(req.body.toString('utf8')); return req.body; }
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > BODY_MAX) return null; chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
}

const sameOrigin = (req) => { const o = req.headers.origin; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch { return false; } };
const send = (res, code, body, cache) => { res.statusCode = code; res.setHeader('Cache-Control', cache || 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); if (body === undefined) return res.end(); res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); };

/* ---------- handler ---------- */
export function createHandler(store = pickStore(), clock = Date.now) {
  return async function handler(req, res) {
    const now = clock(), h = req.headers || {};
    try {
      if (req.method === 'GET' || req.method === 'HEAD') {
        const raw = await store.read(now);
        return send(res, 200, snapshot(raw, store.persistent, now), 'public, max-age=0, s-maxage=3, stale-while-revalidate=10');
      }
      if (req.method === 'POST') {
        if (h.dnt === '1' || h['sec-gpc'] === '1') return send(res, 204);
        if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'origin' });
        if (limited(req, now)) return send(res, 429, { ok: false, error: 'rate' });
        let ev = null; try { ev = parseEvent(await readBody(req)); } catch { ev = null; }
        if (!ev) return send(res, 400, { ok: false, error: 'bad event' });
        await store.record(ev, now);
        return send(res, 204);
      }
      res.setHeader('Allow', 'GET, HEAD, POST'); return send(res, 405, { ok: false, error: 'method' });
    } catch {
      return send(res, 503, { ok: false, error: 'storage' });
    }
  };
}

export default createHandler();
