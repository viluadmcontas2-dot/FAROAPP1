// Contrato da cobrança no servidor: paywall por RLS, trial no servidor, limites do estado,
// webhook robusto à API 2025-03-31+ e checkout sem assinatura duplicada.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const migrationFile = (await readdir('supabase/migrations')).find(name => /_faro_server_paywall\.sql$/.test(name));
assert.ok(migrationFile, 'Precisa existir a migration *_faro_server_paywall.sql');
const [sql, checkout, portal, webhook, shared, project, status, steps, decisions] = await Promise.all([
  readFile(`supabase/migrations/${migrationFile}`, 'utf8'),
  readFile('supabase/functions/criar-checkout-faro/index.ts', 'utf8'),
  readFile('supabase/functions/abrir-portal-faro/index.ts', 'utf8'),
  readFile('supabase/functions/stripe-webhook-faro/index.ts', 'utf8'),
  readFile('supabase/functions/_shared/faro-billing.js', 'utf8'),
  readFile('PROJECT.md', 'utf8'),
  readFile('STATUS.md', 'utf8'),
  readFile('docs/billing/PASSO-A-PASSO-DONO.md', 'utf8'),
  readFile('docs/decisoes/cobranca.md', 'utf8')
]);
const lower = sql.toLowerCase();

// 1 — Paywall no servidor.
assert.match(lower, /create or replace function public\.faro_has_access\(p_user_id uuid\)[\s\S]*security definer[\s\S]*set search_path = ''/,
  'faro_has_access deve ser security definer com search_path vazio');
assert.match(lower, /status in \('active', ?'trialing', ?'past_due'\)[\s\S]*current_period_end > now\(\)/,
  'Acesso por assinatura exige status pago e período vigente');
assert.match(lower, /faro_trials_used[\s\S]*trial_ends_at > now\(\)/, 'Acesso por trial exige trial vigente');
assert.match(lower, /revoke all on function public\.faro_has_access\(uuid\) from public, anon/);
for (const table of ['faro_state', 'faro_profiles', 'faro_push_devices']) {
  for (const op of ['insert', 'update']) {
    const re = new RegExp(`create policy "[^"]+"\\s+on public\\.${table} for ${op}\\s+to authenticated[\\s\\S]*?public\\.faro_has_access\\(\\(select auth\\.uid\\(\\)\\)\\)[\\s\\S]*?;`);
    assert.match(lower, re, `${table}/${op} deve exigir faro_has_access`);
  }
  const select = new RegExp(`create policy "[^"]+"\\s+on public\\.${table} for select\\s+to authenticated\\s+using \\(([^;]*)\\);`);
  const selectBody = lower.match(select)?.[1] || '';
  assert.ok(selectBody, `${table}/select precisa existir`);
  assert.doesNotMatch(selectBody, /faro_has_access/, `${table}: leitura (exportar) não depende de pagamento`);
}
// Políticas autenticadas excluem anônimos.
const policies = lower.match(/create policy "[^"]+"\s+on public\.faro_\w+ for \w+\s+to authenticated[\s\S]*?;/g) || [];
assert.ok(policies.length >= 13, `Esperava ao menos 13 policies recriadas, achei ${policies.length}`);
for (const policy of policies) {
  assert.match(policy, /public\.faro_is_real_user\(\)/, `Policy precisa excluir anônimo: ${policy.slice(0, 80)}`);
}
assert.match(lower, /function public\.faro_is_real_user\(\)[\s\S]*is_anonymous/);

// 4 — Trial único de 7 dias, que sobrevive à exclusão da conta.
assert.match(lower, /create table if not exists public\.faro_trials_used \(\s*email_hash text primary key/);
const trialsTable = lower.match(/create table if not exists public\.faro_trials_used \(([\s\S]*?)\);/)?.[1] || '';
assert.doesNotMatch(trialsTable, /references/, 'faro_trials_used não pode ter FK (sobrevive à exclusão da conta)');
assert.match(lower, /interval '7 days'/);
assert.match(lower, /on conflict \(email_hash\) do nothing/, 'Trial é concedido uma única vez por e-mail');
assert.match(lower, /after insert on auth\.users/, 'Trial é concedido pelo servidor no cadastro');
assert.match(lower, /revoke all on public\.faro_trials_used from anon, authenticated/);

// 5 — Limites do snapshot.
assert.match(lower, /octet_length\(state::text\) <= 524288/, 'state jsonb limitado a 512 KB');
assert.match(lower, /old\.server_updated_at > now\(\) - interval '1 second'/, 'Rate-limit simples via server_updated_at');

// 2/3 — Webhook.
assert.match(shared, /items\?\.data\?\.\[0\]\?\.current_period_end/);
assert.match(webhook, /subscriptionPeriodEnd\(subscription\)/);
assert.match(webhook, /isStaleSubscriptionEvent\(/);
assert.match(webhook, /last_event_created/);
for (const type of ['customer.subscription.trial_will_end', 'invoice.payment_failed', 'charge.dispute.created', 'customer.subscription.deleted']) {
  assert.ok(webhook.includes(`'${type}'`), `Webhook deve tratar ${type}`);
}
assert.match(lower, /add column if not exists last_event_created timestamptz/);
assert.match(lower, /add column if not exists last_dispute_at timestamptz/);

// 3 — Checkout/portal.
assert.match(checkout, /hasBlockingSubscription\(existing\)[\s\S]*billingPortal\.sessions\.create/,
  'Quem já assina vai para o portal, não para um segundo checkout');
assert.match(checkout, /idempotencyKey: `faro-customer-\$\{userId\}`/);
assert.match(checkout, /is_anonymous/, 'Checkout recusa usuário anônimo');
for (const source of [checkout, portal]) {
  assert.match(source, /catch \(error\)[\s\S]*stripeFailure\(error\)/, 'Chamadas Stripe com resposta limpa em erro');
}
for (const source of [checkout, portal, webhook]) {
  assert.match(source, /from '\.\.\/_shared\/faro-billing\.js'/);
}

// Decisão do dono: R$ 22,99 com cupom PRAGAS (R$ 14,90 por 5 meses).
for (const doc of [project, status]) {
  assert.doesNotMatch(doc, /RATAO/, 'Docs ativos não citam mais RATAO');
  assert.match(doc, /PRAGAS/);
}
assert.match(project, /22,99/);
assert.match(project, /14,90/);
assert.match(steps, /PRAGAS/);
for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_FARO_MONTHLY_PRICE_ID', 'FARO_APP_URL']) {
  assert.ok(steps.includes(name), `Passo a passo cita o segredo ${name}`);
}
assert.match(steps, /4242 4242 4242 4242/);
assert.doesNotMatch(steps, /sk_(test|live)_[A-Za-z0-9]{6,}|whsec_[A-Za-z0-9]{6,}/, 'Passo a passo não traz valores de segredo');
assert.match(decisions, /PRAGAS[\s\S]*revis/i, 'Decisão do cupom registrada como revisável');

console.log('FARO cobrança no servidor: paywall RLS, anônimo bloqueado, trial único, limites do estado, webhook e checkout robustos — ok');
