// Store minimo: guarda o estado v2, aplica acoes puras (src/core/actions.js), avisa assinantes e persiste.
// `dirty` + `revision` dizem ao sync se ha algo local ainda nao enviado.
import { reduce } from '../core/actions.js';
import { normalizeState, SCHEMA_VERSION } from '../core/state.js';
import { todayISO } from '../core/dates.js';
import { createPersister } from './persist.js';

const MAX_BACKUP = 5e6;
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
let counter = 0;
const defaultId = () => Date.now().toString(36) + (counter++).toString(36);

export function createStore({ persister = createPersister(), now = Date.now, genId = defaultId, autoFlush = true } = {}) {
  const saved = persister.load();
  let state = normalizeState(saved && saved.state);
  let revision = Number.isInteger(saved && saved.rev) && saved.rev >= 0 ? saved.rev : 0;
  let dirty = !!saved && saved.dirty === true;
  let persistFailed = false;
  const listeners = new Set();

  const getMeta = () => ({ revision, dirty, persistFailed });
  const blob = () => ({ v: SCHEMA_VERSION, rev: revision, dirty, savedAt: now(), state });
  const persist = () => persister.schedule(blob, ok => { persistFailed = !ok; });
  const notify = () => {
    for (const fn of [...listeners]) { try { fn(state, getMeta()); } catch { /* um assinante ruim nao derruba os outros */ } }
  };
  const commit = (next, isDirty) => {
    state = next;
    revision++;
    dirty = isDirty;
    persist();
    notify();
  };

  const flush = () => { const ok = persister.flush(); if (ok === false) persistFailed = true; };
  if (autoFlush && typeof globalThis.addEventListener === 'function') {
    try {
      globalThis.addEventListener('pagehide', flush);
      globalThis.document && globalThis.document.addEventListener('visibilitychange', () => { if (globalThis.document.visibilityState === 'hidden') flush(); });
    } catch { /* ambiente sem eventos de pagina */ }
  }

  return {
    getState: () => state,
    getMeta,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispatch(action) {
      const t = now();
      const next = reduce(state, action, { today: todayISO(new Date(t)), now: t, id: genId() });
      if (next !== state) commit(next, true);
      return state;
    },
    getSnapshot: () => state, // nome que o sync usa
    // Estado vindo da nuvem; null = voltar ao estado de fabrica (logout). Lixo (outra versao etc.) NAO apaga o que ja existe.
    replaceState(remote) {
      if (remote === null) { commit(normalizeState(null), false); return true; }
      if (!isObj(remote) || remote.schemaVersion !== SCHEMA_VERSION) return false;
      commit(normalizeState(remote), false);
      return true;
    },
    // O sync avisa que enviou a revisao `rev`; so limpa a pendencia se nada mudou desde entao.
    markSynced(rev) {
      if (rev === revision && dirty) { dirty = false; persist(); notify(); }
    },
    flush,
    exportBackup: () => JSON.stringify({ app: 'FARO', version: SCHEMA_VERSION, exportedAt: new Date(now()).toISOString(), data: state }),
    importBackup(json) {
      if (typeof json !== 'string') return { ok: false, error: 'formato' };
      if (json.length > MAX_BACKUP) return { ok: false, error: 'tamanho' };
      let b;
      try { b = JSON.parse(json); } catch { return { ok: false, error: 'json' }; }
      if (!isObj(b) || b.app !== 'FARO') return { ok: false, error: 'formato' };
      if (b.version !== SCHEMA_VERSION) return { ok: false, error: typeof b.version === 'number' ? 'versao' : 'formato' };
      if (!isObj(b.data)) return { ok: false, error: 'formato' };
      if (b.data.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: 'versao' };
      commit(normalizeState(b.data), true);
      flush();
      return { ok: true };
    },
  };
}

let shared = null;
export const getStore = () => (shared = shared || createStore());
