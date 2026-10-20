import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';

class SkipStripe extends Error {}
const json = (body: unknown, status = 200) => Response.json(body, { status });
// Excluir a conta (direito LGPD) não depende da cobrança: o Stripe só é exigido se o usuário tem cliente/assinatura.
const configured = () => ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  .every(name => Boolean(Deno.env.get(name)));

const authenticated = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const userId = String(ctx.userClaims?.sub || '');
  if (!userId) return json({ error: 'Sessão inválida.' }, 401);
  if (ctx.userClaims?.is_anonymous === true) return json({ error: 'Entre com sua conta de e-mail.' }, 403);
  const body = await req.json().catch(() => null);
  if (body?.confirmation !== 'EXCLUIR') return json({ error: 'Confirme a exclusão no aplicativo.' }, 400);

  try {
    const { data, error } = await ctx.supabaseAdmin.from('faro_subscriptions')
      .select('stripe_customer_id,stripe_subscription_id').eq('user_id', userId).maybeSingle();
    if (error) return json({ error: 'Não foi possível conferir a assinatura. Tente novamente.' }, 503);
    const needsStripe = Boolean(data?.stripe_customer_id || data?.stripe_subscription_id);
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
    if (needsStripe && !stripeSecret) return json({ error: 'Cancelamento da assinatura indisponível agora. Sua conta foi mantida; tente novamente.' }, 503);
    try {
      if (!needsStripe) throw new SkipStripe();
      const stripe = new Stripe(stripeSecret);
      // Consultar Stripe evita depender do status local ou de um webhook atrasado.
      const ids = new Set<string>();
      if (data?.stripe_subscription_id) ids.add(data.stripe_subscription_id);
      if (data?.stripe_customer_id) {
        for await (const subscription of stripe.subscriptions.list({ customer: data.stripe_customer_id, status: 'all', limit: 100 })) {
          if (!['canceled', 'incomplete_expired'].includes(subscription.status)) ids.add(subscription.id);
        }
      }
      for (const id of ids) {
        const subscription = await stripe.subscriptions.retrieve(id);
        if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
          await stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false });
        }
      }
    } catch (error) {
      if (!(error instanceof SkipStripe)) return json({ error: 'Não foi possível cancelar a assinatura. Sua conta foi mantida; tente novamente.' }, 502);
    }
    // Uma única exclusão usa ON DELETE CASCADE de faro_profiles, faro_state,
    // faro_subscriptions e faro_push_devices. faro_trials_used não tem FK e permanece.
    const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) return json({ error: 'Não foi possível excluir a conta. A assinatura pode já estar cancelada; tente novamente.' }, 503);
    return json({ deleted: true });
  } catch {
    return json({ error: 'Exclusão indisponível. Tente novamente.' }, 503);
  }
});

export default {
  fetch: (req: Request) => {
    // Checar antes do middleware: ausência de segredos nunca inicia uma exclusão.
    if (!configured()) return json({ error: 'Exclusão ainda não configurada.' }, 503);
    return authenticated(req);
  }
};
