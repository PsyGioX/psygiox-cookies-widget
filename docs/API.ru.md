<!--
  PGX Cookies Widget — справочник API (русский)
  Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
  SPDX-License-Identifier: GPL-3.0-only
-->
# Справочник API

English: [API.md](API.md) · Назад в [README](../README.ru.md)

Глобальный объект: **`window.PsyCookies`** · свойства `version`, `license`, `copyright`, `repository`.

## 1. Откуда берутся опции

Поздние источники важнее: значения по умолчанию → `window.PsyCookiesConfig` (до загрузки скрипта) → `data-*` атрибуты тега скрипта → `PsyCookies.init(config)` → `PsyCookies.configure(patch)` → удалённый JSON (`configUrl`).

Имена `data-*` — это имена опций в kebab-case: `data-fallback-lang`, `data-z-index`, `data-config-url`. Сокращения: `data-policy`, `data-privacy`, `data-consent` → `links.*`. Значения разбираются (`true`, `false`, числа, JSON для `{…}`/`[…]`). `data-manual` (или `PsyCookiesConfig.manual = true`) отключает автозапуск — вызовите `PsyCookies.init()` сами.

## 2. Опции

| Опция | По умолчанию | Назначение |
|---|---|---|
| `version` | `'1'` | Версия политики. Другое значение сбрасывает сохранённое согласие — всех спросят заново. |
| `region` | `'auto'` | `auto` · `eu` · `us` · `ru` · `global`. `auto` — по часовому поясу браузера (эвристика). |
| `lang` | `'auto'` | `auto` (`<html lang>`, затем `navigator.languages`) или любой тег (`de`, `pt-BR`). |
| `fallbackLang` | `'en'` | Язык для отсутствующих ключей. |
| `i18nBase` | папка скрипта + `i18n/` | Где лежат лениво загружаемые языковые пакеты. |
| `theme` | `'auto'` | `auto` · `light` · `dark` · `contrast`. |
| `tokens` | `{}` | Дизайн-токены → CSS-переменные `--pc-*` (см. §6). |
| `position` | `'bottom'` | `bottom` `top` `bottom-left` `bottom-right` `top-left` `top-right` `center`. |
| `layout` | `'auto'` | `auto` · `bar` · `box` · `center`. При `auto`: bottom/top → полоса, углы → карточка, center → диалог по центру с затемнением. |
| `animation` | `'slide'` | `slide` · `fade` · `none` (учитывается и `prefers-reduced-motion`). |
| `fab` | `true` | Плавающая кнопка «Настройки куки-файлов» после выбора. |
| `fabPosition` | `'left'` | `left` · `right`. |
| `zIndex` | `2147483000` | Базовый z-index. |
| `operator` | `''` | Наименование оператора сайта (показывается в окне настроек). |
| `links` | `{policy:'',privacy:'',consent:''}` | Ссылки на документы. Пусто — ссылка скрыта. `consent` — текст согласия (152-ФЗ). |
| `categories` | необходимые, функциональные, аналитические, маркетинговые (`sale: true`) | Массив id или объектов `{ id, required?, sale?, title?, desc?, labels? }`. |
| `profiles` | `{}` | Переопределение полей профиля: `{ us: { defaults: ['functional'], ttl: 180 } }`. |
| `ttl` | `0` | Срок согласия в днях; `0` — по профилю (eu/global 180, us/ru 365). |
| `guard` | `'enforce'` | Cookie Guard: `off` · `warn` (только сообщать) · `enforce` (блокировать и удалять). |
| `monitor` | `true` | Трекинг в реальном времени. Включён и при `guard` ≠ `off`. |
| `pollMs` | `1000` | Интервал запасной проверки (реже, если есть Cookie Store API). |
| `logSize` | `100` | Сколько событий хранить в журнале. |
| `cookieRules` | `[]` | `[{ match: '^regex', category, vendor? }]`. |
| `gcm` | `true` | Google Consent Mode v2 (`gtag('consent', …)`). Поставьте `false`, если теги Google не используются. |
| `dataLayer` | `true` | Отправлять `{ event: 'psygiox_consent', psygioxConsent: {…} }`. |
| `honorGPC` | `true` | Учитывать Global Privacy Control. В профиле `us` **блокирует** категории с `sale: true`. |
| `gpc` | `'auto'` | `auto` · `true` · `false` — принудительно задать флаг GPC (удобно для демо). |
| `receipt` | `''` | URL, на который уходят анонимные квитанции согласия (§5). |
| `cookie` | `{name:'psygiox_consent',domain:'',path:'/',sameSite:'Lax'}` | Куки-файл согласия. `domain` — чтобы делить его между поддоменами. |
| `reload` | `'auto'` | После отзыва согласия: `auto` (только если на странице запускались скрипты этой категории) · `true` · `false`. |
| `css` | `'auto'` | `auto` (рядом со скриптом или внутри бандла) · `none` · URL. |
| `nonce` | `''` | CSP-nonce для вставляемых `<style>`/`<script>` (встроенный CSS бандла при строгом `style-src` требует его). |
| `configUrl` | `''` | JSON-файл, который загружается при старте и сливается через `configure()`. |
| `manual` | `false` | Не запускаться автоматически. |
| `debug` | `false` | Выводить ошибки из ваших обработчиков событий. |

## 3. Методы

```text
PsyCookies.init(config?)            запуск (один раз); повторные вызовы работают как configure()
PsyCookies.configure(patch)         слить опции на лету и перерисовать
PsyCookies.config(path?)            копия конфига, например config('links.policy')
PsyCookies.region() / profile()     id региона / объединённый профиль

PsyCookies.open(view?)              'settings' (по умолчанию) · 'live' · 'banner'
PsyCookies.close()
PsyCookies.accept() / reject()      всё / только необходимые
PsyCookies.set({ analytics: true }) изменить часть категорий, остальные оставить
PsyCookies.consent()                null или { version, date, region, id, gpc, categories }
PsyCookies.allowed('marketing')     boolean — действующее состояние (и до выбора)
PsyCookies.reset()                  забыть выбор и снова показать баннер
PsyCookies.destroy()                убрать интерфейс, обработчики и обёртку document.cookie

PsyCookies.on(event, fn) · off(event, fn?) · once(event, fn)

PsyCookies.theme.set('dark' | { accent: '#f60' }) · theme.get()
PsyCookies.categories.list() · add(def) · remove(id)
PsyCookies.cookies.list()           [{ name, category, vendor, status, present, size, changes, firstSeen, lastChange, expires }]
PsyCookies.cookies.classify(name)   { category, vendor }
PsyCookies.cookies.rule(re, category, vendor?)
PsyCookies.cookies.remove(name)     удалить везде, где это возможно из JS
PsyCookies.cookies.stats() · scan() счётчики / принудительная проверка
PsyCookies.live.start() · stop() · pause() · resume() · clear() · log()
PsyCookies.live.mount(el | selector) → unmount()   встраиваемая панель в реальном времени
PsyCookies.i18n.add(lang, messages) · set(lang) · get() · t(key, vars) · has(lang) · available() · load(lang, url?)
```

Значения `status` куки-файла: `necessary` · `allowed` · `unknown` (не классифицирован, его никогда не трогают) · `violation` (нет согласия, режим `warn`) · `blocked` (запись отклонена) · `deleted` (удалён защитой) · `removed` (удалён самим сайтом).

## 4. События

`PsyCookies.on(name, fn)`; те же события отправляются на `window` как `psygiox-cookies:<name>` (`detail` — данные).

| Событие | Данные |
|---|---|
| `ready` | `{ region, lang, consent }` |
| `consent` | `{ source: 'banner'\|'settings'\|'api', first, categories, granted[], revoked[], consent }` — каждое решение |
| `change` | те же данные, только если что-то разрешили или отозвали |
| `cookie` | `{ t, type: 'set'\|'update'\|'delete'\|'block'\|'purge', name, category, vendor, source }` — в реальном времени |
| `violation` | `{ name, category, vendor, action: 'block'\|'enforce'\|'warn' }` |
| `open` / `close` | `{ view: 'banner'\|'settings'\|'live' }` |
| `lang` · `configure` · `reset` | новый язык · копия конфига · `{}` |

## 5. Серверная часть

**Куки-файл согласия** `psygiox_consent` — JSON в URL-кодировке (читается сервером, `SameSite=Lax`, `Secure` на HTTPS):

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

**Квитанции** (`receipt: '/api/consent'`) — POST, тело — JSON с типом `text/plain;charset=UTF-8` (без CORS-предзапроса), через `sendBeacon` или `fetch(..., { keepalive: true })`, **без** куки-файлов:

```json
{ "id": "6b1f…", "ts": 1790000000000, "kind": "first", "version": "1", "region": "eu", "lang": "ru",
  "categories": { "functional": 0, "analytics": 1, "marketing": 0 }, "gpc": false, "origin": "https://example.com", "widget": "1.0.0" }
```
IP-адрес и user agent — это то, что видит *ваш* сервер; виджет ничего больше не добавляет.

**Google Consent Mode v2** — `default` (с `wait_for_update: 500`) отправляется при старте, `update` — после каждого решения:
`analytics` → `analytics_storage` · `marketing` → `ad_storage`, `ad_user_data`, `ad_personalization` · `functional` → `functionality_storage`, `personalization_storage` · `security_storage` всегда granted.

## 6. Настройка внешнего вида и правил

**Токены** (`tokens` / `theme.set({…})`) → CSS-переменные: `bg fg muted line surface accent accentFg focus ok okBg bad badBg warn warnBg flash radius font shadow backdrop` (camelCase → `--pc-accent-fg`). Пресеты: `light`, `dark`, `contrast`, `auto` (следует `prefers-color-scheme`). «Принять» и «Отклонить» всегда имеют один стиль — это сделано намеренно, чтобы не было «тёмных паттернов».

**Категории**
```js
PsyCookies.categories.add({ id: 'chat', labels: { ru: { title: 'Онлайн-чат', desc: 'Виджет поддержки' }, en: { title: 'Live chat' } } });
PsyCookies.cookies.rule('^chat_', 'chat', 'MyChat');      // теперь и Guard применяет эту категорию
```
Порядок классификации: `cookieRules` → правила из `cookies.rule()` (новые первыми) → встроенная база (Google, Meta, Яндекс, Microsoft, TikTok, LinkedIn, Hotjar, Matomo, HubSpot, Stripe, Cloudflare, WordPress, …). Всё неклассифицированное — `unknown`, и его **никогда** не блокируют.

**Шлюз для скриптов и iframe**
```html
<script type="text/plain" data-pc-category="analytics" src="https://example.com/tag.js"></script>
<script type="text/plain" data-pc-category="analytics" data-pc-type="module">/* встроенный код */</script>
<iframe data-pc-category="marketing" data-pc-src="https://www.youtube.com/embed/ID" title="Видео"></iframe>
```
Разрешено — тег создаётся заново и выполняется (порядок сохраняется); заблокированный iframe показывает заглушку с кнопкой настроек. Теги, добавленные позже скриптами, тоже обрабатываются.

**Открыть окно из любого места:** `<a href="#" data-pc-open>…</a>` (`data-pc-open="live"` — вкладка с живым списком).

## 7. Cookie Guard подробно

- `enforce`: запись в `document.cookie` для неразрешённой категории **отклоняется**; куки-файлы таких категорий, появившиеся иначе, **удаляются** (перебираются все варианты domain/path). При отзыве согласия удаляются куки-файлы категории и подходящие ключи `localStorage`/`sessionStorage`.
- Обрабатывается только то, что видит JavaScript. HttpOnly-куки-файлы невидимы; заголовками `Set-Cookie` управляет ваш сервер (читайте куки-файл согласия).
- Значения никогда не показываются, не логируются и не сохраняются — хранится только хеш для обнаружения изменений.

## 8. i18n

Сообщения — плоские ключи → строка или объект с формами множественного числа.

```js
PsyCookies.i18n.add('ru', {
  'banner.accept': 'Принять все',
  'banner.reject@us': 'Отклонить необязательные',       // ключ@регион важнее ключа
  'live.total': { one: '{n} куки-файл', few: '{n} куки-файла', many: '{n} куки-файлов', other: '{n} куки-файла' }
});
```

- Подстановки `{name}`; `{n}` форматируется `Intl.NumberFormat`; массивы склеиваются `Intl.ListFormat`; в HTML-сообщениях `**жирный**` превращается в `<b>`; все значения экранируются.
- Объекты множественного числа используют категории `Intl.PluralRules` (`zero one two few many other`); нет нужной — берётся `other`.
- Поиск ключа: для каждого языка в цепочке (`pt-BR` → `pt` → `fallbackLang` → `en`): `key@region`, затем `key`.
- Файл пакета — `(window.__pcL = window.__pcL || []).push(['xx', { … }])`; работает до и после основного скрипта. Языки вне бандла берутся из `i18nBase`; `i18n.load('xx', url)` грузит откуда угодно.
- Все ключи: [`widget/src/i18n/ru.js`](../widget/src/i18n/ru.js).

## 9. Что лежит в сборке

`widget/dist/`: `psygiox-cookies.min.js` (ядро + ru/en), `psygiox-cookies.min.css`, `psygiox-cookies.bundle.min.js` (все языки и CSS внутри), `i18n/*.min.js`, `SHA256SUMS`, `integrity.json` (sha256/384/512 + SRI), архив и неизменяемая копия `v<версия>/`. В продакшене закрепляйте `v<версия>/` и SRI.
