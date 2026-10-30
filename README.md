<!--
  PGX Cookies Widget — README
  Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
  SPDX-License-Identifier: GPL-3.0-only
-->
<p align="center">
  <img src="assets/brand/logo.png" width="420" alt="PGX Cookies Widget">
</p>

<p align="center">
  <b>Cookie consent with real-time cookie tracking for the EU, US, Russia and the rest of the world.</b><br>
  <a href="https://psygiox-cookies-widget.vercel.app">Live demo</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="docs/API.md">API reference</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <a href="https://github.com/PsyGioX/psygiox-cookies-widget#GPL-3.0-1-ov-file"><img alt="GPL-3.0 license" src="https://img.shields.io/badge/license-GPL--3.0-7dff2e?style=for-the-badge&labelColor=0a0c08"></a>
  <img alt="version 1.0.1" src="https://img.shields.io/badge/version-1.0.1-ffb02e?style=for-the-badge&labelColor=0a0c08">
  <img alt="no runtime dependencies" src="https://img.shields.io/badge/dependencies-0-7dff2e?style=for-the-badge&labelColor=0a0c08">
  <img alt="~17 KB gzip" src="https://img.shields.io/badge/gzip-~17%20KB%20%2B%204%20KB%20CSS-ffb02e?style=for-the-badge&labelColor=0a0c08">
</p>

## Why another cookie banner?

A banner that only *asks* is half the job. **PGX Cookies Widget also watches what your page actually writes and acts on it.**

| | |
|---|---|
| **Cookie Radar** | Real-time tracking of every cookie: new, changed, deleted. Wraps `document.cookie`, listens to the Cookie Store API, shows category, vendor and size. The live panel can be mounted into your own admin page. |
| **Cookie Guard** | No consent — no cookie. Analytics/ad cookies are blocked while they are written and removed if they appear from outside. Modes: `off` · `warn` · `enforce`. |
| **Legal profiles** | `eu` (GDPR/ePrivacy, opt-in), `us` (CCPA/CPRA, opt-out + Global Privacy Control), `ru` (152-FZ, opt-in) and `global` (strict opt-in for LGPD, PIPEDA, UK GDPR, …). |
| **Full API** | Everything is configurable by `data-*` attributes, an object, a remote JSON or code — themes, tokens, layouts, categories, cookie rules, events. |
| **New i18n** | Written from scratch on top of `Intl`: plural forms, lists, dates, relative time, **region variants** (`banner.reject@us`), lazy packs. 9 languages included. |
| **Script gate** | `<script type="text/plain" data-pc-category="analytics">` and `<iframe data-pc-src>` run only after consent. |
| **Consent Mode v2 · GPC · receipts** | Google Consent Mode v2, `dataLayer` events, Global Privacy Control, anonymous consent receipts for your endpoint. |
| **Verifiable builds** | Minified JS/CSS, SHA-256 sums, SRI (sha384), reproducible archive, immutable versioned URLs. |

## Quick start

**1. By link (Vercel / any static host).** Put it as the **first** script in `<head>`:

```html
<script src="https://psygiox-cookies-widget.vercel.app/widget/dist/v1.0.1/psygiox-cookies.min.js"
        integrity="sha384-…"  crossorigin="anonymous"
        data-policy="/cookies" data-privacy="/privacy"></script>

<a href="#" data-pc-open>Cookie settings</a>
```

The exact `integrity` value is in [`widget/dist/integrity.json`](widget/dist/integrity.json) and on the [site](https://psygiox-cookies-widget.vercel.app/#verify). CSS and language packs are loaded automatically from the same folder. One file with everything inside (no extra requests): `psygiox-cookies.bundle.min.js`.

**2. By archive.** Download `psygiox-cookies-widget-1.0.1.zip` from [`widget/dist/`](widget/dist/) or Releases, unpack it to your site and verify:

```bash
unzip psygiox-cookies-widget-1.0.1.zip && cd psygiox-cookies
sha256sum -c SHA256SUMS      # every line must say OK
```

**3. From source.**

```bash
git clone https://github.com/PsyGioX/psygiox-cookies-widget.git && cd psygiox-cookies-widget
npm ci
npm run build     # minify JS/CSS, bundle language packs, hashes, archive, English page, sitemap
npm run verify    # re-check every hash   (npm run verify -- https://HOST/widget/dist  checks a live server)
npm test          # 38 behaviour tests
```

Why first? The widget wraps `document.cookie` when it loads. Scripts that run **before** it can write cookies it never sees.

## Regions

| Profile | Where | Model | Defaults before the choice | Re-ask |
|---|---|---|---|---|
| `eu` | Europe/* time zones | opt-in | only necessary; Accept and Reject look identical | 180 days |
| `us` | US time zones | opt-out | functional + analytics on, sale/sharing off; **GPC locks it**; “Your Privacy Choices” link | 365 days |
| `ru` | Russian time zones | opt-in | only necessary; links to cookie policy, privacy policy and consent text; document version stored | 365 days |
| `global` | everything else | opt-in | only necessary | 180 days |

The region is guessed from the browser time zone — **a heuristic**. When accuracy matters pass it from your server: `data-region="eu"` (for example from Vercel’s `x-vercel-ip-country`). Language is independent of region: a Russian-speaking visitor in Berlin gets the `eu` rules in Russian. Any profile detail can be overridden: `profiles: { us: { defaults: ['functional'] } }`.

## Translations

```js
PsyCookies.i18n.add('de', {
  'banner.title': 'Ihre Privatsphäre ist uns wichtig',
  'banner.reject@us': 'Reject non-essential',        // region variant: key@region
  'live.total': { one: '{n} Cookie auf dieser Seite', other: '{n} Cookies auf dieser Seite' }
});
PsyCookies.i18n.set('de');                            // or data-lang="auto"
```

Included: `ru en` (inside the core file) and `de fr es it pt pl uk` (lazy packs in `i18n/`, or all in the bundle). A pack is one line that pushes into a queue (`window.__pcL`), so the load order does not matter.

## Customisation and API

```html
<script src=".../psygiox-cookies.min.js"
  data-region="eu" data-lang="auto" data-theme="dark" data-position="bottom-right"
  data-guard="enforce" data-receipt="/api/consent"
  data-tokens='{"accent":"#7dff2e","accentFg":"#0a0c08","radius":"20px"}'></script>
```

```js
PsyCookies.configure({ categories: [{ id: 'chat', labels: { en: { title: 'Live chat' } } }],
                       cookieRules: [{ match: '^chat_', category: 'chat', vendor: 'MyChat' }] });
PsyCookies.on('consent', e => console.log(e.granted, e.revoked));
PsyCookies.on('cookie',  e => console.log(e.type, e.name, e.category));   // real time
PsyCookies.live.mount('#cookie-monitor');                                   // embeddable panel
```

Full reference: **[docs/API.md](docs/API.md)** · IDE autocompletion for a remote config: [`widget/schema/config.schema.json`](widget/schema/config.schema.json).

## Repository layout

```
index.html, assets/, en/        landing page (RU) + generated English page, brand and fonts
manifest.webmanifest, sw.js     PWA
widget/src/                     readable sources: psygiox-cookies.js / .css / i18n/*.js
widget/dist/                    built files, SHA256SUMS, integrity.json, archive, v1.0.1/ (immutable; older v*/ stay)
widget/schema/, widget/examples/
scripts/                        build, build-site, verify, check-headers, brand (logo + icons)
test/                           38 tests (jsdom)
docs/API.md                     reference
```

Every project file carries the PsyGioX copyright notice (`npm run headers` enforces it in CI), and the widget shows it in the settings dialog.

## What the widget does *not* do

- It cannot see or delete **HttpOnly** cookies, or stop a `Set-Cookie` header from being sent. Manage those on the server (read the `psygiox_consent` cookie — it is URL-encoded JSON).
- Cookie Guard protects what happens **after** the widget has loaded.
- Cookie signatures are a compact built-in list; add your own with `cookieRules`.
- It is a tool, not legal advice. Texts, periods and the cookie list for your site should be reviewed by a lawyer.

## Brand

The logo is text only and is generated by code: `npm run brand` ([`scripts/brand.mjs`](scripts/brand.mjs)). Letters are outlines of **Titan One** (SIL OFL 1.1); the site self-hosts Titan One and Nunito, see [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt).

## Contributing · Security

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

Copyright (C) 2026 [PsyGioX](https://github.com/PsyGioX). Released under the [GPL-3.0 license](https://github.com/PsyGioX/psygiox-cookies-widget#GPL-3.0-1-ov-file) (`GPL-3.0-only`) — see [LICENSE](LICENSE). If you modify the widget and distribute it, you must publish your changes under the same license.
