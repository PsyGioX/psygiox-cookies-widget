/*
 * PGX Cookies Widget — site build: English page, JSON-LD, sitemap, live hash values.
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 * Source code: https://github.com/PsyGioX/psygiox-cookies-widget
 *
 * index.html (Russian) is the authored page. Every element with data-en / data-en-<attr> carries
 * its English text; this script renders /en/index.html from it, keeps JSON-LD in sync with the
 * visible FAQ, and writes sitemap.xml and robots.txt. Run: npm run build:site
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const wr = (p, t) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), t); };
const pkg = JSON.parse(rd('package.json'));
const REPO = 'https://github.com/PsyGioX/psygiox-cookies-widget';
const SITE = (process.env.SITE_URL || pkg.config.siteUrl).replace(/\/$/, '');
const RELEASED = pkg.config.released || '2026-10-29';
const integ = JSON.parse(rd('widget/dist/integrity.json'));
const V = integ.version, core = integ.files['psygiox-cookies.min.js'], css = integ.files['psygiox-cookies.min.css'];
const zipName = `psygiox-cookies-widget-${V}.zip`;
const zipSha = (rd('widget/dist/SHA256SUMS').split('\n').find((l) => l.endsWith(zipName)) || '').split(/\s+/)[0] || '…';

let html = rd('index.html');

// 1. move the site origin if SITE_URL differs from what the file currently contains
const cur = (html.match(/<link rel="canonical" href="(https?:\/\/[^/"]+)/) || [])[1];
if (cur && cur !== SITE) html = html.split(cur).join(SITE);

// 2. live values from the widget build
const fill = (key, val) => { html = html.replace(new RegExp(`(<[a-z]+[^>]*data-fill="${key}"[^>]*>)[^<]*(</)`, 'g'), `$1${val}$2`); };
fill('site', SITE); fill('ver', V); fill('sri-js', core.integrity); fill('sha-zip', zipSha);
html = html.replace(/(id="ver">)v[\d.]+/, `$1v${V}`)
  .replace(/(id="st-gz">)[^<]*/, `$1${((core.gzip + css.gzip) / 1024).toFixed(1)}`)
  .replace(/psygiox-cookies-widget-[\d.]+\.zip/g, zipName)
  .replace(/\/widget\/dist\/v[\d.]+\//g, `/widget/dist/v${V}/`);

// 3. structured data from the visible page (RU), then the EN page
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ld = (doc, lang, url, title, desc, faq) => {
  const A = `${SITE}/#author`;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'PGX Cookies Widget', inLanguage: ['ru', 'en'], publisher: { '@id': A } },
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description: desc, inLanguage: lang, isPartOf: { '@id': `${SITE}/#website` }, primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}/og-image.png`, width: 1200, height: 630 } },
      { '@type': 'SoftwareApplication', '@id': `${SITE}/#software`, name: 'PGX Cookies Widget', applicationCategory: 'DeveloperApplication', operatingSystem: 'Any (web browser)', softwareVersion: V, description: desc, image: `${SITE}/og-image.png`, url: `${SITE}/`, downloadUrl: `${SITE}/widget/dist/${zipName}`, license: 'https://www.gnu.org/licenses/gpl-3.0.html', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, author: { '@id': A }, sameAs: [REPO] },
      { '@type': 'SoftwareSourceCode', '@id': `${SITE}/#source`, name: 'psygiox-cookies-widget', codeRepository: REPO, programmingLanguage: 'JavaScript', license: 'https://www.gnu.org/licenses/gpl-3.0.html', author: { '@id': A } },
      { '@type': 'Person', '@id': A, name: 'PsyGioX', url: 'https://github.com/PsyGioX', sameAs: ['https://github.com/PsyGioX'] },
      { '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  }).replace(/</g, '\\u003c');
};
const faqOf = (doc, en) => [...doc.querySelectorAll('.faq details')].map((d) => {
  const s = d.querySelector('summary'), a = d.querySelector('.a');
  return [text(en ? s.getAttribute('data-en') || s.innerHTML : s.innerHTML), text(en ? a.getAttribute('data-en') || a.innerHTML : a.innerHTML)];
});
const ru = new JSDOM(html).window.document;
const metaRu = { title: ru.title, desc: ru.querySelector('meta[name=description]').content };
const setLd = (src, json) => src.replace(/(<script type="application\/ld\+json" id="ld">)[\s\S]*?(<\/script>)/, (_, a, b) => `${a}${json}${b}`);
html = setLd(html, ld(ru, 'ru', `${SITE}/`, metaRu.title, metaRu.desc, faqOf(ru, false)));
wr('index.html', html);

// 4. English page
const dom = new JSDOM(html), doc = dom.window.document;
doc.documentElement.lang = 'en';
for (const el of [...doc.querySelectorAll('*')]) {
  for (const a of [...el.attributes]) {
    if (a.name === 'data-en') { el.innerHTML = a.value; el.removeAttribute(a.name); }
    else if (a.name.startsWith('data-en-')) { el.setAttribute(a.name.slice(8), a.value); el.removeAttribute(a.name); }
  }
}
const enTitle = doc.title, enDesc = doc.querySelector('meta[name=description]').content;
doc.getElementById('ld').textContent = ld(doc, 'en', `${SITE}/en/`, enTitle, enDesc, faqOf(ru, true).map(([q, a], i) => [q, a]));
doc.head.prepend(doc.createComment(' GENERATED by scripts/build-site.mjs from /index.html — edit index.html (data-en attributes), not this file '));
wr('en/index.html', dom.serialize());

// leftover Russian text in the English page (marquee is decorative: law names)
const left = [...doc.querySelectorAll('body *')].filter((e) => !e.closest('.marquee') && e.tagName !== 'OPTION' && ![...e.childNodes].every((n) => n.nodeType !== 3 || !/[А-Яа-яЁё]/.test(n.nodeValue)));
if (left.length) console.warn('WARNING: Russian text left in /en/:', left.map((e) => e.textContent.trim().slice(0, 50)));

// 5. sitemap + robots
const alt = (l, h) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${h}"/>`;
const urls = [[`${SITE}/`, 'ru', 1.0], [`${SITE}/en/`, 'en', 0.9]].map(([u]) =>
  `  <url>\n    <loc>${u}</loc>\n    <lastmod>${RELEASED}</lastmod>\n    <changefreq>monthly</changefreq>\n${[alt('ru', `${SITE}/`), alt('en', `${SITE}/en/`), alt('x-default', `${SITE}/`)].join('\n')}\n  </url>`).join('\n');
wr('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<!-- PGX Cookies Widget · Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX> · SPDX-License-Identifier: GPL-3.0-only -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
wr('robots.txt', rd('robots.txt').replace(/Sitemap: .*/, `Sitemap: ${SITE}/sitemap.xml`));
console.log(`site: index.html (ru), en/index.html, sitemap.xml, robots.txt → ${SITE}`);
