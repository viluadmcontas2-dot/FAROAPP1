// Regra de acesso (paywall): puro, sem rede. Liberado | precisa_entrar | precisa_assinar | trial_acabando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideAccess, hasEntitlement, daysLeft, isBlocked, blockedIntro, ACCESS } from '../src/data/access.js';

const NOW = Date.parse('2026-10-21T12:00:00Z');
const inDays = n => new Date(NOW + n * 86400000).toISOString();
const user = { id: 'u1', email: 'a@b.com' };

test('cobrança desligada: sempre liberado, sem login', () => {
  for (const subscription of [null, undefined, { status: 'canceled' }, { status: 'active' }]) {
    const d = decideAccess({ billingEnabled: false, user: null, subscription, now: NOW });
    assert.equal(d.state, ACCESS.LIBERADO);
    assert.equal(isBlocked(d), false);
  }
  assert.equal(decideAccess({ now: NOW }).state, 'liberado'); // sem nada = desligada
  assert.equal(decideAccess({ billingEnabled: 'true', user: null, now: NOW }).state, 'liberado'); // só `true` liga (fail-closed da config)
});

test('cobrança ligada: sem sessão manda entrar', () => {
  const d = decideAccess({ billingEnabled: true, user: null, subscription: { status: 'active', currentPeriodEnd: inDays(30) }, now: NOW });
  assert.equal(d.state, 'precisa_entrar');
  assert.equal(isBlocked(d), true);
});

test('cobrança ligada: sem direito manda assinar (inativa, vencida, em atraso, cancelada)', () => {
  const casos = [null, { status: 'inactive' }, { status: 'canceled', currentPeriodEnd: inDays(10) }, { status: 'past_due', currentPeriodEnd: inDays(10) }, { status: 'unpaid' },
    { status: 'active', currentPeriodEnd: inDays(-1) }, { status: 'trialing', currentPeriodEnd: inDays(-2) }, { status: 'active', currentPeriodEnd: 'lixo' }];
  for (const subscription of casos) {
    const d = decideAccess({ billingEnabled: true, user, subscription, now: NOW });
    assert.equal(d.state, 'precisa_assinar', JSON.stringify(subscription));
    assert.equal(isBlocked(d), true);
  }
});

test('cobrança ligada: assinatura ativa ou em teste libera', () => {
  assert.equal(decideAccess({ billingEnabled: true, user, subscription: { status: 'active', currentPeriodEnd: inDays(20) }, now: NOW }).state, 'liberado');
  assert.equal(decideAccess({ billingEnabled: true, user, subscription: { status: 'active', currentPeriodEnd: null }, now: NOW }).state, 'liberado');
  const t = decideAccess({ billingEnabled: true, user, subscription: { status: 'trialing', currentPeriodEnd: inDays(6) }, now: NOW });
  assert.equal(t.state, 'liberado');
  assert.equal(t.daysLeft, 6);
});

test('teste acabando: libera, mas avisa quando faltam poucos dias', () => {
  const d = decideAccess({ billingEnabled: true, user, subscription: { status: 'trialing', currentPeriodEnd: inDays(2) }, now: NOW });
  assert.equal(d.state, 'trial_acabando');
  assert.equal(d.daysLeft, 2);
  assert.equal(isBlocked(d), false);
  assert.equal(decideAccess({ billingEnabled: true, user, subscription: { status: 'trialing', currentPeriodEnd: inDays(3) }, now: NOW }).state, 'trial_acabando');
  assert.equal(decideAccess({ billingEnabled: true, user, subscription: { status: 'trialing', currentPeriodEnd: inDays(4) }, now: NOW }).state, 'liberado');
});

// ADR 0009: o teste acaba sem cartão e a assinatura é cancelada. Quem volta já usou o teste (vale uma vez): a tela não pode oferecer outro.
test('texto da tela bloqueada: quem nunca assinou começa o teste; quem já teve assinatura assina de novo', () => {
  const d = subscription => decideAccess({ billingEnabled: true, user, subscription, now: NOW });
  assert.match(blockedIntro(d(null)), /Comece o teste grátis para usar o Faro/);
  assert.match(blockedIntro(d({ status: 'inactive' })), /Comece o teste grátis/, 'cliente criado no começo do checkout, sem assinatura: ainda não usou o teste');
  for (const sub of [{ status: 'canceled', currentPeriodEnd: inDays(-1) }, { status: 'canceled' }, { status: 'trialing', currentPeriodEnd: inDays(-1) }]) {
    const t = blockedIntro(d(sub));
    assert.match(t, /Assine para voltar a usar o Faro/, JSON.stringify(sub));
    assert.doesNotMatch(t, /teste grátis/, `${JSON.stringify(sub)}: o teste já foi usado`);
  }
  for (const status of ['past_due', 'unpaid']) assert.match(blockedIntro(d({ status })), /Atualize o pagamento para voltar a usar o Faro/, status);
  assert.match(blockedIntro(decideAccess({ billingEnabled: true, user: null, now: NOW })), /Entre ou crie sua conta para usar o Faro/);
  for (const sub of [null, { status: 'canceled' }, { status: 'past_due' }]) assert.match(blockedIntro(d(sub)), /Seus dados continuam salvos neste aparelho/);
});

test('tela de assinatura cancelada avisa que o 2º checkout cobra já e que o teste não repete', () => {
  const linha = readFileSync(new URL('../src/ui/vals-secondary.js', import.meta.url), 'utf8').split('\n').find(l => l.includes("title: 'Assinatura cancelada'"));
  assert.ok(linha, 'caso canceled/paused existe');
  assert.match(linha, /cobrado já no começo/); assert.match(linha, /O teste grátis vale uma vez por pessoa/);
  assert.match(linha, /label: 'Assinar de novo'/, 'o e2e procura este botão');
});

test('auxiliares: direito e dias restantes', () => {
  assert.equal(hasEntitlement({ status: 'active' }, NOW), true);
  assert.equal(hasEntitlement({ status: 'past_due' }, NOW), false);
  assert.equal(hasEntitlement(null, NOW), false);
  assert.equal(daysLeft({ currentPeriodEnd: inDays(0.2) }, NOW), 1);
  assert.equal(daysLeft({ currentPeriodEnd: inDays(-5) }, NOW), 0);
  assert.equal(daysLeft({}, NOW), null);
});
