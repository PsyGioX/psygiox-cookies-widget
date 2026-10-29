<!-- PGX Cookies Widget · Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX> · SPDX-License-Identifier: GPL-3.0-only -->
# Contributing

Thanks for helping! The project is licensed under **GPL-3.0-only**; by sending a contribution you agree that it is released under the same license.

## Set up

Node.js **22.22.2+** (or 24.15+) — required by jsdom 30, which runs the tests. The widget itself has no Node requirement.

```bash
git clone https://github.com/PsyGioX/psygiox-cookies-widget.git && cd psygiox-cookies-widget
npm ci
npm run check      # headers → build → verify → tests
```

Built files are **committed** (Vercel serves the repository as is), so after changing anything under `widget/src/`, `index.html` or `sw.js` run `npm run build` and commit the result. CI fails when `widget/dist/` or the generated pages differ from a fresh build.

## Rules

1. **Copyright header in every new file** (`Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>` + `SPDX-License-Identifier: GPL-3.0-only`). `npm run headers` checks it.
2. **No dependencies in the browser code.** Build tools are `devDependencies` only.
3. **No inline scripts or styles on the site** — the Content-Security-Policy forbids them (a test enforces it).
4. **Russian text says «куки-файл / куки-файлы»** — not «кука». A test checks `index.html` and the Russian pack.
5. Add or update tests in `test/` for behaviour changes; update `docs/API.md` and `docs/API.ru.md` for API changes.
6. Legal wording (profiles, banner texts) must follow the relevant law or regulator guidance — link it in the pull request.

## Adding a language

1. Copy `widget/src/i18n/en.js` to `widget/src/i18n/<lang>.js`, translate the values (keep the keys, `{placeholders}` and plural objects; use the plural categories of the language).
2. Add the code to `PACKS` in `widget/src/psygiox-cookies.js` and to the language select in `index.html`.
3. `npm run build && npm test`.

## Adding cookie signatures

Add a line to `SIGS` in `widget/src/psygiox-cookies.js`: `[category, vendor, '^regex$']` — exact names only, no guessing. Add a test case.

## Brand

`npm run brand` regenerates the logo, favicons, PWA icons and the social image from `scripts/brand.mjs`.
