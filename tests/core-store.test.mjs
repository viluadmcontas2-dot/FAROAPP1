import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersister, STORAGE_KEY } from '../src/data/persist.js';
import { createStore } from '../src/data/store.js';
import { defaultState } from '../src/core/state.js';

const fakeStorage = (opts = {}) => {
  const m = new Map();
  return {
    m,
    getItem: k => { if (opts.throwGet) throw new Error('blocked'); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (opts.throwSet) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: k => m.delete(k),
  };
};
// timer manual: o teste decide quando o debounce dispara
const fakeTimers = () => {
  let fn = null, n = 0;
  return { setTimer: f => { fn = f; return ++n; }, clearTimer: () => { fn = null; }, fire: () => { const f = fn; fn = null; if (f) f(); }, pending: () => fn !== null };
};
const NOW = new Date(2026, 9, 21, 13, 5).getTime();
const mk = (o = {}) => {
  const storage = o.storage || fakeStorage();
  const timers = fakeTimers();
  let i = 0;
  const persister = createPersister({ storage, setTimer: timers.setTimer, clearTimer: timers.clearTimer });
  const store = createStore({ persister, now: () => NOW, genId: () => 'i' + ++i, autoFlush: false });
  return { storage, timers, persister, store };
};
const CLOSE = { type: 'day/close', payload: { p: { uber: 200 }, km: 100, h: 8 } };

test('chave de persistencia e faro-v2-state', () => assert.equal(STORAGE_KEY, 'faro-v2-state'));

test('comeca com estado padrao, limpo e sem pendencia de sync', () => {
  const { store } = mk();
  assert.deepEqual(store.getState(), defaultState());
  assert.deepEqual(store.getMeta(), { revision: 0, dirty: false, persistFailed: false });
});

test('dispatch aplica a acao, avisa quem assinou e marca dirty + revisao', () => {
  const { store } = mk();
  const seen = [];
  const off = store.subscribe((s, m) => seen.push([s.xp, m.revision, m.dirty]));
  store.dispatch(CLOSE);
  assert.equal(store.getState().recs['2026-10-21'].closed, true); // data vem do relogio injetado
  assert.deepEqual(seen, [[40, 1, true]]);
  store.dispatch({ type: 'nao/existe' });
  assert.equal(seen.length, 1); // sem mudanca, sem aviso
  off();
  store.dispatch({ type: 'xp/add', payload: { amount: 5 } });
  assert.equal(seen.length, 1);
  assert.equal(store.getMeta().revision, 2);
});

test('assinante que falha nao derruba os outros nem o dispatch', () => {
  const { store } = mk();
  let ok = 0;
  store.subscribe(() => { throw new Error('boom'); });
  store.subscribe(() => { ok++; });
  assert.doesNotThrow(() => store.dispatch(CLOSE));
  assert.equal(ok, 1);
});

test('persiste com debounce e recarrega igual', () => {
  const { store, timers, storage } = mk();
  store.dispatch(CLOSE);
  store.dispatch({ type: 'xp/add', payload: { amount: 5 } });
  assert.equal(storage.m.has(STORAGE_KEY), false); // ainda nao gravou
  assert.ok(timers.pending());
  timers.fire();
  assert.ok(storage.m.has(STORAGE_KEY));
  const again = createStore({ persister: createPersister({ storage }), now: () => NOW, autoFlush: false });
  assert.deepEqual(again.getState(), store.getState());
  assert.deepEqual(again.getMeta(), { revision: 2, dirty: true, persistFailed: false }); // pendencia de sync sobrevive ao recarregar
});

test('flush grava na hora', () => {
  const { store, storage } = mk();
  store.dispatch(CLOSE);
  store.flush();
  assert.ok(storage.m.has(STORAGE_KEY));
});

test('storage quebrado (quota, modo privado, bloqueado) nao derruba o app', () => {
  for (const o of [{ throwSet: true }, { throwGet: true, throwSet: true }]) {
    const { store, timers } = mk({ storage: fakeStorage(o) });
    assert.doesNotThrow(() => { store.dispatch(CLOSE); timers.fire(); store.flush(); });
    assert.equal(store.getState().xp, 40);
    assert.equal(store.getMeta().persistFailed, true);
  }
  const noStorage = createStore({ persister: createPersister({ storage: null }), autoFlush: false });
  assert.doesNotThrow(() => noStorage.dispatch(CLOSE));
});

test('dado salvo corrompido ou malicioso vira estado seguro', () => {
  for (const raw of ['{', 'null', '[]', '"x"', JSON.stringify({ state: { schemaVersion: 2, xp: 'NaN', recs: { '__proto__': { p: {} } } }, rev: 'x' }), 'a'.repeat(6e6)]) {
    const storage = fakeStorage();
    storage.m.set(STORAGE_KEY, raw);
    const s = createStore({ persister: createPersister({ storage }), autoFlush: false });
    assert.equal(s.getState().schemaVersion, 2);
    assert.equal(s.getState().xp, 0);
    assert.ok(Number.isInteger(s.getMeta().revision));
  }
});

test('replaceState (vindo da nuvem): normaliza, limpa pendencia e ignora lixo', () => {
  const { store } = mk();
  store.dispatch(CLOSE);
  const remote = { ...defaultState(), xp: 999, recs: { '2026-10-20': { p: { uber: 50 }, km: 20, closed: true } } };
  assert.equal(store.replaceState(remote), true);
  assert.equal(store.getState().xp, 999);
  assert.equal(store.getMeta().dirty, false);
  assert.ok(store.getMeta().revision > 1);
  const before = store.getState();
  for (const bad of [undefined, 'x', 5, [], {}, { schemaVersion: 1, xp: 5 }]) {
    assert.equal(store.replaceState(bad), false, JSON.stringify(bad));
    assert.equal(store.getState(), before); // nao apaga os dados locais
  }
  assert.equal(store.replaceState({ ...remote, xp: 'Infinity', paid: { '__proto__:2026-10-01': 1 } }), true);
  assert.equal(store.getState().xp, 0);
});

test('contrato com o sync: getSnapshot e replaceState(null) volta ao estado de fabrica', () => {
  const { store } = mk();
  store.dispatch(CLOSE);
  assert.equal(store.getSnapshot(), store.getState());
  assert.equal(store.replaceState(null), true);
  assert.deepEqual(store.getState(), defaultState());
  assert.equal(store.getMeta().dirty, false);
});

test('markSynced so limpa a pendencia se nada mudou durante o envio', () => {
  const { store } = mk();
  store.dispatch(CLOSE);
  const rev = store.getMeta().revision;
  store.dispatch({ type: 'xp/add', payload: { amount: 1 } }); // mudou durante o envio
  store.markSynced(rev);
  assert.equal(store.getMeta().dirty, true);
  store.markSynced(store.getMeta().revision);
  assert.equal(store.getMeta().dirty, false);
});

test('backup: exporta no formato FARO v2 e importa de volta', () => {
  const a = mk().store;
  a.dispatch(CLOSE);
  const json = a.exportBackup();
  const parsed = JSON.parse(json);
  assert.equal(parsed.app, 'FARO');
  assert.equal(parsed.version, 2);
  assert.equal(parsed.exportedAt, new Date(NOW).toISOString());
  assert.deepEqual(parsed.data, a.getState());
  const b = mk().store;
  assert.deepEqual(b.importBackup(json), { ok: true });
  assert.deepEqual(b.getState(), a.getState());
  assert.equal(b.getMeta().dirty, true); // precisa subir para a nuvem
});

test('backup invalido e recusado sem tocar no estado', () => {
  const { store } = mk();
  store.dispatch(CLOSE);
  const before = store.getState();
  const cases = {
    '{': 'json', 'null': 'formato', '[]': 'formato', '{"app":"OUTRO","version":2,"data":{}}': 'formato',
    '{"app":"FARO","version":1,"data":{}}': 'versao', '{"app":"FARO","version":2}': 'formato',
    '{"app":"FARO","version":2,"data":{"schemaVersion":1}}': 'versao', '{"app":"FARO","version":2,"data":"x"}': 'formato',
    ['{"app":"FARO","version":2,"data":{"schemaVersion":2},"pad":"' + 'a'.repeat(6e6) + '"}']: 'tamanho',
  };
  for (const [raw, error] of Object.entries(cases)) assert.deepEqual(store.importBackup(raw), { ok: false, error }, raw.slice(0, 60));
  assert.equal(store.importBackup(123).ok, false);
  assert.equal(store.getState(), before);
});

test('backup malicioso importa so o que e valido', () => {
  const { store } = mk();
  const evil = '{"app":"FARO","version":2,"data":{"schemaVersion":2,"xp":1e99,"__proto__":{"x":1},"recs":{"__proto__":{}},"bills":"x"}}';
  assert.deepEqual(store.importBackup(evil), { ok: true });
  assert.equal(store.getState().xp, 1e7);
  assert.equal({}.x, undefined);
  assert.ok(store.getState().bills.length >= 2);
});
