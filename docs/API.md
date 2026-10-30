<!--
  PGX Cookies Widget — API reference
  Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
  SPDX-License-Identifier: GPL-3.0-only
-->
# API reference

Russian version: [API.ru.md](API.ru.md) · Back to the [README](../README.md)

Global object: **`window.PsyCookies`** · properties `version`, `license`, `copyright`, `repository`.

## 1. Where options come from

Later sources win: built-in defaults → `window.PsyCookiesConfig` (set before the script) → `data-*` attributes on the script tag → `PsyCookies.init(config)` → `PsyCookies.configure(patch)` → remote JSON (`configUrl`).

`data-*` names are the camelCase option names in kebab-case: `data-fallback-lang`, `data-z-index`, `data-config-url`. Shortcuts: `data-policy`, `data-privacy`, `data-consent` → `links.*`. Values are parsed (`true`, `false`, numbers, JSON for `{…}`/`[…]`). `data-manual` (or `PsyCookiesConfig.manual = true`) stops the automatic start — call `PsyCookies.init()` yourself.

## 2. Options

| Option | Default | Meaning |
|---|---|---|
| `version` | `'1'` | Policy version. A different value invalidates saved consent (everybody is asked again). |
| `region` | `'auto'` | `auto` · `eu` · `us` · `ru` · `global`. `auto` uses the browser time zone (heuristic). |
| `lang` | `'auto'` | `auto` (`<html lang>`, then `navigator.languages`) or any tag (`de`, `pt-BR`). |
| `fallbackLang` | `'en'` | Used for missing keys. |
| `i18nBase` | script folder + `i18n/` | Where lazy language packs live. |
| `theme` | `'auto'` | `auto` · `light` · `dark` · `contrast`. |
| `tokens` | `{}` | Design tokens → CSS variables `--pc-*` (see §6). |
| `position` | `'bottom'` | `bottom` `top` `bottom-left` `bottom-right` `top-left` `top-right` `center`. |
| `layout` | `'auto'` | `auto` · `bar` · `box` · `center`. `auto`: bottom/top → bar, corners → box, center → centred dialog with overlay. |
| `animation` | `'slide'` | `slide` · `fade` · `none` (also respects `prefers-reduced-motion`). |
| `fab` | `true` | Floating “cookie settings” button after the choice. |
| `fabPosition` | `'left'` | `left` · `right`. |
| `zIndex` | `2147483000` | Base z-index. |
| `operator` | `''` | Legal name of the site operator, shown in the settings dialog. |
| `links` | `{policy:'',privacy:'',consent:''}` | URLs shown as links. Empty = hidden. `consent` is the consent text (152-FZ). |
| `categories` | necessary, functional, analytics, marketing (`sale: true`) | Array of ids or objects `{ id, required?, sale?, title?, desc?, labels? }`. |
| `profiles` | `{}` | Override fields of a profile: `{ us: { defaults: ['functional'], ttl: 180 } }`. |
| `ttl` | `0` | Consent lifetime in days; `0` = profile default (eu/global 180, us/ru 365). |
| `guard` | `'enforce'` | Cookie Guard: `off` · `warn` (report only) · `enforce` (block and delete). |
| `monitor` | `true` | Real-time tracking. Also on whenever `guard` ≠ `off`. |
| `pollMs` | `1000` | Fallback check interval (slower when the Cookie Store API exists). |
| `logSize` | `100` | Max events kept for the live log. |
| `cookieRules` | `[]` | `[{ match: '^regex', category, vendor? }]`. |
| `gcm` | `true` | Google Consent Mode v2 (`gtag('consent', …)`). Set `false` if you do not use Google tags. |
| `dataLayer` | `true` | Push `{ event: 'psygiox_consent', psygioxConsent: {…} }`. |
| `honorGPC` | `true` | Respect Global Privacy Control. In the `us` profile it **locks** categories with `sale: true`. |
| `gpc` | `'auto'` | `auto` · `true` · `false` — force the GPC flag (handy for demos). |
| `receipt` | `''` | URL that receives anonymous consent receipts (§5). |
| `cookie` | `{name:'psygiox_consent',domain:'',path:'/',sameSite:'Lax'}` | The consent cookie. Set `domain` to share it between sub-domains. |
| `reload` | `'auto'` | After a withdrawal: `auto` (only if scripts of that category were activated on this page) · `true` · `false`. |
| `css` | `'auto'` | `auto` (next to the script, or inline for the bundle) · `none` · URL. |
| `nonce` | `''` | CSP nonce for injected `<style>`/`<script>` (the bundle’s inline CSS needs it with a strict `style-src`). |
| `configUrl` | `''` | JSON file fetched at start and merged with `configure()`. |
| `manual` | `false` | Do not start automatically. |
| `debug` | `false` | Print errors thrown by your event handlers. |

## 3. Methods

```text
PsyCookies.init(config?)            start (once); later calls act like configure()
PsyCookies.configure(patch)         merge options at runtime and re-render
PsyCookies.config(path?)            read a copy of the config, e.g. config('links.policy')
PsyCookies.region() / profile()     current region id / merged profile object

PsyCookies.open(view?)              'settings' (default) · 'live' · 'banner'
PsyCookies.close()
PsyCookies.accept() / reject()      all / only necessary
PsyCookies.set({ analytics: true }) change some categories, keep the others
PsyCookies.consent()                null or { version, date, region, id, gpc, categories }
PsyCookies.allowed('marketing')     boolean, effective state (also before a choice)
PsyCookies.reset()                  forget the choice and show the banner again
PsyCookies.destroy()                remove UI, listeners and the document.cookie wrapper

PsyCookies.on(event, fn) · off(event, fn?) · once(event, fn)

PsyCookies.theme.set('dark' | { accent: '#f60' }) · theme.get()
PsyCookies.categories.list() · add(def) · remove(id)
PsyCookies.cookies.list()           [{ name, category, vendor, status, present, size, changes, firstSeen, lastChange, expires }]
PsyCookies.cookies.classify(name)   { category, vendor }
PsyCookies.cookies.rule(re, category, vendor?)
PsyCookies.cookies.remove(name)     delete everywhere it can be deleted from JS
PsyCookies.cookies.stats() · scan() counters / force a check
PsyCookies.live.start() · stop() · pause() · resume() · clear() · log()
PsyCookies.live.mount(el | selector) → unmount()   embeddable real-time panel
PsyCookies.i18n.add(lang, messages) · set(lang) · get() · t(key, vars) · has(lang) · available() · load(lang, url?)
```

Cookie `status` values: `necessary` · `allowed` · `unknown` (not classified, never touched) · `violation` (no consent, `guard: 'warn'`) · `blocked` (write refused) · `deleted` (removed by the guard) · `removed` (removed by the site).

## 4. Events

`PsyCookies.on(name, fn)`; the same events are dispatched on `window` as `psygiox-cookies:<name>` (`detail` = payload).

| Event | Payload |
|---|---|
| `ready` | `{ region, lang, consent }` |
| `consent` | `{ source: 'banner'\|'settings'\|'api', first, categories, granted[], revoked[], consent }` — every decision |
| `change` | same payload, only when something was granted or revoked |
| `cookie` | `{ t, type: 'set'\|'update'\|'delete'\|'block'\|'purge', name, category, vendor, source }` — real time |
| `violation` | `{ name, category, vendor, action: 'block'\|'enforce'\|'warn' }` |
| `open` / `close` | `{ view: 'banner'\|'settings'\|'live' }` |
| `lang` · `configure` · `reset` | new language · config copy · `{}` |

## 5. Server side

**Consent cookie** `psygiox_consent` — URL-encoded JSON (HTTP-readable, `SameSite=Lax`, `Secure` on HTTPS):

```json
{ "v": "1", "t": 1790000000000, "r": "eu", "id": "6b1f…", "g": 0, "c": { "functional": 0, "analytics": 1, "marketing": 0 } }
```

```js
// Node
const c = JSON.parse(decodeURIComponent(req.cookies.psygiox_consent || 'null'));
if (c?.c.analytics) renderAnalytics();
```
```php
// PHP
$c = json_decode(urldecode($_COOKIE['psygiox_consent'] ?? 'null'), true);
if (!empty($c['c']['analytics'])) { /* … */ }
```

**Receipts** (`receipt: '/api/consent'`) — POST, body is JSON sent as `text/plain;charset=UTF-8` (no CORS pre-flight), via `sendBeacon` or `fetch(..., { keepalive: true })`, **without** cookies:

```json
{ "id": "6b1f…", "ts": 1790000000000, "kind": "first", "version": "1", "region": "eu", "lang": "de",
  "categories": { "functional": 0, "analytics": 1, "marketing": 0 }, "gpc": false, "origin": "https://example.com", "widget": "1.0.1" }
```
The IP address and user agent are what *your* server sees; the widget adds nothing else.

**Google Consent Mode v2** — `default` (with `wait_for_update: 500`) is sent at start, `update` after each decision:
`analytics` → `analytics_storage` · `marketing` → `ad_storage`, `ad_user_data`, `ad_personalization` · `functional` → `functionality_storage`, `personalization_storage` · `security_storage` is always granted.

## 6. Customisation

**Tokens** (`tokens` / `theme.set({…})`) → CSS variables: `bg fg muted line surface accent accentFg focus ok okBg bad badBg warn warnBg flash radius font shadow backdrop` (camelCase → `--pc-accent-fg`). Presets: `light`, `dark`, `contrast`, `auto` (follows `prefers-color-scheme`). Accept and Reject always share one style — by design, to avoid dark patterns.

**Categories**
```js
PsyCookies.categories.add({ id: 'chat', labels: { en: { title: 'Live chat', desc: 'Support widget' }, de: { title: 'Live-Chat' } } });
PsyCookies.cookies.rule('^chat_', 'chat', 'MyChat');      // now the Guard enforces it too
```
Classification order: `cookieRules` → rules added by `cookies.rule()` (newest first) → built-in base (Google, Meta, Yandex, Microsoft, TikTok, LinkedIn, Hotjar, Matomo, HubSpot, Stripe, Cloudflare, WordPress, …). Anything unclassified is `unknown` and is **never** blocked.

**Script / iframe gate**
```html
<script type="text/plain" data-pc-category="analytics" src="https://example.com/tag.js"></script>
<script type="text/plain" data-pc-category="analytics" data-pc-type="module">/* inline */</script>
<iframe data-pc-category="marketing" data-pc-src="https://www.youtube.com/embed/ID" title="Video"></iframe>
```
Allowed → the tag is re-created and runs (order preserved); blocked iframes show a placeholder with a settings button. Tags added later by scripts are handled too.

**Open the dialog from anywhere:** `<a href="#" data-pc-open>…</a>` (`data-pc-open="live"` opens the live tab).

## 7. Cookie Guard in detail

- `enforce`: a `document.cookie` write for a category that is not allowed is **refused**; cookies of such categories that appear in any other way are **deleted** (all domain/path variants are tried). On withdrawal, cookies and matching `localStorage`/`sessionStorage` keys of the category are purged.
- Only what JavaScript can see is handled. HttpOnly cookies are invisible; server `Set-Cookie` headers must be controlled by your server (read the consent cookie).
- Values are never displayed, logged or stored — only a hash to detect changes.

## 8. i18n

Messages are flat keys → string or plural object.

```js
PsyCookies.i18n.add('pl', {
  'banner.accept': 'Akceptuję wszystkie',
  'banner.reject@us': 'Reject non-essential',          // key@region wins over key
  'live.total': { one: '{n} plik cookie', few: '{n} pliki cookie', many: '{n} plików cookie', other: '{n} pliku cookie' }
});
```

- Placeholders `{name}`; `{n}` is formatted with `Intl.NumberFormat`; array values are joined with `Intl.ListFormat`; in HTML messages `**bold**` becomes `<b>`; all values are HTML-escaped.
- Plural objects use `Intl.PluralRules` categories (`zero one two few many other`); missing → `other`.
- Lookup per key: for each language in the chain (`pt-BR` → `pt` → `fallbackLang` → `en`): `key@region`, then `key`.
- A pack file is `(window.__pcL = window.__pcL || []).push(['xx', { … }])` — usable before or after the core. Languages not bundled are fetched from `i18nBase`; `i18n.load('xx', url)` loads from anywhere.
- All keys: [`widget/src/i18n/en.js`](../widget/src/i18n/en.js).

## 9. Build outputs

`widget/dist/`: `psygiox-cookies.min.js` (core + ru/en), `psygiox-cookies.min.css`, `psygiox-cookies.bundle.min.js` (all languages + CSS inside), `i18n/*.min.js`, `SHA256SUMS`, `integrity.json` (sha256/384/512 + SRI), the archive, and the immutable `v<version>/` copy. Pin `v<version>/` + SRI in production.
