// Regras puras da cobrança FARO (compartilhadas pelas Edge Functions via supabase/functions/_shared).
import assert from 'node:assert/strict';
import {
  normalizedStatus,
  subscriptionPeriodEnd,
  subscriptionIdFrom,
  isStaleSubscriptionEvent,
  hasBlockingSubscription,
  stripeFailure
} from '../supabase/functions/_shared/faro-billing.js';

// 2 — API 2025-03-31+: current_period_end saiu da subscription e foi para os itens.
assert.equal(subscriptionPeriodEnd({ items: { data: [{ current_period_end: 1767225600 }] } }), '2026-01-01T00:00:00.000Z',
  'Período deve vir de items.data[0].current_period_end');
assert.equal(subscriptionPeriodEnd({ current_period_end: 1767225600 }), '2026-01-01T00:00:00.000Z',
  'Fallback para APIs antigas');
assert.equal(subscriptionPeriodEnd({ items: { data: [] } }), null);
assert.equal(subscriptionPeriodEnd({}), null);

// Invoice da API nova guarda a assinatura em parent.subscription_details.
assert.equal(subscriptionIdFrom({ object: 'subscription', id: 'sub_1' }), 'sub_1');
assert.equal(subscriptionIdFrom({ object: 'invoice', subscription: 'sub_2' }), 'sub_2');
assert.equal(subscriptionIdFrom({ object: 'invoice', parent: { subscription_details: { subscription: 'sub_3' } } }), 'sub_3');
assert.equal(subscriptionIdFrom({ object: 'checkout.session', subscription: { id: 'sub_4' } }), 'sub_4');
assert.equal(subscriptionIdFrom({ object: 'charge' }), null);

assert.equal(normalizedStatus('active'), 'active');
assert.equal(normalizedStatus('incomplete'), 'inactive');
assert.equal(normalizedStatus('incomplete_expired'), 'inactive');

// 3 — Evento velho não pode sobrescrever estado mais novo.
const t = 1_800_000_000;
assert.equal(isStaleSubscriptionEvent(null, { subscriptionId: 'sub_a', status: 'active', eventCreated: t }), false,
  'Sem linha atual, nada é velho');
assert.equal(isStaleSubscriptionEvent({ stripe_subscription_id: 'sub_a', status: 'active', last_event_created: new Date((t + 10) * 1000).toISOString() },
  { subscriptionId: 'sub_a', status: 'past_due', eventCreated: t }), true,
  'Evento criado antes do último aplicado é velho');
assert.equal(isStaleSubscriptionEvent({ stripe_subscription_id: 'sub_a', status: 'active', last_event_created: new Date(t * 1000).toISOString() },
  { subscriptionId: 'sub_a', status: 'canceled', eventCreated: t }), false,
  'Mesmo segundo não é considerado velho');
assert.equal(isStaleSubscriptionEvent({ stripe_subscription_id: 'sub_new', status: 'active', last_event_created: null },
  { subscriptionId: 'sub_old', status: 'canceled', eventCreated: t + 999 }), true,
  'Assinatura antiga não derruba a nova que está ativa (staleDelete generalizado)');
assert.equal(isStaleSubscriptionEvent({ stripe_subscription_id: 'sub_old', status: 'canceled', last_event_created: null },
  { subscriptionId: 'sub_new', status: 'active', eventCreated: t }), false,
  'Nova assinatura ativa substitui uma antiga cancelada');

// Checkout: não abrir segunda assinatura.
for (const status of ['active', 'trialing', 'past_due']) {
  assert.equal(hasBlockingSubscription({ status, stripe_subscription_id: 'sub_x' }), true, status);
}
for (const status of ['inactive', 'canceled', 'unpaid']) {
  assert.equal(hasBlockingSubscription({ status, stripe_subscription_id: 'sub_x' }), false, status);
}
assert.equal(hasBlockingSubscription({ status: 'active', stripe_subscription_id: null }), false);
assert.equal(hasBlockingSubscription(null), false);

// Erros Stripe viram resposta limpa, sem vazar detalhes.
const stripeErr = Object.assign(new Error('No such price: price_x'), { type: 'StripeInvalidRequestError', statusCode: 400 });
const r1 = stripeFailure(stripeErr);
assert.equal(r1.status, 502);
assert.doesNotMatch(JSON.stringify(r1.body), /price_x|No such/);
const r2 = stripeFailure(Object.assign(new Error('x'), { type: 'StripeCardError', statusCode: 402 }));
assert.equal(r2.status, 402);
const r3 = stripeFailure(new Error('boom'));
assert.equal(r3.status, 500);
assert.doesNotMatch(JSON.stringify(r3.body), /boom/);

console.log('FARO cobrança: regras puras (período, assinatura da invoice, evento velho, assinatura duplicada, erros limpos) — ok');
