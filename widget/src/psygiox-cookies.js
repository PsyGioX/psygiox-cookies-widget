/*!
 * PsyGioX Cookies v__VERSION__ — universal cookie-consent widget with real-time cookie tracking.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of
 * the GNU General Public License, version 3, as published by the Free Software Foundation.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See <https://www.gnu.org/licenses/gpl-3.0.html>.
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 */
(function (win, doc) {
  'use strict';
  if (win.PsyCookies && win.PsyCookies.__pc) return;

  var VERSION = '__VERSION__';
  var REPO = 'https://github.com/PsyGioX/psygiox-cookies-widget';
  var nav = win.navigator, loc = win.location;
  var PACKS = ['de', 'fr', 'es', 'it', 'pt', 'pl', 'uk'];
  var RTL = /^(ar|he|fa|ur)$/;
  var cur = doc.currentScript;
  if (!cur) {
    var ss = doc.getElementsByTagName('script');
    for (var si = ss.length - 1; si >= 0; si--) if (/psygiox-cookies/i.test(ss[si].src || '')) { cur = ss[si]; break; }
  }

  /* ============================== helpers ============================== */
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function clone(v) { return isObj(v) ? merge({}, v) : Array.isArray(v) ? v.map(clone) : v; }
  function merge(t, s) {
    for (var k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      if (isObj(s[k]) && isObj(t[k])) merge(t[k], s[k]); else t[k] = clone(s[k]);
    }
    return t;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return Date.now(); }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function kebab(s) { return s.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
  function hash(s) { var x = 5381, i = s.length; while (i) x = (x * 33) ^ s.charCodeAt(--i); return x >>> 0; }
  function uid() {
    try {
      if (win.crypto && win.crypto.randomUUID) return win.crypto.randomUUID();
      var a = new Uint8Array(16); win.crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
    } catch (e) { return now().toString(36) + Math.random().toString(36).slice(2); }
  }
  function qs(r, s) { return r.querySelector(s); }
  function qsa(r, s) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
  function mk(tag, cls) { var n = doc.createElement(tag); if (cls) n.className = cls; return n; }
  var raf = win.requestAnimationFrame ? win.requestAnimationFrame.bind(win) : function (f) { return setTimeout(f, 16); };

  /* ============================== defaults & legal profiles ============================== */
  var DEFAULTS = {
    version: '1',               // policy version: bump it to ask everybody again
    region: 'auto',             // auto | eu | us | ru | global
    lang: 'auto',               // auto | any BCP-47 tag
    fallbackLang: 'en',
    i18nBase: '',               // folder with language packs (default: <script folder>/i18n/)
    theme: 'auto',              // auto | light | dark | contrast
    tokens: {},                 // CSS design tokens: { accent, accentFg, bg, fg, radius, font, ... }
    position: 'bottom',         // bottom | top | bottom-left | bottom-right | top-left | top-right | center
    layout: 'auto',             // auto | bar | box | center
    animation: 'slide',         // slide | fade | none
    fab: true,                  // floating "cookie settings" button after the choice
    fabPosition: 'left',        // left | right
    zIndex: 2147483000,
    operator: '',               // legal name of the site operator (shown in the settings dialog)
    links: { policy: '', privacy: '', consent: '' },
    categories: [
      { id: 'necessary', required: true },
      { id: 'functional' },
      { id: 'analytics' },
      { id: 'marketing', sale: true }
    ],
    profiles: {},               // override pieces of the legal profiles: { us: { defaults: ['analytics'] } }
    ttl: 0,                     // consent lifetime in days (0 = profile default)
    guard: 'enforce',           // off | warn | enforce  (Cookie Guard)
    monitor: true,              // real-time cookie tracking
    pollMs: 1000,
    logSize: 100,
    cookieRules: [],            // [{ match: '^my_', category: 'analytics', vendor: 'My tool' }]
    gcm: true,                  // Google Consent Mode v2 signals
    dataLayer: true,            // push events to window.dataLayer (GTM)
    honorGPC: true,
    gpc: 'auto',                // auto | true | false (force the Global Privacy Control flag, handy for demos)
    receipt: '',                // endpoint that receives anonymous consent receipts
    cookie: { name: 'psygiox_consent', domain: '', path: '/', sameSite: 'Lax' },
    reload: 'auto',             // reload the page after withdrawal: auto | true | false
    css: 'auto',                // auto | none | URL
    nonce: '',
    configUrl: '',              // JSON file merged into the config on start
    manual: false,              // do not start automatically; call PsyCookies.init()
    debug: false
  };
  var ALIAS = { policy: 'links.policy', privacy: 'links.privacy', consent: 'links.consent' };

  var PROFILES = {
    eu: { law: 'GDPR · ePrivacy', model: 'optin', ttl: 180 },
    global: { law: 'LGPD · PIPEDA · UK GDPR · PDPA', model: 'optin', ttl: 180 },
    ru: { law: '152-FZ', model: 'optin', ttl: 365 },
    us: { law: 'CCPA/CPRA · state laws', model: 'optout', ttl: 365, gpc: 'lock', defaults: ['functional', 'analytics'], dnsmpi: true }
  };
  var RU_TZ = /^(Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Kirov|Astrakhan|Saratov|Ulyanovsk)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr))$/;
  var US_TZ = /^(America\/(New_York|Detroit|Chicago|Menominee|Denver|Boise|Phoenix|Los_Angeles|Anchorage|Juneau|Sitka|Metlakatla|Yakutat|Nome|Adak|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)|Pacific\/Honolulu|US\/.+)$/;

  var cfg = merge({}, DEFAULTS);
  var S = { region: 'global', prof: PROFILES.global, lang: 'en', consent: null, started: false, built: false, gpc: false, pend: null, paused: false, want: null };
  var handlers = {}, jar = Object.create(null), evlog = [], counters = { blocked: 0, purged: 0, violations: 0 };
  var memo = {}, builtin = null, apiRules = [], rules = [], views = [], activated = {}, phs = [];

  /* ============================== events ============================== */
  function on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return function () { off(ev, fn); }; }
  function off(ev, fn) {
    if (!handlers[ev]) return;
    handlers[ev] = fn ? handlers[ev].filter(function (f) { return f !== fn && f.__o !== fn; }) : [];
  }
  function once(ev, fn) { var w = function (d) { off(ev, w); fn(d); }; w.__o = fn; return on(ev, w); }
  function emit(ev, detail) {
    (handlers[ev] || []).slice().forEach(function (f) { try { f(detail); } catch (e) { if (cfg.debug && win.console) console.error(e); } });
    try { win.dispatchEvent(new CustomEvent('psygiox-cookies:' + ev, { detail: detail })); } catch (e) { /* old browsers */ }
  }

  /* ============================== i18n (Intl-based, region-aware) ============================== */
  var packs = {}, ic = {}, loading = {};
  function normLang(l) {
    var p = String(l || '').replace('_', '-').split('-');
    return p[0].toLowerCase() + (p[1] ? '-' + (p[1].length === 2 ? p[1].toUpperCase() : p[1]) : '');
  }
  function chain() {
    var o = [];
    [S.lang, cfg.fallbackLang, 'en'].forEach(function (l) {
      l = normLang(l);
      [l, l.split('-')[0]].forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); });
    });
    return o;
  }
  function lookup(key) {
    var c = chain(), sfx = ['@' + S.region, ''];
    for (var i = 0; i < c.length; i++) {
      var p = packs[c[i]]; if (!p) continue;
      for (var j = 0; j < 2; j++) if (p[key + sfx[j]] !== undefined) return p[key + sfx[j]];
    }
  }
  function intl(kind, opts) {
    var k = kind + S.lang + (opts ? JSON.stringify(opts) : '');
    if (ic[k] !== undefined) return ic[k];
    try { ic[k] = new Intl[kind](S.lang, opts); } catch (e) { try { ic[k] = new Intl[kind]('en', opts); } catch (e2) { ic[k] = null; } }
    return ic[k];
  }
  function nf(n) { var f = intl('NumberFormat'); return f ? f.format(n) : String(n); }
  function plural(n) { var f = intl('PluralRules'); return f ? f.select(n) : (n === 1 ? 'one' : 'other'); }
  function list(a) { var f = intl('ListFormat', { style: 'long', type: 'conjunction' }); return f ? f.format(a) : a.join(', '); }
  function fmtDate(ts) { var f = intl('DateTimeFormat', { dateStyle: 'medium', timeStyle: 'short' }); return f ? f.format(ts) : new Date(ts).toLocaleString(); }
  function fmtTime(ts) { var f = intl('DateTimeFormat', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); return f ? f.format(ts) : new Date(ts).toLocaleTimeString(); }
  function rel(ts) {
    var f = intl('RelativeTimeFormat', { numeric: 'auto', style: 'short' }); if (!f) return '';
    var s = Math.round((ts - now()) / 1000), a = Math.abs(s);
    return a < 60 ? f.format(s, 'second') : a < 3600 ? f.format(Math.round(s / 60), 'minute') : a < 86400 ? f.format(Math.round(s / 3600), 'hour') : f.format(Math.round(s / 86400), 'day');
  }
  function fmt(tpl, vars, html) {
    var s = html ? esc(tpl) : String(tpl);
    s = s.replace(/\{(\$?\w+)\}/g, function (m, k) {
      if (!vars || !(k in vars)) return m;
      var v = vars[k];
      if (k === 'n' && typeof v === 'number') v = nf(v);
      if (Array.isArray(v)) v = list(v);
      return html && k.charAt(0) !== '$' ? esc(v) : String(v);
    });
    return html ? s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') : s;
  }
  function msg(key, vars, html) {
    var v = lookup(key);
    if (v === undefined) return html ? esc(key) : key;
    if (isObj(v)) { var c = plural(+(vars && vars.n) || 0); v = v[c] != null ? v[c] : (v.other != null ? v.other : ''); }
    return fmt(v, vars, html);
  }
  function T(k, v) { return msg(k, v, false); }
  function H(k, v) { return msg(k, v, true); }
  function hasLang(l) { var b = l.split('-')[0]; return !!(packs[l] || packs[b]) || PACKS.indexOf(b) > -1; }
  function detectLang() {
    if (cfg.lang && cfg.lang !== 'auto') return normLang(cfg.lang);
    var c = [doc.documentElement.lang].concat(nav.languages || [nav.language]);
    for (var i = 0; i < c.length; i++) { if (!c[i]) continue; var n = normLang(c[i]); if (hasLang(n)) return n; }
    return normLang(cfg.fallbackLang);
  }
  function packBase() { return cfg.i18nBase || (cur && cur.src ? cur.src.replace(/[^\/]*$/, '') + 'i18n/' : ''); }
  function ensureLang() {
    var b = S.lang.split('-')[0];
    if (packs[S.lang] || packs[b] || PACKS.indexOf(b) < 0) return;
    I.load(b).catch(function () { /* stay on the fallback language */ });
  }
  var I = {
    add: function (lang, m, silent) {
      lang = normLang(lang); packs[lang] = merge(packs[lang] || {}, m);
      if (S.built && !silent && chain().indexOf(lang) > -1) renderAll();
      return I;
    },
    set: function (lang) { cfg.lang = lang; S.lang = detectLang(); ensureLang(); if (S.built) renderAll(); emit('lang', S.lang); return S.lang; },
    get: function () { return S.lang; },
    t: function (k, v) { return T(k, v); },
    has: function (lang) { return !!packs[normLang(lang)]; },
    available: function () { return Object.keys(packs).concat(PACKS.filter(function (p) { return !packs[p]; })); },
    load: function (lang, url) {
      lang = normLang(lang).split('-')[0];
      if (packs[lang]) return Promise.resolve(lang);
      if (loading[lang]) return loading[lang];
      var src = url || packBase() + lang + (cur && /\.min\./.test(cur.src) ? '.min.js' : '.js');
      loading[lang] = new Promise(function (res, rej) {
        var s = mk('script'); s.src = src; s.async = true; if (cfg.nonce) s.nonce = cfg.nonce;
        s.onload = function () { res(lang); };
        s.onerror = function () { delete loading[lang]; rej(new Error('PsyCookies: language pack "' + lang + '" not found')); };
        (doc.head || doc.documentElement).appendChild(s);
      });
      return loading[lang];
    }
  };
  // Language packs register themselves through a tiny queue: (window.__pcL = window.__pcL || []).push([lang, messages])
  var queued = win.__pcL;
  win.__pcL = { push: function (p) { I.add(p[0], p[1]); } };
  if (Array.isArray(queued)) queued.forEach(function (p) { I.add(p[0], p[1], true); });

  /* ============================== cookie access, classification ============================== */
  var cd = null, owner = null, patched = false;
  [win.Document && win.Document.prototype, win.HTMLDocument && win.HTMLDocument.prototype].forEach(function (p) {
    if (!cd && p) { var d = Object.getOwnPropertyDescriptor(p, 'cookie'); if (d && d.get && d.set) { cd = d; owner = p; } }
  });
  function rawGet() { try { return cd ? cd.get.call(doc) : doc.cookie; } catch (e) { return ''; } }
  function rawSet(s) { try { if (cd) cd.set.call(doc, s); else doc.cookie = s; } catch (e) { /* ignore */ } }
  function parseJar(str) {
    var o = Object.create(null);
    if (!str) return o;
    str.split(/;\s?/).forEach(function (p) { var i = p.indexOf('='); if (i < 1) return; var n = p.slice(0, i).trim(); if (n) o[n] = p.slice(i + 1); });
    return o;
  }
  function parseSet(s) {
    var parts = String(s).split(';'), nv = parts[0], i = nv.indexOf('=');
    var o = { name: i < 0 ? '' : nv.slice(0, i).trim(), exp: null, dead: false }, ma = null, ex = null;
    for (var k = 1; k < parts.length; k++) {
      var kv = parts[k].split('='), key = kv[0].trim().toLowerCase(), val = kv.slice(1).join('=').trim();
      if (key === 'max-age') { var m = parseInt(val, 10); if (!isNaN(m)) ma = m; }
      else if (key === 'expires') { var d = Date.parse(val); if (!isNaN(d)) ex = d; }
    }
    if (ma !== null) o.exp = now() + ma * 1000; else if (ex !== null) o.exp = ex;
    o.dead = o.exp !== null && o.exp <= now();
    return o;
  }

  // [category, vendor, name pattern] — a compact built-in signature base; extend with cookieRules / cookies.rule()
  var SIGS = [
    ['necessary', 'Session & security', '^(PHPSESSID|JSESSIONID|ASP\\.NET_SessionId|connect\\.sid|laravel_session|sessionid|csrftoken|XSRF-TOKEN|_csrf|csrf_token|wordpress_(logged_in|sec|test_cookie).*|woocommerce_.+|wp_woocommerce_session_.+|cart|cart_sig|secure_customer_sig)$'],
    ['necessary', 'Cloudflare', '^(__cf_bm|__cflb|cf_clearance|_cfuvid)$'],
    ['necessary', 'Stripe', '^__stripe_(mid|sid)$'],
    ['necessary', 'reCAPTCHA', '^_GRECAPTCHA$'],
    ['functional', 'Preferences', '^(lang|language|locale|i18next|NEXT_LOCALE|theme|dark_mode|a11y|wp-settings(-time)?-.+)$'],
    ['functional', 'Live chat', '^(intercom-(id|session|device-id)-.+|drift(t|_.+)|crisp-client.+|Tawk_.+|__zlcmid)$'],
    ['analytics', 'Google Analytics', '^(_ga(_.+)?|_gid|_gat(_.+)?|__utm[a-z]+|_dc_gtm_.+|AMP_TOKEN)$'],
    ['analytics', 'Yandex Metrica', '^_ym_.+$'],
    ['analytics', 'Matomo', '^(_pk_.+|mtm_.+)$'],
    ['analytics', 'Hotjar', '^_hj.+$'],
    ['analytics', 'Microsoft Clarity', '^(_cl(ck|sk)|CLID)$'],
    ['analytics', 'HubSpot', '^(hubspotutk|__hs(tc|sc|src)|__hs_.+|messagesUtk)$'],
    ['analytics', 'Mixpanel / Amplitude / Segment', '^(mp_.+_mixpanel|amp(litude)?_.+|ajs_.+)$'],
    ['analytics', 'Heap / FullStory / VWO', '^(_hp2_.+|fs_uid|_fs_.+|_vwo_.+|_vis_opt_.+|optimizely.+)$'],
    ['analytics', 'Shopify analytics', '^_shopify_(y|s|sa_p|sa_t)$'],
    ['marketing', 'Meta Pixel', '^(_fb[pc]|fr)$'],
    ['marketing', 'Google Ads', '^(_gcl_.+|_gac_.+|IDE|DSID|test_cookie|__gads|__gpi|_gads|1P_JAR|ANID)$'],
    ['marketing', 'Microsoft Ads', '^(MUID|_uet(sid|vid|msclkid)|MR|SRM_B)$'],
    ['marketing', 'Yandex', '^(yandexuid|yuidss|ymex|yabs-sid|is_gdpr(_b)?|yp|ys)$'],
    ['marketing', 'TikTok', '^(_ttp|_tt_enable_cookie|ttclid|_ttclid)$'],
    ['marketing', 'LinkedIn', '^(li_fat_id|li_sugr|lidc|bcookie|bscookie|UserMatchHistory|AnalyticsSyncHistory|li_gc|_li_.+)$'],
    ['marketing', 'Pinterest', '^(_pin_unauth|_pinterest_.+|_epik)$'],
    ['marketing', 'X / Twitter', '^(personalization_id|guest_id(_ads|_marketing)?|muc_ads)$'],
    ['marketing', 'Snapchat', '^(_scid(_r)?|_sctr|sc_at)$'],
    ['marketing', 'Reddit', '^(_rdt_uuid|_rdt_cid)$'],
    ['marketing', 'VK / Mail.ru', '^(tmr_.+|_tmr_.+|mrcu)$'],
    ['marketing', 'Ad networks', '^(cto_.+|_criteo.+|t_gid|taboola_.+|outbrain_.+|obuid|__adroll.+)$']
  ];
  function compileRules() {
    rules = [];
    (cfg.cookieRules || []).concat(apiRules).forEach(function (r) {
      try { rules.push({ re: r.match instanceof RegExp ? r.match : new RegExp(r.match), cat: r.category, vendor: r.vendor || '' }); } catch (e) { /* bad pattern */ }
    });
    memo = {};
  }
  function classify(name) {
    if (memo[name]) return memo[name];
    var r = null, i;
    if (name === cfg.cookie.name || name === 'cookie_consent') r = { cat: 'necessary', vendor: 'PsyGioX Cookies' };
    for (i = 0; !r && i < rules.length; i++) if (rules[i].re.test(name)) r = { cat: rules[i].cat, vendor: rules[i].vendor };
    if (!r) {
      if (!builtin) builtin = SIGS.map(function (s) { return { re: new RegExp(s[2]), cat: s[0], vendor: s[1] }; });
      for (i = 0; !r && i < builtin.length; i++) if (builtin[i].re.test(name)) r = { cat: builtin[i].cat, vendor: builtin[i].vendor };
    }
    return (memo[name] = r || { cat: 'unknown', vendor: '' });
  }

  /* ============================== consent model ============================== */
  function cats() { return cfg.categories; }
  function catDef(id) { for (var i = 0; i < cfg.categories.length; i++) if (cfg.categories[i].id === id) return cfg.categories[i]; return null; }
  function gpcOn() { return cfg.honorGPC && S.gpc; }
  function isLocked(id) { var c = catDef(id); return !!(c && c.sale && gpcOn() && S.prof.gpc === 'lock'); }
  function baseline(id) {
    var c = catDef(id); if (!c) return false;
    if (c.required) return true;
    return S.prof.model === 'optout' && (S.prof.defaults || []).indexOf(id) > -1 && !isLocked(id);
  }
  function allowed(id) {
    var c = catDef(id); if (!c) return false;
    if (c.required) return true;
    if (isLocked(id)) return false;
    return S.consent ? !!S.consent.c[id] : baseline(id);
  }
  function snapshot() { var o = {}; cats().forEach(function (c) { o[c.id] = allowed(c.id); }); return o; }
  function isForbidden(cat) { var c = catDef(cat); return !!(c && !c.required && !allowed(cat)); }

  function ttlMs() { return (cfg.ttl || S.prof.ttl || 365) * 864e5; }
  function storeConsent(rec) {
    var d = cfg.cookie, v = encodeURIComponent(JSON.stringify(rec));
    rawSet(d.name + '=' + v + '; max-age=' + Math.round(ttlMs() / 1000) + '; path=' + (d.path || '/') + '; SameSite=' + (d.sameSite || 'Lax') +
      (d.domain ? '; domain=' + d.domain : '') + (loc.protocol === 'https:' ? '; Secure' : ''));
    if (parseJar(rawGet())[d.name] !== v) { try { win.localStorage.setItem(d.name, v); } catch (e) { /* storage blocked */ } }
  }
  function loadConsent() {
    var v = parseJar(rawGet())[cfg.cookie.name];
    if (!v) { try { v = win.localStorage.getItem(cfg.cookie.name); } catch (e) { v = null; } }
    if (!v) return null;
    try {
      var r = JSON.parse(decodeURIComponent(v));
      if (r && String(r.v) === String(cfg.version) && r.t && now() - r.t < ttlMs() && isObj(r.c)) return r;
    } catch (e) { /* damaged record */ }
    return null;
  }
  function clearConsent() {
    var d = cfg.cookie;
    rawSet(d.name + '=; max-age=0; path=' + (d.path || '/') + (d.domain ? '; domain=' + d.domain : ''));
    try { win.localStorage.removeItem(d.name); } catch (e) { /* ignore */ }
  }

  function commit(choices, source) {
    var prev = snapshot(), first = !S.consent;
    var rec = { v: String(cfg.version), t: now(), r: S.region, id: (S.consent && S.consent.id) || uid(), g: gpcOn() ? 1 : 0, c: {} };
    cats().forEach(function (c) { if (!c.required) rec.c[c.id] = choices[c.id] && !isLocked(c.id) ? 1 : 0; });
    S.consent = rec; S.pend = null; storeConsent(rec);
    var next = snapshot(), granted = [], revoked = [];
    Object.keys(next).forEach(function (k) { if (next[k] && !prev[k]) granted.push(k); if (!next[k] && prev[k]) revoked.push(k); });
    gcm('update'); pushLayer(); sendReceipt(rec, first ? 'first' : 'change');
    revoked.forEach(purgeCategory);
    activate();
    if (S.built) { showBanner(false); renderState(); closeModal(true); }
    var detail = { source: source || 'api', first: first, categories: next, granted: granted, revoked: revoked, consent: api.consent() };
    emit('consent', detail);
    if (granted.length || revoked.length) emit('change', detail);
    if (revoked.length && (cfg.reload === true || (cfg.reload === 'auto' && revoked.some(function (k) { return activated[k]; })))) setTimeout(function () { loc.reload(); }, 80);
    return api.consent();
  }

  /* ============================== integrations ============================== */
  function gtag() { (win.dataLayer = win.dataLayer || []).push(arguments); }
  function gcm(kind, base) {
    if (!cfg.gcm) return;
    var a = function (c) { return (base ? baseline(c) : allowed(c)) ? 'granted' : 'denied'; };
    var o = { analytics_storage: a('analytics'), ad_storage: a('marketing'), ad_user_data: a('marketing'), ad_personalization: a('marketing'), functionality_storage: a('functional'), personalization_storage: a('functional'), security_storage: 'granted' };
    if (kind === 'default') o.wait_for_update = 500;
    gtag('consent', kind, o);
  }
  function pushLayer() {
    if (!cfg.dataLayer) return;
    (win.dataLayer = win.dataLayer || []).push({ event: 'psygiox_consent', psygioxConsent: snapshot(), psygioxRegion: S.region });
  }
  function sendReceipt(rec, kind) {
    if (!cfg.receipt) return;
    var body = JSON.stringify({ id: rec.id, ts: rec.t, kind: kind, version: String(cfg.version), region: S.region, lang: S.lang, categories: rec.c, gpc: !!rec.g, origin: loc.origin, widget: VERSION });
    try { if (nav.sendBeacon && nav.sendBeacon(cfg.receipt, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return; } catch (e) { /* fall through */ }
    try { win.fetch(cfg.receipt, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body, keepalive: true, credentials: 'omit' }); } catch (e) { /* ignore */ }
  }

  /* ============================== script / iframe gate ============================== */
  function release(n, c) {
    n.setAttribute('data-pc-done', '1'); activated[c] = true;
    if (n.__pcph && n.__pcph.parentNode) n.__pcph.parentNode.removeChild(n.__pcph);
    if (n.tagName === 'SCRIPT') {
      var s = mk('script'), a = n.attributes;
      for (var i = 0; i < a.length; i++) { var k = a[i].name; if (k !== 'type' && k.indexOf('data-pc') !== 0) s.setAttribute(k, a[i].value); }
      s.type = n.getAttribute('data-pc-type') || 'text/javascript';
      if (n.getAttribute('src')) s.src = n.getAttribute('src'); else s.text = n.text;
      s.async = false; if (cfg.nonce && !s.nonce) s.nonce = cfg.nonce;
      if (n.parentNode) n.parentNode.replaceChild(s, n);
    } else {
      var src = n.getAttribute('data-pc-src'); if (src) n.setAttribute('src', src);
      n.hidden = false;
    }
  }
  function placeholder(n, c) {
    if (n.__pcph) return;
    n.hidden = true;
    var p = mk('div', 'pc-root pc-ph'); p.__cat = c; n.__pcph = p;
    phs.push(p); n.parentNode.insertBefore(p, n); fillPlaceholder(p);
  }
  function fillPlaceholder(p) {
    applyRoot(p);
    p.innerHTML = '<p>' + H('ph.text', { category: catLabel(p.__cat) }) + '</p><button type="button" class="pc-btn pc-btn--ghost pc-btn--sm" data-pc="settings">' + H('ph.btn') + '</button>';
  }
  function activate() {
    qsa(doc, '[data-pc-category]:not([data-pc-done])').forEach(function (n) {
      var c = n.getAttribute('data-pc-category');
      if (allowed(c)) release(n, c); else if (n.tagName === 'IFRAME') placeholder(n, c);
    });
    phs = phs.filter(function (p) { return p.parentNode; });
  }
  var actTimer = 0;
  function observe() {
    if (S.mo || !win.MutationObserver) return;
    S.mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) {
        var n = list[i].addedNodes[j];
        if (n.nodeType === 1 && (n.hasAttribute('data-pc-category') || n.querySelector('[data-pc-category]'))) { clearTimeout(actTimer); actTimer = setTimeout(activate, 0); return; }
      }
    });
    S.mo.observe(doc.documentElement, { childList: true, subtree: true });
  }

  /* ============================== live tracker + Cookie Guard ============================== */
  function log(type, name, k, src) {
    var e = { t: now(), type: type, name: name, category: k.cat, vendor: k.vendor, source: src || 'script' };
    evlog.unshift(e); if (evlog.length > cfg.logSize) evlog.length = cfg.logSize;
    emit('cookie', e); return e;
  }
  function domains() {
    var host = loc.hostname, parts = host.split('.'), d = ['', host, '.' + host];
    for (var i = 1; i < parts.length - 1; i++) d.push('.' + parts.slice(i).join('.'));
    return d;
  }
  function purge(name) {
    var segs = loc.pathname.split('/').filter(Boolean), paths = ['/'], p = '';
    segs.forEach(function (s) { p += '/' + s; paths.push(p); });
    domains().forEach(function (d) {
      paths.forEach(function (pt) { rawSet(name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=' + pt + (d ? '; domain=' + d : '')); });
    });
    return !(name in parseJar(rawGet()));
  }
  function verdict(j, src) {
    var c = j.k.cat;
    if (c === 'necessary') j.st = 'necessary';
    else if (c === 'unknown' || !catDef(c)) j.st = 'unknown';
    else if (isForbidden(c)) {
      counters.violations++;
      emit('violation', { name: j.n, category: c, vendor: j.k.vendor, action: cfg.guard });
      if (cfg.guard === 'enforce' && purge(j.n)) { j.gone = true; j.st = 'deleted'; j.t = now(); counters.purged++; log('purge', j.n, j.k, src); }
      else j.st = 'violation';
    } else j.st = 'allowed';
  }
  var dirty = false;
  function scan(src) {
    var curr = parseJar(rawGet()), t = now(), n, j;
    for (n in jar) if (!jar[n].gone && !(n in curr)) { j = jar[n]; j.gone = true; j.t = t; j.fl = 1; j.st = 'removed'; log('delete', n, j.k, src); dirty = true; }
    for (n in curr) {
      var v = curr[n], hh = hash(v);
      j = jar[n];
      if (!j || j.gone) {
        j = jar[n] = { n: n, k: classify(n), size: n.length + v.length, h: hh, t0: t, t: t, c: 1, gone: false, st: '', fl: 1, exp: (j && j.exp) || null };
        log('set', n, j.k, src); verdict(j, src); dirty = true;
      } else if (j.h !== hh) {
        j.h = hh; j.size = n.length + v.length; j.t = t; j.c++; j.fl = 1;
        log('update', n, j.k, src); verdict(j, src); dirty = true;
      } else if (!j.st) verdict(j, src);
    }
    if (dirty) { dirty = false; schedule(); }
  }
  function patch() {
    if (patched || !cd || !owner) return;
    var o = Object.getOwnPropertyDescriptor(owner, 'cookie');
    if (!o || !o.configurable) return;
    patched = true;
    Object.defineProperty(owner, 'cookie', {
      configurable: true, enumerable: cd.enumerable,
      get: function () { return cd.get.call(this); },
      set: function (v) {
        if (this !== doc) return cd.set.call(this, v);
        var a = parseSet(v);
        if (a.name && !a.dead && cfg.guard === 'enforce' && S.started) {
          var k = classify(a.name);
          if (isForbidden(k.cat)) {
            counters.blocked++; counters.violations++;
            var j = jar[a.name];
            if (!j || j.gone) jar[a.name] = { n: a.name, k: k, size: 0, h: 0, t0: now(), t: now(), c: 0, gone: true, st: 'blocked', fl: 1, exp: null };
            log('block', a.name, k, 'script'); emit('violation', { name: a.name, category: k.cat, vendor: k.vendor, action: 'block' }); schedule();
            return;
          }
        }
        cd.set.call(this, v);
        if (S.mon) scan('script');
        if (a.name && jar[a.name]) jar[a.name].exp = a.exp;
      }
    });
  }
  function unpatch() { if (patched && owner && cd) { try { Object.defineProperty(owner, 'cookie', cd); } catch (e) { /* ignore */ } patched = false; } }
  function startMonitor() {
    if (S.mon) return;
    S.mon = true; scan('init');
    if (win.cookieStore && win.cookieStore.addEventListener) { S.csl = function () { scan('detected'); }; win.cookieStore.addEventListener('change', S.csl); }
    S.timer = setInterval(function () { if (!doc.hidden) scan('detected'); }, win.cookieStore ? Math.max(cfg.pollMs * 4, 3000) : Math.max(cfg.pollMs, 250));
  }
  function stopMonitor() {
    S.mon = false; clearInterval(S.timer);
    if (S.csl && win.cookieStore) win.cookieStore.removeEventListener('change', S.csl);
  }
  function purgeStorage(cat) {
    ['localStorage', 'sessionStorage'].forEach(function (nm) {
      try { var st = win[nm]; Object.keys(st).forEach(function (k) { if (classify(k).cat === cat) st.removeItem(k); }); } catch (e) { /* blocked */ }
    });
  }
  function purgeCategory(cat) {
    Object.keys(parseJar(rawGet())).forEach(function (n) {
      if (classify(n).cat !== cat) return;
      purge(n);
      if (jar[n]) { jar[n].gone = true; jar[n].st = 'deleted'; jar[n].t = now(); jar[n].fl = 1; counters.purged++; log('purge', n, jar[n].k, 'revoke'); }
    });
    purgeStorage(cat); schedule();
  }
  function jarList() {
    return Object.keys(jar).map(function (n) { return jar[n]; }).sort(function (a, b) { return (a.gone - b.gone) || (b.t - a.t); });
  }
  function stats() {
    var s = { present: 0, allowed: 0, unknown: 0, violations: 0, blocked: counters.blocked, purged: counters.purged, bytes: 0, byCategory: {} };
    jarList().forEach(function (j) {
      if (j.gone) return;
      s.present++; s.bytes += j.size; s.byCategory[j.k.cat] = (s.byCategory[j.k.cat] || 0) + 1;
      if (j.st === 'allowed' || j.st === 'necessary') s.allowed++; else if (j.st === 'unknown') s.unknown++; else if (j.st === 'violation') s.violations++;
    });
    return s;
  }
  var sched = false;
  function schedule() { if (sched) return; sched = true; raf(function () { sched = false; refreshLive(); refreshCatLists(); }); }

  /* ============================== UI: markup ============================== */
  var FAB = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 4 4 0 0 0 21 12.8z"/><path d="M8.5 9.5h.01M11 15h.01M16 14h.01M7.5 13h.01"/></svg>';
  function catLabel(id) {
    if (id === 'unknown') return T('st.unknown');
    var k = 'cat.' + id + '.title', c = catDef(id);
    return lookup(k) !== undefined ? T(k) : (c && c.title) || id;
  }
  function catDesc(c) { var k = 'cat.' + c.id + '.desc'; return lookup(k) !== undefined ? H(k) : esc(c.desc || ''); }
  function linksHtml() {
    var L = cfg.links, o = [];
    [['policy', 'link.policy'], ['privacy', 'link.privacy'], ['consent', 'link.consent']].forEach(function (p) {
      if (L[p[0]]) o.push('<a href="' + esc(L[p[0]]) + '">' + H(p[1]) + '</a>');
    });
    return o.join(' · ');
  }
  function bannerHtml() {
    var L = linksHtml();
    return '<div class="pc-bb"><h2 id="pc-bt" class="pc-h">' + H('banner.title') + '</h2><p id="pc-bd" class="pc-p">' + H('banner.text') + '</p>' +
      (L ? '<p class="pc-links">' + L + '</p>' : '') + (gpcOn() ? '<p class="pc-note">' + H('gpc.notice') + '</p>' : '') + '</div>' +
      '<div class="pc-ba"><button type="button" class="pc-btn pc-btn--fill" data-pc="accept">' + H('banner.accept') + '</button>' +
      '<button type="button" class="pc-btn pc-btn--fill" data-pc="reject">' + H('banner.reject') + '</button>' +
      '<button type="button" class="pc-btn pc-btn--ghost" data-pc="settings">' + H(S.prof.dnsmpi ? 'banner.dnsmpi' : 'banner.settings') + '</button></div>';
  }
  function catHtml(c) {
    var id = c.id, locked = isLocked(id), req = !!c.required;
    var on = req ? true : locked ? false : (S.pend && id in S.pend ? S.pend[id] : allowed(id));
    return '<div class="pc-cat" data-cat="' + esc(id) + '"><div class="pc-row"><div class="pc-ct"><b>' + esc(catLabel(id)) + '</b>' +
      (req ? '<span class="pc-tag">' + H('tag.always') + '</span>' : '') + '</div>' +
      '<label class="pc-sw"><input type="checkbox" data-pc-cat="' + esc(id) + '" aria-label="' + esc(catLabel(id)) + '"' + (on ? ' checked' : '') + (req || locked ? ' disabled' : '') + '><i></i></label></div>' +
      '<p class="pc-small">' + catDesc(c) + '</p>' + (locked ? '<p class="pc-small pc-lock">' + H('gpc.locked') + '</p>' : '') +
      '<details class="pc-det"><summary>' + H('cat.cookies') + '</summary><ul class="pc-ck" data-cat-list="' + esc(id) + '"></ul></details></div>';
  }
  function statusText() {
    if (!S.consent) return T('status.none');
    var l = cats().filter(function (c) { return !c.required && S.consent.c[c.id] && !isLocked(c.id); }).map(function (c) { return catLabel(c.id); });
    return l.length ? T('status.saved', { date: fmtDate(S.consent.t), list: l }) : T('status.saved0', { date: fmtDate(S.consent.t) });
  }
  function modalHtml() {
    var L = linksHtml();
    return '<div class="pc-backdrop" data-pc="close"></div><div class="pc-panel" tabindex="-1">' +
      '<div class="pc-head"><h2 id="pc-mt" class="pc-h">' + H('modal.title') + '</h2><button type="button" class="pc-x" data-pc="close" aria-label="' + esc(T('modal.close')) + '">&times;</button></div>' +
      '<div class="pc-tabs" role="tablist"><button type="button" role="tab" class="pc-tab" id="pc-tab-prefs" aria-controls="pc-pane-prefs" data-pc-tab="prefs">' + H('tab.prefs') + '</button>' +
      '<button type="button" role="tab" class="pc-tab" id="pc-tab-live" aria-controls="pc-pane-live" data-pc-tab="live">' + H('tab.live') + '<span class="pc-dot" aria-hidden="true"></span></button></div>' +
      '<div class="pc-body"><div role="tabpanel" id="pc-pane-prefs" aria-labelledby="pc-tab-prefs" class="pc-pane"><p class="pc-p">' + H('modal.intro') + (cfg.operator ? ' ' + H('modal.operator', { operator: cfg.operator }) : '') + '</p>' +
      (L ? '<p class="pc-links">' + L + '</p>' : '') + (gpcOn() ? '<p class="pc-note">' + H('gpc.notice') + '</p>' : '') +
      cats().map(catHtml).join('') + '<p class="pc-status" id="pc-status" aria-live="polite">' + esc(statusText()) + '</p></div>' +
      '<div role="tabpanel" id="pc-pane-live" aria-labelledby="pc-tab-live" class="pc-pane" hidden>' + liveHtml() + '</div></div>' +
      '<div class="pc-foot"><div class="pc-act"><button type="button" class="pc-btn pc-btn--fill" data-pc="save">' + H('modal.save') + '</button>' +
      '<button type="button" class="pc-btn pc-btn--ghost" data-pc="accept">' + H('banner.accept') + '</button>' +
      '<button type="button" class="pc-btn pc-btn--ghost" data-pc="reject">' + H('banner.reject') + '</button></div>' +
      '<p class="pc-copy"><a href="' + REPO + '" target="_blank" rel="noopener">PsyGioX Cookies</a> v' + VERSION + ' · © 2026 PsyGioX · GPL-3.0</p></div></div>';
  }
  function liveHtml() {
    return '<div class="pc-live"><div class="pc-lh"><h3 class="pc-h3">' + H('live.title') + '</h3><span class="pc-badge pc-badge--' + esc(cfg.guard) + '">' + H('live.guard', { mode: cfg.guard }) + '</span></div>' +
      '<p class="pc-total" data-live="total"></p><div class="pc-stats" data-live="stats"></div>' +
      '<div class="pc-ctl"><button type="button" class="pc-btn pc-btn--ghost pc-btn--sm" data-pc="live-pause"></button><button type="button" class="pc-btn pc-btn--ghost pc-btn--sm" data-pc="live-clear">' + H('live.clear') + '</button></div>' +
      '<div class="pc-tw"><table class="pc-tbl"><thead><tr><th>' + H('live.col.name') + '</th><th>' + H('live.col.cat') + '</th><th>' + H('live.col.status') + '</th><th>' + H('live.col.size') + '</th><th>' + H('live.col.time') + '</th></tr></thead><tbody data-live="rows"></tbody></table></div>' +
      '<h3 class="pc-h3">' + H('live.log') + '</h3><ol class="pc-log" data-live="log" role="log" aria-live="off"></ol><p class="pc-small">' + H('live.hint') + '</p></div>';
  }
  function fillLive(v, flash) {
    var live = qs(v, '.pc-live'); if (!live) return;
    var list = jarList(), s = stats(), f = function (k) { return qs(live, '[data-live="' + k + '"]'); };
    f('total').textContent = T('live.total', { n: s.present });
    f('stats').innerHTML = [['allowed', s.allowed, 'ok'], ['blocked', s.blocked + s.purged, 'bad'], ['unknown', s.unknown, 'mute'], ['violation', s.violations, 'warn']].map(function (x) {
      return '<div class="pc-stat pc-stat--' + x[2] + '"><b>' + nf(x[1]) + '</b><span>' + H('stat.' + x[0]) + '</span></div>';
    }).join('');
    qs(live, '[data-pc="live-pause"]').textContent = T(S.paused ? 'live.resume' : 'live.pause');
    f('rows').innerHTML = list.length ? list.map(function (j) {
      return '<tr class="pc-r pc-s-' + j.st + (flash && j.fl ? ' pc-flash' : '') + '"><th scope="row" class="pc-n">' + esc(j.n) + '</th><td><span class="pc-chip pc-c-' + esc(j.k.cat) + '">' + esc(catLabel(j.k.cat)) + '</span>' +
        (j.k.vendor ? '<small>' + esc(j.k.vendor) + '</small>' : '') + '</td><td><span class="pc-st">' + H('st.' + j.st) + '</span></td><td>' + (j.size ? nf(j.size) + ' B' : '—') + '</td><td data-ts="' + j.t + '">' + esc(rel(j.t)) + '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="pc-empty">' + H('live.empty') + '</td></tr>';
    f('log').innerHTML = evlog.slice(0, 40).map(function (e) {
      return '<li class="pc-lg pc-lg--' + e.type + '"><time data-ts="' + e.t + '" title="' + esc(rel(e.t)) + '">' + esc(fmtTime(e.t)) + '</time><span class="pc-lt">' + H('ev.' + e.type) + '</span><code>' + esc(e.name) + '</code>' +
        (e.vendor ? '<em>' + esc(e.vendor) + '</em>' : '') + '</li>';
    }).join('');
  }
  function visible(v) { return v.isConnected !== false && !v.closest('[hidden]'); }
  function refreshLive() {
    if (S.paused) return;
    views = views.filter(function (v) { return v.isConnected !== false; });
    var any = false;
    views.forEach(function (v) { if (visible(v)) { fillLive(v, true); any = true; } });
    jarList().forEach(function (j) { j.fl = 0; });
    if (any) ensureTick();
  }
  function refreshCatLists() {
    if (!S.built) return;
    qsa(S.modal, '[data-cat-list]').forEach(function (ul) {
      var id = ul.getAttribute('data-cat-list');
      var items = jarList().filter(function (j) { return !j.gone && j.k.cat === id; });
      ul.innerHTML = items.length ? items.map(function (j) { return '<li><code>' + esc(j.n) + '</code>' + (j.k.vendor ? ' <small>' + esc(j.k.vendor) + '</small>' : '') + '</li>'; }).join('') : '<li class="pc-none">' + H('cat.none') + '</li>';
    });
  }
  function ensureTick() {
    if (S.tick) return;
    S.tick = setInterval(function () {
      var vis = views.filter(visible);
      if (!vis.length || doc.hidden) { if (!vis.length) { clearInterval(S.tick); S.tick = 0; } return; }
      if (S.paused) return;
      vis.forEach(function (v) { qsa(v, '.pc-tbl [data-ts]').forEach(function (c) { c.textContent = rel(+c.getAttribute('data-ts')); }); });
    }, 1000);
  }

  /* ============================== UI: build / render / behaviour ============================== */
  function pos() {
    var p = String(cfg.position || 'bottom'), v = p.indexOf('top') === 0 ? 'top' : p === 'center' ? 'center' : 'bottom';
    var h = /left/.test(p) ? 'left' : /right/.test(p) ? 'right' : 'center';
    return { v: v, h: h };
  }
  function layout() {
    if (cfg.layout && cfg.layout !== 'auto') return cfg.layout;
    var p = pos(); return p.v === 'center' ? 'center' : p.h === 'center' ? 'bar' : 'box';
  }
  function applyRoot(r) {
    r.setAttribute('data-theme', typeof cfg.theme === 'string' ? cfg.theme : 'auto');
    r.setAttribute('lang', S.lang); r.setAttribute('dir', RTL.test(S.lang.split('-')[0]) ? 'rtl' : 'ltr');
    r.style.setProperty('--pc-z', cfg.zIndex);
    Object.keys(cfg.tokens || {}).forEach(function (k) { r.style.setProperty('--pc-' + kebab(k), cfg.tokens[k]); });
  }
  function build() {
    if (S.built) return;
    S.built = true;
    var r = S.root = mk('div', 'pc-root'); r.setAttribute('data-pc-copyright', '© 2026 PsyGioX · GPL-3.0-only · ' + REPO);
    S.overlay = mk('div', 'pc-overlay'); S.overlay.hidden = true;
    S.banner = mk('div', 'pc-banner'); S.banner.hidden = true;
    S.modal = mk('div', 'pc-modal'); S.modal.hidden = true; S.modal.setAttribute('role', 'dialog'); S.modal.setAttribute('aria-modal', 'true'); S.modal.setAttribute('aria-labelledby', 'pc-mt');
    S.fab = mk('button', 'pc-fab'); S.fab.type = 'button'; S.fab.hidden = true; S.fab.setAttribute('data-pc', 'settings');
    [S.overlay, S.banner, S.modal, S.fab].forEach(function (n) { r.appendChild(n); });
    doc.body.appendChild(r);
    renderAll();
    doc.addEventListener('click', onClick); doc.addEventListener('keydown', onKey); doc.addEventListener('change', onChange);
    if (win.ResizeObserver) { S.ro = new win.ResizeObserver(measure); S.ro.observe(S.banner); }
  }
  function renderAll() {
    if (!S.built) return;
    var wasOpen = !S.modal.hidden, tab = S.tab || 'prefs', bannerOn = !S.banner.hidden;
    if (wasOpen) S.pend = readToggles();
    applyRoot(S.root);
    var p = pos(), b = S.banner, lay = layout();
    b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', lay === 'center' ? 'true' : 'false'); b.setAttribute('aria-labelledby', 'pc-bt'); b.setAttribute('aria-describedby', 'pc-bd');
    b.setAttribute('data-layout', lay); b.setAttribute('data-v', p.v); b.setAttribute('data-h', p.h); b.setAttribute('data-anim', cfg.animation);
    b.innerHTML = bannerHtml();
    S.modal.innerHTML = modalHtml();
    S.fab.setAttribute('aria-label', T('fab.label')); S.fab.title = T('fab.label'); S.fab.innerHTML = FAB; S.fab.setAttribute('data-h', cfg.fabPosition);
    views = views.filter(function (v) { return v.__embed; }); views.unshift(qs(S.modal, '.pc-live'));
    phs.forEach(fillPlaceholder);
    selectTab(wasOpen ? tab : 'prefs');
    refreshCatLists(); refreshLive();
    b.hidden = !bannerOn; renderState();
  }
  function renderState() {
    S.fab.hidden = !(cfg.fab !== false && S.banner.hidden && S.built);
    var st = qs(S.modal, '#pc-status'); if (st) st.textContent = statusText();
  }
  function measure() { doc.documentElement.style.setProperty('--pc-bh', (S.banner.hidden ? 0 : S.banner.offsetHeight) + 'px'); }
  function showBanner(on) {
    if (!S.built) return;
    var changed = S.banner.hidden === on;
    S.banner.hidden = !on; S.overlay.hidden = !(on && layout() === 'center');
    doc.documentElement.classList.toggle('pc-has-banner', on); measure(); renderState();
    if (on && layout() === 'center') { S.last = doc.activeElement; var f = qs(S.banner, 'button'); if (f) f.focus(); }
    if (changed) emit(on ? 'open' : 'close', { view: 'banner' });
  }
  function selectTab(t) {
    S.tab = t === 'live' ? 'live' : 'prefs';
    ['prefs', 'live'].forEach(function (n) {
      var tb = qs(S.modal, '#pc-tab-' + n), pn = qs(S.modal, '#pc-pane-' + n), act = n === S.tab;
      tb.setAttribute('aria-selected', act ? 'true' : 'false'); tb.tabIndex = act ? 0 : -1; pn.hidden = !act;
    });
    if (S.tab === 'live') { fillLive(qs(S.modal, '.pc-live'), false); ensureTick(); }
  }
  function openModal(tab) {
    if (!S.built) { S.want = tab; return; }
    S.last = doc.activeElement; S.pend = null;
    var was = S.modal.hidden;
    S.modal.innerHTML = modalHtml();
    views = views.filter(function (v) { return v.__embed; }); views.unshift(qs(S.modal, '.pc-live'));
    selectTab(tab || 'prefs'); refreshCatLists();
    S.modal.hidden = false; doc.documentElement.classList.add('pc-lock');
    qs(S.modal, '.pc-panel').focus();
    if (was) emit('open', { view: tab === 'live' ? 'live' : 'settings' });
  }
  function closeModal(silent) {
    if (!S.built || S.modal.hidden) return;
    S.modal.hidden = true; doc.documentElement.classList.remove('pc-lock');
    if (!silent && S.last && S.last.focus) S.last.focus();
    emit('close', { view: 'settings' });
  }
  function readToggles() {
    var o = {};
    qsa(S.modal, 'input[data-pc-cat]').forEach(function (i) { o[i.getAttribute('data-pc-cat')] = i.checked; });
    return o;
  }
  function onChange(e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-pc-cat') && S.modal.contains(t)) S.pend = readToggles();
  }
  function allOf(v) { var o = {}; cats().forEach(function (c) { o[c.id] = v; }); return o; }
  function onClick(e) {
    var t = e.target, el = t && t.closest ? t.closest('[data-pc],[data-pc-open],[data-pc-tab]') : null;
    if (!el) return;
    if (el.hasAttribute('data-pc-open')) { e.preventDefault(); api.open(el.getAttribute('data-pc-open') || 'settings'); return; }
    if (el.hasAttribute('data-pc-tab')) { selectTab(el.getAttribute('data-pc-tab')); return; }
    var a = el.getAttribute('data-pc');
    if (a === 'accept') commit(allOf(true), S.modal.hidden ? 'banner' : 'settings');
    else if (a === 'reject') commit(allOf(false), S.modal.hidden ? 'banner' : 'settings');
    else if (a === 'save') commit(readToggles(), 'settings');
    else if (a === 'settings') openModal('prefs');
    else if (a === 'close') closeModal();
    else if (a === 'live-pause') { S.paused = !S.paused; if (!S.paused) refreshLive(); else views.forEach(function (v) { var b = qs(v, '[data-pc="live-pause"]'); if (b) b.textContent = T('live.resume'); }); }
    else if (a === 'live-clear') { evlog = []; refreshLive(); }
  }
  function focusables(root) {
    return qsa(root, 'button:not([disabled]),a[href],input:not([disabled]),summary').filter(function (n) { return n.offsetParent !== null; });
  }
  function onKey(e) {
    var trapIn = !S.modal.hidden ? S.modal : (!S.banner.hidden && layout() === 'center' ? S.banner : null);
    if (e.key === 'Escape' && !S.modal.hidden) { closeModal(); return; }
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-pc-tab') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var n = t.getAttribute('data-pc-tab') === 'prefs' ? 'live' : 'prefs'; selectTab(n); qs(S.modal, '#pc-tab-' + n).focus(); return;
    }
    if (e.key !== 'Tab' || !trapIn) return;
    var f = focusables(trapIn); if (!f.length) return;
    var first = f[0], last = f[f.length - 1], panel = qs(trapIn, '.pc-panel');
    if (e.shiftKey && (doc.activeElement === first || doc.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ============================== lifecycle ============================== */
  function detectRegion() {
    var z = ''; try { z = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    if (RU_TZ.test(z)) return 'ru';
    if (/^Europe\//.test(z) || /^Atlantic\/(Azores|Madeira|Canary|Faroe|Reykjavik)$/.test(z)) return 'eu';
    if (US_TZ.test(z)) return 'us';
    return 'global';
  }
  function normalizeCategories() {
    cfg.categories = (cfg.categories || []).map(function (c) { return typeof c === 'string' ? { id: c } : c; }).filter(function (c) { return c && c.id; });
    if (!cfg.categories.some(function (c) { return c.id === 'necessary'; })) cfg.categories.unshift({ id: 'necessary', required: true });
    cfg.categories.forEach(function (c) {
      if (c.id === 'necessary') c.required = true;
      if (c.labels) Object.keys(c.labels).forEach(function (l) {
        var m = {}, x = c.labels[l];
        if (x.title) m['cat.' + c.id + '.title'] = x.title;
        if (x.desc) m['cat.' + c.id + '.desc'] = x.desc;
        I.add(l, m, true);
      });
    });
  }
  function prep() {
    normalizeCategories();
    var r = String(cfg.region || 'auto').toLowerCase(); if (r === 'auto') r = detectRegion(); if (!PROFILES[r]) r = 'global';
    S.region = r; S.prof = merge(merge({}, PROFILES[r]), (cfg.profiles && cfg.profiles[r]) || {});
    S.gpc = cfg.gpc === 'auto' ? !!nav.globalPrivacyControl : !!cfg.gpc;
    S.lang = detectLang(); compileRules(); S.consent = loadConsent();
  }
  function fromAttrs(el) {
    var o = {};
    if (!el) return o;
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i]; if (a.name.indexOf('data-') !== 0) continue;
      var k = camel(a.name.slice(5)), p = ALIAS[k] || k;
      if (!(p.split('.')[0] in DEFAULTS)) continue;
      var v = a.value; v = (v === '' || v === 'true') ? true : v === 'false' ? false : /^-?\d+(\.\d+)?$/.test(v) ? +v : /^[\[{]/.test(v) ? (function () { try { return JSON.parse(v); } catch (e) { return v; } })() : v;
      var parts = p.split('.'), t = o;
      for (var j = 0; j < parts.length - 1; j++) t = t[parts[j]] = t[parts[j]] || {};
      t[parts[parts.length - 1]] = v;
    }
    return o;
  }
  function loadCss() {
    if (cfg.css === 'none' || doc.querySelector('link[data-pc-css],style[data-pc-css]')) return;
    var host = doc.head || doc.documentElement;
    if (win.__pcCSS) { var s = mk('style'); s.setAttribute('data-pc-css', ''); if (cfg.nonce) s.nonce = cfg.nonce; s.textContent = win.__pcCSS; host.appendChild(s); return; }
    var href = cfg.css !== 'auto' ? cfg.css : (cur && cur.src ? cur.src.replace(/\.js(\?.*)?$/, '.css$1') : '');
    if (!href) return;
    var l = mk('link'); l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-pc-css', ''); host.appendChild(l);
  }
  function remoteConfig() {
    try {
      win.fetch(cfg.configUrl, { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (j) { configure(j); }).catch(function () { /* keep local config */ });
    } catch (e) { /* no fetch */ }
  }
  function configure(p) {
    if (p) merge(cfg, p);
    prep(); ensureLang();
    if (cfg.guard !== 'off' || cfg.monitor) { patch(); startMonitor(); }
    if (S.built) {
      renderAll(); activate(); gcm('default', true); if (S.consent) gcm('update');
      if (S.consent) showBanner(false); else showBanner(true);
    }
    emit('configure', clone(cfg));
    return api;
  }
  function ready() {
    build(); observe(); activate();
    if (S.consent) { renderState(); pushLayer(); } else showBanner(true);
    emit('ready', { region: S.region, lang: S.lang, consent: api.consent() });
    if (S.want) { var w = S.want; S.want = null; openModal(w); }
  }
  function start(extra) {
    if (S.started) { if (extra) configure(extra); return api; }
    S.started = true;
    merge(cfg, win.PsyCookiesConfig || {}); merge(cfg, fromAttrs(cur)); if (extra) merge(cfg, extra);
    prep(); loadCss();
    if (cfg.guard !== 'off' || cfg.monitor) { patch(); startMonitor(); }
    gcm('default', true); if (S.consent) gcm('update');
    ensureLang();
    if (cfg.configUrl) remoteConfig();
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', ready); else ready();
    return api;
  }
  function destroy() {
    stopMonitor(); unpatch();
    if (S.mo) S.mo.disconnect();
    if (S.ro) S.ro.disconnect();
    clearInterval(S.tick);
    doc.removeEventListener('click', onClick); doc.removeEventListener('keydown', onKey); doc.removeEventListener('change', onChange);
    if (S.root && S.root.parentNode) S.root.parentNode.removeChild(S.root);
    doc.documentElement.classList.remove('pc-has-banner', 'pc-lock');
    S.built = false; S.started = false; S.mo = null; S.ro = null; S.tick = 0;
  }

  /* ============================== public API ============================== */
  var api = win.PsyCookies = {
    __pc: 1, version: VERSION, license: 'GPL-3.0-only', copyright: '© 2026 PsyGioX', repository: REPO,
    init: function (c) { return start(c); },
    configure: configure,
    config: function (path) { var v = path ? path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, cfg) : cfg; return clone(v); },
    region: function () { return S.region; },
    profile: function () { return merge({ region: S.region }, S.prof); },
    open: function (view) { view = view || 'settings'; if (view === 'banner') { showBanner(true); return; } openModal(view === 'live' ? 'live' : 'prefs'); },
    close: function () { closeModal(); if (S.consent) showBanner(false); },
    accept: function () { return commit(allOf(true), 'api'); },
    reject: function () { return commit(allOf(false), 'api'); },
    set: function (choices) { return commit(merge(snapshot(), choices || {}), 'api'); },
    consent: function () {
      var c = S.consent; if (!c) return null;
      return { version: c.v, date: c.t, region: c.r, id: c.id, gpc: !!c.g, categories: snapshot() };
    },
    allowed: allowed,
    reset: function () {
      clearConsent(); S.consent = null; S.pend = null; gcm('default', true); pushLayer();
      if (S.built) { renderState(); showBanner(true); }
      scan('reset'); emit('reset', {});
    },
    destroy: destroy,
    on: on, off: off, once: once,
    i18n: I,
    theme: {
      set: function (t) {
        if (typeof t === 'string') cfg.theme = t; else if (isObj(t)) merge(cfg.tokens, t);
        if (S.built) { applyRoot(S.root); phs.forEach(applyRoot); views.forEach(function (v) { if (v.__embed) applyRoot(v); }); }
        return api;
      },
      get: function () { return { theme: cfg.theme, tokens: clone(cfg.tokens) }; }
    },
    categories: {
      list: function () { return clone(cats()); },
      add: function (def) {
        if (!def || !def.id || catDef(def.id)) return api;
        cfg.categories.push(clone(def)); normalizeCategories(); if (S.built) renderAll(); return api;
      },
      remove: function (id) { cfg.categories = cfg.categories.filter(function (c) { return c.id !== id || c.required; }); if (S.built) renderAll(); return api; }
    },
    cookies: {
      list: function () {
        return jarList().map(function (j) {
          return { name: j.n, category: j.k.cat, vendor: j.k.vendor, status: j.st, present: !j.gone, size: j.size, changes: j.c, firstSeen: j.t0, lastChange: j.t, expires: j.exp };
        });
      },
      classify: function (name) { var k = classify(name); return { category: k.cat, vendor: k.vendor }; },
      rule: function (match, category, vendor) { apiRules.unshift({ match: match, category: category, vendor: vendor }); compileRules(); scan('rule'); return api; },
      remove: function (name) { var ok = purge(name); scan('api'); return ok; },
      stats: stats,
      scan: function () { scan('api'); return stats(); }
    },
    live: {
      start: startMonitor, stop: stopMonitor,
      pause: function () { S.paused = true; }, resume: function () { S.paused = false; refreshLive(); },
      log: function () { return evlog.slice(); },
      clear: function () { evlog = []; refreshLive(); },
      mount: function (target) {
        var el = typeof target === 'string' ? doc.querySelector(target) : target; if (!el) return function () {};
        el.classList.add('pc-root', 'pc-embed'); el.__embed = true; applyRoot(el); el.innerHTML = liveHtml();
        views.push(el); fillLive(el, false); ensureTick();
        return function () { views = views.filter(function (v) { return v !== el; }); el.innerHTML = ''; el.__embed = false; };
      }
    }
  };

  if (!cur || !cur.hasAttribute('data-manual')) { if (!win.PsyCookiesConfig || !win.PsyCookiesConfig.manual) start(); }
})(window, document);
