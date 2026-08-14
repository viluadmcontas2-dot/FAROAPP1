import { withSupabase } from 'npm:@supabase/server';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const json = (body: unknown, status = 200) => Response.json(body, { status });

const normalizedStatus = (value: string | null | undefined) => {
  if (value === 'trialing') return 'trialing';
  if (value === 'active') return 'active';
  if (value === 'past_due') return 'past_due';
  if (value === 'unpaid') return 'unpaid';
  if (value === 'paused') return 'paused';
  if (value === 'canceled') return 'canceled';
  return 'inactive';
};

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const signature = req.headers.get('stripe-signature') || '';
    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
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
    const subscriptionId = object.object === 'subscription'
      ? object.id
      : typeof object.subscription === 'string'
        ? object.subscription
        : object.subscription?.id || null;

    let userId = String(object.client_reference_id || object.metadata?.faro_user_id || '');
    if (!userId && (subscriptionId || customerId)) {
      let query = ctx.supabaseAdmin.from('faro_subscriptions').select('user_id');
      query = subscriptionId ? query.eq('stripe_subscription_id', subscriptionId) : query.eq('stripe_customer_id', customerId);
      const { data } = await query.maybeSingle();
      userId = data?.user_id || '';
    }

    const applySubscription = async (subscription: any, fallbackUserId = userId) => {
      const resolvedUserId = String(subscription.metadata?.faro_user_id || fallbackUserId || '');
      if (!resolvedUserId) return false;
      const { error } = await ctx.supabaseAdmin.from('faro_subscriptions').upsert({
        user_id: resolvedUserId,
        stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || customerId,
        stripe_subscription_id: subscription.id,
        status: normalizedStatus(subscription.status),
        current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      return true;
    };

    try {
      if (event.type === 'checkout.session.completed' && subscriptionId && userId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription, userId);
      } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        await applySubscription(object);
      } else if ((event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription, userId);
      }

      const { error: markError } = await ctx.supabaseAdmin
        .from('faro_webhook_events')
        .insert({ event_id: event.id, event_type: event.type });
      if (markError && markError.code !== '23505') throw markError;

      return json({ received: true });
    } catch (error) {
      console.error('FARO webhook falhou', event.id, event.type, error);
      return json({ received: false }, 500);
    }
  })
};
