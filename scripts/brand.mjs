/*
 * PGX Cookies Widget — brand generator: logo (text only), favicons, PWA icons, social image.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 *
 * Letters are converted to outlines (no font is needed to display the logo).
 * Font: Titan One (SIL OFL 1.1) via @fontsource/titan-one. Run: npm run brand
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(ROOT, p);
mkdirSync(out('assets/brand'), { recursive: true });

const woff = readFileSync(out('node_modules/@fontsource/titan-one/files/titan-one-latin-400-normal.woff'));
const font = opentype.parse(woff.buffer.slice(woff.byteOffset, woff.byteOffset + woff.byteLength));

const C = { ink: '#0a0c08', lime: '#7dff2e', limeHi: '#d4ff7a', limeLo: '#3fc10e', amber: '#ffb02e', white: '#ffffff' };
const COPYX = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COPY = 'PGX Cookies Widget — Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX> — SPDX-License-Identifier: GPL-3.0-only — https://github.com/PsyGioX/psygiox-cookies-widget';

/** text -> { d, x1, y1, x2, y2, w, h } with the baseline at y = 0 */
function textPath(str, size, tracking = 0) {
  const path = new opentype.Path(); const glyphs = font.stringToGlyphs(str); let x = 0;
  glyphs.forEach((g, i) => {
    path.commands.push(...g.getPath(x, 0, size).commands);
    x += (g.advanceWidth * size) / font.unitsPerEm + tracking * size;
    if (i < glyphs.length - 1) x += (font.getKerningValue(g, glyphs[i + 1]) * size) / font.unitsPerEm;
  });
  const b = path.getBoundingBox();
  return { d: path.toPathData(2), x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, w: b.x2 - b.x1, h: b.y2 - b.y1 };
}
const fit = (t, width) => { const k = width / t.w; return { k, tx: -t.x1 * k, ty: -t.y1 * k, h: t.h * k }; };

const DEFS = (id, d) => `<linearGradient id="lime${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.limeHi}"/><stop offset=".5" stop-color="${C.lime}"/><stop offset="1" stop-color="${C.limeLo}"/></linearGradient><clipPath id="clip${id}"><path d="${d}"/></clipPath>`;
// cookie chips: dark crumbs clipped to the letters (no extra shapes outside the text)
const chips = (w, h) => {
  let s = 1337, r = () => ((s = (s * 16807) % 2147483647) / 2147483647), o = '';
  for (let i = 0; i < Math.round(w / 20); i++) o += `<ellipse cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" rx="${(7 + r() * 9).toFixed(1)}" ry="${(5 + r() * 6).toFixed(1)}" transform="rotate(${(r() * 180).toFixed(0)} ${(r() * w).toFixed(0)} ${(r() * h).toFixed(0)})"/>`;
  return o;
};

/** the sticker-style "PGX" word, drawn in its own coordinate box [0..w]x[0..h] */
function pgxSticker(id, size, opts = {}) {
  const t = textPath('PGX', size, 0.005), stroke = opts.stroke ?? size * 0.048, ring = opts.ring ?? size * 0.125, sh = opts.shadow ?? size * 0.05;
  const g = `transform="translate(${-t.x1} ${-t.y1})"`;
  const body = `<g ${g}>` +
    (sh ? `<path d="${t.d}" transform="translate(${sh} ${sh * 1.15})" fill="${C.ink}" stroke="${C.ink}" stroke-width="${ring}" stroke-linejoin="round" opacity=".55"/>` : '') +
    `<path d="${t.d}" fill="${C.white}" stroke="${C.white}" stroke-width="${ring}" stroke-linejoin="round"/>` +
    `<path d="${t.d}" fill="${C.ink}" stroke="${C.ink}" stroke-width="${stroke * 2}" stroke-linejoin="round"/>` +
    `<path d="${t.d}" fill="url(#lime${id})"/>` +
    `<g clip-path="url(#clip${id})"><g fill="${C.ink}" opacity=".5" transform="translate(${t.x1} ${t.y1})">${chips(t.w, t.h)}</g></g>` +
    `<g clip-path="url(#clip${id})"><rect x="${t.x1}" y="${t.y1}" width="${t.w}" height="${t.h * 0.38}" fill="${C.white}" opacity=".3"/></g></g>`;
  return { body, defs: DEFS(id, t.d), t, pad: ring / 2 + sh * 1.2 };
}

/* ---------- 1. full lockup: PGX + COOKIES WIDGET ---------- */
function lockup() {
  const size = 330, p = pgxSticker('A', size), pad = 64 + p.pad;
  const W = p.t.w, bannerH = 104, gap = 54, bannerW = W + 40;
  const txt = textPath('COOKIES WIDGET', 100, 0.01), f = fit(txt, bannerW - 72);
  const vbW = Math.round(bannerW + pad * 2 + 30), vbH = Math.round(p.t.h + gap + bannerH + pad * 2 + 20);
  const x0 = pad, y0 = pad;
  const by = y0 + p.t.h + gap, sk = 26;
  const bPath = `M${x0 + sk} ${by} H${x0 + bannerW + sk} L${x0 + bannerW} ${by + bannerH} H${x0} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${vbW}" height="${vbH}" role="img" aria-labelledby="t"><title id="t">PGX Cookies Widget</title><desc>${COPYX(COPY)}</desc>
<!-- ${COPY} -->
<defs>${p.defs}</defs>
<g transform="rotate(-3 ${vbW / 2} ${vbH / 2})">
<g transform="translate(${x0} ${y0})">${p.body}</g>
<path d="${bPath}" transform="translate(12 14)" fill="${C.ink}" opacity=".55"/>
<path d="${bPath}" fill="${C.white}" stroke="${C.white}" stroke-width="30" stroke-linejoin="round"/>
<path d="${bPath}" fill="${C.ink}" stroke="${C.ink}" stroke-width="14" stroke-linejoin="round"/>
<path d="${bPath}" fill="${C.amber}"/>
<g transform="translate(${x0 + 36 + sk / 2} ${by + (bannerH - f.h) / 2}) scale(${f.k}) translate(${-txt.x1} ${-txt.y1})"><path d="${txt.d}" fill="${C.ink}"/></g>
</g></svg>\n`;
}

/* ---------- 2. icon: PGX on an ink tile ---------- */
function icon({ size = 512, radius = 112, scale = 0.8, bg = true, mono = false } = {}) {
  const p = pgxSticker('I', 200, { ring: 0, shadow: 0, stroke: 9 }), s = (size * scale) / p.t.w;
  const x = (size - p.t.w * s) / 2, y = (size - p.t.h * s) / 2 + size * 0.005;
  const letters = mono
    ? `<path d="${textPath('PGX', 200, 0.005).d}" fill="#000" transform="translate(${x} ${y}) scale(${s}) translate(${-p.t.x1} ${-p.t.y1})"/>`
    : `<g transform="translate(${x} ${y}) scale(${s})">${p.body}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-labelledby="t"><title id="t">PGX Cookies Widget</title>
<!-- ${COPY} -->
<defs>${mono ? '' : p.defs}${bg && !mono ? `<radialGradient id="glow" cx=".2" cy=".95" r=".9"><stop offset="0" stop-color="${C.lime}" stop-opacity=".38"/><stop offset="1" stop-color="${C.lime}" stop-opacity="0"/></radialGradient>` : ''}</defs>
${bg && !mono ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${C.ink}"/><rect width="${size}" height="${size}" rx="${radius}" fill="url(#glow)"/>` : ''}${letters}</svg>\n`;
}

/* ---------- 3. social preview 1200x630 ---------- */
function og() {
  const lock = lockup(), vb = lock.match(/viewBox="0 0 (\d+) (\d+)"/), lw = +vb[1], lh = +vb[2], k = 0.56;
  const inner = lock.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title[\s\S]*?<\/desc>/, '');
  const t1 = textPath('REAL-TIME COOKIE TRACKING', 60, 0.01), f1 = fit(t1, 600);
  const pills = ['GDPR', 'CCPA/CPRA', 'GPC', '152-FZ', 'CONSENT MODE V2'];
  let px = 0, pillSvg = '';
  pills.forEach((s) => {
    const t = textPath(s, 40, 0.02), f = fit(t, t.w * 0.52), pw = t.w * 0.52 + 36;
    pillSvg += `<g transform="translate(${px} 0)"><rect width="${pw}" height="48" rx="24" fill="none" stroke="${C.lime}" stroke-width="3"/><g transform="translate(18 ${(48 - f.h) / 2}) scale(${f.k}) translate(${-t.x1} ${-t.y1})"><path d="${t.d}" fill="${C.limeHi}"/></g></g>`;
    px += pw + 14;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-labelledby="t"><title id="t">PGX Cookies Widget</title>
<!-- ${COPY} -->
<defs><pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="${C.lime}" opacity=".16"/></pattern><radialGradient id="g1" cx=".15" cy=".1" r=".8"><stop offset="0" stop-color="${C.lime}" stop-opacity=".30"/><stop offset="1" stop-color="${C.lime}" stop-opacity="0"/></radialGradient><radialGradient id="g2" cx=".95" cy=".95" r=".6"><stop offset="0" stop-color="${C.amber}" stop-opacity=".28"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="630" fill="${C.ink}"/><rect width="1200" height="630" fill="url(#dots)"/><rect width="1200" height="630" fill="url(#g1)"/><rect width="1200" height="630" fill="url(#g2)"/>
<g transform="translate(${(1200 - lw * k) / 2} 62) scale(${k})">${inner}</g>
<g transform="translate(${(1200 - 600) / 2} ${62 + lh * k + 6}) scale(1)"><g transform="scale(${f1.k}) translate(${-t1.x1} ${-t1.y1})"><path d="${t1.d}" fill="${C.white}"/></g></g>
<g transform="translate(${(1200 - (px - 14)) / 2} ${62 + lh * k + 6 + f1.h + 30})">${pillSvg}</g></svg>\n`;
}

/* ---------- write SVG + rasterise ---------- */
const png = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { loadSystemFonts: false } }).render().asPng();
function withText(buf, meta) {                      // embed the copyright as PNG tEXt chunks
  let chunks = Buffer.alloc(0);
  for (const [k, v] of Object.entries(meta)) {
    const data = Buffer.from(`${k}\0${v}`, 'latin1'), len = Buffer.alloc(4), crc = Buffer.alloc(4), type = Buffer.from('tEXt');
    len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([type, data])) >>> 0);
    chunks = Buffer.concat([chunks, len, type, data, crc]);
  }
  return Buffer.concat([buf.subarray(0, 33), chunks, buf.subarray(33)]);
}
const META = { Title: 'PGX Cookies Widget', Author: 'PsyGioX', Copyright: 'Copyright (C) 2026 PsyGioX https://github.com/PsyGioX', License: 'GPL-3.0-only', Source: 'https://github.com/PsyGioX/psygiox-cookies-widget' };
const wpng = (p, svg, w) => writeFileSync(out(p), withText(png(svg, w), META));

const logo = lockup(), tile = icon(), tileFlat = icon({ radius: 0, scale: 0.8 }), maskable = icon({ radius: 0, scale: 0.6 });
writeFileSync(out('assets/brand/logo.svg'), logo);
writeFileSync(out('assets/brand/logo-mark.svg'), tile);
writeFileSync(out('assets/brand/og-image.svg'), og());
writeFileSync(out('favicon.svg'), icon({ size: 64, radius: 16, scale: 0.86 }));
writeFileSync(out('safari-pinned-tab.svg'), icon({ mono: true, bg: false, scale: 0.9 }));
wpng('assets/brand/logo.png', logo, 1600);
wpng('og-image.png', og(), 1200);
wpng('apple-touch-icon.png', tileFlat, 180);
wpng('icon-192.png', tile, 192);
wpng('icon-512.png', tile, 512);
wpng('icon-maskable-512.png', maskable, 512);

// favicon.ico: PNG frames 16/32/48 packed in an ICO container
const frames = [16, 32, 48].map((s) => ({ s, data: png(icon({ size: 64, radius: 14, scale: 0.9 }), s) }));
const head = Buffer.alloc(6 + frames.length * 16); head.writeUInt16LE(1, 2); head.writeUInt16LE(frames.length, 4);
let off = head.length;
frames.forEach((f, i) => { const o = 6 + i * 16; head[o] = f.s; head[o + 1] = f.s; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(f.data.length, o + 8); head.writeUInt32LE(off, o + 12); off += f.data.length; });
writeFileSync(out('favicon.ico'), Buffer.concat([head, ...frames.map((f) => f.data)]));
// self-hosted display fonts for the site (OFL); the licence file in assets/fonts/ is kept as is
mkdirSync(out('assets/fonts'), { recursive: true });
copyFileSync(out('node_modules/@fontsource/titan-one/files/titan-one-latin-400-normal.woff2'), out('assets/fonts/titan-one-latin-400-normal.woff2'));
for (const f of ['nunito-cyrillic-900-normal.woff2', 'nunito-latin-900-normal.woff2']) copyFileSync(out('node_modules/@fontsource/nunito/files/' + f), out('assets/fonts/' + f));
console.log('brand: logo.svg, logo-mark.svg, favicon.svg/.ico, apple-touch-icon, icon-192/512, maskable, safari-pinned-tab, og-image');
