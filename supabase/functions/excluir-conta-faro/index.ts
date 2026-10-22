import { withSupabase } from 'npm:@supabase/server@1.4.1';
import Stripe from 'npm:stripe@22.5.0';
import { readTextLimited } from '../_shared/faro-http.js';

// Exclusão de conta (pré-requisito para ligar a cobrança). Ordem: marca "excluindo" (bloqueia novo checkout) ->
// expira checkouts abertos -> cancela assinaturas vivas no Stripe -> só então apaga o usuário (cascata apaga
// estado, perfil, aparelhos e assinatura). Se o Stripe falhar, a conta é MANTIDA (nunca apaga e deixa cobrando).
// Trazida do remoto (v2) e endurecida: corpo com limite real, checkout aberto sem cliente também exige o Stripe,
// erros do Stripe registrados sem dados pessoais.
class SkipStripe extends Error {}
const MAX_BODY_BYTES = 1_024;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const configured = () => ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  .every(name => Boolean(Deno.env.get(name)));

const authenticated = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const userId = String(ctx.userClaims?.id || ctx.jwtClaims?.sub || '');
  if (!userId) return json({ error: 'Sessão inválida.' }, 401);
  if (ctx.jwtClaims?.is_anonymous === true) return json({ error: 'Entre com sua conta de e-mail.' }, 403);
  const raw = await readTextLimited(req, MAX_BODY_BYTES);
  if (!raw.ok) return json({ error: 'Pedido grande demais.' }, 413);
  let body: any = null;
  try { body = JSON.parse(raw.text); } catch { body = null; }
  if (body?.confirmation !== 'EXCLUIR') return json({ error: 'Confirme a exclusão no aplicativo.' }, 400);

  try {
    const { data: savedCheckout, error: beginError } = await ctx.supabaseAdmin
      .rpc('faro_begin_account_deletion', { p_user_id: userId });
    if (beginError) return json({ error: 'Não foi possível iniciar a exclusão. Tente novamente.' }, 503);
    const { data, error } = await ctx.supabaseAdmin.from('faro_subscriptions')
      .select('stripe_customer_id,stripe_subscription_id').eq('user_id', userId).maybeSingle();
    if (error) return json({ error: 'Não foi possível conferir a assinatura. Tente novamente.' }, 503);
    const openSession = typeof savedCheckout === 'string' && savedCheckout ? savedCheckout : '';
    const needsStripe = Boolean(data?.stripe_customer_id || data?.stripe_subscription_id || openSession);
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
    if (needsStripe && !stripeSecret) return json({ error: 'Cancelamento da assinatura indisponível agora. Sua conta foi mantida; tente novamente.' }, 503);
    try {
      if (!needsStripe) throw new SkipStripe();
      const stripe = new Stripe(stripeSecret);
      const openCheckouts = new Set<string>();
      if (openSession) openCheckouts.add(openSession);
      if (data?.stripe_customer_id) {
        for await (const session of stripe.checkout.sessions.list({ customer: data.stripe_customer_id, status: 'open', limit: 100 })) {
          openCheckouts.add(session.id);
        }
      }
      for (const id of openCheckouts) {
        const session = await stripe.checkout.sessions.retrieve(id);
        if (session.status === 'open') await stripe.checkout.sessions.expire(id);
      }
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
    } catch (stripeError) {
      if (!(stripeError instanceof SkipStripe)) {
        console.error('FARO exclusão: Stripe falhou', (stripeError as { type?: string; code?: string })?.type || (stripeError as { code?: string })?.code || 'erro');
        return json({ error: 'Não foi possível cancelar a assinatura. Sua conta foi mantida; tente novamente.' }, 502);
      }
    }
    const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) return json({ error: 'Não foi possível excluir a conta. A assinatura pode já estar cancelada; tente novamente.' }, 503);
    return json({ deleted: true });
  } catch {
    return json({ error: 'Exclusão indisponível. Tente novamente.' }, 503);
  }
});

export default {
  fetch: (req: Request) => {
    if (!configured()) return json({ error: 'Exclusão ainda não configurada.' }, 503);
    return authenticated(req);
  }
};
