// Contrato estático das Edge Functions (Deno não roda offline aqui; isto trava as defesas no código).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const fn = n => readFileSync(new URL(`../supabase/functions/${n}/index.ts`, import.meta.url), 'utf8');
const webhook = fn('stripe-webhook-faro'), checkout = fn('criar-checkout-faro'), portal = fn('abrir-portal-faro');

test('webhook: só POST, assinatura verificada com segredo, idempotência, 400 em assinatura inválida', () => {
  assert.match(webhook, /req\.method !== 'POST'/);
  assert.match(webhook, /constructEvent\(rawBody, signature, webhookSecret\)/);
  assert.match(webhook, /faro_webhook_events/); assert.match(webhook, /23505/);
  assert.match(webhook, /status: 400/); assert.match(webhook, /!stripeSecret \|\| !webhookSecret/);
  assert.ok(webhook.indexOf('constructEvent') < webhook.indexOf('faro_webhook_events'), 'verifica antes de tocar o banco');
});
test('webhook: status desconhecido => inactive; período lido também dos itens; fatura nova (parent)', () => {
  assert.match(webhook, /return 'inactive'/); assert.match(webhook, /items\?\.data\?\.\[0\]\?\.current_period_end/);
  assert.match(webhook, /parent\?\.subscription_details/);
});
test('checkout/portal: só POST, exigem usuário autenticado, app url https; checkout não duplica assinatura viva', () => {
  for (const f of [checkout, portal]) { assert.match(f, /req\.method !== 'POST'/); assert.match(f, /auth: 'user'/); assert.match(f, /https:\\\/\\\//); }
  assert.match(checkout, /'active', 'trialing', 'past_due'/); assert.match(checkout, /409/);
  assert.doesNotMatch(checkout + portal, /await req\.json|searchParams|body\.(price|customer|user)/, 'não confia em entrada do cliente');
});
test('config.toml: toda função listada com verify_jwt explícito e autenticação feita no código', () => {
  const toml = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  for (const n of readdirSync(new URL('../supabase/functions/', import.meta.url))) assert.match(toml, new RegExp(`\\[functions\\.${n}\\]`));
});
test('migração faro_save_state: revoga escrita direta, limites e schema 2', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261021000100_faro_save_state_rpc.sql', import.meta.url), 'utf8');
  assert.match(sql, /revoke insert, update on public\.faro_state from authenticated/);
  assert.match(sql, /524288/); assert.match(sql, /set search_path = ''/); assert.match(sql, /revoke all on function public\.faro_save_state[^;]*from public, anon/);
});
