<!-- PGX Cookies Widget · Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX> · SPDX-License-Identifier: GPL-3.0-only -->
# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/) · Versioning: [SemVer](https://semver.org/).

## [Unreleased]

## [1.0.1] — 2026-10-30

### Added
- **Live usage on the landing**: a new “Live” section fed by `api/stats.js` — page views, banner choices (accept / custom / reject), cookies stopped by the Guard, a 24-hour chart, regions, languages and a live feed of the last 30 events. Counters only: no cookies, no IP addresses, no user agents, no identifiers. Do Not Track and Global Privacy Control are honoured on the client and on the server; a visitor can also tick “Don’t count my visit”. The tracker imitation that the page starts by itself is not counted. Storage: Upstash Redis / Vercel KV when `UPSTASH_REDIS_REST_URL` + `_TOKEN` (or `KV_REST_API_URL` + `_TOKEN`) are set, otherwise function memory (the section says so). Without the API (any static host) the section falls back to this tab's events.
- 12 tests for the counter (`test/stats.test.mjs`): validation, privacy, abuse limiter, Redis round trip against a fake Upstash server, landing behaviour.

### Fixed
- **Mobile: the page became wider than the screen.** On phones `.btn { width: 100% }` stretched the header buttons (RU, GitHub, Install) and the “Copy” buttons; the header overflowed to ~440 px, the browser widened the layout viewport and the cookie banner / settings dialog were laid out against that wider viewport. The header now fits 320 px (GitHub moved into the menu on narrow screens, the install button is hidden below 420 px), the page clips horizontal overflow (`overflow-x: clip`), and the full navigation appears from 1100 px (it was cut off between 980 and 1023 px).
- Widget CSS: `calc(100vw - 24px)` → `calc(100% - 24px)` for the box and centre layouts (`100vw` includes the scrollbar and follows an over-wide layout viewport).
- The service worker no longer touches `/api/`.

### Changed
- Landing copy no longer says “no analytics”: it now describes the anonymous counter (FAQ “What does this website store?”). Third-party trackers, external fonts and CDNs are still not used.
- `v1.0.0/` is untouched (SRI hashes of existing users stay valid); the changes ship as `v1.0.1/`.

### Changed
- Dev dependencies: jsdom 26 → 30, opentype.js 1.3 → 2.0, esbuild 0.28; GitHub Actions: checkout 4 → 7, setup-node 4 → 7. CI now runs on Node 22 and 24 (jsdom 30 needs Node 22.22.2+).
- `scripts/brand.mjs` has its own SVG path serializer: `Path#toPathData` of opentype.js 2.0 can print `NaN` (the X was missing from the icons). Output is pixel-identical to 1.0.0; a test guards it.

## [1.0.0] — 2026-10-29

First public release — a full rewrite of the original widget.

### Added
- Legal profiles `eu`, `us`, `ru`, `global` with automatic detection and a server override.
- **Cookie Radar**: real-time cookie tracking (`document.cookie` wrapper, Cookie Store API, light polling), live panel in the dialog and `live.mount()`.
- **Cookie Guard** (`off` / `warn` / `enforce`) with a built-in signature base and custom `cookieRules`.
- Full API: `data-*`, `PsyCookiesConfig`, `init()`, `configure()`, remote `configUrl`; themes, tokens, layouts, categories, events.
- New Intl-based translation system: plural forms, lists, dates, region variants (`key@region`), lazy packs. Languages: ru, en, de, fr, es, it, pt, pl, uk.
- Script/iframe gate, Google Consent Mode v2, `dataLayer` events, Global Privacy Control, consent receipts.
- Minified JS/CSS, bundle, SHA-256 sums, SRI, `integrity.json`, reproducible archive, immutable `v1.0.0/` folder.
- Project site (RU/EN), PWA, favicons, SEO, JSON schema, examples, 38 tests, CI, release workflow.
- PsyGioX copyright and GPL-3.0-only notice in every file and in the widget dialog.
