import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [account, config, checkout, portal, webhook, schema, webhookSchema] = await Promise.all([
  readFile('faro-account.js','utf8'),
  readFile('faro-config.js','utf8'),
  readFile('supabase/functions/criar-checkout-faro/index.ts','utf8'),
  readFile('supabase/functions/abrir-portal-faro/index.ts','utf8'),
  readFile('supabase/functions/stripe-webhook-faro/index.ts','utf8'),
  readFile('supabase/migrations/20260814173000_faro_commercial_foundation.sql','utf8'),
  readFile('supabase/migrations/20260814174500_stripe_webhook_idempotency.sql','utf8')
]);

for (const source of [checkout, portal, webhook]) {
  assert.match(source, /npm:@supabase\/server@1\.4\.1/,
    'Edge Functions comerciais precisam pin de @supabase/server');
  assert.match(source, /npm:stripe@22\.5\.0/,
    'Edge Functions comerciais precisam pin exato do SDK Stripe');
}

assert.match(checkout, /withSupabase\(\{ auth: 'user' \}/,
  'Checkout hospedado só pode ser criado para usuário autenticado');
assert.match(checkout, /checkout\.sessions\.create/);
assert.match(checkout, /mode: 'subscription'/);
assert.match(checkout, /line_items:/);
assert.match(portal, /withSupabase\(\{ auth: 'user' \}/);
assert.match(portal, /billingPortal\.sessions\.create/);

assert.match(webhook, /withSupabase\(\{ auth: 'none' \}/,
  'Webhook não usa JWT porque autenticação vem da assinatura Stripe');
assert.match(webhook, /stripe-signature/);
assert.match(webhook, /webhooks\.constructEvent\(rawBody, signature, webhookSecret\)/);
assert.match(webhook, /faro_webhook_events/);
assert.match(webhookSchema, /event_id text primary key/);
assert.match(webhookSchema, /revoke all on public\.faro_webhook_events from anon, authenticated/);

assert.match(schema, /grant select on public\.faro_subscriptions to authenticated/);
assert.doesNotMatch(schema, /grant select, insert, update, delete on public\.faro_subscriptions to authenticated/,
  'Entitlement não pode ser escrito pelo cliente');

for (const source of [account, config]) {
  assert.doesNotMatch(source, /sk_(?:test|live)_|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|service_role|sb_secret_/,
    'Cliente FARO não pode carregar segredo privilegiado');
}
assert.doesNotMatch(account, /cardNumber|card-number|StripeElements|stripe\.elements/i,
  'FARO não coleta cartão: pagamento deve permanecer no Checkout hospedado');
assert.match(account, /client\.functions\.invoke\(name\)/,
  'Cliente só pede uma sessão server-side e segue a URL hospedada');

console.log('FARO_FINANCE_V1 N6 preflight: checkout hospedado, entitlement server-side, webhook assinado e dependências reprodutíveis — ok');
