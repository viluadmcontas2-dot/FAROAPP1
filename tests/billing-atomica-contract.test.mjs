// Contrato das Edge Functions de cobrança atômica (webhook via RPC, checkout único, exclusão segura, trava de servidor)
// e da regra "CI não pula em silêncio". O comportamento SQL é provado em tests/billing-sql-behavior.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = path => readFileSync(path, 'utf8');
const webhook = read('supabase/functions/stripe-webhook-faro/index.ts');
const checkout = read('supabase/functions/criar-checkout-faro/index.ts');
const portal = read('supabase/functions/abrir-portal-faro/index.ts');
const excluir = read('supabase/functions/excluir-conta-faro/index.ts');
const passo = read('docs/billing/PASSO-A-PASSO-DONO.md');

// Webhook: idempotência e ordem dentro da RPC atômica; nada de "consulta, processa, grava".
assert.match(webhook, /rpc\('faro_apply_subscription_event'/);
assert.doesNotMatch(webhook, /from\('faro_webhook_events'\)/, 'webhook não pode tocar faro_webhook_events fora da RPC');
assert.doesNotMatch(webhook, /from\('faro_subscriptions'\)\s*\.upsert/, 'upsert da assinatura só pela RPC');
assert.match(webhook, /orphan/, 'conta excluída responde 200 e registra');

// Trava de servidor (fail-closed).
for (const [name, source] of [['checkout', checkout], ['portal', portal]]) {
  assert.match(source, /Deno\.env\.get\('FARO_BILLING_ENABLED'\)\s*===\s*'true'/, `${name}: exige FARO_BILLING_ENABLED=true`);
  assert.match(source, /Cobrança ainda não aberta\.'\s*\},\s*503/, `${name}: 503 quando fechada`);
}
assert.match(passo, /FARO_BILLING_ENABLED/);
assert.match(passo, /beta[^\n]*NÃO/i, 'passo a passo diz que no beta a variável não é criada');

// Checkout único por usuário.
assert.match(checkout, /rpc\('faro_reserve_checkout'/);
assert.match(checkout, /rpc\('faro_save_checkout'/);
assert.match(checkout, /rpc\('faro_release_checkout'/);
assert.match(checkout, /idempotencyKey: `faro-checkout-\$\{userId\}-\$\{/);
assert.match(checkout, /decision === 'reuse'/);
assert.match(checkout, /decision === 'deleting'/);

// Exclusão: marca, expira checkouts abertos (salvo e listados) ANTES de cancelar e apagar.
const iBegin = excluir.indexOf("rpc('faro_begin_account_deletion'");
const iList = excluir.indexOf('checkout.sessions.list');
const iExpire = excluir.indexOf('checkout.sessions.expire');
const iCancel = excluir.indexOf('subscriptions.cancel');
const iDelete = excluir.indexOf('deleteUser');
assert.ok(iBegin > 0 && iList > iBegin && iExpire > iBegin && iCancel > iExpire && iDelete > iCancel,
  'ordem: marcar exclusão → listar/expirar checkouts → cancelar assinaturas → apagar usuário');
assert.match(excluir, /status: 'open'/);

// CI não pula testes de navegador em silêncio.
const probe = spawnSync(process.execPath, ['-e', "require('./scripts/lib/faro-browser.cjs').findChrome()"], {
  env: { ...process.env, CI: 'true', FARO_CHROME_BIN: '/nao/existe/chrome' }, encoding: 'utf8'
});
assert.notEqual(probe.status, 0, 'CI=true sem Chrome deve falhar');
assert.match(probe.stderr, /CI=true/);
const local = spawnSync(process.execPath, ['-e', "process.exit(require('./scripts/lib/faro-browser.cjs').findChrome() === null ? 0 : 3)"], {
  env: { ...process.env, CI: '', FARO_CHROME_BIN: '/nao/existe/chrome' }, encoding: 'utf8'
});
assert.equal(local.status, 0, 'localmente, Chrome ausente continua SKIP (null)');

console.log('FARO cobrança atômica (contrato) — ok');
