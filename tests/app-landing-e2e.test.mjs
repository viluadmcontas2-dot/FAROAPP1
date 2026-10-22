// Landing de venda (fora do app instalado): promessa + preço + "Assinar e começar". Os passos de instalar SÓ aparecem depois da assinatura.
// Usa o app real com a nuvem FALSA (tests/helpers/conta-harness-entry.js): a URL do Stripe nunca navega, só fica registrada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { browserAvailable, serve, launch, prepareShots, cleanup, watchErrors } from './helpers/e2e-app.mjs';
import { buildHarness } from './helpers/conta-harness.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright não encontrados (veja tests/helpers/e2e-app.mjs)';
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 Instagram 330.0.0.20.114 (iPhone14,2; iOS 17_4)',
};
const PHONE = { width: 390, height: 844 };
const STRIPE = 'https://checkout.stripe.com/c/pay/cs_test_falso';
const USERS = {
  'motorista@faro.app': { id: 'id-1', password: 'senha-forte-1', confirmed: true },
  'outro@faro.app': { id: 'id-2', password: 'senha-forte-2', confirmed: true },
};
const SUB = status => ({ status, stripe_customer_id: 'cus_1', current_period_end: new Date(Date.now() + 5 * 864e5).toISOString(), cancel_at_period_end: false });
const INSTALL_STEPS = /Toque em Compartilhar|Adicionar à Tela de Início|Instale o Faro|Instalar o Faro|Abra no Safari|Abra no Chrome|Copiar link/;

let dir, server, browser;
test.before(async () => { if (skip) return; dir = await buildHarness(); server = await serve(dir); browser = await launch({ standalone: false }); });
test.after(async () => { if (browser) await browser.close(); if (server) await server.close(); if (dir) cleanup(dir); });

async function open({ cfg = {}, query = '', ua = UA.android, viewport = PHONE } = {}) {
  const context = await browser.newContext({ viewport, userAgent: ua, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
  await context.addInitScript(c => { window.__FARO_TEST__ = c; }, cfg);
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto(server.url + query);
  await page.waitForFunction(() => document.getElementById('root') && document.getElementById('root').children.length > 0);
  return { context, page, errors };
}
const text = page => page.evaluate(() => document.body.innerText);
const hasText = (page, t, timeout = 8000) => page.waitForFunction(x => document.body.innerText.includes(x), t, { timeout });
const btn = (page, name) => page.getByRole('button', { name, exact: true });
const calls = page => page.evaluate(() => (window.__server.calls || []).map(c => c.name));
const redirects = page => page.evaluate(() => window.__redirects);
const CHECKOUT = { 'criar-checkout-faro': { url: STRIPE } };
const fill = async (page, email, senha) => { await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(senha); };

test('landing de uma tela: promessa, como funciona, preço e botões; sem passos de instalar', { skip }, async () => {
  const { context, page, errors } = await open({ cfg: { billing: true, users: USERS } });
  await hasText(page, 'Veja o lucro de verdade do seu dia');
  const body = await text(page);
  assert.match(body, /2 dias de teste, sem cartão, depois R\$ 22,99\/mês\. Cancele quando quiser\./);
  assert.match(body, /Tem cupom\? Digite na tela de pagamento\./);
  await btn(page, 'Assinar e começar').waitFor();
  await btn(page, 'Já tenho conta').waitFor();
  assert.equal(await btn(page, 'Enviar link do Faro para meu WhatsApp').count(), 0, 'antes de assinar não há compartilhar');
  assert.doesNotMatch(body, INSTALL_STEPS, 'antes de assinar não existe passo de instalar');
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'cabe numa tela do celular');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem horizontal');
  const small = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && /\p{L}/u.test(n.textContent)) && parseFloat(getComputedStyle(el).fontSize) < 13.99).map(el => el.textContent.trim().slice(0, 30)));
  assert.deepEqual(small, [], 'texto >= 14px');
  const targets = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.getBoundingClientRect()).filter(r => r.height < 43.5 || r.width < 43.5).length);
  assert.equal(targets, 0, 'botões >= 44px');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${prepareShots()}/celular-landing.png` });
  assert.deepEqual(await calls(page), []);
  assert.deepEqual(errors, []);
  await context.close();
});

test('cobrança desligada: preço aparece, botão desativado diz "A assinatura abre em breve" e nada de checkout', { skip }, async () => {
  const { context, page, errors } = await open({ cfg: { billing: false, users: USERS } });
  await hasText(page, '2 dias de teste, sem cartão, depois R$ 22,99/mês');
  const primary = btn(page, 'A assinatura abre em breve');
  await primary.waitFor();
  assert.equal(await primary.isDisabled(), true);
  assert.equal(await btn(page, 'Assinar e começar').count(), 0);
  await primary.click({ force: true }).catch(() => {});
  assert.deepEqual(await calls(page), [], 'sem criar checkout');
  assert.deepEqual(await redirects(page), []);
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  assert.deepEqual(errors, []);
  await context.close();
});

test('sem conta: Assinar e começar abre o formulário; criar conta pede para confirmar o e-mail; entrar leva ao checkout', { skip }, async () => {
  const { context, page, errors } = await open({ cfg: { billing: true, users: USERS, invoke: CHECKOUT } });
  await btn(page, 'Assinar e começar').click();
  await btn(page, 'Criar conta e continuar').waitFor();
  assert.deepEqual(await calls(page), [], 'o checkout só abre com sessão');
  // erro diz o que fazer
  await fill(page, 'sem-arroba', 'senha-forte-1');
  await btn(page, 'Criar conta e continuar').click();
  await hasText(page, 'Digite um e-mail válido');
  await fill(page, 'novo@faro.app', '123');
  await btn(page, 'Criar conta e continuar').click();
  await hasText(page, 'pelo menos 8 caracteres');
  // conta nova: confirma o e-mail e depois entra
  await fill(page, 'novo@faro.app', 'senha-forte-9');
  await btn(page, 'Criar conta e continuar').click();
  await hasText(page, 'Enviamos um link para novo@faro.app');
  await btn(page, 'Entrar e continuar').waitFor();
  // senha errada
  await fill(page, 'motorista@faro.app', 'errada-123');
  await btn(page, 'Entrar e continuar').click();
  await hasText(page, 'E-mail ou senha não conferem');
  assert.deepEqual(await redirects(page), []);
  // entra e segue direto para o checkout
  await fill(page, 'motorista@faro.app', 'senha-forte-1');
  await btn(page, 'Entrar e continuar').click();
  await page.waitForFunction(() => window.__redirects.length === 1);
  assert.deepEqual(await redirects(page), [STRIPE]);
  assert.deepEqual(await calls(page), ['criar-checkout-faro']);
  assert.match(page.url(), /127\.0\.0\.1/, 'a URL de checkout falsa nunca navega');
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  assert.deepEqual(errors.filter(e => !/status of 4|Failed to load resource/.test(e)), []);
  await context.close();
});

test('"Já tenho conta" usa o modo entrar; sem assinatura volta para a landing e pede para assinar', { skip }, async () => {
  const { context, page } = await open({ cfg: { billing: true, users: USERS, invoke: CHECKOUT } });
  await btn(page, 'Já tenho conta').click();
  await btn(page, 'Entrar e continuar').waitFor();
  await fill(page, 'motorista@faro.app', 'senha-forte-1');
  await btn(page, 'Entrar e continuar').click();
  await btn(page, 'Assinar e começar').waitFor();
  assert.deepEqual(await calls(page), [], 'quem só entrou ainda não abriu checkout');
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  await context.close();
});

test('com sessão: Assinar e começar chama o checkout direto; endereço que não é do Stripe é recusado', { skip }, async () => {
  let t = await open({ cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, invoke: CHECKOUT } });
  await btn(t.page, 'Assinar e começar').click();
  await t.page.waitForFunction(() => window.__redirects.length === 1);
  assert.deepEqual(await redirects(t.page), [STRIPE]);
  assert.equal(await t.page.getByLabel('Senha').count(), 0, 'já está na conta: sem formulário');
  await t.context.close();
  t = await open({ cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, invoke: { 'criar-checkout-faro': { url: 'https://malvado.example/pagar' } } } });
  await btn(t.page, 'Assinar e começar').click();
  await hasText(t.page, 'endereço de pagamento inesperado');
  assert.deepEqual(await redirects(t.page), []);
  await t.context.close();
});

test('volta do pagamento: confere a assinatura com repetição, mostra "Assinatura ativa" e só então o instalar (Android)', { skip }, async () => {
  const { context, page, errors } = await open({ query: '?faro_cobranca=retorno', cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' } } });
  await hasText(page, 'Confirmando sua assinatura');
  assert.doesNotMatch(await text(page), INSTALL_STEPS, 'enquanto confere, nada de instalar');
  await page.waitForTimeout(2500); // o aviso do Stripe demora
  assert.doesNotMatch(await text(page), /Assinatura ativa/);
  await page.evaluate(s => window.__server.subs.set('id-1', s), SUB('trialing'));
  await hasText(page, 'Assinatura ativa');
  await page.evaluate(() => {
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    ev.prompt = async () => { window.__prompted = (window.__prompted || 0) + 1; };
    ev.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(ev);
  });
  const install = btn(page, 'Instalar o Faro');
  await install.waitFor();
  await page.screenshot({ path: `${prepareShots()}/celular-landing-assinatura-ativa.png` });
  await install.click();
  await hasText(page, 'Faro instalado');
  assert.equal(await page.evaluate(() => window.__prompted), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('volta do pagamento: iPhone mostra 3 passos; navegador embutido manda abrir no Safari; computador copia o link', { skip }, async () => {
  const cfg = { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, subs: { 'id-1': SUB('active') } };
  let t = await open({ query: '?faro_cobranca=retorno', cfg, ua: UA.iphone });
  await hasText(t.page, 'Assinatura ativa');
  const body = await text(t.page);
  assert.match(body, /Toque em Compartilhar/);
  assert.match(body, /Toque em Adicionar à Tela de Início/);
  assert.match(body, /Abra o Faro pelo novo ícone/);
  assert.equal(await btn(t.page, 'Instalar o Faro').count(), 0);
  await t.context.close();
  t = await open({ query: '?faro_cobranca=retorno', cfg, ua: UA.instagram });
  await hasText(t.page, 'Abra no Safari');
  await btn(t.page, 'Copiar link').waitFor();
  await t.context.close();
  t = await open({ query: '?faro_cobranca=retorno', cfg, viewport: { width: 1280, height: 800 }, ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' });
  await hasText(t.page, 'Assinatura ativa');
  await btn(t.page, 'Copiar link').waitFor();
  assert.ok(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await t.context.close();
});

test('volta do pagamento sem a confirmação no prazo: avisa, deixa verificar de novo e nunca mostra instalar', { skip }, async () => {
  const { context, page } = await open({ query: '?faro_cobranca=retorno', cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, poll: { every: 100, total: 600 } } });
  await hasText(page, 'Ainda não recebemos a confirmação do pagamento');
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  assert.doesNotMatch(await text(page), /Assinatura ativa/);
  await page.evaluate(s => window.__server.subs.set('id-1', s), SUB('active'));
  await btn(page, 'Verificar de novo').click();
  await hasText(page, 'Assinatura ativa');
  await context.close();
});

test('volta do pagamento sem sessão neste navegador: pede para entrar e depois confere a assinatura', { skip }, async () => {
  const { context, page } = await open({ query: '?faro_cobranca=retorno', cfg: { billing: true, users: USERS, subs: { 'id-1': SUB('trialing') } } });
  await btn(page, 'Entrar e continuar').waitFor();
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  await fill(page, 'motorista@faro.app', 'senha-forte-1');
  await btn(page, 'Entrar e continuar').click();
  await hasText(page, 'Assinatura ativa');
  await context.close();
});

test('pagamento cancelado: volta à landing com aviso e sem instalar', { skip }, async () => {
  const { context, page } = await open({ query: '?faro_cobranca=cancelada', cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, invoke: CHECKOUT } });
  await hasText(page, 'Pagamento cancelado. Você pode tentar de novo.');
  await btn(page, 'Assinar e começar').waitFor();
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  await btn(page, 'Assinar e começar').click();
  await page.waitForFunction(() => window.__redirects.length === 1);
  await context.close();
});

test('assinatura cancelada, vencida ou inativa nunca libera os passos de instalar', { skip }, async () => {
  for (const status of ['canceled', 'inactive', 'past_due', 'unpaid', 'paused']) {
    const { context, page } = await open({ query: '?faro_cobranca=retorno', cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, subs: { 'id-1': SUB(status) }, poll: { every: 50, total: 300 } } });
    await hasText(page, 'Ainda não recebemos a confirmação do pagamento');
    assert.doesNotMatch(await text(page), INSTALL_STEPS, status);
    assert.doesNotMatch(await text(page), /Assinatura ativa/, status);
    await context.close();
  }
});

test('trocar de conta: a landing não carrega o estado da conta anterior', { skip }, async () => {
  const { context, page } = await open({ cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, subs: { 'id-1': SUB('active') } } });
  await hasText(page, 'Assinatura ativa'); // quem já assina e abre a landing vê o instalar
  await btn(page, 'Trocar de conta').click();
  await btn(page, 'Assinar e começar').waitFor();
  assert.doesNotMatch(await text(page), /Assinatura ativa|motorista@faro\.app/);
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  await btn(page, 'Já tenho conta').click();
  await fill(page, 'outro@faro.app', 'senha-forte-2');
  await btn(page, 'Entrar e continuar').click();
  await btn(page, 'Assinar e começar').waitFor();
  assert.doesNotMatch(await text(page), /Assinatura ativa|motorista@faro\.app/);
  assert.doesNotMatch(await text(page), INSTALL_STEPS);
  await context.close();
});

test('depois de assinar: "Enviar link do Faro para meu WhatsApp" abre wa.me com o endereço do app, sem número fixo', { skip }, async () => {
  const { context, page, errors } = await open({ query: '?faro_cobranca=retorno', cfg: { billing: true, users: USERS, session: { id: 'id-1', email: 'motorista@faro.app' }, subs: { 'id-1': SUB('active') } } });
  await hasText(page, 'Assinatura ativa');
  await page.evaluate(() => { window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null; }; });
  await btn(page, 'Enviar link do Faro para meu WhatsApp').click();
  const [[url, target, feat]] = await page.evaluate(() => window.__opened);
  assert.ok(url.startsWith('https://wa.me/?text='), 'sem número fixo');
  const msg = decodeURIComponent(url.slice('https://wa.me/?text='.length));
  assert.ok(msg.includes(server.url.replace(/\/$/, '')), 'leva o endereço do app');
  assert.equal(target, '_blank');
  assert.match(feat, /noopener/);
  assert.deepEqual(errors, []);
  await context.close();
});
