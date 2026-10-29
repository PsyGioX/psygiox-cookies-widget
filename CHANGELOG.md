<!-- PGX Cookies Widget · Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX> · SPDX-License-Identifier: GPL-3.0-only -->
# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/) · Versioning: [SemVer](https://semver.org/).

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
- Project site (RU/EN), PWA, favicons, SEO, JSON schema, examples, 37 tests, CI, release workflow.
- PsyGioX copyright and GPL-3.0-only notice in every file and in the widget dialog.
