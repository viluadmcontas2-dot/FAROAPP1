// Regras puras da cobranca FARO (mesmo arquivo publicado no remoto).
const KNOWN_STATUS = new Set(['trialing', 'active', 'past_due', 'unpaid', 'paused', 'canceled']);
const BLOCKING_STATUS = new Set(['active', 'trialing', 'past_due']);

export const normalizedStatus = value => (KNOWN_STATUS.has(value) ? value : 'inactive');

const idOf = value => (typeof value === 'string' ? value : value?.id || null);

export const subscriptionPeriodEnd = subscription => {
  const seconds = subscription?.items?.data?.[0]?.current_period_end ?? subscription?.current_period_end ?? null;
  return typeof seconds === 'number' && Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
};

export const subscriptionIdFrom = object => {
  if (!object) return null;
  if (object.object === 'subscription') return object.id || null;
  return idOf(object.subscription) || idOf(object.parent?.subscription_details?.subscription) || null;
};

export const hasBlockingSubscription = row => Boolean(row?.stripe_subscription_id && BLOCKING_STATUS.has(row.status));

// Trial so na primeira vez: dias vindos do banco (faro_trial_days_for); 0 = sem trial.
// Sem cartao na entrada (ADR 0009): se o teste acabar sem pagamento cadastrado, o Stripe cancela a assinatura
// (evento customer.subscription.deleted); com pagamento cadastrado, cobra no fim do teste.
export const checkoutTrialParams = days => {
  const n = Number(days);
  return Number.isInteger(n) && n > 0
    ? { trial_period_days: n, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } }
    : {};
};

export const stripeFailure = error => {
  const type = String(error?.type || '');
  if (type === 'StripeCardError') {
    return { status: 402, body: { error: 'O pagamento não foi aceito. Confira o cartão e tente de novo.' } };
  }
  if (type.startsWith('Stripe')) {
    return { status: 502, body: { error: 'O provedor de pagamento não respondeu como esperado. Tente de novo em instantes.' } };
  }
  return { status: 500, body: { error: 'Algo deu errado do nosso lado. Tente de novo em instantes.' } };
};
