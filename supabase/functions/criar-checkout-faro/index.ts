import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
const priceId = Deno.env.get('STRIPE_FARO_MONTHLY_PRICE_ID') || '';
const appUrl = Deno.env.get('FARO_APP_URL') || '';

const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
    const userId = String(ctx.userClaims?.sub || '');
    if (!userId) return json({ error: 'Sessão inválida.' }, 401);
    if (!stripeSecret || !priceId || !/^https:\/\/[^\s]+$/.test(appUrl)) return json({ error: 'Cobrança ainda não configurada.' }, 503);

    const stripe = new Stripe(stripeSecret);
    const { data: existing, error: readError } = await ctx.supabaseAdmin
      .from('faro_subscriptions')
      .select('stripe_customer_id,status')
      .eq('user_id', userId)
      .maybeSingle();
    if (readError) return json({ error: 'Não foi possível preparar a assinatura.' }, 500);

    // Já tem assinatura viva: não cria uma segunda cobrança; o caminho é o portal.
    if (existing && ['active', 'trialing', 'past_due', 'unpaid', 'paused'].includes(existing.status)) {
      return json({ error: 'Você já tem uma assinatura. Use "Gerenciar assinatura".' }, 409);
    }

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
      allow_promotion_codes: true,
      integration_identifier: 'faro_finance_qmvktzra',
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
