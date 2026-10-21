import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';
import {
  normalizedStatus,
  subscriptionIdFrom,
  subscriptionPeriodEnd
} from '../_shared/faro-billing.js';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const json = (body: unknown, status = 200) => Response.json(body, { status });

// Atualizam a assinatura (status 'trialing' inclusive, via normalizedStatus).
// customer.subscription.trial_will_end NÃO entra aqui: é apenas registrado (idempotência) pelo applyEvent(null).
const SUBSCRIPTION_REFRESH_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'invoice.paid',
  'invoice.payment_failed'
]);

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'POST') return new Response('Método não permitido', { status: 405, headers: { Allow: 'POST' } });
    if (Number(req.headers.get('content-length') || 0) > 1_000_000) return new Response('Corpo grande demais', { status: 413 });
    if (!stripeSecret || !webhookSecret) return json({ error: 'Webhook ainda não configurado.' }, 503);

    const stripe = new Stripe(stripeSecret);
    const signature = req.headers.get('stripe-signature') || '';
    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch {
      return new Response('Assinatura inválida', { status: 400 });
    }

    const object: any = event.data.object;
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id || null;
    const subscriptionId = subscriptionIdFrom(object);

    let userId = String(object.client_reference_id || object.metadata?.faro_user_id || '');
    if (!userId && (subscriptionId || customerId)) {
      let query = ctx.supabaseAdmin.from('faro_subscriptions').select('user_id');
      query = subscriptionId ? query.eq('stripe_subscription_id', subscriptionId) : query.eq('stripe_customer_id', customerId);
      const { data } = await query.maybeSingle();
      userId = data?.user_id || '';
    }

    // Toda gravação passa pela RPC atômica: registra o evento (replay = 'duplicate'), ignora evento velho
    // ('stale'), grava a assinatura e, em 'trialing', marca o trial como usado.
    const eventCreatedIso = new Date(event.created * 1000).toISOString();
    const applyEvent = async (subscription: any, fallbackUserId = userId) => {
      const resolvedUserId = String(subscription?.metadata?.faro_user_id || fallbackUserId || '') || null;
      const { data, error } = await ctx.supabaseAdmin.rpc('faro_apply_subscription_event', {
        p_event_id: event.id,
        p_event_type: event.type,
        p_event_created: eventCreatedIso,
        p_user_id: resolvedUserId,
        p_customer_id: subscription
          ? (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || customerId)
          : null,
        p_subscription_id: subscription?.id || null,
        p_status: subscription ? normalizedStatus(subscription.status) : null,
        p_current_period_end: subscription ? subscriptionPeriodEnd(subscription) : null,
        p_cancel_at_period_end: Boolean(subscription?.cancel_at_period_end)
      });
      if (error) throw error;
      if (data === 'stale') console.warn('FARO webhook: evento velho ignorado', event.id, event.type);
      if (data === 'orphan') console.warn('FARO webhook: conta inexistente (excluída); evento registrado', event.id);
      return String(data || '');
    };

    try {
      let result = '';
      if (event.type === 'checkout.session.completed' && subscriptionId && userId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        result = await applyEvent(subscription, userId);
      } else if (SUBSCRIPTION_REFRESH_EVENTS.has(event.type) && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        result = await applyEvent(subscription, userId);
      } else if (event.type === 'customer.subscription.deleted' && subscriptionId) {
        result = await applyEvent(object, String(object.metadata?.faro_user_id || userId || ''));
      } else if (event.type === 'charge.dispute.created') {
        const chargeId = typeof object.charge === 'string' ? object.charge : object.charge?.id || null;
        const charge: any = chargeId ? await stripe.charges.retrieve(chargeId) : null;
        const disputeCustomer = typeof charge?.customer === 'string' ? charge.customer : charge?.customer?.id || null;
        if (disputeCustomer) {
          const { error } = await ctx.supabaseAdmin
            .from('faro_subscriptions')
            .update({ last_dispute_at: new Date(event.created * 1000).toISOString(), updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', disputeCustomer);
          if (error) throw error;
        }
        console.warn('FARO webhook: disputa aberta', event.id);
      } else if (event.type === 'customer.subscription.trial_will_end') {
        console.info('FARO webhook: trial termina em breve', event.id);
      }

      // Demais eventos (inclui trial_will_end): só registrados.
      if (!result) result = await applyEvent(null, '');
      return json({ received: true, result, duplicate: result === 'duplicate' });
    } catch (error) {
      console.error('FARO webhook falhou', event.id, event.type, (error as { type?: string; code?: string })?.type || (error as { code?: string })?.code || 'erro');
      return json({ received: false }, 500);
    }
  })
};
