/*
 * PGX Cookies Widget — verify hashes of the built files.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 *
 *   npm run verify                       check widget/dist and every widget/dist/v*\/ folder on disk
 *   npm run verify -- https://HOST/widget/dist   check what a server (Vercel, CDN) really serves
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'widget/dist');
const remote = process.argv[2] && process.argv[2].replace(/\/$/, '');
const h = (buf, alg, enc = 'hex') => createHash(alg).update(buf).digest(enc);
let bad = 0, ok = 0;
const report = (good, what) => { good ? ok++ : bad++; if (!good) console.error('MISMATCH  ' + what); };
const lines = (dir) => readFileSync(join(dir, 'SHA256SUMS'), 'utf8').trim().split('\n').map((l) => l.split(/\s{2}/));

async function checkDir(dir, label) {
  const integ = existsSync(join(dir, 'integrity.json')) ? JSON.parse(readFileSync(join(dir, 'integrity.json'), 'utf8')) : null;
  for (const [sum, file] of lines(dir)) {
    let buf;
    if (remote && dir === DIST) { const r = await fetch(`${remote}/${file}`); if (!r.ok) { report(false, `${label}/${file}  HTTP ${r.status}`); continue; } buf = Buffer.from(await r.arrayBuffer()); }
    else buf = readFileSync(join(dir, file));
    report(h(buf, 'sha256') === sum, `${label}/${file}  sha256`);
    const m = integ && integ.files[file];
    if (m) { report(h(buf, 'sha384', 'base64') === m.sha384 && 'sha384-' + m.sha384 === m.integrity, `${label}/${file}  sha384/SRI`); report(h(buf, 'sha512', 'base64') === m.sha512, `${label}/${file}  sha512`); }
  }
}
await checkDir(DIST, 'dist');
if (!remote) for (const d of readdirSync(DIST)) if (/^v\d/.test(d)) await checkDir(join(DIST, d), d);
console.log(bad ? `FAILED: ${bad} mismatch(es), ${ok} ok` : `OK: ${ok} checks passed${remote ? ' against ' + remote : ''}`);
process.exit(bad ? 1 : 0);
