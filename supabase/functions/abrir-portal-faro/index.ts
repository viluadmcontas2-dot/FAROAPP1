import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
const appUrl = Deno.env.get('FARO_APP_URL') || '';
const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const userId = String(ctx.userClaims?.sub || '');
    if (!userId) return json({ error: 'Sessão inválida.' }, 401);
    if (!stripeSecret || !appUrl) return json({ error: 'Portal ainda não configurado.' }, 503);

    const stripe = new Stripe(stripeSecret);
    const { data, error } = await ctx.supabaseAdmin
      .from('faro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data?.stripe_customer_id) return json({ error: 'Nenhuma assinatura encontrada para esta conta.' }, 404);

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}?faro_cobranca=portal`
    });

    return json({ url: session.url });
  })
};
