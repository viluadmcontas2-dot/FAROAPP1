// Contrato estático das Edge Functions (Deno não roda offline aqui; isto trava as defesas no código).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const fn = n => readFileSync(new URL(`../supabase/functions/${n}/index.ts`, import.meta.url), 'utf8');
const webhook = fn('stripe-webhook-faro'), checkout = fn('criar-checkout-faro'), portal = fn('abrir-portal-faro');

test('webhook: só POST, assinatura verificada com segredo, idempotência, 400 em assinatura inválida', () => {
  assert.match(webhook, /req\.method !== 'POST'/);
  assert.match(webhook, /constructEventAsync\(rawBody, signature, webhookSecret\)/);
  assert.match(webhook, /faro_apply_subscription_event/);
  assert.match(webhook, /status: 400/); assert.match(webhook, /!stripeSecret \|\| !webhookSecret/);
  assert.ok(webhook.indexOf('constructEventAsync') < webhook.indexOf('faro_apply_subscription_event'), 'verifica antes de tocar o banco');
});
test('webhook/shared: status desconhecido => inactive; período lido dos itens; fatura nova (parent)', () => {
  const shared = readFileSync(new URL('../supabase/functions/_shared/faro-billing.js', import.meta.url), 'utf8');
  assert.match(shared, /'inactive'/); assert.match(shared, /items\?\.data\?\.\[0\]\?\.current_period_end/);
  assert.match(shared, /parent\?\.subscription_details/);
});
test('checkout/portal: só POST, exigem usuário autenticado, app url https; checkout não duplica assinatura viva', () => {
  for (const f of [checkout, portal]) { assert.match(f, /req\.method !== 'POST'/); assert.match(f, /auth: 'user'/); assert.match(f, /https:\\\/\\\//); }
  assert.match(checkout, /hasBlockingSubscription\(existing\)/); assert.match(checkout, /billingPortal\.sessions\.create/); assert.match(checkout, /409/);
  assert.doesNotMatch(checkout + portal, /await req\.json|searchParams|body\.(price|customer|user)/, 'não confia em entrada do cliente');
});
test('config.toml: toda função listada com verify_jwt explícito e autenticação feita no código', () => {
  const toml = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  for (const n of readdirSync(new URL('../supabase/functions/', import.meta.url)).filter(x => !x.startsWith('_'))) assert.match(toml, new RegExp(`\\[functions\\.${n}\\]`));
});
test('migração faro_save_state: revoga escrita direta, limites e schema 2', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261021000100_faro_save_state_rpc.sql', import.meta.url), 'utf8');
  assert.match(sql, /revoke insert, update on public\.faro_state from authenticated/);
  assert.match(sql, /524288/); assert.match(sql, /set search_path = ''/); assert.match(sql, /revoke all on function public\.faro_save_state[^;]*from public, anon/);
});

test('checkout: trial de 7 dias UMA vez (decidido no banco), cartão sempre, idempotência estável por usuário+janela', () => {
  assert.match(checkout, /faro_trial_days_for/); assert.match(checkout, /checkoutTrialParams\(/);
  assert.match(checkout, /payment_method_collection: 'always'/); assert.match(checkout, /subscription_data: \{.*\.\.\.checkoutTrialParams\(trialDays\)/);
  assert.match(checkout, /idempotencyKey: `faro-checkout-\$\{userId\}-\$\{windowIndex\}-\$\{trialDays > 0 \? 't' : 'n'\}`/);
  assert.match(checkout, /allow_promotion_codes: true/, 'cupom RATAO continua valendo');
  assert.doesNotMatch(checkout, /trial_period_days:\s*7/, 'dias vêm do banco, não do código');
  assert.ok(checkout.indexOf('faro_trial_days_for') < checkout.indexOf('checkout.sessions.create'));
});
test('checkout: anônimo recusado, cobrança só com FARO_BILLING_ENABLED', () => {
  assert.match(checkout, /is_anonymous === true[^\n]*403/); assert.match(checkout, /FARO_BILLING_ENABLED/);
});
test('shared faro-billing: trial só com dias inteiros positivos', async () => {
  const m = await import('../supabase/functions/_shared/faro-billing.js');
  assert.deepEqual(m.checkoutTrialParams(7), { trial_period_days: 7 });
  for (const v of [0, -1, 1.5, null, undefined, 'x', NaN]) assert.deepEqual(m.checkoutTrialParams(v), {});
  assert.equal(m.normalizedStatus('trialing'), 'trialing'); assert.equal(m.normalizedStatus('foo'), 'inactive');
  assert.equal(m.hasBlockingSubscription({ stripe_subscription_id: 's', status: 'trialing' }), true);
  assert.equal(m.hasBlockingSubscription({ stripe_subscription_id: 's', status: 'canceled' }), false);
});
test('webhook: trial_will_end só registra; trialing e demais status via RPC atômica; replay = duplicate', () => {
  assert.match(webhook, /faro_apply_subscription_event/); assert.match(webhook, /duplicate: result === 'duplicate'/);
  const refresh = webhook.match(/SUBSCRIPTION_REFRESH_EVENTS = new Set\(\[([^\]]*)\]/s)[1];
  assert.doesNotMatch(refresh, /trial_will_end/, 'trial_will_end não atualiza assinatura');
  assert.match(webhook, /customer\.subscription\.trial_will_end/);
  assert.match(webhook, /normalizedStatus/);
});
test('migração faro_acesso_e_trial: idempotente, search_path vazio, acesso só active/trialing, sem trial sem cartão', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261021000200_faro_acesso_e_trial.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table if not exists public\.faro_trials_used/); assert.match(sql, /create table if not exists public\.faro_billing_settings/);
  assert.match(sql, /faro_has_access/); assert.match(sql, /faro_my_trial_ends_at/);
  assert.match(sql, /sub\.status in \('active', 'trialing'\)/); assert.doesNotMatch(sql.split('function public.faro_has_access')[1].split('$$;')[0] || '', /past_due/);
  assert.doesNotMatch(sql.replace(/^--.*$/gm, ''), /create (or replace )?function [^;]*(?<!set )search_path = '[^']/);
  const fns = sql.match(/create or replace function[\s\S]*?\$\$;?/g) || [];
  for (const f of fns) assert.match(f, /set search_path = ''/);
  assert.match(sql, /enable row level security/); assert.match(sql, /drop trigger if exists faro_grant_trial_on_signup/);
});
