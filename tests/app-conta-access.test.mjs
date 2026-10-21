// Regra de acesso (paywall): puro, sem rede. Liberado | precisa_entrar | precisa_assinar | trial_acabando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAccess, hasEntitlement, daysLeft, isBlocked, ACCESS } from '../src/data/access.js';

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

test('auxiliares: direito e dias restantes', () => {
  assert.equal(hasEntitlement({ status: 'active' }, NOW), true);
  assert.equal(hasEntitlement({ status: 'past_due' }, NOW), false);
  assert.equal(hasEntitlement(null, NOW), false);
  assert.equal(daysLeft({ currentPeriodEnd: inDays(0.2) }, NOW), 1);
  assert.equal(daysLeft({ currentPeriodEnd: inDays(-5) }, NOW), 0);
  assert.equal(daysLeft({}, NOW), null);
});
