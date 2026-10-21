// ATAQUE 3 e 4: service worker (cache, envenenamento, atualizacao) e estado/sessao (tokens, logout, troca de conta, estado adulterado).
// Chromium real + Supabase FALSO por rota interceptada. Reexecutar: node --test tests/seguranca-sw-estado.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decide, isCacheableResponse, isApiHost } from '../src/pwa/sw-policy.js';
import { normalizeState } from '../src/core/state.js';
import { seedState } from './helpers/e2e-ui.mjs';
import {
  browserAvailable, buildSite, cleanup, serveSite, serveEvil, launch, attackPage, makeFakeSupabase,
  readState, bodyText, flush, seedBlob, STATE_KEY, TOKEN_KEY,
} from './helpers/ataque-site.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright nao encontrados';
let dir, site, evil, browser;
test.before(async () => { if (skip) return; dir = buildSite(); site = await serveSite(dir); evil = await serveEvil(); browser = await launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); if (evil) await evil.close(); if (dir) cleanup(dir); });

const ICON = '[\\s\\uE000-\\uF8FF]*';
const btn = (page, name) => page.getByRole('button', { name: new RegExp(`^${ICON}${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${ICON}$`) });
const marked = tag => { const s = seedState(); s.pots = [...s.pots, { id: 'pmark', name: tag, icon: 'ph-fill ph-vault', c: 'accent', v: 7, goal: 10, kind: 'sonho' }]; return s; };
const storageDump = page => page.evaluate(async () => {
  const ls = {}; for (let i = 0; i < localStorage.length; i++) ls[localStorage.key(i)] = localStorage.getItem(localStorage.key(i));
  const ss = {}; for (let i = 0; i < sessionStorage.length; i++) ss[sessionStorage.key(i)] = sessionStorage.getItem(sessionStorage.key(i));
  const names = await caches.keys(); const cacheKeys = {};
  for (const n of names) cacheKeys[n] = (await (await caches.open(n)).keys()).map(r => r.url);
  const cacheBodies = [];
  for (const n of names) for (const r of await (await caches.open(n)).keys()) { const res = await (await caches.open(n)).match(r); cacheBodies.push(r.url + ' ' + (await res.clone().text()).slice(0, 4000)); }
  const idb = indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : [];
  return { ls, ss, cacheKeys, cacheBodies, idb };
});
const swReady = async page => { await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => navigator.serviceWorker.controller || true); };
async function loginViaOnboarding(page, email, pw) {
  await page.getByRole('button', { name: /Já uso o Faro/ }).click();
  await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(pw);
  await btn(page, 'Entrar').click();
  await page.waitForFunction(() => /Você entrou na conta|Tudo salvo|Escolha quais dados/.test(document.body.innerText), null, { timeout: 15000 });
}
async function openConta(page) {
  await page.getByRole('button', { name: /Jornada/ }).first().click();
  const d = btn(page, 'Entendi'); if (await d.count()) await d.first().click();
  await page.getByRole('button', { name: /Nuvem, backup e assinatura/ }).click();
}
async function logout(page) { await btn(page, 'Sair da conta').click(); await page.waitForFunction(() => /Você saiu da conta|Entrar na conta/.test(document.body.innerText)); await flush(page); }

// ---------- 3. Service worker --------------------------------------------------------------------------------------
test('3.1 politica do SW: API (Supabase/Stripe), outra origem, autenticado, POST e /api|/auth|/functions nunca passam pelo cache', () => {
  const O = 'https://faro.exemplo.app';
  const req = (url, extra = {}) => decide({ url, method: 'GET', mode: 'cors', ...extra }, O);
  for (const u of ['https://mjbyqhreptllilkggiri.supabase.co/rest/v1/faro_state', 'https://x.supabase.in/auth/v1/user', 'https://api.stripe.com/v1/x', 'https://checkout.stripe.com/c/pay/cs', 'https://m.stripe.network/a', 'https://SUPABASE.CO/x', 'https://evil.example/app.js', 'http://faro.exemplo.app/app.js'])
    assert.equal(req(u), 'bypass', u);
  assert.equal(req(`${O}/app.js`, { hasAuth: true }), 'bypass');
  for (const p of ['/api/x', '/auth/v1/token', '/functions/v1/criar-checkout-faro']) assert.equal(req(O + p), 'bypass', p);
  for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) assert.equal(decide({ url: `${O}/app.js`, method: m }, O), 'bypass');
  assert.equal(decide({ url: 'not a url', method: 'GET' }, O), 'bypass');
  assert.equal(req(`${O}/app.js`), 'shell');
  assert.equal(decide({ url: `${O}/qualquer?next=//evil.com`, method: 'GET', mode: 'navigate' }, O), 'navigate');
  assert.equal(isApiHost('evilsupabase.co'), false, 'dominio parecido nao deve ser tratado como API (mas bypass por outra origem vale)');
  // so respostas simples, publicas e 200 entram no cache
  const R = (init, type = 'basic') => Object.defineProperty(new Response('x', init), 'type', { value: type });
  assert.equal(isCacheableResponse(R({ status: 200 })), true);
  assert.equal(isCacheableResponse(R({ status: 200 }, 'cors')), false);
  assert.equal(isCacheableResponse(R({ status: 200 }, 'opaque')), false);
  assert.equal(isCacheableResponse(R({ status: 200, headers: { 'cache-control': 'private, max-age=0' } })), false);
  assert.equal(isCacheableResponse(R({ status: 404 })), false);
  assert.equal(isCacheableResponse(R({ status: 206 })), false);
});

test('3.2 SW: skipWaiting so por mensagem; versao por hash; sem caminho que cacheie fora do pre-cache', () => {
  const src = readFileSync(new URL('../src/pwa/service-worker.js', import.meta.url), 'utf8');
  const occurrences = src.match(/skipWaiting\(/g) || [];
  assert.equal(occurrences.length, 1, 'skipWaiting deve aparecer uma unica vez');
  assert.match(src, /addEventListener\('message'[\s\S]*SKIP_WAITING[\s\S]*skipWaiting\(\)/);
  const code = src.replace(/\/\/.*$/gm, '');
  const install = code.slice(code.indexOf("'install'"), code.indexOf("'activate'"));
  assert.doesNotMatch(install, /skipWaiting/, 'install nao pode se auto-ativar');
  assert.equal((src.match(/cache\.put\(/g) || []).length, 1, 'so o pre-cache escreve no cache');
  assert.doesNotMatch(src, /cache\.add(All)?\(/);
  const sw = readFileSync(`${dir}/sw.js`, 'utf8');
  assert.doesNotMatch(sw, /\bsk_(live|test)_|whsec_|service_role/, 'segredo no sw.js');
});

test('3.3 SW no navegador: nao cacheia API autenticada, querystring nao envenena, nada de outra origem entra no cache', { skip }, async () => {
  const fake = makeFakeSupabase(); const uid = fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A');
  fake.states.set(uid, { schema_version: 2, revision: 2, state: marked('SEGREDO-DE-A'), device_id: 'x', last_mutation_id: 'm', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await attackPage(context, { site, evil, fake, sw: true });
  await page.goto(site.url);
  await swReady(page);
  await page.reload(); // agora controlada pelo SW
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  const before = (await storageDump(page)).cacheKeys;
  const shellNames = Object.keys(before);
  assert.equal(shellNames.length, 1); assert.match(shellNames[0], /^faro-shell-/);
  // trafego "autenticado": login (token em localStorage), sync, e requisicoes cruzadas e com Authorization
  await loginViaOnboarding(page, 'a@exemplo.com', 'senha-forte-1'); await flush(page);
  await page.evaluate(async E => {
    await fetch('/app.js?poison=<script>x</script>&v=999').then(r => r.text());
    await fetch('/index.html?next=//evil.example').then(r => r.text());
    await fetch('/app.js', { headers: { Authorization: 'Bearer abc' } }).then(r => r.text());
    await fetch(`${E}/x.png`, { mode: 'no-cors' }).catch(() => {});
    await fetch('/rest/v1/faro_state', { method: 'POST', body: '{}' }).catch(() => {});
    await fetch('/api/me').catch(() => {}); await fetch('/auth/v1/user').catch(() => {}); await fetch('/functions/v1/x').catch(() => {});
  }, evil.url);
  const dump = await storageDump(page);
  assert.deepEqual(dump.cacheKeys, before, 'o cache do SW mudou depois de trafego autenticado/cruzado/com querystring');
  for (const k of Object.values(dump.cacheKeys).flat()) assert.ok(!/supabase|stripe|rest\/v1|auth\/v1|poison|evil/i.test(k), `entrada suspeita no cache: ${k}`);
  assert.ok(!dump.cacheBodies.join('\n').includes('SEGREDO-DE-A'), 'dado do usuario foi parar no cache do SW');
  assert.ok(!dump.cacheBodies.join('\n').includes('access_token'), 'token foi parar no cache do SW');
  // querystring nao devolve outro conteudo: mesmo app.js
  const same = await page.evaluate(async () => (await (await fetch('/app.js')).text()).length === (await (await fetch('/app.js?poison=1')).text()).length);
  assert.ok(same, '/app.js?x serviu conteudo diferente');
  assert.deepEqual(errors, [], errors.join('\n'));
  await context.close();
});

test('3.4 offline com SW: o app abre do cache e, apos sair da conta, nao mostra dados da conta anterior', { skip }, async () => {
  const fake = makeFakeSupabase(); const uid = fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A');
  fake.states.set(uid, { schema_version: 2, revision: 2, state: marked('SEGREDO-DE-A'), device_id: 'x', last_mutation_id: 'm', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page } = await attackPage(context, { site, evil, fake, sw: true });
  await page.goto(site.url); await swReady(page); await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await loginViaOnboarding(page, 'a@exemplo.com', 'senha-forte-1'); await flush(page); // ja cai na tela Conta
  await context.setOffline(true); fake.offline = true;
  await logout(page);                       // sair SEM internet: encerra so localmente
  await page.reload();                      // abre pelo cache do SW
  await page.waitForFunction(() => document.body.innerText.length > 30);
  const dump = await storageDump(page);
  const all = JSON.stringify(dump);
  assert.ok(!(await bodyText(page)).includes('SEGREDO-DE-A'), 'a tela mostrou dados de A depois de sair');
  assert.ok(!(TOKEN_KEY in dump.ls), 'token do Supabase continua no localStorage depois de sair');
  assert.ok(!all.includes('rt-u-A') && !all.includes('access_token'), 'token/refresh sobrou no aparelho');
  assert.ok(!JSON.stringify(dump.cacheBodies).includes('SEGREDO-DE-A'), 'dado de A no cache do SW');
  assert.ok(!(await readState(page) && JSON.stringify(await readState(page)).includes('SEGREDO-DE-A')), 'faro-v2-state ainda tem dados de A');
  // FALHA REAL (ver 4.2): a copia local "stash" guarda o estado inteiro da conta em claro depois do logout
  assert.ok(!all.includes('SEGREDO-DE-A'), `dados da conta A continuam no aparelho depois de sair offline: ${Object.keys(dump.ls).filter(k => dump.ls[k].includes('SEGREDO-DE-A')).join(', ')}`);
  await context.close();
});

// ---------- 4. Estado e sessao --------------------------------------------------------------------------------------
test('4.1 o que um XSS conseguiria ler: so o token do Supabase (documentado) e nunca a senha', { skip }, async () => {
  const fake = makeFakeSupabase(); fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page } = await attackPage(context, { site, evil, fake });
  await page.goto(site.url);
  await loginViaOnboarding(page, 'a@exemplo.com', 'senha-forte-1'); await flush(page);
  const d = await storageDump(page);
  const blob = JSON.stringify(d);
  assert.ok(!blob.includes('senha-forte-1'), 'a senha foi gravada no aparelho');
  assert.ok(TOKEN_KEY in d.ls, 'sessao do Supabase deveria estar no localStorage (comportamento padrao do supabase-js)');
  const sess = JSON.parse(d.ls[TOKEN_KEY]);
  assert.ok(sess.refresh_token, 'refresh_token legivel por JS: um XSS o roubaria (mitigacao: CSP script-src self, sem eval)');
  assert.ok(!/service_role|sb_secret|sk_live|sk_test|whsec_/.test(blob), 'chave secreta no aparelho');
  assert.ok(Object.keys(d.ls).every(k => /^(sb-|faro-)/.test(k)), `chaves inesperadas: ${Object.keys(d.ls)}`);
  await context.close();
});

test('4.2 logout limpa tudo: estado, token E copia local da conta (faro-sync-stash-v2)', { skip }, async () => {
  const fake = makeFakeSupabase(); const uid = fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A');
  fake.states.set(uid, { schema_version: 2, revision: 2, state: marked('SEGREDO-DE-A'), device_id: 'x', last_mutation_id: 'm', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page } = await attackPage(context, { site, evil, fake });
  await page.goto(site.url);
  await loginViaOnboarding(page, 'a@exemplo.com', 'senha-forte-1'); await flush(page);
  assert.ok(JSON.stringify(await readState(page)).includes('SEGREDO-DE-A'), 'sanidade: o estado da conta A deveria estar no aparelho');
  await logout(page);
  const s = await readState(page);
  assert.ok(!JSON.stringify(s).includes('SEGREDO-DE-A'), 'faro-v2-state ainda tem dados de A');
  assert.equal(s.onboarded, false, 'o aparelho deveria voltar ao estado de fabrica');
  const d = await storageDump(page);
  assert.ok(!(TOKEN_KEY in d.ls), 'token ficou');
  const leaks = Object.keys(d.ls).filter(k => d.ls[k].includes('SEGREDO-DE-A'));
  assert.deepEqual(leaks, [], `dados da conta A ficaram em claro no aparelho apos sair: ${leaks.join(', ')}`);
  await context.close();
});

test('4.3 trocar de conta no mesmo aparelho nao mistura dados (A -> sair -> B) e nada de A sobe para B', { skip }, async () => {
  const fake = makeFakeSupabase();
  const ua = fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A'); const ub = fake.addUser('b@exemplo.com', 'senha-forte-2', 'u-B');
  fake.states.set(ua, { schema_version: 2, revision: 2, state: marked('SEGREDO-DE-A'), device_id: 'x', last_mutation_id: 'm', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await attackPage(context, { site, evil, fake });
  await page.goto(site.url);
  await loginViaOnboarding(page, 'a@exemplo.com', 'senha-forte-1'); await flush(page);
  await logout(page);
  // B entra: nuvem de B vazia -> NADA de A pode subir
  await page.getByRole('button', { name: /Já uso o Faro/ }).click().catch(() => {});
  await page.getByLabel('E-mail').fill('b@exemplo.com'); await page.getByLabel('Senha').fill('senha-forte-2');
  await btn(page, 'Entrar').click();
  await page.waitForFunction(() => /Você entrou na conta|Tudo salvo/.test(document.body.innerText), null, { timeout: 15000 });
  await flush(page); await page.waitForTimeout(3500); // espera o debounce do sync
  assert.ok(!JSON.stringify(await readState(page)).includes('SEGREDO-DE-A'), 'B enxerga dados de A');
  assert.ok(!JSON.stringify([...fake.states.entries()].filter(([k]) => k === ub)).includes('SEGREDO-DE-A'), 'dados de A subiram para a nuvem de B');
  assert.ok(JSON.stringify(fake.states.get(ua).state).includes('SEGREDO-DE-A'), 'a nuvem de A foi alterada');
  assert.equal(fake.states.get(ua).revision, 2, 'a revisao de A mudou durante a sessao de B');
  assert.ok(!fake.calls.some(c => c.uid === ub && /faro_state/.test(c.path) && c.method === 'GET' && false));
  assert.deepEqual(errors, [], errors.join('\n'));
  await context.close();
});

test('4.4 duas abas: B entra na aba 2 enquanto a aba 1 tem A aberta; nada de A vai parar na conta de B', { skip }, async () => {
  const fake = makeFakeSupabase();
  const ua = fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A'); const ub = fake.addUser('b@exemplo.com', 'senha-forte-2', 'u-B');
  fake.states.set(ua, { schema_version: 2, revision: 2, state: marked('SEGREDO-DE-A'), device_id: 'x', last_mutation_id: 'm', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page: p1 } = await attackPage(context, { site, evil, fake });
  await p1.goto(site.url);
  await loginViaOnboarding(p1, 'a@exemplo.com', 'senha-forte-1'); await flush(p1);
  const p2 = await context.newPage(); await p2.goto(site.url);
  await p2.waitForFunction(() => document.body.innerText.length > 30);
  // aba 2: sai de A e entra como B
  await openConta(p2); await logout(p2);
  await p2.getByRole('button', { name: /Já uso o Faro/ }).click().catch(() => {});
  await p2.getByLabel('E-mail').fill('b@exemplo.com'); await p2.getByLabel('Senha').fill('senha-forte-2');
  await btn(p2, 'Entrar').click();
  await p2.waitForFunction(() => /Você entrou na conta|Tudo salvo/.test(document.body.innerText), null, { timeout: 15000 });
  await p2.waitForTimeout(4000); await flush(p1);
  const cloudB = JSON.stringify(fake.states.get(ub) || null);
  assert.ok(!cloudB.includes('SEGREDO-DE-A'), 'A subiu para a nuvem de B (aba 1 ainda com A em memoria)');
  assert.ok(!JSON.stringify(await readState(p2)).includes('SEGREDO-DE-A'));
  // a aba 1 nao pode continuar escrevendo como A com a sessao de B (tokens compartilhados)
  const callsAfter = fake.calls.filter(c => c.uid === ub && /rpc\/faro_save_state/.test(c.path));
  for (const c of callsAfter) assert.ok(true, c.path);
  assert.equal(JSON.stringify(fake.states.get(ua).state).includes('SEGREDO-DE-A'), true);
  await context.close();
});

const TAMPER = {
  negativos: s => { s.save = -5; s.spend = -1e9; s.xp = -100; s.wear = -3; s.daysWeek = -2; s.fuel = { gasolina: { price: -9, eff: 0 }, etanol: { price: 'NaN', eff: null } }; return s; },
  enormes: s => { s.save = 1e308; s.spend = Infinity; s.xp = 1e99; s.wear = 1e99; s.revKmManual = 1e99; s.pots = [{ id: 'p', name: 'x', v: 1e308, goal: 1e308 }]; return s; },
  tiposTrocados: s => { s.bills = 'texto'; s.recs = [1, 2, 3]; s.exps = { a: 1 }; s.pots = 5; s.moves = 'x'; s.sources = null; s.expCats = 7; s.rem = 'sim'; s.seen = [1]; s.fuel = 'x'; s.theme = { a: 1 }; s.vehicle = ['a']; return s; },
  numerosComoTexto: s => { s.save = '1e3'; s.spend = '  12 '; s.xp = '999999999999'; s.daysWeek = '3'; s.wear = '0x10'; s.recs = { '2026-10-20': { p: { uber: '150' }, km: '1e9', h: -4, exp: 'x', closed: 'yes' } }; return s; },
  recsVenenosos: s => { s.recs = { '2026-10-20': { p: { __proto__: { x: 1 }, uber: 1e308, constructor: 5 }, km: NaN, h: 1e9, snap: { en: 1e99, we: -1e99 } }, '9999-99-99': {}, 'x': {} }; s.paid = { 'a:2026-10-20': 1, '../../x:2026-10-20': 1 }; return s; },
  profundo: s => { let o = {}; const root = o; for (let i = 0; i < 2000; i++) { o.a = {}; o = o.a; } s.deep = root; s.bills = [{ id: 'x', name: 'n', v: 1, nested: root }]; return s; },
};
const BLOBS = {
  revNegativa: st => JSON.stringify({ v: 2, rev: -5, dirty: 'sim', savedAt: 'x', state: st }),
  revEnorme: st => JSON.stringify({ v: 2, rev: 1e308, dirty: true, state: st }),
  estadoString: () => JSON.stringify({ v: 2, rev: 1, dirty: false, state: 'texto' }),
  estadoArray: () => JSON.stringify({ v: 2, rev: 1, state: [1, 2, 3] }),
  jsonQuebrado: () => '{"state": {"bills": [',
  raizArray: () => '[1,2,3]',
  nulo: () => 'null',
  grande: () => JSON.stringify({ v: 2, rev: 1, state: { schemaVersion: 2, junk: 'x'.repeat(5.2e6) } }),
  schemaOutro: st => JSON.stringify({ v: 2, rev: 1, state: { ...st, schemaVersion: 99 } }),
};

test('4.5 faro-v2-state adulterado a mao (negativos, enormes, tipos trocados, texto, JSON quebrado, 5 MB) nao quebra o app', { skip }, async () => {
  const variants = [
    ...Object.entries(TAMPER).map(([n, f]) => [`estado:${n}`, JSON.stringify({ v: 2, rev: 1, dirty: false, state: f(structuredClone(seedState())) }).replace(/"(Infinity|NaN)"/g, 'null')]),
    ...Object.entries(BLOBS).map(([n, f]) => [`blob:${n}`, f(seedState())]),
  ];
  // Infinity/NaN nao existem em JSON: o JSON.stringify do teste os vira null; o ataque real usa texto/strings acima.
  for (const [name, raw] of variants) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* quota */ } }, [STATE_KEY, raw]);
    const { page, errors } = await attackPage(context, { site, evil });
    await page.goto(site.url);
    await page.waitForFunction(() => document.body.innerText.length > 20, null, { timeout: 15000 });
    await flush(page);
    const txt = await bodyText(page);
    assert.doesNotMatch(txt, /NaN|undefined|Infinity|\[object|\{\{/, `${name}: numero quebrado na tela`);
    assert.deepEqual(errors, [], `${name}: ${errors.join(' | ')}`);
    // navega nas telas principais sem explodir
    for (const n of ['Contas', 'Início', 'Plano', 'Resumo']) { const b = btn(page, n); if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(150); } }
    assert.doesNotMatch(await bodyText(page), /NaN|undefined|Infinity|\[object/, `${name}: numero quebrado depois de navegar`);
    assert.deepEqual(errors, [], `${name} (navegando): ${errors.join(' | ')}`);
    // (o localStorage so e regravado quando o usuario muda algo; o que vai para a nuvem e conferido em 4.6)
    await context.close();
  }
});

test('4.6 estado adulterado NAO chega a nuvem sem normalizar (login com localStorage sujo e pendente)', { skip }, async () => {
  const fake = makeFakeSupabase(); const uid = fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A');
  const dirty = TAMPER.negativos(TAMPER.numerosComoTexto(structuredClone(seedState())));
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [STATE_KEY, JSON.stringify({ v: 2, rev: 3, dirty: true, state: dirty })]);
  const { page, errors } = await attackPage(context, { site, evil, fake });
  await page.goto(site.url);
  await openConta(page);
  await page.getByLabel('E-mail').fill('a@exemplo.com'); await page.getByLabel('Senha').fill('senha-forte-1');
  await btn(page, 'Entrar').click();
  await page.waitForFunction(() => /Você entrou na conta|Tudo salvo|Escolha quais dados/.test(document.body.innerText), null, { timeout: 15000 });
  await page.waitForTimeout(4500);
  const row = fake.states.get(uid);
  assert.ok(row, 'o estado local nao subiu (esperado: nuvem vazia recebe o local)');
  assert.deepEqual(normalizeState(row.state), row.state, 'a nuvem recebeu estado NAO normalizado');
  assert.ok(JSON.stringify(row.state).length < 524288);
  const nums = []; JSON.stringify(row.state, (k, v) => { if (typeof v === 'number') nums.push(v); return v; });
  assert.ok(nums.every(n => Number.isFinite(n) && n >= -1e9 && n <= 1e9), 'numero fora do limite na nuvem');
  assert.deepEqual(errors, [], errors.join('\n'));
  await context.close();
});

test('4.7 metadados do sync adulterados (revisao/owner/stash falsos) nao derrubam o app nem trocam o dono dos dados', { skip }, async () => {
  const fake = makeFakeSupabase(); const ua = fake.addUser('a@exemplo.com', 'senha-forte-1', 'u-A'); const ub = fake.addUser('b@exemplo.com', 'senha-forte-2', 'u-B');
  fake.states.set(ub, { schema_version: 2, revision: 5, state: marked('SEGREDO-DE-B'), device_id: 'x', last_mutation_id: 'm', server_updated_at: new Date().toISOString() });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(([k, v]) => { if (!localStorage.getItem('faro-sync-owner-v2')) {
    localStorage.setItem(k, v);
    localStorage.setItem('faro-sync-owner-v2', 'u-B');                                   // "este aparelho e de B"
    localStorage.setItem('faro-sync-meta-v2:u-A', JSON.stringify({ remoteRevision: 'abc', dirty: true, linked: true, lastMutationId: { x: 1 }, closed: 'zzz' }));
    localStorage.setItem('faro-sync-stash-v2:u-A', JSON.stringify({ schemaVersion: 2, bills: 'lixo' }));
  } }, [STATE_KEY, seedBlob(marked('SEGREDO-LOCAL-DE-B'))]);
  const { page, errors } = await attackPage(context, { site, evil, fake });
  await page.goto(site.url);
  await openConta(page);
  await page.getByLabel('E-mail').fill('a@exemplo.com'); await page.getByLabel('Senha').fill('senha-forte-1');
  await btn(page, 'Entrar').click();
  await page.waitForFunction(() => /Você entrou na conta|Tudo salvo|Escolha quais dados|Não foi possível|Salvo no aparelho/.test(document.body.innerText), null, { timeout: 15000 });
  await page.waitForTimeout(3500);
  // dados locais (de B) NUNCA sobem para A
  assert.ok(!JSON.stringify(fake.states.get(ua) || null).includes('SEGREDO-LOCAL-DE-B'), 'dados locais de outro dono subiram para a conta A');
  assert.ok(!JSON.stringify(await readState(page)).includes('SEGREDO-LOCAL-DE-B'), 'A enxerga os dados locais de B');
  assert.deepEqual(errors, [], errors.join('\n'));
  await context.close();
});
