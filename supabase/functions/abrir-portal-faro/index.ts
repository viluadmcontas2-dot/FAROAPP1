import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';
import { stripeFailure } from '../_shared/faro-billing.js';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
const appUrl = Deno.env.get('FARO_APP_URL') || '';
const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const userId = String(ctx.userClaims?.sub || '');
    if (!userId) return json({ error: 'Sessão inválida.' }, 401);
    if (ctx.userClaims?.is_anonymous === true) return json({ error: 'Crie sua conta com e-mail para assinar.' }, 403);
    // Trava de servidor (fail-closed): sem FARO_BILLING_ENABLED=true nos segredos, a cobrança fica fechada (beta).
    if (!(Deno.env.get('FARO_BILLING_ENABLED') === 'true')) return json({ error: 'Cobrança ainda não aberta.' }, 503);
    if (!stripeSecret || !appUrl) return json({ error: 'Portal ainda não configurado.' }, 503);

    const stripe = new Stripe(stripeSecret);
    const { data, error } = await ctx.supabaseAdmin
      .from('faro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data?.stripe_customer_id) return json({ error: 'Nenhuma assinatura encontrada para esta conta.' }, 404);

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: data.stripe_customer_id,
        return_url: `${appUrl}?faro_cobranca=portal`
      });
      return json({ url: session.url });
    } catch (error) {
      console.error('FARO portal falhou', (error as { type?: string })?.type || 'erro');
      const failure = stripeFailure(error);
      return json(failure.body, failure.status);
    }
  })
};
