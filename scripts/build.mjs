/*
 * PGX Cookies Widget — build: minify JS/CSS, bundle language packs, compute hashes, pack the archive.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 *
 * Usage: npm run build:widget   (reproducible: same sources + same lockfile = byte-identical dist/)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { gzipSync, zipSync, strToU8 } from 'fflate';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'widget/src');
const DIST = join(ROOT, 'widget/dist');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const V = pkg.version;
const SITE = process.env.SITE_URL || pkg.config.siteUrl;
const REPO = 'https://github.com/PsyGioX/psygiox-cookies-widget';
const CORE_PACKS = ['en', 'ru'];                       // inlined in psygiox-cookies.min.js
const LAZY_PACKS = readdirSync(join(SRC, 'i18n')).map((f) => f.replace(/\.js$/, '')).filter((l) => !CORE_PACKS.includes(l)).sort();
const BANNER = `/*! PGX Cookies Widget v${V} | (c) 2026 PsyGioX <https://github.com/PsyGioX> | GPL-3.0-only | ${REPO} */\n`;
const read = (p) => readFileSync(join(SRC, p), 'utf8');
const minJs = (code) => transformSync(code, { loader: 'js', minify: true, target: 'es2017', legalComments: 'none', charset: 'utf8' }).code;
const minCss = (code) => transformSync(code, { loader: 'css', minify: true, legalComments: 'none', charset: 'utf8' }).code;
const core = read('psygiox-cookies.js').replace(/__VERSION__/g, V);
const pack = (l) => read(`i18n/${l}.js`);

// language packs are queued first, the core drains the queue on start (see i18n section of the core)
const css = minCss(read('psygiox-cookies.css'));
const files = new Map();
files.set('psygiox-cookies.min.js', BANNER + minJs(CORE_PACKS.map(pack).join('\n') + '\n' + core));
files.set('psygiox-cookies.min.css', BANNER + css);
files.set('psygiox-cookies.bundle.min.js', BANNER + minJs(`window.__pcCSS=${JSON.stringify(css)};\n` + [...CORE_PACKS, ...LAZY_PACKS].map(pack).join('\n') + '\n' + core));
for (const l of LAZY_PACKS) files.set(`i18n/${l}.min.js`, BANNER + minJs(pack(l)));

const sha = (buf, alg, enc) => createHash(alg).update(buf).digest(enc);
const entries = [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, text]) => [name, Buffer.from(text, 'utf8')]);
const meta = {};
for (const [name, buf] of entries) {
  meta[name] = {
    bytes: buf.length,
    gzip: gzipSync(buf, { level: 9, mtime: 0 }).length,
    sha256: sha(buf, 'sha256', 'hex'),
    sha384: sha(buf, 'sha384', 'base64'),
    sha512: sha(buf, 'sha512', 'base64'),
    integrity: 'sha384-' + sha(buf, 'sha384', 'base64'),
  };
}
const sums = entries.map(([name]) => `${meta[name].sha256}  ${name}`).join('\n') + '\n';
const integrity = JSON.stringify({
  name: 'psygiox-cookies', version: V, license: 'GPL-3.0-only',
  copyright: 'Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>', repository: REPO,
  note: 'Use the integrity value as the SRI attribute. Pin the versioned folder (v' + V + '/) in production.',
  files: meta,
}, null, 2) + '\n';

const install = `# PGX Cookies Widget v${V} — install

<!-- Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX> · SPDX-License-Identifier: GPL-3.0-only -->

1. Copy this folder to your site, e.g. /assets/psygiox-cookies/.
2. Add this as the FIRST script in <head> (it must run before analytics/ads):

   <script src="/assets/psygiox-cookies/psygiox-cookies.min.js"
           data-policy="/cookies" data-privacy="/privacy"></script>

   Everything in one file (no extra requests, ready for strict SRI): psygiox-cookies.bundle.min.js
3. Verify the files:  sha256sum -c SHA256SUMS
4. Docs: ${REPO}/blob/main/docs/API.md
Licensed under GPL-3.0-only — see LICENSE.
`;

const stamp = (dir) => {
  mkdirSync(dir, { recursive: true });
  for (const [name, buf] of entries) { mkdirSync(dirname(join(dir, name)), { recursive: true }); writeFileSync(join(dir, name), buf); }
  writeFileSync(join(dir, 'SHA256SUMS'), sums); writeFileSync(join(dir, 'integrity.json'), integrity);
};

// clean only what this script owns (older v*/ folders stay: they are immutable for SRI users)
mkdirSync(DIST, { recursive: true });
for (const f of readdirSync(DIST)) if (!/^v\d/.test(f) || f === `v${V}`) rmSync(join(DIST, f), { recursive: true, force: true });
stamp(DIST); stamp(join(DIST, `v${V}`));

// release archive (deterministic: sorted names, fixed mtime)
const mtime = new Date(Date.UTC(2026, 0, 1));
const zipFiles = {};
const add = (name, data) => { zipFiles['psygiox-cookies/' + name] = [data instanceof Uint8Array ? data : strToU8(data), { mtime, level: 9 }]; };
for (const [name, buf] of entries) add(name, buf);
add('LICENSE', readFileSync(join(ROOT, 'LICENSE'))); add('INSTALL.md', install); add('SHA256SUMS', sums); add('integrity.json', integrity);
const sorted = Object.fromEntries(Object.entries(zipFiles).sort(([a], [b]) => (a < b ? -1 : 1)));
const zipName = `psygiox-cookies-widget-${V}.zip`;
const zip = Buffer.from(zipSync(sorted));
writeFileSync(join(DIST, zipName), zip);
const rootSums = sums + `${sha(zip, 'sha256', 'hex')}  ${zipName}\n`;
writeFileSync(join(DIST, 'SHA256SUMS'), rootSums);

// stamp the service worker cache name with the build hash so installed PWAs refresh
const swPath = join(ROOT, 'sw.js');
if (existsSync(swPath)) {
  const build = `v${V}-${sha(rootSums, 'sha256', 'hex').slice(0, 10)}`;
  writeFileSync(swPath, readFileSync(swPath, 'utf8').replace(/const BUILD = '[^']*';/, `const BUILD = '${build}';`));
}

const kb = (n) => (n / 1024).toFixed(1).padStart(6) + ' KB';
console.log(`PGX Cookies Widget v${V} (${SITE})`);
for (const [name] of entries) console.log(`  ${name.padEnd(34)} ${kb(meta[name].bytes)}  gzip ${kb(meta[name].gzip)}`);
console.log(`  ${zipName.padEnd(34)} ${kb(zip.length)}`);
