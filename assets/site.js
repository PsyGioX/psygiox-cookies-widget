/*
 * PGX Cookies Widget — landing page behaviour (no dependencies, no trackers)
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LANG = document.documentElement.lang === 'en' ? 'en' : 'ru';
  const TXT = {
    ru: { copy: 'Копировать', copied: 'Скопировано', file: 'Файл', info: 'готов', first: 'первый выбор', changed: 'выбор изменён', allowed: 'разрешено', revoked: 'отозвано', none: 'нет', missing: 'Виджет не загрузился — проверьте блокировщики.', hashFail: 'Не удалось загрузить integrity.json' },
    en: { copy: 'Copy', copied: 'Copied', file: 'File', info: 'ready', first: 'first choice', changed: 'choice changed', allowed: 'allowed', revoked: 'revoked', none: 'none', missing: 'The widget did not load — check your content blockers.', hashFail: 'Could not load integrity.json' },
  }[LANG];
  const P = window.PsyCookies;

  /* ---------- reveal on scroll ---------- */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    rv.forEach((n) => io.observe(n));
  } else rv.forEach((n) => n.classList.add('in'));

  /* ---------- install tabs (arrow keys, roving tabindex) ---------- */
  const tabs = $$('.tabs [role="tab"]');
  const select = (t) => tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus();
    });
  });

  /* ---------- copy buttons ---------- */
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const text = $(b.getAttribute('data-copy')).textContent;
    try { await navigator.clipboard.writeText(text); } catch { const r = document.createRange(); r.selectNodeContents($(b.getAttribute('data-copy'))); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); }
    const old = b.textContent; b.textContent = TXT.copied; setTimeout(() => { b.textContent = old; }, 1600);
  }));

  /* ---------- live data from the build (integrity.json, SHA256SUMS) ---------- */
  const fill = (k, v) => $$(`[data-fill="${k}"]`).forEach((n) => { n.textContent = v; });
  fill('site', location.origin);
  fetch('/widget/dist/integrity.json').then((r) => r.json()).then((j) => {
    const f = j.files, core = f['psygiox-cookies.min.js'];
    fill('ver', j.version); $('#ver').textContent = 'v' + j.version;
    fill('sri-js', core.integrity);
    $('#st-gz').textContent = ((core.gzip + f['psygiox-cookies.min.css'].gzip) / 1024).toFixed(1);
    const zip = $('[data-fill-href="zip"]'); if (zip) zip.href = `/widget/dist/psygiox-cookies-widget-${j.version}.zip`;
    const kb = (n) => (n / 1024).toFixed(1) + ' KB';
    const tb = $('#hash-rows'); tb.textContent = '';
    Object.keys(f).forEach((name) => {
      const m = f[name], tr = document.createElement('tr'), cells = [];
      const a = document.createElement('a'); a.href = `/widget/dist/v${j.version}/${name}`; a.textContent = name;
      const td0 = document.createElement('td'); td0.append(a); cells.push(td0);
      [kb(m.bytes), kb(m.gzip)].forEach((t) => { const td = document.createElement('td'); td.textContent = t; cells.push(td); });
      [m.sha256, m.integrity].forEach((t) => {
        const td = document.createElement('td'), c = document.createElement('code'); c.textContent = t; const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn--amber mini'; b.textContent = TXT.copy; b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(t); b.textContent = TXT.copied; setTimeout(() => { b.textContent = TXT.copy; }, 1400); } catch { /* clipboard blocked */ } });
        td.append(c, ' ', b); cells.push(td);
      });
      tr.append(...cells); tb.append(tr);
    });
    return fetch('/widget/dist/SHA256SUMS').then((r) => r.text()).then((t) => { const m = t.split('\n').find((l) => l.endsWith('.zip')); if (m) fill('sha-zip', m.split(/\s+/)[0]); });
  }).catch(() => { const tb = $('#hash-rows'); if (tb) tb.innerHTML = ''; const td = document.createElement('td'); td.colSpan = 5; td.textContent = TXT.hashFail; const tr = document.createElement('tr'); tr.append(td); tb && tb.append(tr); });

  /* ---------- everything below needs the widget ---------- */
  if (!P) { const l = $('#hero-log'); if (l) { const li = document.createElement('li'); li.textContent = TXT.missing; l.append(li); } return pwa(); }

  const log = $('#hero-log'), time = new Intl.DateTimeFormat(LANG, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const line = (type, name, extra) => {
    const li = document.createElement('li'), t = document.createElement('time'), tag = document.createElement('span'), code = document.createElement('code');
    t.textContent = time.format(new Date()); tag.className = 'tag tag--' + type; tag.textContent = type; code.textContent = name;
    li.append(t, tag, code);
    if (extra) { const em = document.createElement('em'); em.textContent = extra; li.append(em); }
    log.prepend(li); while (log.children.length > 40) log.lastChild.remove();
  };
  line('info', `region=${P.region()} · lang=${P.i18n.get()} · guard=${P.config('guard')}`, TXT.info);
  P.on('cookie', (e) => line(e.type, e.name, e.vendor || e.category));
  P.on('consent', (e) => line('consent', e.first ? TXT.first : TXT.changed, `${TXT.allowed}: ${e.granted.join(', ') || TXT.none} · ${TXT.revoked}: ${e.revoked.join(', ') || TXT.none}`));

  const rnd = () => Math.floor(Math.random() * 1e9);
  const VALUE = { _ga: () => `GA1.1.${rnd()}.${Math.floor(Date.now() / 1000)}`, _ym_uid: () => `${Date.now()}${rnd()}`, _fbp: () => `fb.1.${Date.now()}.${rnd()}`, _gcl_au: () => `1.1.${rnd()}.${Math.floor(Date.now() / 1000)}`, PHPSESSID: () => rnd().toString(36), theme: () => 'dark', my_cookie: () => rnd().toString(36) };
  const simulate = (name) => {
    if (name === '*') { P.cookies.list().filter((c) => c.present && c.name !== P.config('cookie.name')).forEach((c) => { document.cookie = `${c.name}=; max-age=0; path=/`; }); P.cookies.scan(); return; }
    document.cookie = `${name}=${(VALUE[name] || rnd)()}; path=/; max-age=86400; SameSite=Lax`;
  };
  $$('[data-sim]').forEach((b) => b.addEventListener('click', () => simulate(b.dataset.sim)));
  setTimeout(() => { if (!P.cookies.list().length) ['_ga', 'PHPSESSID', '_fbp'].forEach((n, i) => setTimeout(() => simulate(n), i * 650)); }, 1400);

  P.live.mount('#live-embed');

  /* ---------- playground ---------- */
  const val = (n) => (($(`input[name="${n}"]:checked`) || {}).value);
  const cfgOut = $('#cfg-out');
  const accentFg = (hex) => { const n = parseInt(hex.slice(1), 16), l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); return l > 150 ? '#0a0c08' : '#ffffff'; };
  const show = () => {
    const o = { region: val('region'), lang: $('#ctl-lang').value, theme: val('theme'), position: $('#ctl-pos').value, guard: val('guard'), tokens: { accent: $('#ctl-accent').value } };
    if ($('#ctl-gpc').checked) o.gpc = true;
    cfgOut.textContent = 'PsyCookies.init(' + JSON.stringify(o, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'") + ');';
    plural();
  };
  $$('input[name="region"]').forEach((r) => r.addEventListener('change', () => { P.configure({ region: r.value }); P.reset(); show(); }));
  $('#ctl-lang').addEventListener('change', (e) => { P.i18n.set(e.target.value); show(); });
  $$('input[name="theme"]').forEach((r) => r.addEventListener('change', () => { P.theme.set(r.value); show(); }));
  $('#ctl-pos').addEventListener('change', (e) => { P.configure({ position: e.target.value }); P.open('banner'); show(); });
  $$('input[name="guard"]').forEach((r) => r.addEventListener('change', () => { P.configure({ guard: r.value }); show(); }));
  $('#ctl-accent').addEventListener('input', (e) => { P.theme.set({ accent: e.target.value, accentFg: accentFg(e.target.value) }); show(); });
  $('#ctl-gpc').addEventListener('change', (e) => { P.configure({ gpc: e.target.checked }); show(); });
  $('#act-banner').addEventListener('click', () => P.open('banner'));
  $('#act-settings').addEventListener('click', () => P.open('settings'));
  $('#act-reset').addEventListener('click', () => P.reset());

  /* ---------- plural demo ---------- */
  const out = $('#pl-out'), meta = $('#pl-meta'), range = $('#pl-n');
  function plural() {
    const n = +range.value, lang = P.i18n.get();
    out.textContent = P.i18n.t('live.total', { n });
    let cat = 'other'; try { cat = new Intl.PluralRules(lang).select(n); } catch { /* old browser */ }
    meta.textContent = `lang=${lang} · n=${n} · Intl.PluralRules → ${cat}`;
  }
  range.addEventListener('input', plural); P.on('lang', plural); P.on('configure', plural); plural(); show();
  pwa();

  /* ---------- PWA: service worker + install prompt ---------- */
  function pwa() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    let ev; const btn = $('#pwa-install');
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); ev = e; if (btn) btn.hidden = false; });
    if (btn) btn.addEventListener('click', async () => { if (!ev) return; ev.prompt(); await ev.userChoice; ev = null; btn.hidden = true; });
    addEventListener('appinstalled', () => { if (btn) btn.hidden = true; });
  }
})();
