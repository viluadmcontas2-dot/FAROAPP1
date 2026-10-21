// Excluir minha conta (camada de dados): chama a função `excluir-conta-faro` só com confirmação, limpa o aparelho só depois do sucesso
// e nunca deixa dado da conta apagada para trás. Nuvem falsa dos testes (sem rede).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend, BackendError } from '../src/data/backend.js';
import { createSync } from '../src/data/sync.js';
import { makeServer, makeFakeCreateClient, memStorage, GOOD } from './backend-helpers.mjs';

const make = ({ billing = true, signedIn = true } = {}) => {
  const server = makeServer();
  server.users.set('a@x.com', { id: 'ua', password: 'senha-forte-1', confirmed: true });
  const storage = memStorage();
  const backend = createBackend({ config: { ...GOOD, billingEnabled: billing }, createClient: makeFakeCreateClient(server), storage, randomId: () => 'dev-1', redirectTo: () => 'https://app/' });
  return { server, storage, backend, login: () => backend.signIn({ email: 'a@x.com', password: 'senha-forte-1' }), signedIn };
};
const rejectsCode = (p, code, msg) => assert.rejects(p, e => e instanceof BackendError && e.code === code && (!msg || e.message === msg));

test('sem confirmação ou sem login: não chama a função', async () => {
  const { backend, server, login } = make();
  await rejectsCode(backend.deleteAccount({ confirmed: true }), 'not_signed_in');
  await login();
  await rejectsCode(backend.deleteAccount(), 'confirmation_required');
  await rejectsCode(backend.deleteAccount({ confirmed: 'true' }), 'confirmation_required');
  await rejectsCode(backend.deleteAccount({ confirmed: false }), 'confirmation_required');
  assert.equal((server.calls || []).filter(c => c.name === 'excluir-conta-faro').length, 0);
});

test('com confirmação: chama excluir-conta-faro (POST, EXCLUIR) e devolve deleted', async () => {
  const { backend, server, login } = make({ billing: false }); // a exclusão vale mesmo com a cobrança desligada
  await login();
  server.invoke['excluir-conta-faro'] = { deleted: true };
  assert.deepEqual(await backend.deleteAccount({ confirmed: true }), { deleted: true });
  const calls = server.calls.filter(c => c.name === 'excluir-conta-faro');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body, { confirmation: 'EXCLUIR' });
});

test('sem internet: mensagem diz o que fazer', async () => {
  const { backend, server, login } = make();
  await login();
  server.down = true;
  await rejectsCode(backend.deleteAccount({ confirmed: true }), 'offline', 'Sem internet. Conecte e tente de novo.');
  assert.ok(backend.getUser(), 'a sessão continua: nada foi apagado');
});

test('erro do servidor: usa a frase do servidor, ou uma frase padrão; resposta sem deleted não conta', async () => {
  const { backend, server, login } = make();
  await login();
  const err = new Error('Edge Function returned a non-2xx status code');
  err.context = { json: async () => ({ error: 'Não foi possível cancelar a assinatura. Sua conta foi mantida; tente novamente.' }) };
  server.invoke['excluir-conta-faro'] = err;
  await rejectsCode(backend.deleteAccount({ confirmed: true }), 'delete_failed', 'Não foi possível cancelar a assinatura. Sua conta foi mantida; tente novamente.');
  server.invoke['excluir-conta-faro'] = new Error('boom');
  await rejectsCode(backend.deleteAccount({ confirmed: true }), 'delete_failed', 'Não foi possível excluir a conta agora. Tente de novo.');
  server.invoke['excluir-conta-faro'] = { ok: true };
  await rejectsCode(backend.deleteAccount({ confirmed: true }), 'delete_failed');
  assert.ok(backend.getUser());
});

test('depois de excluir: o aparelho é limpo, a sessão acaba e nada fica guardado para essa conta', async () => {
  const { backend, server, storage, login } = make();
  let state = { schemaVersion: 2, onboarded: true, nome: 'dados do motorista' };
  const subs = new Set();
  const store = { getSnapshot: () => structuredClone(state), replaceState: s => { state = s ? structuredClone(s) : null; }, subscribe: fn => { subs.add(fn); return () => subs.delete(fn); } };
  const sync = createSync({ backend, store, storage, hasData: s => !!(s && s.onboarded), setTimer: () => 0, clearTimer: () => {} });
  sync.start();
  await login();
  // mudança ainda não enviada: sem a limpeza, o sair da conta a guardaria em texto puro
  state = { ...state, nome: 'pendente' }; subs.forEach(f => f());
  assert.equal(sync.hasPending(), true);
  server.invoke['excluir-conta-faro'] = { deleted: true };
  await backend.deleteAccount({ confirmed: true });
  sync.discardLocal();
  const events = []; backend.onAuthChange(e => events.push(e.event));
  await backend.endLocalSession();
  assert.equal(backend.getUser(), null);
  assert.deepEqual(events, ['signedOut']);
  assert.equal(state, null, 'estado local de fábrica');
  assert.deepEqual([...storage._m.keys()].filter(k => /^faro-sync-/.test(k)), [], 'sem meta, rascunho nem dono');
  assert.equal(sync.hasPending(), false);
  assert.equal(sync.getStatus().status, 'idle');
  sync.discardLocal(); // idempotente
  await backend.endLocalSession();
});
