/*
 * PGX Cookies Widget — example: API usage
 * Copyright (C) 2026 PsyGioX <https://github.com/PsyGioX>
 * SPDX-License-Identifier: GPL-3.0-only
 */
const P = window.PsyCookies;
const out = document.getElementById('events');
const log = (...a) => { out.textContent = a.join(' ') + '\n' + out.textContent; };

// start manually (the script tag has data-manual) and extend the configuration in code
P.init({
  categories: [{ id: 'chat', labels: { en: { title: 'Live chat', desc: 'Support widget.' }, de: { title: 'Live-Chat' } } }],
  cookieRules: [{ match: '^chat_', category: 'chat', vendor: 'MyChat' }],
  tokens: { accent: '#7dff2e', accentFg: '#0a0c08', radius: '20px' },
});

P.on('cookie', (e) => log('cookie', e.type, e.name, `(${e.category})`));
P.on('consent', (e) => log('consent', 'granted:', e.granted.join(',') || '-', 'revoked:', e.revoked.join(',') || '-'));
P.on('violation', (e) => log('violation', e.name, e.action));

P.live.mount('#monitor');                       // the same real-time panel as in the dialog
document.getElementById('a').onclick = () => P.accept();
document.getElementById('r').onclick = () => P.reject();
document.getElementById('x').onclick = () => P.reset();
document.getElementById('g').onclick = () => { document.cookie = '_ga=GA1.2.1; path=/'; };
document.getElementById('p').onclick = () => { document.cookie = 'PHPSESSID=abc; path=/'; };
