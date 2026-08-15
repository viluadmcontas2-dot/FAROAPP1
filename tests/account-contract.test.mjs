import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = await readFile('faro-config.js', 'utf8');
const account = await readFile('faro-account.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const schema = await readFile('supabase/migrations/20260814173000_faro_commercial_foundation.sql', 'utf8');
const webhookIdempotency = await readFile('supabase/migrations/20260814174500_stripe_webhook_idempotency.sql', 'utf8');
const checkout = await readFile('supabase/functions/criar-checkout-faro/index.ts', 'utf8');
const portal = await readFile('supabase/functions/abrir-portal-faro/index.ts', 'utf8');
const webhook = await readFile('supabase/functions/stripe-webhook-faro/index.ts', 'utf8');
const functionConfig = await readFile('supabase/config.toml', 'utf8');

// Frontend só contém configuração publicável.
assert.match(config, /supabasePublishableKey/);
assert.match(config, /otpChannel: 'whatsapp'/);
for (const source of [config, account, shell]) {
  assert.doesNotMatch(source, /sk_live_|sk_test_|sb_secret_|service_role|SUPABASE_SECRET_KEYS|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/);
}

// Estado vivo desta branch: fundação presente, serviço online ainda não conectado.
assert.match(config, /supabaseUrl: ''/, 'Branch de validação não pode fingir Supabase conectado');
assert.match(config, /supabasePublishableKey: ''/, 'Branch de validação não pode fingir chave publicável configurada');
assert.match(account, /A fundação de conta está pronta; o serviço online ainda não está conectado nesta validação\./, 'UI precisa informar estado local quando backend está ausente');
assert.match(account, /A conta online ainda não está conectada nesta branch de validação\. Seu FARO continua salvo neste aparelho\./, 'Tentativa de login sem backend deve falhar de forma honesta e preservar dados locais');

// Phone-first e conflito explícito quando o backend vier a ser configurado.
assert.match(account, /signInWithOtp/);
assert.match(account, /channel:'whatsapp'/);
assert.match(account, /verifyOtp\(\{ phone:pendingPhone, token, type:'sms' \}\)/);
assert.match(account, /USAR DADOS DESTE APARELHO/);
assert.match(account, /USAR DADOS SALVOS NA CONTA/);
assert.match(account, /O FARO não vai sobrescrever nada sozinho/);
assert.match(account, /meta\.dirty/);
assert.match(account, /remote\.revision/);

// Save continua local-first; sync é posterior/debounced.
assert.match(account, /const baseSave = app\.save/);
assert.match(account, /const result = baseSave\.apply\(this, args\)/);
assert.match(account, /setTimeout\(\(\) => syncNow\('debounced'\), 2500\)/);
assert.match(account, /window\.addEventListener\('online'/);
assert.match(account, /Salvo no aparelho/);

// Snapshot completo, versionado e por user_id.
assert.match(account, /from\('faro_state'\)/);
assert.match(account, /schema_version: Number\(config\.schemaVersion/);
assert.match(account, /state: app\.state/);
assert.match(account, /user_id: userId/);

// Mesmo aparelho: logout seguro não mantém dados do usuário na superfície ativa.
assert.match(account, /if \(!navigator\.onLine\) return app\.toast\('Conecte-se à internet para sair sem arriscar dados não sincronizados\.'/);
assert.match(account, /app\.state = app\.cloneDefaults\(\)/);
assert.match(account, /app\.state\.onboardingComplete = false/);

// RLS e autorização server-side.
for (const table of ['faro_profiles','faro_state','faro_subscriptions','faro_push_devices']) {
  assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
}
assert.match(schema, /auth\.uid\(\)\) = user_id/);
assert.match(schema, /grant select on public\.faro_subscriptions to authenticated/);
assert.doesNotMatch(schema, /grant select, insert, update, delete on public\.faro_subscriptions to authenticated/);
assert.match(webhookIdempotency, /event_id text primary key/);
assert.match(webhookIdempotency, /revoke all on public\.faro_webhook_events from anon, authenticated/);

// Cobrança: Checkout/Portal server-side e assinatura real por webhook assinado.
assert.match(checkout, /withSupabase\(\{ auth: 'user' \}/);
assert.match(checkout, /mode: 'subscription'/);
assert.match(checkout, /STRIPE_FARO_MONTHLY_PRICE_ID/);
assert.match(portal, /billingPortal\.sessions\.create/);
assert.match(webhook, /withSupabase\(\{ auth: 'none' \}/);
assert.match(webhook, /stripe\.webhooks\.constructEvent/);
assert.match(webhook, /STRIPE_WEBHOOK_SECRET/);
assert.match(webhook, /checkout\.session\.completed/);
assert.match(webhook, /invoice\.paid/);
assert.match(webhook, /invoice\.payment_failed/);
assert.match(webhook, /customer\.subscription\.updated/);
assert.match(webhook, /faro_webhook_events/);
assert.match(functionConfig, /\[functions\.stripe-webhook-faro\][\s\S]*verify_jwt = false/);

// Integração da camada comercial à fotografia instalada.
assert.match(shell, /faro-config\.js\?v=1/);
assert.match(shell, /faro-account\.js\?v=1/);
assert.match(build, /'faro-config\.js'/);
assert.match(build, /'faro-account\.js'/);
assert.match(sw, /faro-config\.js\?v=1/);
assert.match(sw, /faro-account\.js\?v=1/);

console.log('FARO: dados locais ativos; fundação de conta/sync protegida e backend corretamente classificado como não conectado — ok');
