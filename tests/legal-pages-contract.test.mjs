import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildCsp } from '../scripts/csp.mjs';
const read = path => readFileSync(path, 'utf8');
for (const page of ['termos.html', 'privacidade.html']) test(`Publicar ${page} acessível e offline`, () => {
  const html = read(page);
  for (const text of ['lang="pt-BR"', 'viewport-fit=cover', 'contato@FARO_DOMINIO_A_DEFINIR', '[PREENCHER PELO DONO]', 'legal.css', 'app-shell.html']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /<script|\son\w+=|javascript:/i);
  assert.match(read('scripts/build-static-site.mjs'), new RegExp(`'${page}'`));
  assert.ok(read('sw.js').includes(`'./${page}'`));
  assert.match(buildCsp(), /style-src 'self'/);
});
test('Informar coleta, retenção e direitos sem prometer eliminação absoluta', () => {
  const text = read('privacidade.html');
  for (const term of ['Supabase', 'RLS', 'acessar', 'exportar', 'corrigir', 'excluir', 'hash', 'Stripe', 'aparelho']) assert.ok(text.includes(term), term);
  assert.match(read('termos.html'), /não é consultoria financeira/);
});
test('Conectar Conta com exportação existente e confirmação em duas etapas', () => {
  const code = read('faro-account.js');
  for (const text of ['href="termos.html"', 'href="privacidade.html"', 'Exportar meus dados', 'Excluir minha conta', 'faroDeleteContinue', 'faroDeleteConfirm', "invoke('excluir-conta-faro'", 'app.exportData()', 'deletionInProgress', 'faro-deleted-account-backup-v1']) assert.ok(code.includes(text), text);
  assert.doesNotMatch(code, /\bconfirm\(/);
  assert.ok(code.indexOf("invoke('excluir-conta-faro'") < code.indexOf('clearDeletedAccountState()'));
});
test('Excluir somente o titular autenticado, cancelar Stripe antes e preservar trial', () => {
  const code = read('supabase/functions/excluir-conta-faro/index.ts');
  for (const text of ["withSupabase({ auth: 'user' }", 'is_anonymous', 'Deno.env.get', '503', 'supabaseAdmin.auth.admin.deleteUser(userId)', ".eq('user_id', userId)", 'subscriptions.cancel', 'subscriptions.list']) assert.ok(code.includes(text), text);
  assert.ok(code.indexOf('subscriptions.cancel') < code.indexOf('auth.admin.deleteUser'));
  assert.doesNotMatch(code, /from\(['"]faro_trials_used['"]\)/);
  assert.match(read('supabase/config.toml'), /\[functions.excluir-conta-faro\]\s*verify_jwt = false/);
  const sql = read('supabase/migrations/20260814173000_faro_commercial_foundation.sql');
  assert.equal((sql.match(/references auth.users\(id\) on delete cascade/g) || []).length, 4);
});

// Executar o handler com dependências falsas: nenhuma chamada a provedores.
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
const edgeSource = () => stripTypeScriptTypes(read('supabase/functions/excluir-conta-faro/index.ts')
  .replace(/^import .*;\n/gm, '').replace('export default', 'globalThis.handler ='));
function edgeHarness({ secrets = true, anonymous = false, stripeError = false, dbError = false, deleteError = false, subscriptions = [] } = {}) {
  const calls = [];
  const context = {
    userClaims: { sub: 'titular', is_anonymous: anonymous },
    supabaseAdmin: {
      from(table) { calls.push(table); return { select() { return this; }, eq(key, value) { assert.equal(key, 'user_id'); assert.equal(value, 'titular'); return this; }, async maybeSingle() { return { data: { stripe_customer_id: 'customer' }, error: dbError }; } }; },
      auth: { admin: { async deleteUser(id) { calls.push(`delete:${id}`); return { error: deleteError }; } } }
    }
  };
  const sandbox = { Response, Set, Deno: { env: { get: () => secrets ? 'configured' : '' } },
    withSupabase: (options, fn) => { assert.equal(options.auth, 'user'); return req => fn(req, context); },
    Stripe: class { subscriptions = {
      async *list() { if (stripeError) throw Error('segredo não deve vazar'); for (const sub of subscriptions) yield sub; },
      async retrieve(id) { return subscriptions.find(s => s.id === id); },
      async cancel(id) { calls.push(`cancel:${id}`); }
    }; }
  };
  vm.runInNewContext(edgeSource(), sandbox);
  return { calls, invoke: (method = 'POST', confirmation = 'EXCLUIR') => sandbox.handler.fetch(new Request('https://example.test', { method, ...(method === 'POST' ? { body: JSON.stringify({ confirmation, user_id: 'outro' }) } : {}) })) };
}
test('Handler bloqueia configuração ausente, anônimo, método e confirmação', async () => {
  for (const [options, method, confirmation, status] of [[{ secrets:false }, 'POST', 'EXCLUIR', 503], [{ anonymous:true }, 'POST', 'EXCLUIR', 403], [{}, 'GET', '', 405], [{}, 'POST', 'sim', 400]]) {
    const h = edgeHarness(options); assert.equal((await h.invoke(method, confirmation)).status, status); assert.equal(h.calls.length, 0);
  }
});
test('Handler preserva conta quando Stripe ou banco falha; responde sem detalhes', async () => {
  for (const options of [{ stripeError:true }, { dbError:true }]) {
    const h = edgeHarness(options); const response = await h.invoke();
    assert.ok(response.status >= 500); assert.ok(!h.calls.some(c => c.startsWith('delete:')));
    assert.doesNotMatch(await response.text(), /segredo/);
  }
});
test('Handler cancela assinaturas abertas antes da exclusão e tolera repetição', async () => {
  const h = edgeHarness({ subscriptions: [{ id:'ativa', status:'active' }, { id:'pausada', status:'paused' }, { id:'encerrada', status:'canceled' }] });
  assert.equal((await h.invoke()).status, 200);
  assert.deepEqual(h.calls, ['faro_subscriptions', 'cancel:ativa', 'cancel:pausada', 'delete:titular']);
  const retry = edgeHarness({ subscriptions: [{ id:'ativa', status:'canceled' }] });
  assert.equal((await retry.invoke()).status, 200);
  assert.deepEqual(retry.calls, ['faro_subscriptions', 'delete:titular']);
  assert.equal((await edgeHarness({ deleteError:true }).invoke()).status, 503);
});
