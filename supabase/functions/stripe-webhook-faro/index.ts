import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';
import {
  isStaleSubscriptionEvent,
  normalizedStatus,
  subscriptionIdFrom,
  subscriptionPeriodEnd
} from '../_shared/faro-billing.js';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const json = (body: unknown, status = 200) => Response.json(body, { status });

// Eventos que reconsultam a assinatura atual na Stripe antes de gravar o entitlement.
const SUBSCRIPTION_REFRESH_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed'
]);

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
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

    const { data: alreadyProcessed } = await ctx.supabaseAdmin
      .from('faro_webhook_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();
    if (alreadyProcessed) return json({ received: true, duplicate: true });

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

    // Grava o entitlement, salvo se o evento for velho (ordem de entrega não é garantida).
    const applySubscription = async (subscription: any, fallbackUserId = userId) => {
      const resolvedUserId = String(subscription.metadata?.faro_user_id || fallbackUserId || '');
      if (!resolvedUserId) return false;
      const status = normalizedStatus(subscription.status);
      const { data: current, error: currentError } = await ctx.supabaseAdmin
        .from('faro_subscriptions')
        .select('stripe_subscription_id,status,last_event_created')
        .eq('user_id', resolvedUserId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (isStaleSubscriptionEvent(current, { subscriptionId: subscription.id, status, eventCreated: event.created })) {
        console.warn('FARO webhook: evento velho ignorado', event.id, event.type);
        return false;
      }
      const { error } = await ctx.supabaseAdmin.from('faro_subscriptions').upsert({
        user_id: resolvedUserId,
        stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || customerId,
        stripe_subscription_id: subscription.id,
        status,
        current_period_end: subscriptionPeriodEnd(subscription),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        last_event_created: new Date(event.created * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      return true;
    };

    try {
      if (event.type === 'checkout.session.completed' && subscriptionId && userId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription, userId);
      } else if (SUBSCRIPTION_REFRESH_EVENTS.has(event.type) && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription, userId);
      } else if (event.type === 'customer.subscription.deleted' && subscriptionId) {
        // Delete atrasado de assinatura antiga não cancela a nova (isStaleSubscriptionEvent).
        await applySubscription(object, String(object.metadata?.faro_user_id || userId || ''));
      } else if (event.type === 'charge.dispute.created') {
        // Disputa (chargeback): apenas registra; o status segue o que a Stripe mandar depois.
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
      }

      const { error: markError } = await ctx.supabaseAdmin
        .from('faro_webhook_events')
        .insert({ event_id: event.id, event_type: event.type });
      if (markError && markError.code !== '23505') throw markError;

      return json({ received: true });
    } catch (error) {
      console.error('FARO webhook falhou', event.id, event.type, (error as { type?: string; code?: string })?.type || (error as { code?: string })?.code || 'erro');
      return json({ received: false }, 500);
    }
  })
};
