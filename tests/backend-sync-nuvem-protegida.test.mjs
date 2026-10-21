// Mesa do Chato, achado 1: sair, usar sem conta e entrar de novo nunca derruba a nuvem calado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/data/store.js';
import { createSync } from '../src/data/sync.js';
import { defaultState } from '../src/core/state.js';

const closedDays = s => Object.keys(s.recs).filter(k => s.recs[k].closed).length;

function rig() {
  const mem = new Map();
  const storage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  const persister = { load: () => null, schedule() {}, flush: () => true, hasPending: () => false, save: () => true };
  let n = 0;
  const store = createStore({ persister, now: () => Date.UTC(2026, 9, 21, 15), genId: () => 'g' + ++n, autoFlush: false, watchStorage: () => {} });
  const cloud = { row: null };
  let authCb = null, user = null;
  const backend = {
    getClient: () => ({
      from: () => ({ select: () => ({ maybeSingle: async () => ({ data: cloud.row, error: null }) }) }),
      rpc: async (_n, a) => {
        if (cloud.row && a.p_expected_revision !== cloud.row.revision) return { data: { ok: false, state: cloud.row.state, revision: cloud.row.revision, server_updated_at: 'x', device_id: 'outro' }, error: null };
        cloud.row = { schema_version: 2, revision: (cloud.row ? cloud.row.revision : 0) + 1, state: a.p_state, server_updated_at: 'y', device_id: a.p_device_id };
        return { data: { ok: true, revision: cloud.row.revision, server_updated_at: 'y' }, error: null };
      },
    }),
    deviceId: () => 'dev', getUser: () => user, onAuthChange: fn => { authCb = fn; return () => {}; },
  };
  const timers = [];
  const sync = createSync({ backend, store, storage, setTimer: fn => { timers.push(fn); return timers.length; }, clearTimer: () => {}, debounceMs: 0, random: () => 0.5 });
  sync.start();
  return { store, cloud, sync, storage, signIn: id => { user = { id, email: id + '@x' }; authCb({ event: 'signedIn', user }); }, signOut: () => { user = null; authCb({ event: 'signedOut' }); } };
}
const cloudWith = days => {
  let s = { ...defaultState(), onboarded: true, onboardedAt: '2026-08-01' };
  const recs = {};
  for (let d = 1; d <= days; d++) recs['2026-07-' + String(d).padStart(2, '0')] = { p: { uber: 250 }, km: 120, h: 9, exp: 0, closed: true };
  return { ...s, recs };
};
const onboard = store => {
  store.dispatch({ type: 'onboarding/complete', payload: { sources: ['uber'], bills: [] } });
  store.dispatch({ type: 'day/close', payload: { p: { uber: 180 }, km: 90, h: 8, date: '2026-10-20' } });
};

test('sair, usar sem conta e entrar de novo NAO derruba a nuvem: vira conflito explicito', async () => {
  const r = rig();
  r.cloud.row = { schema_version: 2, revision: 50, state: cloudWith(31), server_updated_at: 'z', device_id: 'antigo' };
  r.signIn('A'); await r.sync.syncNow();
  assert.equal(closedDays(r.store.getState()), 31);
  r.signOut();
  assert.equal(closedDays(r.store.getState()), 0, 'saiu: comeca vazio');
  onboard(r.store);
  assert.equal(closedDays(r.store.getState()), 1);
  r.signIn('A'); await r.sync.syncNow(); await r.sync.syncNow();
  assert.equal(closedDays(r.cloud.row.state), 31, 'nuvem intacta');
  assert.equal(r.cloud.row.revision, 50);
  assert.equal(r.sync.getStatus().status, 'conflict');
  assert.equal(closedDays(r.store.getState()), 1, 'dados locais preservados ate o motorista escolher');
  await r.sync.usarNuvem();
  assert.equal(closedDays(r.store.getState()), 31);
});

test('conflito: escolher "este aparelho" e explicito e sobe', async () => {
  const r = rig();
  r.cloud.row = { schema_version: 2, revision: 7, state: cloudWith(5), server_updated_at: 'z', device_id: 'antigo' };
  r.signIn('A'); await r.sync.syncNow(); r.signOut(); onboard(r.store);
  r.signIn('A'); await r.sync.syncNow();
  assert.equal(r.sync.getStatus().status, 'conflict');
  await r.sync.usarEsteAparelho();
  assert.equal(closedDays(r.cloud.row.state), 1);
});

test('sair guarda o estado da conta no stash por usuario e comeca vazio', async () => {
  const r = rig();
  r.cloud.row = { schema_version: 2, revision: 3, state: cloudWith(4), server_updated_at: 'z', device_id: 'antigo' };
  r.signIn('A'); await r.sync.syncNow();
  r.signOut();
  const stash = JSON.parse(r.storage.getItem('faro-sync-stash-v2:A'));
  assert.equal(closedDays(stash), 4);
  assert.equal(r.store.getState().onboarded, false);
});

test('entrar com nuvem cheia e local vazio puxa a nuvem', async () => {
  const r = rig();
  r.cloud.row = { schema_version: 2, revision: 3, state: cloudWith(4), server_updated_at: 'z', device_id: 'antigo' };
  r.signIn('A'); await r.sync.syncNow(); r.signOut(); r.signIn('A'); await r.sync.syncNow();
  assert.equal(closedDays(r.store.getState()), 4);
  assert.equal(r.sync.getStatus().status, 'synced');
});

test('nunca envia estado com menos dias fechados que a nuvem sem conflito', async () => {
  const r = rig();
  r.cloud.row = { schema_version: 2, revision: 3, state: cloudWith(10), server_updated_at: 'z', device_id: 'antigo' };
  r.signIn('A'); await r.sync.syncNow();
  r.store.importBackup(JSON.stringify({ app: 'FARO', version: 2, data: cloudWith(2) }));
  await r.sync.syncNow(); await r.sync.syncNow();
  assert.equal(closedDays(r.cloud.row.state), 10);
  assert.equal(r.sync.getStatus().status, 'conflict');
});
