/*
 * PGX Cookies Widget — makes sure every project file carries the PsyGioX copyright notice.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 *
 * Exempt (cannot carry a comment or must stay verbatim): LICENSE, package-lock.json, vercel.json,
 * SHA256SUMS, fonts/archives/icons. PNG files carry the notice in tEXt chunks.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIR = new Set(['node_modules', '.git', '.vercel']);
const EXEMPT = new Set(['LICENSE', 'package-lock.json', 'vercel.json', 'SHA256SUMS']);
const BINARY = new Set(['.ico', '.woff', '.woff2', '.zip']);
const missing = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n), st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIR.has(n)) walk(p); continue; }
    if (EXEMPT.has(n) || BINARY.has(extname(n))) continue;
    const buf = readFileSync(p), head = extname(n) === '.png' ? buf.toString('latin1') : buf.toString('utf8', 0, 2500);
    if (!/PsyGioX/.test(head)) missing.push(relative(ROOT, p));
  }
})(ROOT);
if (missing.length) { console.error('Missing copyright notice in:\n  ' + missing.join('\n  ')); process.exit(1); }
console.log('OK: every file carries the PsyGioX copyright notice');
