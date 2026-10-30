/*
 * PGX Cookies Widget — service worker (offline shell for the project site)
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 *
 * BUILD is rewritten by `npm run build:widget` (version + hash of dist/SHA256SUMS),
 * so installed copies refresh whenever the widget changes.
 */
const BUILD = 'v1.0.1-b22248bf4a';
const CACHE = 'pgx-cookies-' + BUILD;
const SHELL = [
  '/', '/en/', '/offline.html', '/assets/site.css', '/assets/site.js', '/assets/brand/logo.svg',
  '/assets/fonts/titan-one-latin-400-normal.woff2', '/assets/fonts/nunito-cyrillic-900-normal.woff2', '/assets/fonts/nunito-latin-900-normal.woff2',
  '/widget/dist/psygiox-cookies.min.js', '/widget/dist/psygiox-cookies.min.css', '/widget/dist/integrity.json',
  '/favicon.svg', '/icon-192.png', '/manifest.webmanifest',
];
const FRESH = /\/widget\/dist\/(SHA256SUMS|integrity\.json)$/; // hashes must never be stale
const SKIP = /\.zip$/;                                            // big downloads stay online-only

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('pgx-cookies-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener('fetch', (event) => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || SKIP.test(url.pathname) || url.pathname.startsWith('/api/')) return;  // live counters are never cached

  if (req.mode === 'navigate') {                       // pages: network first, offline fallback
    event.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match(req).then((m) => m || caches.match('/offline.html'))));
    return;
  }
  if (FRESH.test(url.pathname)) {                      // network first, cache as a fallback
    event.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => {  // everything else: stale-while-revalidate
    const net = fetch(req).then((r) => put(req, r)).catch(() => hit);
    return hit || net;
  }));
});
