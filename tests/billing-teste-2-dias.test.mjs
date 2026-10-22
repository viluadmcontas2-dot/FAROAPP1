import test from 'node:test';
import assert from 'node:assert/strict';
import * as billing from '../supabase/functions/_shared/faro-billing.js';

test('teste elegível: dois dias sem cartão e cancelamento ao terminar sem pagamento', () => {
  for (const days of [2, '2', 5]) {
    assert.deepEqual(billing.checkoutTrialParams(days), {
      trial_period_days: Number(days),
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } }
    });
    assert.equal(billing.paymentCollectionFor(days), 'if_required');
  }
});

test('sem teste: cobrança imediata exige cartão e não envia parâmetros de trial', () => {
  for (const days of [0, -1, null, undefined, '', 'inválido', NaN, Infinity, 1.5]) {
    assert.deepEqual(billing.checkoutTrialParams(days), {});
    assert.equal(billing.paymentCollectionFor(days), 'always');
  }
});
