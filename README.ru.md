<!--
  PGX Cookies Widget — README (русский)
  Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
  SPDX-License-Identifier: GPL-3.0-only
-->
<p align="center">
  <img src="assets/brand/logo.png" width="420" alt="PGX Cookies Widget">
</p>

<p align="center">
  <b>Согласие на куки-файлы с трекингом в реальном времени — для ЕС, США, России и всего мира.</b><br>
  <a href="https://psygiox-cookies-widget.vercel.app">Демо и лендинг</a> ·
  <a href="README.md">English</a> ·
  <a href="docs/API.ru.md">Справочник API</a> ·
  <a href="CHANGELOG.md">История изменений</a>
</p>

<p align="center">
  <a href="https://github.com/PsyGioX/psygiox-cookies-widget#GPL-3.0-1-ov-file"><img alt="Лицензия GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-7dff2e?style=for-the-badge&labelColor=0a0c08"></a>
  <img alt="версия 1.0.0" src="https://img.shields.io/badge/version-1.0.0-ffb02e?style=for-the-badge&labelColor=0a0c08">
  <img alt="без зависимостей" src="https://img.shields.io/badge/dependencies-0-7dff2e?style=for-the-badge&labelColor=0a0c08">
  <img alt="около 17 КБ gzip" src="https://img.shields.io/badge/gzip-~17%20KB%20%2B%204%20KB%20CSS-ffb02e?style=for-the-badge&labelColor=0a0c08">
</p>

## Чем это отличается от обычных баннеров

Баннер, который только *спрашивает*, — это полдела. **PGX Cookies Widget ещё и следит, какие куки-файлы страница реально записывает, и действует.**

| | |
|---|---|
| **Cookie Radar** | Отслеживание каждого куки-файла в реальном времени: новый, изменённый, удалённый. Оборачивает `document.cookie`, слушает Cookie Store API, показывает категорию, вендора и размер. Живую панель можно встроить в свою админку. |
| **Cookie Guard** | Нет согласия — нет куки-файла. Куки-файлы аналитики и рекламы блокируются при записи и удаляются, если появились «снаружи». Режимы: `off` · `warn` · `enforce`. |
| **Правовые профили** | `eu` (GDPR/ePrivacy, opt-in), `us` (CCPA/CPRA, opt-out + Global Privacy Control), `ru` (152-ФЗ, opt-in) и `global` (строгий opt-in для LGPD, PIPEDA, UK GDPR и др.). |
| **Полный API** | Всё настраивается `data-*` атрибутами, объектом, удалённым JSON или кодом: темы, токены, раскладки, категории, правила для куки-файлов, события. |
| **Переводы нового образца** | Написаны с нуля поверх `Intl`: формы множественного числа, списки, даты, относительное время, **региональные варианты текста** (`banner.reject@us`), ленивые пакеты. В комплекте 9 языков. |
| **Блокировка скриптов** | `<script type="text/plain" data-pc-category="analytics">` и `<iframe data-pc-src>` запускаются только после согласия. |
| **Consent Mode v2 · GPC · квитанции** | Google Consent Mode v2, события `dataLayer`, Global Privacy Control, анонимные квитанции согласия на ваш endpoint. |
| **Проверяемая сборка** | Минифицированные JS/CSS, суммы SHA-256, SRI (sha384), воспроизводимый архив, неизменяемые версионные URL. |

## Быстрый старт

**1. Ссылкой (Vercel или любой статический хостинг).** Подключайте **первым** скриптом в `<head>`:

```html
<script src="https://psygiox-cookies-widget.vercel.app/widget/dist/v1.0.0/psygiox-cookies.min.js"
        integrity="sha384-…"  crossorigin="anonymous"
        data-policy="/cookies" data-privacy="/privacy" data-consent="/consent"></script>

<a href="#" data-pc-open>Настройки куки-файлов</a>
```

Точное значение `integrity` лежит в [`widget/dist/integrity.json`](widget/dist/integrity.json) и на [сайте](https://psygiox-cookies-widget.vercel.app/#verify). CSS и языковые пакеты подгружаются сами из той же папки. Один файл со всем внутри (без дополнительных запросов): `psygiox-cookies.bundle.min.js`.

**2. Архивом.** Скачайте `psygiox-cookies-widget-1.0.0.zip` из [`widget/dist/`](widget/dist/) или из Releases, распакуйте на сайте и проверьте:

```bash
unzip psygiox-cookies-widget-1.0.0.zip && cd psygiox-cookies
sha256sum -c SHA256SUMS      # в каждой строке должно быть OK
```

**3. Из исходников.**

```bash
git clone https://github.com/PsyGioX/psygiox-cookies-widget.git && cd psygiox-cookies-widget
npm ci
npm run build     # минификация JS/CSS, бандл языков, хеши, архив, английская страница, sitemap
npm run verify    # перепроверка всех хешей   (npm run verify -- https://HOST/widget/dist — проверка живого сервера)
npm test          # 37 тестов поведения
```

Почему первым? Виджет оборачивает `document.cookie` при загрузке. Скрипты, выполненные **до** него, могут записать куки-файлы, которых он не увидит.

## Регионы

| Профиль | Где | Модель | До выбора пользователя | Повторный запрос |
|---|---|---|---|---|
| `eu` | часовые пояса Europe/* | opt-in | только необходимые; «Принять» и «Отклонить» выглядят одинаково | 180 дней |
| `us` | часовые пояса США | opt-out | функциональные и аналитические включены, продажа/передача выключена; **GPC блокирует**; ссылка «Your Privacy Choices» | 365 дней |
| `ru` | российские часовые пояса | opt-in | только необходимые; ссылки на политику куки-файлов, политику ПДн и текст согласия; версия документов сохраняется | 365 дней |
| `global` | всё остальное | opt-in | только необходимые | 180 дней |

Регион определяется по часовому поясу браузера — **это эвристика**. Когда важна точность, передавайте его с сервера: `data-region="eu"` (например, из заголовка Vercel `x-vercel-ip-country`). Язык не зависит от региона: русскоязычный посетитель в Берлине получит правила `eu` на русском. Любую деталь профиля можно переопределить: `profiles: { us: { defaults: ['functional'] } }`.

## Переводы

```js
PsyCookies.i18n.add('ru', {
  'banner.title': 'Мы используем куки-файлы',
  'banner.reject@us': 'Отклонить необязательные',     // вариант по региону: ключ@регион
  'live.total': { one: '{n} куки-файл', few: '{n} куки-файла', many: '{n} куки-файлов', other: '{n} куки-файла' }
});
PsyCookies.i18n.set('ru');                             // или data-lang="auto"
```

В комплекте: `ru en` (внутри основного файла) и `de fr es it pt pl uk` (ленивые пакеты в `i18n/` или всё сразу в бандле). Пакет — одна строка, которая кладёт данные в очередь (`window.__pcL`), поэтому порядок загрузки не важен.

## Настройка и API

```html
<script src=".../psygiox-cookies.min.js"
  data-region="eu" data-lang="auto" data-theme="dark" data-position="bottom-right"
  data-guard="enforce" data-receipt="/api/consent"
  data-tokens='{"accent":"#7dff2e","accentFg":"#0a0c08","radius":"20px"}'></script>
```

```js
PsyCookies.configure({ categories: [{ id: 'chat', labels: { ru: { title: 'Онлайн-чат' } } }],
                       cookieRules: [{ match: '^chat_', category: 'chat', vendor: 'MyChat' }] });
PsyCookies.on('consent', e => console.log(e.granted, e.revoked));
PsyCookies.on('cookie',  e => console.log(e.type, e.name, e.category));   // в реальном времени
PsyCookies.live.mount('#cookie-monitor');                                   // встраиваемая панель
```

Полный справочник: **[docs/API.ru.md](docs/API.ru.md)** · подсказки в IDE для удалённого конфига: [`widget/schema/config.schema.json`](widget/schema/config.schema.json).

## Структура репозитория

```
index.html, assets/, en/        лендинг (RU) + генерируемая английская страница, бренд и шрифты
manifest.webmanifest, sw.js     PWA
widget/src/                     читаемые исходники: psygiox-cookies.js / .css / i18n/*.js
widget/dist/                    сборка, SHA256SUMS, integrity.json, архив, v1.0.0/ (неизменяемая)
widget/schema/, widget/examples/
scripts/                        build, build-site, verify, check-headers, brand (логотип и иконки)
test/                           37 тестов (jsdom)
docs/                           справочник API
```

В каждом файле проекта есть копирайт PsyGioX (`npm run headers` проверяет это в CI), а сам виджет показывает его в окне настроек.

## Чего виджет *не* умеет

- Не видит и не удаляет **HttpOnly**‑куки-файлы и не может помешать отправке заголовка `Set-Cookie`. Ими управляют на сервере (читайте куки-файл `psygiox_consent` — это JSON в URL‑кодировке).
- Cookie Guard защищает то, что происходит **после** загрузки виджета.
- База сигнатур куки-файлов компактная и встроенная; свои правила добавляйте через `cookieRules`.
- Это инструмент, а не юридическая консультация. Тексты, сроки и список куки-файлов вашего сайта должен проверить юрист.

## Бренд

Логотип состоит только из текста и генерируется кодом: `npm run brand` ([`scripts/brand.mjs`](scripts/brand.mjs)). Буквы — контуры шрифта **Titan One** (SIL OFL 1.1); сайт использует самохостинг шрифтов Titan One и Nunito, см. [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt).

## Участие · Безопасность

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Лицензия

© 2026 [PsyGioX](https://github.com/PsyGioX). Распространяется по [лицензии GPL-3.0](https://github.com/PsyGioX/psygiox-cookies-widget#GPL-3.0-1-ov-file) (`GPL-3.0-only`) — см. [LICENSE](LICENSE). Если вы изменяете виджет и распространяете результат, изменения нужно публиковать под той же лицензией.
