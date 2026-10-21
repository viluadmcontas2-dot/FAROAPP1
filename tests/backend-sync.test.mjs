import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend } from '../src/data/backend.js';
import { createSync } from '../src/data/sync.js';
import { defaultState } from '../src/core/state.js';
import { makeServer, makeFakeCreateClient, memStorage, GOOD } from './backend-helpers.mjs';

// Relógio/timers manuais: tick() executa os timers vencidos.
const makeTimers = () => { const q = []; return { setTimer: (fn, ms) => { const t = { fn, ms }; q.push(t); return t; }, clearTimer: t => { const i = q.indexOf(t); if (i >= 0) q.splice(i, 1); }, pending: () => q.length, lastMs: () => q.at(-1)?.ms, async fire() { const t = q.shift(); if (t) await t.fn(); await new Promise(r => setImmediate(r)); } }; };

const makeStore = (initial = null) => {
  let state = initial; const subs = new Set();
  return { getSnapshot: () => structuredClone(state), replaceState: s => { state = s ? structuredClone(s) : null; }, subscribe: fn => { subs.add(fn); return () => subs.delete(fn); },
    edit: patch => { state = { ...(state || { schema_version: 2 }), ...patch }; subs.forEach(f => f()); }, get: () => state };
};

const rig = async ({ server = makeServer(), storage = memStorage(), initial = null, device = 'dev-A', hasData = s => Boolean(s && Object.keys(s).length > 1) } = {}) => {
  [['a@x.com', 'ua'], ['b@x.com', 'ub']].forEach(([e, id]) => server.users.set(e, { id, password: 'senha-forte-1', confirmed: true }));
  const backend = createBackend({ config: GOOD, createClient: makeFakeCreateClient(server), storage, randomId: () => device, redirectTo: () => 'https://app/' });
  const store = makeStore(initial); const timers = makeTimers(); let n = 0;
  const sync = createSync({ backend, store, storage, ...(hasData ? { hasData } : {}), randomId: () => `${device}-m${++n}`, random: () => 0.5, ...timers });
  sync.start();
  const login = async who => { await backend.signIn({ email: `${who}@x.com`, password: 'senha-forte-1' }); await timers.fire(); };
  return { server, storage, backend, store, timers, sync, login };
};

test('sem login: edições locais não tocam a rede', async () => {
  const r = await rig(); r.store.edit({ x: 1 });
  assert.equal(r.timers.pending(), 0); assert.equal(r.server.rpcCalls, 0); assert.equal(r.sync.getStatus().status, 'idle');
});

test('dados locais + nuvem vazia: primeiro login envia (revisão 1); edição depois usa debounce e avança', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } });
  await r.login('a');
  assert.equal(r.server.states.get('ua').revision, 1); assert.equal(r.sync.getStatus().status, 'synced');
  r.store.edit({ a: 2 }); assert.equal(r.sync.getStatus().status, 'pending'); assert.equal(r.timers.lastMs(), 2500);
  r.store.edit({ a: 3 }); assert.equal(r.timers.pending(), 1); // debounce: um só timer
  await r.timers.fire();
  assert.equal(r.server.states.get('ua').revision, 2); assert.equal(r.server.states.get('ua').state.a, 3);
});

test('aparelho novo (vazio) baixa o estado da nuvem', async () => {
  const server = makeServer(); server.states.set('ua', { schema_version: 2, revision: 4, state: { schema_version: 2, a: 9 }, device_id: 'x', last_mutation_id: 'm', server_updated_at: 't' });
  const r = await rig({ server }); await r.login('a');
  assert.equal(r.store.get().a, 9); assert.equal(r.sync.getStatus().status, 'synced');
  assert.equal(server.rpcCalls, 0);
});

test('conflito: dois aparelhos com dados -> status conflict com local/remote; nada sobrescrito', async () => {
  const server = makeServer(); server.states.set('ua', { schema_version: 2, revision: 3, state: { schema_version: 2, a: 'nuvem' }, device_id: 'B', last_mutation_id: 'mb', server_updated_at: 't' });
  const r = await rig({ server, initial: { schema_version: 2, a: 'local' } }); await r.login('a');
  const s = r.sync.getStatus();
  assert.equal(s.status, 'conflict'); assert.equal(s.local.a, 'local'); assert.equal(s.remote.state.a, 'nuvem'); assert.equal(s.remote.revision, 3);
  assert.equal(server.states.get('ua').state.a, 'nuvem'); assert.equal(server.rpcCalls, 0);
  r.store.edit({ b: 1 }); assert.equal(r.timers.pending(), 0); // conflito pausa envio
});

test('conflito: usarEsteAparelho sobe o local sobre a revisão da nuvem', async () => {
  const server = makeServer(); server.states.set('ua', { schema_version: 2, revision: 3, state: { schema_version: 2, a: 'nuvem' }, device_id: 'B', last_mutation_id: 'mb', server_updated_at: 't' });
  const r = await rig({ server, initial: { schema_version: 2, a: 'local' } }); await r.login('a');
  await r.sync.usarEsteAparelho();
  assert.equal(server.states.get('ua').state.a, 'local'); assert.equal(server.states.get('ua').revision, 4); assert.equal(r.sync.getStatus().status, 'synced');
});

test('conflito: usarNuvem troca o local e não envia nada', async () => {
  const server = makeServer(); server.states.set('ua', { schema_version: 2, revision: 3, state: { schema_version: 2, a: 'nuvem' }, device_id: 'B', last_mutation_id: 'mb', server_updated_at: 't' });
  const r = await rig({ server, initial: { schema_version: 2, a: 'local' } }); await r.login('a');
  await r.sync.usarNuvem();
  assert.equal(r.store.get().a, 'nuvem'); assert.equal(server.rpcCalls, 0); assert.equal(r.sync.getStatus().status, 'synced');
  assert.equal(r.sync.hasPending(), false);
});

test('conflito durante o uso: outro aparelho avançou a nuvem enquanto este editava', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } }); await r.login('a');
  r.server.states.set('ua', { ...r.server.states.get('ua'), revision: 5, state: { schema_version: 2, a: 'outro' }, device_id: 'B', last_mutation_id: 'mb' });
  r.store.edit({ a: 2 }); await r.timers.fire();
  const s = r.sync.getStatus(); assert.equal(s.status, 'conflict'); assert.equal(s.remote.state.a, 'outro'); assert.equal(s.local.a, 2);
  assert.equal(r.server.states.get('ua').state.a, 'outro');
});

test('offline -> online: edita sem internet, nada é enviado, ao voltar envia; falha de rede faz retry com backoff', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } }); await r.login('a');
  r.sync.setOnline(false); r.store.edit({ a: 2 });
  assert.equal(r.sync.getStatus().status, 'offline'); assert.equal(r.timers.pending(), 0); assert.equal(r.store.get().a, 2);
  r.server.down = true; r.sync.setOnline(true); await r.timers.fire();
  assert.equal(r.sync.getStatus().status, 'pending'); assert.ok(r.sync.getStatus().retryInMs >= 1000);
  const first = r.sync.getStatus().retryInMs; r.server.down = true; await r.timers.fire();
  assert.ok(r.sync.getStatus().retryInMs > first, 'backoff cresce');
  r.server.down = false; await r.timers.fire();
  assert.equal(r.server.states.get('ua').state.a, 2); assert.equal(r.sync.getStatus().status, 'synced'); assert.equal(r.sync.hasPending(), false);
});

test('idempotência: resposta perdida e reenvio da mesma mutação não duplica revisão', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } }); await r.login('a');
  r.store.edit({ a: 2 });
  const real = r.backend.getClient().rpc; let lose = true;
  r.backend.getClient().rpc = async (...args) => { const res = await real(...args); if (lose) { lose = false; return { data: null, error: { code: '', message: 'timeout' } }; } return res; };
  await r.timers.fire(); // servidor gravou (rev 2) mas o cliente não soube
  assert.equal(r.server.states.get('ua').revision, 2);
  await r.timers.fire(); // retry com a MESMA mutation id
  assert.equal(r.server.states.get('ua').revision, 2); assert.equal(r.sync.getStatus().status, 'synced'); assert.equal(r.sync.hasPending(), false);
});

test('troca de usuário no mesmo aparelho: dados de A nunca vão para B', async () => {
  const r = await rig({ initial: { schema_version: 2, segredoA: 'x' } }); await r.login('a');
  r.store.edit({ segredoA: 'y' }); // pendente de A
  await r.backend.signOut();
  assert.equal(r.store.get(), null, 'sair limpa o aparelho');
  await r.login('b');
  assert.equal(r.server.states.get('ub'), undefined, 'B não recebe dados de A');
  assert.equal(JSON.stringify([...r.server.states.get('ua') ? [r.server.states.get('ua')] : []]).includes('segredoA'), true);
  r.store.edit({ minhaB: 1 }); await r.timers.fire();
  assert.equal(r.server.states.get('ub').state.minhaB, 1); assert.equal(r.server.states.get('ub').state.segredoA, undefined);
  // A volta: recupera o pendente guardado e sobe para A
  await r.backend.signOut(); await r.login('a');
  assert.equal(r.store.get().segredoA, 'y');
  await r.timers.fire();
  assert.equal(r.server.states.get('ua').state.segredoA, 'y');
});

test('troca direta A->B sem signedOut: estado local de A é trocado, não enviado a B', async () => {
  const r = await rig({ initial: { schema_version: 2, segredoA: 'x' } }); await r.login('a');
  r.store.edit({ segredoA: 'z' });
  await r.backend.signIn({ email: 'b@x.com', password: 'senha-forte-1' }); await r.timers.fire();
  assert.equal(r.server.states.get('ub'), undefined);
  assert.equal(r.store.get(), null);
});

test('erro permanente do servidor (estado grande/schema) para o retry e preserva local', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } }); await r.login('a');
  r.server.rpcError = { code: '54000', message: 'state_too_large' };
  r.store.edit({ a: 2 }); await r.timers.fire();
  assert.equal(r.sync.getStatus().status, 'error'); assert.equal(r.timers.pending(), 0); assert.equal(r.store.get().a, 2);
});

test('sem direito (assinatura) para o retry, explica o que fazer e preserva o local', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } }); await r.login('a');
  r.server.rpcError = { code: '42501', message: 'sem_direito' };
  r.store.edit({ a: 2 }); await r.timers.fire();
  assert.equal(r.sync.getStatus().status, 'error'); assert.equal(r.timers.pending(), 0); assert.equal(r.store.get().a, 2);
  assert.match(r.sync.getStatus().error, /assinatura/i);
});

test('muitas gravacoes seguidas: tenta de novo depois, sem perder o local', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } }); await r.login('a');
  r.server.rpcError = { code: 'P0429', message: 'muitas_gravacoes' };
  r.store.edit({ a: 2 }); await r.timers.fire();
  assert.equal(r.sync.getStatus().status, 'pending'); assert.ok(r.timers.pending() > 0); assert.equal(r.store.get().a, 2);
  assert.match(r.sync.getStatus().error, /instantes|seguidas/i);
});

test('flush(): sinaliza se ainda há dado só neste aparelho antes de sair', async () => {
  const r = await rig({ initial: { schema_version: 2, a: 1 } }); await r.login('a');
  r.store.edit({ a: 2 });
  assert.deepEqual(await r.sync.flush(), { clean: true });
  r.store.edit({ a: 3 }); r.server.down = true;
  assert.deepEqual(await r.sync.flush(), { clean: false });
});

// ---- Achado 1: aparelho novo (estado de fábrica) nunca vira conflito nem apaga a nuvem. hasData PADRÃO (sem injeção).
const defaultHas = null; // null = usa o hasData PADRÃO do sync
const cloudRow = state => ({ schema_version: 2, revision: 7, state, device_id: 'B', last_mutation_id: 'mb', server_updated_at: 't' });
const cloudState = () => ({ ...defaultState(), xp: 900, onboarded: true });

test('hasData padrão: estado de fábrica não conta como dado; estado com uso conta', async () => {
  const server = makeServer(); server.states.set('ua', cloudRow(cloudState()));
  const r = await rig({ server, initial: defaultState(), hasData: defaultHas }); await r.login('a');
  assert.equal(r.sync.getStatus().status, 'synced'); // sem conflito
  assert.equal(r.store.get().xp, 900); // puxou a nuvem sem perguntar
  assert.equal(server.rpcCalls, 0); assert.equal(server.states.get('ua').state.xp, 900); // nuvem intacta
});

test('aparelho novo com estado null/{} também puxa a nuvem (não é dado)', async () => {
  for (const initial of [null, {}, { schemaVersion: 2 }]) {
    const server = makeServer(); server.states.set('ua', cloudRow(cloudState()));
    const r = await rig({ server, initial, hasData: defaultHas }); await r.login('a');
    assert.equal(r.sync.getStatus().status, 'synced', JSON.stringify(initial)); assert.equal(r.store.get().xp, 900); assert.equal(server.rpcCalls, 0);
  }
});

test('usarEsteAparelho com aparelho vazio NÃO apaga a nuvem (puxa a nuvem)', async () => {
  const server = makeServer(); server.states.set('ua', cloudRow(cloudState()));
  const r = await rig({ server, initial: { ...defaultState(), xp: 5 }, hasData: defaultHas }); await r.login('a');
  assert.equal(r.sync.getStatus().status, 'conflict'); // local TEM dado real e diverge
  r.store.replaceState(defaultState()); // aparelho ficou vazio (ex.: limpou) enquanto o conflito estava aberto
  await r.sync.usarEsteAparelho();
  assert.equal(server.states.get('ua').state.xp, 900); assert.equal(server.rpcCalls, 0);
  assert.equal(r.store.get().xp, 900);
});

test('local com dado real + nuvem com dado diferente continua em conflito', async () => {
  const server = makeServer(); server.states.set('ua', cloudRow(cloudState()));
  const r = await rig({ server, initial: { ...defaultState(), xp: 5, onboarded: true }, hasData: defaultHas }); await r.login('a');
  assert.equal(r.sync.getStatus().status, 'conflict'); assert.equal(server.rpcCalls, 0);
});

test('local com dado real + nuvem só com estado de fábrica: sobe o local (sem conflito)', async () => {
  const server = makeServer(); server.states.set('ua', cloudRow(defaultState()));
  const r = await rig({ server, initial: { ...defaultState(), xp: 5 }, hasData: defaultHas }); await r.login('a');
  assert.equal(r.sync.getStatus().status, 'synced'); assert.equal(server.states.get('ua').state.xp, 5);
});
