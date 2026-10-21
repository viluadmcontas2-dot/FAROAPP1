// Tela Conta no navegador real, com a nuvem FALSA (tests/helpers/conta-harness-entry.js): entrar, criar conta, sair, conflito,
// assinatura "em breve" (cobrança desligada) e checkout/portal (cobrança ligada; a URL do Stripe nunca navega). Zero erro de console.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../src/core/actions.js';
import { calc } from '../src/core/calc.js';
import { defaultState } from '../src/core/state.js';
import { todayISO } from '../src/core/dates.js';
import { R } from '../src/core/money.js';
import { browserAvailable, serve, launch, forceStandalone, prepareShots, cleanup, watchErrors } from './helpers/e2e-app.mjs';
import { buildHarness } from './helpers/conta-harness.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright não encontrados (veja tests/helpers/e2e-app.mjs)';
const VIEWPORTS = [{ name: 'celular', width: 390, height: 844 }, { name: 'tela-larga', width: 1280, height: 800 }];

const today = todayISO(), ctx = { today };
const onboarded = reduce(defaultState(), { type: 'onboarding/complete', payload: {} }, ctx);
let withDay = reduce(onboarded, { type: 'entry/add', payload: { kind: 'in', plat: 'uber', amount: 150 } }, ctx);
withDay = reduce(withDay, { type: 'day/close', payload: { p: { uber: 150 }, km: 100, h: 9 } }, ctx);
const lucroLocal = R(calc(withDay, today).month.lucro);
const blob = state => JSON.stringify({ v: 2, rev: 1, dirty: false, savedAt: Date.now(), state });

let dir, server, browser;
test.before(async () => { if (skip) return; dir = await buildHarness(); server = await serve(dir); browser = await launch(); });
test.after(async () => { if (browser) await browser.close(); if (server) await server.close(); if (dir) cleanup(dir); });

const ICON = '[\\s\\uE000-\\uF8FF]*';
const button = (page, name) => page.getByRole('button', { name: new RegExp(`^${ICON}${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${ICON}$`) });
const text = page => page.evaluate(() => document.body.innerText);
const hasText = (page, t, timeout = 8000) => page.waitForFunction(x => document.body.innerText.includes(x), t, { timeout });
const noText = (page, t) => page.waitForFunction(x => !document.body.innerText.includes(x), t);

// abre o app com a nuvem falsa configurada (`cfg`) e, se pedido, dados locais já prontos
async function open(vp, cfg = {}, { local = null } = {}) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
  await context.addInitScript(c => { window.__FARO_TEST__ = c; }, cfg);
  if (local) await context.addInitScript(b => { try { if (!localStorage.getItem('faro-v2-state')) localStorage.setItem('faro-v2-state', b); } catch { /* ok */ } }, blob(local));
  const page = await context.newPage();
  const errors = watchErrors(page);
  page.on('dialog', d => d.accept());
  await page.goto(server.url);
  return { context, page, errors, shot: async name => { await page.waitForTimeout(600); await page.screenshot({ path: `${prepareShots()}/${vp.name}-conta-${name}.png` }); } };
}
const USERS = { 'motorista@faro.app': { id: 'id-1', password: 'senha-forte-1', confirmed: true } };
const redirects = page => page.evaluate(() => window.__redirects);
const goConta = async page => { await button(page, 'Jornada').or(page.getByRole('button', { name: /Jornada/ })).first().click(); const dica = button(page, 'Entendi'); if (await dica.count()) await dica.first().click(); await page.getByRole('button', { name: /Nuvem, backup e assinatura/ }).click(); await hasText(page, 'Backup dos seus dados'); };
const fill = async (page, email, senha) => { await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(senha); };

for (const vp of VIEWPORTS) {
  test(`criar conta, entrar e sair · assinatura "em breve" com cobrança desligada · ${vp.name}`, { skip }, async () => {
    const { context, page, errors, shot } = await open(vp, { users: { 'motorista@faro.app': { id: 'id-1', password: 'senha-forte-1', confirmed: false } } });
    await hasText(page, 'Ver meu lucro de verdade');
    await button(page, 'Já uso o Faro · Entrar').click(); // abre a tela Conta direto do onboarding
    await hasText(page, 'Entrar na conta');
    const body = await text(page);
    assert.match(body, /Assinatura abre em breve/);
    assert.equal(await button(page, 'Começar 7 dias grátis').count(), 0, 'sem botão de assinatura enquanto a cobrança está desligada');
    assert.match(body, /Faro 9\.9\.9/, 'mostra a versão do app');
    assert.match(body, /Sem conta, seus dados ficam só neste aparelho/);
    await shot('entrar');

    // erro diz o que fazer
    await fill(page, 'motorista@faro.app', 'senha-errada');
    await button(page, 'Entrar').click();
    await hasText(page, 'E-mail ou senha não conferem');
    // e-mail ainda não confirmado
    await fill(page, 'motorista@faro.app', 'senha-forte-1');
    await button(page, 'Entrar').click();
    await hasText(page, 'Confirme seu e-mail antes de entrar');

    // mostrar/ocultar senha
    const pw = page.getByLabel('Senha');
    assert.equal(await pw.getAttribute('type'), 'password');
    await button(page, 'Mostrar').click();
    assert.equal(await pw.getAttribute('type'), 'text');
    await button(page, 'Ocultar').click();
    assert.equal(await pw.getAttribute('type'), 'password');

    // esqueci a senha: sem e-mail pede o e-mail; com e-mail avisa o envio
    await page.getByLabel('E-mail').fill('');
    await button(page, 'Esqueci a senha').click();
    await hasText(page, 'Digite seu e-mail para recuperar a senha');
    await page.getByLabel('E-mail').fill('motorista@faro.app');
    await button(page, 'Esqueci a senha').click();
    await hasText(page, 'Enviamos o link para criar uma nova senha em motorista@faro.app');

    // criar conta (a confirmação por e-mail é obrigatória: não entra sozinho)
    await button(page, 'Criar conta').click();
    await hasText(page, 'Criar sua conta');
    await fill(page, 'novo@faro.app', 'curta');
    await button(page, 'Criar conta').click();
    await hasText(page, 'Sua senha precisa ter pelo menos 8 caracteres');
    await fill(page, 'novo@faro.app', 'senha-forte-2');
    await button(page, 'Criar conta').click();
    await hasText(page, 'Enviamos um link para novo@faro.app');
    await hasText(page, 'Entrar na conta'); // volta para o modo Entrar
    await shot('conta-criada');

    // confirma o e-mail e entra
    await page.evaluate(() => { window.__server.users.get('motorista@faro.app').confirmed = true; });
    await fill(page, 'motorista@faro.app', 'senha-forte-1');
    await button(page, 'Entrar').click();
    await hasText(page, 'Você entrou na conta');
    await hasText(page, 'Tudo salvo na nuvem');
    assert.match(await text(page), /motorista@faro\.app/);
    assert.equal(await button(page, 'Entrar').count(), 0);
    await shot('logado');

    // sair
    await button(page, 'Sair da conta').click();
    await hasText(page, 'Você saiu da conta');
    await hasText(page, 'Entrar na conta');
    assert.match(await text(page), /Sem conta, seus dados ficam só neste aparelho/);
    assert.deepEqual(errors, [], errors.join('\n'));
    await context.close();
  });

  test(`conflito: duas escolhas explícitas e confirmação antes de substituir · ${vp.name}`, { skip }, async () => {
    const remote = onboarded; // a nuvem tem outros dados que este aparelho
    const cfg = { users: USERS, states: { 'id-1': { schema_version: 2, revision: 3, state: remote, device_id: 'outro', last_mutation_id: 'm0', server_updated_at: '2026-10-20T15:30:00Z' } } };
    const { context, page, errors, shot } = await open(vp, cfg, { local: withDay });
    await hasText(page, 'Lucro de verdade de hoje');
    await goConta(page);
    await fill(page, 'motorista@faro.app', 'senha-forte-1');
    await button(page, 'Entrar').click();
    await hasText(page, 'Escolha quais dados manter');
    const body = await text(page);
    assert.match(body, /A nuvem tem dados diferentes/);
    assert.match(body, /salvo em 20\/10 às/, 'mostra a data do que está na nuvem');
    assert.ok(body.includes(`Lucro do mês ${lucroLocal} · 1 dia fechado`), 'mostra o lucro do que está neste aparelho');
    assert.match(body, /Ainda sem dias fechados/, 'mostra o resumo da nuvem');
    await shot('conflito');
    // sem escolha padrão: nada muda até confirmar
    assert.equal((await page.evaluate(() => window.__server.states.get('id-1').revision)), 3);

    // voltar desiste
    await button(page, 'Manter os dados da nuvem').click();
    await hasText(page, 'Manter os dados da nuvem?');
    await shot('conflito-confirmar');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Voltar' }).click();
    await noText(page, 'Manter os dados da nuvem?');
    assert.equal((await page.evaluate(() => window.__server.states.get('id-1').revision)), 3);

    // usar este aparelho: a nuvem passa a ter o dia fechado
    await button(page, 'Usar os dados deste aparelho').click();
    await hasText(page, 'Usar os dados deste aparelho?');
    await button(page, 'Confirmar').click();
    await hasText(page, 'Dados deste aparelho enviados');
    await hasText(page, 'Tudo salvo na nuvem');
    const sent = await page.evaluate(() => window.__server.states.get('id-1'));
    assert.equal(sent.revision, 4);
    assert.equal(sent.state.recs[today].closed, true, 'a nuvem recebeu o dia fechado deste aparelho');
    assert.deepEqual(await page.evaluate(() => document.body.innerText.includes('Escolha quais dados manter')), false);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('conflito: manter a nuvem troca os dados deste aparelho', { skip }, async () => {
  const remote = reduce(onboarded, { type: 'entry/add', payload: { kind: 'in', plat: 'n99', amount: 80 } }, ctx);
  const cfg = { users: USERS, states: { 'id-1': { schema_version: 2, revision: 7, state: remote, device_id: 'outro', last_mutation_id: 'm0', server_updated_at: '2026-10-20T15:30:00Z' } } };
  const { context, page, errors } = await open(VIEWPORTS[0], cfg, { local: withDay });
  await hasText(page, 'Lucro de verdade de hoje');
  await goConta(page);
  await fill(page, 'motorista@faro.app', 'senha-forte-1');
  await button(page, 'Entrar').click();
  await hasText(page, 'Escolha quais dados manter');
  await button(page, 'Manter os dados da nuvem').click();
  await button(page, 'Confirmar').click();
  await hasText(page, 'Dados da nuvem mantidos');
  await hasText(page, 'Tudo salvo na nuvem');
  await page.waitForTimeout(700);
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('faro-v2-state')).state);
  assert.ok(!local.recs[today] || !local.recs[today].closed, 'o dia fechado deste aparelho foi substituído');
  assert.equal(await page.evaluate(() => window.__server.states.get('id-1').revision), 7, 'a nuvem não foi tocada');
  assert.deepEqual(errors, []);
  await context.close();
});

test('cobrança ligada: sem sessão só aparece a tela Conta (paywall), sem apagar dados', { skip }, async () => {
  const { context, page, errors, shot } = await open(VIEWPORTS[0], { billing: true, users: USERS, invoke: { 'criar-checkout-faro': { url: 'https://checkout.stripe.com/c/pay/cs_test_falso' }, 'abrir-portal-faro': { url: 'https://billing.stripe.com/p/session/falso' } } }, { local: onboarded });
  await hasText(page, 'Entre ou crie sua conta para usar o Faro');
  assert.equal(await page.getByRole('button', { name: 'Voltar' }).count(), 0, 'sem botão de voltar no paywall');
  assert.doesNotMatch(await text(page), /Lucro de verdade|Início|Plano/, 'o app não aparece');
  await shot('paywall-entrar');

  // entra, mas ainda sem assinatura: vê a oferta e continua bloqueado
  await fill(page, 'motorista@faro.app', 'senha-forte-1');
  await button(page, 'Entrar').click();
  await hasText(page, 'Sem assinatura');
  assert.match(await text(page), /Comece o teste grátis para usar o Faro/);
  assert.doesNotMatch(await text(page), /Lucro de verdade/);
  await shot('paywall-assinar');
  await button(page, 'Começar 7 dias grátis').click();
  await page.waitForFunction(() => window.__redirects.length === 1);
  assert.deepEqual(await redirects(page), ['https://checkout.stripe.com/c/pay/cs_test_falso']);
  assert.match(page.url(), /127\.0\.0\.1/, 'a URL de checkout falsa nunca navega');
  assert.notEqual(await page.evaluate(() => localStorage.getItem('faro-v2-state')), null, 'os dados locais continuam lá');
  assert.deepEqual(errors, []);
  await context.close();
});

test('cobrança ligada: teste grátis libera o app e a tela Conta mostra os dias e "Gerenciar assinatura"', { skip }, async () => {
  const end = new Date(Date.now() + 6 * 86400000 - 3600000).toISOString();
  const cfg = { billing: true, users: USERS, subs: { 'id-1': { status: 'trialing', stripe_customer_id: 'cus_1', current_period_end: end, cancel_at_period_end: false } }, invoke: { 'abrir-portal-faro': { url: 'https://billing.stripe.com/p/session/falso' } } };
  const { context, page, errors, shot } = await open(VIEWPORTS[0], cfg, { local: onboarded });
  await hasText(page, 'Entre ou crie sua conta');
  await fill(page, 'motorista@faro.app', 'senha-forte-1');
  await button(page, 'Entrar').click();
  await hasText(page, 'Primeiros passos no Faro'); // liberado
  await goConta(page);
  await hasText(page, 'Teste grátis');
  assert.match(await text(page), /Faltam 6 dias do teste grátis/);
  await shot('assinatura-teste');
  await button(page, 'Gerenciar assinatura').click();
  await page.waitForFunction(() => window.__redirects.length === 1);
  assert.deepEqual(await redirects(page), ['https://billing.stripe.com/p/session/falso']);
  assert.deepEqual(errors, []);
  await context.close();
});

test('cobrança ligada: pagamento pendente bloqueia e pede "Atualizar pagamento"; cancelada pede "Assinar de novo"', { skip }, async () => {
  for (const [status, label, intro] of [['past_due', 'Atualizar pagamento', 'Pagamento pendente'], ['canceled', 'Assinar de novo', 'Assinatura cancelada']]) {
    const end = new Date(Date.now() + 5 * 86400000).toISOString();
    const cfg = { billing: true, users: USERS, subs: { 'id-1': { status, stripe_customer_id: 'cus_1', current_period_end: end, cancel_at_period_end: false } } };
    const { context, page, errors } = await open(VIEWPORTS[0], cfg, { local: onboarded });
    await hasText(page, 'Entre ou crie sua conta');
    await fill(page, 'motorista@faro.app', 'senha-forte-1');
    await button(page, 'Entrar').click();
    await hasText(page, intro);
    await button(page, label).waitFor();
    assert.doesNotMatch(await text(page), /Lucro de verdade/, `${status}: o app fica bloqueado`);
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test('aviso "Nova versão disponível" chama apply() em "Atualizar agora"', { skip }, async () => {
  const { context, page, errors, shot } = await open(VIEWPORTS[0], {}, { local: onboarded });
  await hasText(page, 'Primeiros passos no Faro');
  await goConta(page);
  assert.equal(await button(page, 'Atualizar agora').count(), 0);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('faro:sw-update', { detail: { apply: () => { window.__applied = true; } } })));
  await hasText(page, 'Nova versão disponível');
  await shot('nova-versao');
  await button(page, 'Atualizar agora').click();
  assert.equal(await page.evaluate(() => window.__applied), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test('o app só abre instalado, mesmo com a cobrança desligada (sem atalho)', { skip }, async () => {
  const context = await (await launch({ standalone: false })).newContext({ viewport: VIEWPORTS[0] });
  const page = await context.newPage();
  await page.goto(server.url + '?dev=1');
  await hasText(page, 'O Faro é um app de celular');
  assert.doesNotMatch(await text(page), /Ver meu lucro de verdade/);
  await context.browser().close();
});
