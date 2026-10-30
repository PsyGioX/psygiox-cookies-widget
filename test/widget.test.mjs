/*
 * PGX Cookies Widget — behaviour tests (jsdom).
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JSDOM, CookieJar } from 'jsdom';

const dist = (f) => readFileSync(new URL('../widget/dist/' + f, import.meta.url), 'utf8');
const BUNDLE = dist('psygiox-cookies.bundle.min.js');
const CORE = dist('psygiox-cookies.min.js');
const URL_ = 'https://example.com/shop/';
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const instances = [];

async function boot(config = {}, { html = '', code = BUNDLE, jar = new CookieJar(), pre } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="en"><head></head><body>${html}</body></html>`, { url: URL_, runScripts: 'dangerously', pretendToBeVisual: true, cookieJar: jar });
  instances.push(dom);
  const w = dom.window;
  if (w.document.readyState === 'loading') await new Promise((r) => w.addEventListener('load', r));
  w.PsyCookiesConfig = Object.assign({ lang: 'en', css: 'none', reload: false }, config);
  if (pre) pre(w);
  w.eval(code);
  await tick();
  return { dom, w, P: w.PsyCookies, d: w.document, jar };
}
const cookieNames = (d) => d.cookie.split('; ').filter(Boolean).map((c) => c.split('=')[0]);
test.after(() => instances.forEach((i) => i.window.close()));

test('exposes API, version and copyright', async () => {
  const { P } = await boot({ region: 'eu' });
  assert.equal(P.version, '1.0.1');
  assert.equal(P.license, 'GPL-3.0-only');
  assert.match(P.copyright, /PsyGioX/);
  for (const k of ['open', 'accept', 'reject', 'set', 'consent', 'allowed', 'configure', 'on', 'i18n', 'cookies', 'live', 'theme', 'categories']) assert.ok(k in P, k);
});

test('legal footer with copyright is rendered inside the widget', async () => {
  const { d } = await boot({ region: 'eu' });
  const copy = d.querySelector('.pc-copy').textContent;
  assert.match(copy, /PsyGioX/); assert.match(copy, /GPL-3\.0/); assert.match(copy, /2026/);
  assert.match(d.querySelector('.pc-root').getAttribute('data-pc-copyright'), /PsyGioX/);
});

test('EU banner: opt-in, equal accept/reject', async () => {
  const { d, P } = await boot({ region: 'eu' });
  const b = d.querySelector('.pc-banner');
  assert.equal(b.hidden, false);
  const acc = b.querySelector('[data-pc=accept]'), rej = b.querySelector('[data-pc=reject]');
  assert.equal(acc.className, rej.className);
  assert.equal(P.region(), 'eu');
  assert.equal(P.allowed('analytics'), false);
  assert.equal(P.allowed('necessary'), true);
});

test('region detection from time zone (override-able)', async () => {
  const mk = async (tz) => (await boot({}, { pre: (w) => { w.Intl.DateTimeFormat = function () { return { resolvedOptions: () => ({ timeZone: tz }) }; }; } })).P.region();
  assert.equal(await mk('Europe/Berlin'), 'eu');
  assert.equal(await mk('Europe/Moscow'), 'ru');
  assert.equal(await mk('Asia/Vladivostok'), 'ru');
  assert.equal(await mk('America/Los_Angeles'), 'us');
  assert.equal(await mk('America/Sao_Paulo'), 'global');
  assert.equal(await mk('Asia/Tokyo'), 'global');
});

test('i18n: region variants, Intl plurals, language switch', async () => {
  const { P } = await boot({ region: 'eu' });
  assert.equal(P.i18n.t('banner.reject'), 'Reject all');
  await boot({ region: 'us' }).then(({ P: US }) => assert.equal(US.i18n.t('banner.reject'), 'Reject non-essential'));
  P.i18n.set('ru');
  assert.equal(P.i18n.t('live.total', { n: 1 }), '1 куки-файл на странице');
  assert.equal(P.i18n.t('live.total', { n: 3 }), '3 куки-файла на странице');
  assert.equal(P.i18n.t('live.total', { n: 5 }), '5 куки-файлов на странице');
  P.i18n.set('pl');
  assert.equal(P.i18n.t('live.total', { n: 2 }), '2 pliki cookie na tej stronie');
  P.i18n.set('de');
  assert.equal(P.i18n.t('banner.accept'), 'Alle akzeptieren');
  P.i18n.set('xx');
  assert.equal(P.i18n.t('banner.accept'), 'Accept all'); // falls back to English
  P.i18n.add('xx', { 'banner.accept': 'Okay' });
  assert.equal(P.i18n.t('banner.accept'), 'Okay');
});

test('language auto-detection from <html lang>', async () => {
  const { P } = await boot({ region: 'eu', lang: 'auto' }, { pre: (w) => { w.document.documentElement.lang = 'uk-UA'; } });
  assert.equal(P.i18n.get(), 'uk-UA');
  assert.equal(P.i18n.t('banner.accept'), 'Прийняти все');
});

test('Cookie Guard blocks, allows after consent and purges on withdrawal', async () => {
  const { P, d } = await boot({ region: 'eu' });
  const events = []; P.on('cookie', (e) => events.push(e.type + ':' + e.name));
  d.cookie = '_ga=GA1.2.1; path=/';
  d.cookie = 'PHPSESSID=abc; path=/';
  d.cookie = 'my_pref=1; path=/';
  assert.ok(!cookieNames(d).includes('_ga'), 'analytics cookie must be blocked');
  assert.ok(cookieNames(d).includes('PHPSESSID'));
  assert.ok(cookieNames(d).includes('my_pref'));
  const byName = Object.fromEntries(P.cookies.list().map((c) => [c.name, c]));
  assert.equal(byName._ga.status, 'blocked');
  assert.equal(byName.PHPSESSID.status, 'necessary');
  assert.equal(byName.my_pref.status, 'unknown');
  assert.ok(events.includes('block:_ga') && events.includes('set:PHPSESSID'));
  P.set({ analytics: true });
  d.cookie = '_ga=GA1.2.1; path=/';
  assert.ok(cookieNames(d).includes('_ga'));
  assert.equal(P.cookies.list().find((c) => c.name === '_ga').status, 'allowed');
  P.reject();
  assert.ok(!cookieNames(d).includes('_ga'), 'withdrawal must delete analytics cookies');
  assert.ok(cookieNames(d).includes('PHPSESSID'), 'necessary cookies stay');
});

test('Cookie Guard detects cookies written outside JS (e.g. Set-Cookie)', async () => {
  const { P, d, jar } = await boot({ region: 'eu', pollMs: 250 });
  jar.setCookieSync('_fbp=fb.1.2.3; Path=/', URL_);
  P.cookies.scan();
  assert.ok(!cookieNames(d).includes('_fbp'));
  assert.equal(P.cookies.list().find((c) => c.name === '_fbp').status, 'deleted');
});

test('guard "warn" reports but does not delete; "off" ignores', async () => {
  const { P, d } = await boot({ region: 'eu', guard: 'warn' });
  const v = []; P.on('violation', (e) => v.push(e.name));
  d.cookie = '_ga=1; path=/';
  assert.ok(cookieNames(d).includes('_ga'));
  assert.deepEqual(v, ['_ga']);
  assert.equal(P.cookies.list()[0].status, 'violation');
});

test('consent persists across page loads and respects policy version', async () => {
  const jar = new CookieJar();
  const a = await boot({ region: 'eu' }, { jar });
  a.P.set({ analytics: true });
  const rec = a.P.consent();
  assert.equal(rec.categories.analytics, true); assert.equal(rec.categories.marketing, false); assert.ok(rec.id);
  const b = await boot({ region: 'eu' }, { jar });
  assert.equal(b.P.allowed('analytics'), true);
  assert.equal(b.d.querySelector('.pc-banner').hidden, true);
  assert.equal(b.d.querySelector('.pc-fab').hidden, false);
  const c = await boot({ region: 'eu', version: '2' }, { jar });
  assert.equal(c.P.allowed('analytics'), false);
  assert.equal(c.d.querySelector('.pc-banner').hidden, false);
});

test('UI actions: accept via banner, settings dialog, save toggles', async () => {
  const { d, P } = await boot({ region: 'eu' });
  d.querySelector('.pc-banner [data-pc=settings]').click();
  const modal = d.querySelector('.pc-modal');
  assert.equal(modal.hidden, false);
  const inp = modal.querySelector('input[data-pc-cat=analytics]');
  inp.checked = true; inp.dispatchEvent(new d.defaultView.Event('change', { bubbles: true }));
  modal.querySelector('[data-pc=save]').click();
  assert.equal(modal.hidden, true);
  assert.equal(P.allowed('analytics'), true); assert.equal(P.allowed('marketing'), false);
  assert.equal(d.querySelector('.pc-banner').hidden, true);
});

test('US profile: opt-out defaults, GPC locks sale/sharing', async () => {
  const { P, d } = await boot({ region: 'us' });
  assert.equal(P.allowed('analytics'), true); assert.equal(P.allowed('marketing'), false);
  d.cookie = '_ga=1; path=/'; assert.ok(cookieNames(d).includes('_ga'));
  assert.match(d.querySelector('.pc-banner [data-pc=settings]').textContent, /Privacy Choices/);
  const g = await boot({ region: 'us', gpc: true });
  g.P.accept();
  assert.equal(g.P.allowed('marketing'), false);
  assert.equal(g.P.consent().gpc, true);
  assert.ok(g.d.querySelector('.pc-note'));
  assert.ok(g.d.querySelector('input[data-pc-cat=marketing]').disabled);
});

test('Google Consent Mode v2 default + update, dataLayer event', async () => {
  const { P, w } = await boot({ region: 'eu' });
  const dl = Array.from(w.dataLayer, (x) => Array.from(x));
  const def = dl.find((x) => x[0] === 'consent' && x[1] === 'default');
  assert.equal(def[2].analytics_storage, 'denied'); assert.equal(def[2].ad_storage, 'denied'); assert.equal(def[2].security_storage, 'granted');
  P.set({ analytics: true });
  const upd = Array.from(w.dataLayer, (x) => Array.from(x)).filter((x) => x[1] === 'update').pop();
  assert.equal(upd[2].analytics_storage, 'granted'); assert.equal(upd[2].ad_storage, 'denied');
  assert.ok(w.dataLayer.some((x) => x && x.event === 'psygiox_consent'));
});

test('script and iframe gate', async () => {
  const html = '<script type="text/plain" data-pc-category="analytics">window.__ran = (window.__ran||0)+1</script><iframe data-pc-category="marketing" data-pc-src="about:blank"></iframe>';
  const { P, w, d } = await boot({ region: 'eu' }, { html });
  assert.equal(w.__ran, undefined);
  assert.ok(d.querySelector('.pc-ph'), 'placeholder for blocked iframe');
  P.set({ analytics: true, marketing: true });
  assert.equal(w.__ran, 1);
  assert.equal(d.querySelector('.pc-ph'), null);
  assert.equal(d.querySelector('iframe').getAttribute('src'), 'about:blank');
});

test('consent receipt is sent when an endpoint is configured', async () => {
  const sent = [];
  const { P } = await boot({ region: 'eu', receipt: 'https://example.com/r' }, { pre: (w) => { w.navigator.sendBeacon = (u, b) => { sent.push([u, b]); return true; }; } });
  P.accept();
  assert.equal(sent.length, 1); assert.equal(sent[0][0], 'https://example.com/r'); assert.ok(sent[0][1].size > 50);
});

test('customisation API: theme, tokens, categories, rules, events', async () => {
  const { P, d } = await boot({ region: 'eu' });
  P.theme.set('dark'); P.theme.set({ accent: '#ff0066', radius: '4px' });
  const root = d.querySelector('.pc-root');
  assert.equal(root.getAttribute('data-theme'), 'dark');
  assert.equal(root.style.getPropertyValue('--pc-accent'), '#ff0066');
  P.configure({ position: 'top-right' });
  assert.equal(d.querySelector('.pc-banner').getAttribute('data-layout'), 'box');
  assert.equal(d.querySelector('.pc-banner').getAttribute('data-h'), 'right');
  P.configure({ position: 'center' });
  assert.equal(d.querySelector('.pc-banner').getAttribute('data-layout'), 'center');
  P.categories.add({ id: 'chat', labels: { en: { title: 'Live chat', desc: 'Support widget' } } });
  assert.ok(d.querySelector('[data-cat=chat]')); assert.match(d.querySelector('[data-cat=chat] b').textContent, /Live chat/);
  P.cookies.rule('^chat_', 'chat', 'MyChat');
  assert.deepEqual({ ...P.cookies.classify('chat_id') }, { category: 'chat', vendor: 'MyChat' });
  d.cookie = 'chat_id=1; path=/';
  assert.ok(!cookieNames(d).includes('chat_id'), 'custom category is guarded too');
  const seen = []; P.on('consent', (e) => seen.push(e.source)); P.set({ chat: true });
  d.cookie = 'chat_id=1; path=/'; assert.ok(cookieNames(d).includes('chat_id'));
  assert.deepEqual(seen, ['api']);
});

test('config from data-attributes of the script tag', async () => {
  const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { url: URL_, runScripts: 'dangerously', pretendToBeVisual: true });
  instances.push(dom); const w = dom.window;
  if (w.document.readyState === 'loading') await new Promise((r) => w.addEventListener('load', r));
  const s = w.document.createElement('script');
  s.setAttribute('data-region', 'ru'); s.setAttribute('data-lang', 'ru'); s.setAttribute('data-policy', '/cookies'); s.setAttribute('data-theme', 'contrast'); s.setAttribute('data-css', 'none'); s.setAttribute('data-ttl', '30');
  s.textContent = BUNDLE; w.document.head.appendChild(s);
  await tick();
  const P = w.PsyCookies;
  assert.equal(P.region(), 'ru'); assert.equal(P.config('theme'), 'contrast'); assert.equal(P.config('links.policy'), '/cookies'); assert.equal(P.config('ttl'), 30);
  assert.match(w.document.querySelector('.pc-banner').textContent, /Принять все/);
  assert.ok(w.document.querySelector('.pc-links a[href="/cookies"]'));
});

test('live tracker: embeddable panel updates in real time and escapes names', async () => {
  const { P, d } = await boot({ region: 'eu' }, { html: '<div id="mon"></div>' });
  const un = P.live.mount('#mon');
  assert.ok(d.querySelector('#mon .pc-live'));
  P.accept();
  d.cookie = '_ga=1; path=/'; d.cookie = 'ok=1; path=/'; d.cookie = '<img src=x onerror=alert(1)>=1; path=/';
  await tick(60);
  const rows = d.querySelectorAll('#mon [data-live=rows] tr');
  assert.ok(rows.length >= 2);
  assert.match(d.querySelector('#mon [data-live=total]').textContent, /cookies? on this page/);
  assert.equal(d.querySelector('#mon img'), null, 'cookie names must never be injected as HTML');
  assert.ok(P.live.log().length >= 2);
  un(); assert.equal(d.querySelector('#mon').innerHTML, '');
});

test('reset brings the banner back; destroy restores document.cookie', async () => {
  const { P, d } = await boot({ region: 'eu' });
  P.accept(); assert.equal(d.querySelector('.pc-banner').hidden, true);
  P.reset(); assert.equal(d.querySelector('.pc-banner').hidden, false); assert.equal(P.consent(), null);
  P.destroy(); assert.equal(d.querySelector('.pc-root'), null);
  d.cookie = '_ga=1; path=/'; assert.ok(cookieNames(d).includes('_ga'));
});

test('lazy language packs: core build loads a pack on demand', async () => {
  const { P, w } = await boot({ region: 'eu' }, { code: CORE });
  assert.equal(P.i18n.has('de'), false);
  P.i18n.set('de'); // pack requested; fall back to English until it arrives
  assert.equal(P.i18n.t('banner.accept'), 'Accept all');
  w.__pcL.push(['de', { 'banner.accept': 'Alle akzeptieren' }]); // what the pack file does
  assert.equal(P.i18n.t('banner.accept'), 'Alle akzeptieren');
});

test('dist: hashes match, banners carry the copyright', () => {
  for (const line of dist('SHA256SUMS').trim().split('\n')) {
    const [h, f] = line.split(/\s{2}/);
    const buf = readFileSync(new URL('../widget/dist/' + f, import.meta.url));
    assert.equal(createHash('sha256').update(buf).digest('hex'), h, f);
  }
  for (const f of ['psygiox-cookies.min.js', 'psygiox-cookies.min.css', 'psygiox-cookies.bundle.min.js', 'i18n/de.min.js']) assert.match(dist(f).slice(0, 220), /PsyGioX.*GPL-3\.0-only/, f);
  const integ = JSON.parse(dist('integrity.json'));
  assert.match(integ.files['psygiox-cookies.min.js'].integrity, /^sha384-/);
});

test('live pause button has its label immediately; close button icon is an SVG', async () => {
  const { d, P } = await boot({ region: 'eu' });
  P.open('settings');
  const pause = d.querySelector('.pc-modal [data-pc=live-pause]');
  assert.equal(pause.textContent, 'Pause');
  assert.ok(d.querySelector('.pc-modal [data-live=total]').textContent.length > 0, 'stats are filled before the tab is opened');
  assert.ok(d.querySelector('.pc-x svg'), 'close icon is an SVG');
  assert.equal(d.querySelector('.pc-x').textContent.trim(), '');
  pause.click();
  assert.equal(d.querySelector('.pc-modal [data-pc=live-pause]').textContent, 'Resume');
  P.i18n.set('ru');
  assert.equal(d.querySelector('.pc-modal [data-pc=live-pause]').textContent, 'Продолжить', 'label survives a re-render while paused');
});

test('the dialog live panel shows cookies right away and updates while the tab is open', async () => {
  const { d, P } = await boot({ region: 'eu' });
  d.cookie = 'PHPSESSID=abc; path=/';
  P.open('live');
  const rows = () => [...d.querySelectorAll('.pc-modal [data-live=rows] .pc-n')].map((e) => e.textContent);
  assert.deepEqual(rows(), ['PHPSESSID']);
  d.cookie = 'my_pref=1; path=/';
  await tick(60);
  assert.deepEqual(rows().sort(), ['PHPSESSID', 'my_pref']);
  assert.match(d.querySelector('.pc-modal [data-live=total]').textContent, /2 cookies/);
});
