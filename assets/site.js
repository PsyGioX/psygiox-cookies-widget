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
  let quiet = false;   // true while the page imitates trackers by itself: those cookies are not visitor activity and are not counted

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

  usage();

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
  setTimeout(() => { if (!P.cookies.list().length) { quiet = true; ['_ga', 'PHPSESSID', '_fbp'].forEach((n, i) => setTimeout(() => simulate(n), i * 650)); setTimeout(() => { quiet = false; }, 3 * 650 + 1200); } }, 1400);

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

  /* ---------- live usage: anonymous counters from /api/stats (no ids, no cookies; DNT/GPC respected) ---------- */
  function usage() {
    const root = $('#usage'); if (!root) return;
    const L = {
      ru: { live: 'LIVE', local: 'ЭТА ВКЛАДКА', off: 'ОФЛАЙН', ev: { view: 'просмотр', accept: 'принять все', reject: 'только необходимые', custom: 'свой выбор', block: 'остановлено' }, reg: { eu: 'EU', us: 'US', ru: 'RU', global: 'World' }, empty: 'Событий пока нет. Выберите что-нибудь в баннере или нажмите на имитацию трекера.', local_note: 'Счётчик /api/stats недоступен на этом хосте — показаны только события этой вкладки.', mem: 'Хранилище не подключено: счётчики живут в памяти функции и обнуляются при её перезапуске.', out: 'Ваш визит не учитывается' },
      en: { live: 'LIVE', local: 'THIS TAB', off: 'OFFLINE', ev: { view: 'view', accept: 'accept all', reject: 'only necessary', custom: 'custom choice', block: 'blocked' }, reg: { eu: 'EU', us: 'US', ru: 'RU', global: 'World' }, empty: 'No events yet. Pick something in the banner or press a tracker button.', local_note: 'The /api/stats counter is not available on this host — showing events from this tab only.', mem: 'No storage is connected: counters live in the function’s memory and reset when it restarts.', out: 'Your visit is not counted' },
    }[LANG];
    const nf = new Intl.NumberFormat(LANG), tf = new Intl.DateTimeFormat(LANG, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const EV = ['view', 'accept', 'reject', 'custom', 'block'], KEY = 'pgx-usage-optout';
    const zero = () => ({ view: 0, accept: 0, reject: 0, custom: 0, block: 0 });
    const status = $('#usage-status'), feedEl = $('#usage-feed'), opt = $('#usage-optout'), note = $('#usage-note');
    const noteDefault = note ? note.textContent : '';

    // ---- privacy gates
    const signal = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1' || navigator.globalPrivacyControl === true;
    const stored = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
    const optedOut = () => signal() || stored();
    if (opt) {
      opt.checked = optedOut(); opt.disabled = signal();
      opt.addEventListener('change', () => { try { opt.checked ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* storage blocked: the choice lasts for this tab */ } });
    }

    // ---- state: the server snapshot, or a session-only one when the API is not there
    let mode = 'wait', snap = null, echo = [], fails = 0, timer = 0;
    const local = { total: zero(), hours: Array.from({ length: 24 }, zero), region: {}, lang: {}, feed: [], minutes: 0 };
    const setMode = (m) => {
      mode = m; if (!status) return; status.dataset.state = m === 'server' ? 'live' : m === 'local' ? 'local' : m;
      status.textContent = m === 'server' ? L.live : m === 'local' ? L.local : m === 'off' ? L.off : '…';
      status.title = m === 'server' && snap && snap.persistent === false ? L.mem : '';
      if (note) note.textContent = m === 'local' ? L.local_note : noteDefault;
    };

    // ---- rendering
    const num = (k, v) => { const el = $(`[data-u="${k}"]`, root); if (!el) return; const s = typeof v === 'number' ? nf.format(v) : v; if (el.textContent !== s) { el.textContent = s; if (typeof v === 'number' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } } };
    const sum = (o) => EV.reduce((a, k) => a + (o[k] || 0), 0);
    function spark(hours) {
      const svg = $('#usage-spark'); if (!svg) return; const NS = 'http://www.w3.org/2000/svg'; svg.textContent = '';
      const max = Math.max(1, ...hours.map((h) => h.view || 0)), H = 52;
      const mk = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
      svg.append(mk('line', { x1: 0, x2: 240, y1: H + 2, y2: H + 2 }));
      hours.forEach((h, i) => {
        const v = h.view || 0, c = (h.accept || 0) + (h.reject || 0) + (h.custom || 0), hv = v ? Math.max(2, (v / max) * H) : 0, hc = c ? Math.max(2, (Math.min(c, v || c) / max) * H) : 0;
        if (hv) svg.append(mk('rect', { x: i * 10, y: H + 2 - hv, width: 8, height: hv, rx: 1.5 }));
        if (hc) svg.append(mk('rect', { class: 'b2', x: i * 10 + 2, y: H + 2 - hc, width: 4, height: hc, rx: 1 }));
      });
    }
    function lists(s) {
      const reg = $('#usage-regions'), langs = $('#usage-langs');
      if (reg) { reg.textContent = ''; const max = Math.max(1, ...['eu', 'us', 'ru', 'global'].map((k) => s.region[k] || 0)); ['eu', 'us', 'ru', 'global'].forEach((k) => { const li = document.createElement('li'), n = document.createElement('span'), bar = document.createElement('em'), i = document.createElement('i'), v = document.createElement('span'); n.textContent = L.reg[k]; i.style.width = ((s.region[k] || 0) / max * 100).toFixed(1) + '%'; bar.append(i); v.textContent = nf.format(s.region[k] || 0); li.append(n, bar, v); reg.append(li); }); }
      if (langs) { langs.textContent = ''; Object.entries(s.lang).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([k, v]) => { const li = document.createElement('li'), sm = document.createElement('small'); li.textContent = k; sm.textContent = nf.format(v); li.append(sm); langs.append(li); }); }
    }
    function feed(s) {
      if (!feedEl) return; feedEl.textContent = '';
      const rows = echo.map((x) => ({ ...x, you: true })).concat(s.feed || []).slice(0, 30);
      if (!rows.length) { const li = document.createElement('li'); li.textContent = L.empty; feedEl.append(li); return; }
      rows.forEach((x) => {
        const li = document.createElement('li'), t = document.createElement('time'), tag = document.createElement('span'), code = document.createElement('code');
        t.textContent = tf.format(new Date(x.t)); tag.className = 'tag tag--' + x.e; tag.textContent = L.ev[x.e] || x.e; code.textContent = `${L.reg[x.r] || x.r} · ${x.l}`;
        li.append(t, tag, code); if (x.c) { const em = document.createElement('em'); em.textContent = x.c; li.append(em); } if (x.you) li.className = 'you'; feedEl.append(li);
      });
    }
    function render() {
      const s = mode === 'server' && snap ? snap : { total: local.total, last24h: local.total, hours: local.hours, region: local.region, lang: local.lang, feed: local.feed, viewsLast15m: local.total.view };
      const d = s.last24h, choices = d.accept + d.reject + d.custom;
      num('views', d.view); num('choices', choices); num('blocks', d.block); num('recent', s.viewsLast15m || 0);
      ['accept', 'custom', 'reject'].forEach((k) => { const w = choices ? d[k] / choices * 100 : 0; const el = $(`#usage-split .s-${k}`); if (el) el.style.width = w.toFixed(1) + '%'; num('p-' + k, choices ? Math.round(w) + '%' : '–'); });
      spark(s.hours); lists(s); feed(s);
    }

    // ---- reading (poll while the tab is visible; back off when the API is missing)
    async function poll() {
      clearTimeout(timer);
      if (document.hidden) return;
      try {
        const r = await fetch('/api/stats', { cache: 'no-store', credentials: 'omit', headers: { accept: 'application/json' } });
        if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) throw new Error('no api');
        const j = await r.json(); if (!j || !j.ok) throw new Error('bad');
        snap = j; fails = 0; if (!optedOut()) echo = []; setMode('server');
      } catch { fails++; if (mode !== 'server') setMode('local'); else if (fails >= 3) setMode('off'); }
      render();
      timer = setTimeout(poll, Math.min(30000, 5000 * 2 ** Math.max(0, fails - 1)));
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });

    // ---- writing (from this page only; at most 25 events per page view)
    let sent = 0;
    function record(ev) {
      local.total[ev.e]++; local.hours[23][ev.e]++; if (ev.e === 'view') { local.region[ev.r] = (local.region[ev.r] || 0) + 1; local.lang[ev.l] = (local.lang[ev.l] || 0) + 1; }
      const row = { t: Date.now(), ...ev }; local.feed.unshift(row); local.feed.length = Math.min(local.feed.length, 30); echo.unshift(row); echo.length = Math.min(echo.length, 6);
      if (mode !== 'server' || optedOut()) render();
      if (optedOut() || sent >= 25) return; sent++;
      fetch('/api/stats', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ev), keepalive: true, credentials: 'omit' })
        .then((r) => { if (r.ok && mode === 'server') setTimeout(poll, 500); }).catch(() => {});
    }
    if (P) {
      const ctx = () => ({ r: P.region(), l: P.i18n.get() });
      const OPT = ['functional', 'analytics', 'marketing'];
      record({ e: 'view', ...ctx() });
      P.on('consent', (e) => {
        if (e.source !== 'banner' && e.source !== 'settings') return;                       // our own demo buttons use the API; count real choices only
        const on = OPT.filter((id) => e.categories && e.categories[id]).length;
        record({ e: on === OPT.length ? 'accept' : on === 0 ? 'reject' : 'custom', ...ctx() });
      });
      let lastBlock = 0;
      P.on('violation', (e) => { if (quiet || e.action === 'warn' || Date.now() - lastBlock < 800) return; lastBlock = Date.now(); record({ e: 'block', c: e.category || 'unknown', ...ctx() }); });
    }
    render(); poll();
  }

  /* ---------- PWA: service worker + install prompt ---------- */
  function pwa() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    let ev; const btn = $('#pwa-install');
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); ev = e; if (btn) btn.hidden = false; });
    if (btn) btn.addEventListener('click', async () => { if (!ev) return; ev.prompt(); await ev.userChoice; ev = null; btn.hidden = true; });
    addEventListener('appinstalled', () => { if (btn) btn.hidden = true; });
  }
})();
