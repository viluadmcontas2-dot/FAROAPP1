// Regras puras da cobrança FARO. Sem dependências: roda no Deno (Edge Functions) e no Node (testes).

const KNOWN_STATUS = new Set(['trialing', 'active', 'past_due', 'unpaid', 'paused', 'canceled']);
const BLOCKING_STATUS = new Set(['active', 'trialing', 'past_due']);

/** Status Stripe → status aceito pela tabela faro_subscriptions. */
export const normalizedStatus = value => (KNOWN_STATUS.has(value) ? value : 'inactive');

const idOf = value => (typeof value === 'string' ? value : value?.id || null);

/**
 * Fim do período atual. Na API 2025-03-31+ o campo saiu da subscription e foi para cada item;
 * mantém fallback para o campo antigo.
 */
export const subscriptionPeriodEnd = subscription => {
  const seconds = subscription?.items?.data?.[0]?.current_period_end ?? subscription?.current_period_end ?? null;
  return typeof seconds === 'number' && Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
};

/** Id da assinatura em qualquer objeto de evento (subscription, invoice antiga/nova, checkout). */
export const subscriptionIdFrom = object => {
  if (!object) return null;
  if (object.object === 'subscription') return object.id || null;
  return idOf(object.subscription) || idOf(object.parent?.subscription_details?.subscription) || null;
};

/**
 * Evento velho não pode sobrescrever estado mais novo:
 * - se já aplicamos um evento criado depois deste, pula;
 * - se o usuário já está ligado a OUTRA assinatura ainda válida e esta não está válida, pula
 *   (generaliza o antigo staleDelete para todos os eventos de subscription).
 */
export const isStaleSubscriptionEvent = (current, { subscriptionId, status, eventCreated }) => {
  if (!current) return false;
  const lastApplied = current.last_event_created ? Date.parse(current.last_event_created) : NaN;
  if (Number.isFinite(lastApplied) && Number.isFinite(eventCreated) && eventCreated * 1000 < lastApplied) return true;
  const otherSubscription = Boolean(current.stripe_subscription_id && current.stripe_subscription_id !== subscriptionId);
  if (otherSubscription && BLOCKING_STATUS.has(current.status) && !BLOCKING_STATUS.has(status)) return true;
  return false;
};

/** Já existe assinatura que impede um segundo checkout? */
export const hasBlockingSubscription = row => Boolean(row?.stripe_subscription_id && BLOCKING_STATUS.has(row.status));

/** Erro em chamada Stripe → resposta HTTP limpa, sem vazar detalhes internos. */
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
