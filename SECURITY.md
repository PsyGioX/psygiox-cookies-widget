<!-- PGX Cookies Widget · Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX> · SPDX-License-Identifier: GPL-3.0-only -->
# Security policy

## Supported versions

Only the latest released version (`widget/dist/`) receives fixes.

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub’s private reporting:
<https://github.com/PsyGioX/psygiox-cookies-widget/security/advisories/new>

Include the widget version, a minimal page or config that reproduces the problem and the impact you see. Reports are handled on a best-effort basis; you will get an answer in the advisory thread.

## What is in scope

- XSS or script injection through cookie names/values, configuration or translations.
- Bypasses of Cookie Guard for **classified** cookies that JavaScript can see.
- Wrong hashes in `widget/dist/` or a build that differs from the sources.

Out of scope: HttpOnly cookies and `Set-Cookie` headers (invisible to scripts by design), third-party scripts that run before the widget, and legal advice questions.

## Verifying what you run

```bash
sha256sum -c widget/dist/SHA256SUMS
npm run verify -- https://YOUR-HOST/widget/dist     # compares a live server with the committed sums
```
