import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const priceId = Deno.env.get('STRIPE_FARO_MONTHLY_PRICE_ID')!;
const appUrl = Deno.env.get('FARO_APP_URL')!;

const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const userId = String(ctx.userClaims?.sub || '');
    if (!userId) return json({ error: 'Sessão inválida.' }, 401);
    if (!priceId || !appUrl) return json({ error: 'Cobrança ainda não configurada.' }, 503);

    const { data: existing, error: readError } = await ctx.supabaseAdmin
      .from('faro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (readError) return json({ error: 'Não foi possível preparar a assinatura.' }, 500);

    let customerId = existing?.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { faro_user_id: userId } });
      customerId = customer.id;
      const { error: saveCustomerError } = await ctx.supabaseAdmin
        .from('faro_subscriptions')
        .upsert({ user_id: userId, stripe_customer_id: customerId, status: 'inactive', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (saveCustomerError) return json({ error: 'Não foi possível vincular a assinatura à sua conta.' }, 500);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { faro_user_id: userId },
      subscription_data: { metadata: { faro_user_id: userId } },
      success_url: `${appUrl}?faro_cobranca=retorno`,
      cancel_url: `${appUrl}?faro_cobranca=cancelada`
    });

    if (!session.url) return json({ error: 'Checkout indisponível agora.' }, 503);
    return json({ url: session.url });
  })
};
