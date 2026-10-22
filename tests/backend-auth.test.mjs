import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend, BackendError, safeStripeUrl } from '../src/data/backend.js';
import { readConfig } from '../src/data/config.js';
import { makeServer, makeFakeCreateClient, memStorage, GOOD } from './backend-helpers.mjs';

const make = (over = {}, serverOver = {}) => {
  const server = Object.assign(makeServer(), serverOver);
  server.users.set('a@x.com', { id: 'ua', password: 'senha-forte-1', confirmed: true });
  const redirects = [];
  const backend = createBackend({ config: GOOD, createClient: makeFakeCreateClient(server), storage: memStorage(), redirect: u => redirects.push(u), randomId: () => 'dev-1', redirectTo: () => 'https://app/', ...over });
  return { server, backend, redirects };
};
const rejectsCode = (p, code) => assert.rejects(p, e => e instanceof BackendError && e.code === code && /[a-zà-ú]/i.test(e.message));

test('config: billing/push só ligam com true e URL https; sem chave => não configurado', () => {
  assert.equal(readConfig({ supabaseUrl: 'http://x', supabasePublishableKey: 'k', billingEnabled: true }).configured, false);
  assert.equal(readConfig({ supabaseUrl: 'https://x.co', supabasePublishableKey: 'k', billingEnabled: 'true' }).billingEnabled, false);
  assert.equal(readConfig(undefined).billingEnabled, false); // padrão público: fail-closed
  assert.equal(readConfig(undefined).configured, true);
});

test('login: sucesso emite signedIn; senha errada e e-mail não confirmado dão mensagens claras', async () => {
  const { backend, server } = make();
  const events = []; backend.onAuthChange(e => events.push(e.event));
  await rejectsCode(backend.signIn({ email: 'a@x.com', password: 'errada' }), 'invalid_credentials');
  server.users.set('b@x.com', { id: 'ub', password: 'p12345678', confirmed: false });
  await rejectsCode(backend.signIn({ email: 'b@x.com', password: 'p12345678' }), 'email_not_confirmed');
  await rejectsCode(backend.signIn({ email: 'xx', password: 'a' }), 'invalid_email');
  const u = await backend.signIn({ email: ' A@X.com ', password: 'senha-forte-1' });
  assert.deepEqual(u, { id: 'ua', email: 'a@x.com' });
  assert.ok(events.includes('signedIn'));
});

test('erros de rede viram mensagem offline sem vazar detalhe interno', async () => {
  const { backend } = make({}, { down: true });
  await assert.rejects(backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' }), e => e.code === 'offline' && !/fetch/i.test(e.message));
});

test('restore: restaura sessão existente; offline não derruba o app', async () => {
  const { backend, server } = make();
  await backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  const client = backend.getClient();
  assert.equal((await backend.restore()).status, 'signedIn');
  server.down = true;
  const r = await backend.restore();
  assert.equal(r.status, 'signedIn'); assert.equal(r.offline, true);
  assert.ok(client);
  assert.equal((await createBackend({ config: {}, createClient: null }).restore()).status, 'unconfigured');
});

test('signUp: pede confirmação; confirmação desligada no servidor => recusa (fail-closed)', async () => {
  const a = make();
  assert.deepEqual(await a.backend.signUp({ email: 'n@x.com', password: 'abcdefgh' }), { needsEmailConfirmation: true });
  await rejectsCode(a.backend.signUp({ email: 'n@x.com', password: 'abc' }), 'weak_password');
  await assert.rejects(a.backend.signUp({ email: 'n@x.com', password: 'abcdefgh', confirmPassword: 'outra' }), e => e.code === 'password_mismatch');
  const b = make({}, { autoConfirm: true });
  await rejectsCode(b.backend.signUp({ email: 'm@x.com', password: 'abcdefgh' }), 'confirmation_disabled');
  assert.equal(b.backend.getUser(), null);
});

test('signOut: emite signedOut', async () => {
  const { backend } = make();
  await backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  const events = []; backend.onAuthChange(e => events.push(e.event));
  await backend.signOut();
  assert.equal(backend.getUser(), null); assert.ok(events.includes('signedOut'));
});

test('assinatura: billing desligado não chama rede e recusa checkout/portal', async () => {
  const { backend, server, redirects } = make({ config: { ...GOOD, billingEnabled: false } });
  await backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  assert.equal((await backend.fetchSubscription()).status, 'inactive');
  await rejectsCode(backend.startCheckout(), 'billing_off');
  await rejectsCode(backend.openPortal(), 'billing_off');
  assert.equal(redirects.length, 0); void server;
});

test('assinatura: lê status; status desconhecido vira inactive', async () => {
  const { backend, server } = make();
  await backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  server.subs.set('ua', { status: 'active', stripe_customer_id: 'cus_1', current_period_end: '2026-12-01', cancel_at_period_end: true });
  assert.deepEqual(await backend.fetchSubscription(), { status: 'active', hasCustomer: true, currentPeriodEnd: '2026-12-01', trialEnd: null, cancelAtPeriodEnd: true, billingEnabled: true });
  server.subs.set('ua', { status: 'hacked' });
  assert.equal((await backend.fetchSubscription()).status, 'inactive');
});

test('checkout: só redireciona para https do Stripe; URL maliciosa é recusada', async () => {
  const { backend, server, redirects } = make();
  await rejectsCode(backend.startCheckout(), 'not_signed_in');
  await backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  server.invoke['criar-checkout-faro'] = { url: 'https://checkout.stripe.com/c/pay/cs_1' };
  await backend.startCheckout();
  assert.deepEqual(redirects, ['https://checkout.stripe.com/c/pay/cs_1']);
  for (const bad of ['https://checkout.stripe.com.evil.com/x', 'http://checkout.stripe.com/x', 'javascript:alert(1)', 'https://evil.com/', 'https://user:p@checkout.stripe.com/x', 'https://checkout.stripe.com:444/x', '//checkout.stripe.com']) {
    server.invoke['criar-checkout-faro'] = { url: bad };
    await rejectsCode(backend.startCheckout(), 'billing_bad_url');
  }
  assert.equal(redirects.length, 1);
  server.invoke['abrir-portal-faro'] = { url: 'https://checkout.stripe.com/x' }; // host errado para portal
  await rejectsCode(backend.openPortal(), 'billing_bad_url');
  server.invoke['abrir-portal-faro'] = new Error('boom interno SECRET');
  await assert.rejects(backend.openPortal(), e => e.code === 'billing_failed' && !/SECRET|boom/.test(e.message));
  server.invoke['abrir-portal-faro'] = { url: 'https://billing.stripe.com/p/session/x' };
  await backend.openPortal(); assert.equal(redirects.length, 2);
  assert.equal(safeStripeUrl(undefined, ['x']), null);
});

test('push: só com pushEnabled e usuário; grava aparelho do usuário', async () => {
  const off = make({ config: { ...GOOD, pushEnabled: false } });
  await off.backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  await rejectsCode(off.backend.registerPushDevice({ subscription: {} }), 'push_off');
  const { backend, server } = make();
  await rejectsCode(backend.registerPushDevice({}), 'not_signed_in');
  await backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  await backend.registerPushDevice({ subscription: { endpoint: 'e' }, city: 'Recife' });
  assert.equal(server.devices[0].user_id, 'ua'); assert.equal(server.devices[0].device_id, 'dev-1');
  await rejectsCode(backend.registerPushDevice({ platform: 'tv' }), 'push_failed');
});

test('assinatura: devolve fim do teste após ativação e null quando ausente', async () => {
  const { backend, server } = make();
  assert.equal((await backend.fetchSubscription()).trialEnd, null);
  await backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' });
  assert.equal((await backend.fetchSubscription()).trialEnd, null);
  for (const status of ['trialing', 'active']) {
    server.subs.set('ua', { status, trial_end: '2026-10-22T00:00:00.000Z' });
    const sub = await backend.fetchSubscription();
    assert.equal(sub.status, status);
    assert.equal(sub.trialEnd, '2026-10-22T00:00:00.000Z');
  }
  server.subs.set('ua', { status: 'active', trial_end: null });
  assert.equal((await backend.fetchSubscription()).trialEnd, null);
});
