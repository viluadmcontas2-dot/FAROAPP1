import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';
import { hasBlockingSubscription, stripeFailure } from '../_shared/faro-billing.js';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
const priceId = Deno.env.get('STRIPE_FARO_MONTHLY_PRICE_ID') || '';
const appUrl = Deno.env.get('FARO_APP_URL') || '';

const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const userId = String(ctx.userClaims?.sub || '');
    if (!userId) return json({ error: 'Sessão inválida.' }, 401);
    if (ctx.userClaims?.is_anonymous === true) return json({ error: 'Crie sua conta com e-mail para assinar.' }, 403);
    // Trava de servidor (fail-closed): sem FARO_BILLING_ENABLED=true nos segredos, a cobrança fica fechada (beta).
    if (!(Deno.env.get('FARO_BILLING_ENABLED') === 'true')) return json({ error: 'Cobrança ainda não aberta.' }, 503);
    if (!stripeSecret || !priceId || !appUrl) return json({ error: 'Cobrança ainda não configurada.' }, 503);

    const stripe = new Stripe(stripeSecret);
    const { data: existing, error: readError } = await ctx.supabaseAdmin
      .from('faro_subscriptions')
      .select('stripe_customer_id,stripe_subscription_id,status')
      .eq('user_id', userId)
      .maybeSingle();
    if (readError) return json({ error: 'Não foi possível preparar a assinatura.' }, 500);

    try {
      // Quem já assina não abre um segundo checkout: vai direto para o portal.
      if (hasBlockingSubscription(existing) && existing?.stripe_customer_id) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: existing.stripe_customer_id,
          return_url: `${appUrl}?faro_cobranca=portal`
        });
        return json({ url: portal.url, portal: true });
      }

      let customerId = existing?.stripe_customer_id || null;
      if (!customerId) {
        const customer = await stripe.customers.create(
          { metadata: { faro_user_id: userId } },
          { idempotencyKey: `faro-customer-${userId}` }
        );
        customerId = customer.id;
        const { error: saveCustomerError } = await ctx.supabaseAdmin
          .from('faro_subscriptions')
          .upsert({ user_id: userId, stripe_customer_id: customerId, status: 'inactive', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (saveCustomerError) return json({ error: 'Não foi possível vincular a assinatura à sua conta.' }, 500);
      }

      // Uma sessão aberta por usuário: decisão atômica no banco (trava por usuário).
      const { data: reservation, error: reserveError } = await ctx.supabaseAdmin
        .rpc('faro_reserve_checkout', { p_user_id: userId })
        .single();
      if (reserveError || !reservation) return json({ error: 'Não foi possível preparar a assinatura.' }, 500);
      const decision = (reservation as { decision: string }).decision;
      if (decision === 'deleting') return json({ error: 'Sua conta está sendo excluída.' }, 409);
      if (decision === 'reuse') return json({ url: (reservation as { checkout_url: string }).checkout_url, reused: true });
      if (decision === 'busy') return json({ error: 'Seu pagamento já está sendo preparado. Tente de novo em instantes.' }, 409);

      // Janela de 30 min = validade da sessão: duas chamadas na mesma janela recebem a MESMA sessão da Stripe.
      const windowMs = 30 * 60 * 1000;
      const windowIndex = Math.floor(Date.now() / windowMs);
      const expiresAt = Math.floor(((windowIndex + 1) * windowMs) / 1000) + 30 * 60;
      let session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          allow_promotion_codes: true,
          integration_identifier: 'faro_finance_qmvktzra',
          client_reference_id: userId,
          metadata: { faro_user_id: userId },
          subscription_data: { metadata: { faro_user_id: userId } },
          expires_at: expiresAt,
          success_url: `${appUrl}?faro_cobranca=retorno`,
          cancel_url: `${appUrl}?faro_cobranca=cancelada`
        }, { idempotencyKey: `faro-checkout-${userId}-${windowIndex}` });
      } catch (error) {
        await ctx.supabaseAdmin.rpc('faro_release_checkout', { p_user_id: userId });
        throw error;
      }

      if (!session.url) {
        await ctx.supabaseAdmin.rpc('faro_release_checkout', { p_user_id: userId });
        return json({ error: 'Checkout indisponível agora.' }, 503);
      }
      await ctx.supabaseAdmin.rpc('faro_save_checkout', {
        p_user_id: userId,
        p_session_id: session.id,
        p_url: session.url,
        p_expires_at: new Date(session.expires_at * 1000).toISOString()
      });
      return json({ url: session.url });
    } catch (error) {
      console.error('FARO checkout falhou', (error as { type?: string })?.type || 'erro');
      const failure = stripeFailure(error);
      return json(failure.body, failure.status);
    }
  })
};
