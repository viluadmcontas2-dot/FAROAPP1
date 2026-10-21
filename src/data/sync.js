// Sincronização do snapshot v2 com `faro_state` (offline-first, sem merge mágico).
//
// Injeção: backend {getClient,getUser,deviceId,onAuthChange}, store {getSnapshot,replaceState,subscribe}.
//   store.replaceState(state|null): troca o estado local; null = voltar ao estado vazio de fábrica.
//   hasData(state): true se há dados REAIS do usuário (padrão: hasUserData; estado vazio/de fábrica não conta).
// Estado exposto por getStatus(): { status, local?, remote?, lastSyncedAt, error, retryInMs }
//   status: 'idle' (sem conta) | 'synced' | 'pending' | 'syncing' | 'offline' | 'error' | 'conflict'
// Conflito: { status:'conflict', local, remote } -> resolver com usarEsteAparelho() ou usarNuvem().
// Regras de segurança de dados: dados locais nunca sobem para outra conta (dono local = usuário vinculado).

import { defaultState, normalizeState } from '../core/state.js';

const META_PREFIX = 'faro-sync-meta-v2:';
const STASH_PREFIX = 'faro-sync-stash-v2:';
const OWNER_KEY = 'faro-sync-owner-v2';
const PERMANENT = new Set(['22023', '54000', '28000']);

// "Tem dado" = o usuário usou o app. Objeto vazio, lixo ou estado de fábrica NÃO contam (aparelho novo não pode virar conflito).
const FACTORY = JSON.stringify(defaultState());
export const hasUserData = s => {
  if (!s || typeof s !== 'object' || Array.isArray(s) || !Object.keys(s).length) return false;
  try {
    const n = JSON.stringify(normalizeState(s));
    return n !== FACTORY && n !== JSON.stringify(normalizeState({ schemaVersion: s.schemaVersion })); // só a versão = vazio
  } catch { return false; }
};

// Dias fechados: a nuvem nunca pode perder dias por um envio automatico.
export const closedCount = s => { try { return Object.keys(s.recs).filter(k => s.recs[k] && s.recs[k].closed).length; } catch { return 0; } };

const same = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } };

export const createSync = ({
  backend, store, storage = null,
  hasData = hasUserData,
  now = () => Date.now(),
  randomId = () => globalThis.crypto?.randomUUID?.() || `m-${now()}-${Math.random().toString(36).slice(2)}`,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = t => clearTimeout(t),
  random = Math.random,
  isOnline = () => globalThis.navigator?.onLine !== false,
  debounceMs = 2500, backoffBaseMs = 2000, backoffMaxMs = 120000
} = {}) => {
  const mem = new Map();
  const read = k => { try { const v = storage?.getItem(k); return v == null ? (mem.get(k) ?? null) : v; } catch { return mem.get(k) ?? null; } };
  const write = (k, v) => { mem.set(k, v); try { storage?.setItem(k, v); } catch { /* memória */ } };
  const drop = k => { mem.delete(k); try { storage?.removeItem(k); } catch { /* ok */ } };
  const readJson = k => { try { return JSON.parse(read(k) || 'null'); } catch { return null; } };

  const listeners = new Set();
  let uid = null;           // usuário ativo
  let epoch = 0;            // invalida operações assíncronas de sessões antigas
  let online = isOnline();
  let timer = null;
  let attempt = 0;
  let running = false;
  let again = false;
  let suppress = false;
  let unsubStore = null;
  let unsubAuth = null;
  let st = { status: 'idle', lastSyncedAt: null, error: null, retryInMs: null };

  const emit = patch => {
    st = { ...st, ...patch };
    if (st.status !== 'conflict') { delete st.local; delete st.remote; }
    for (const fn of [...listeners]) { try { fn(getStatus()); } catch { /* ouvinte */ } }
  };
  const getStatus = () => ({ ...st });

  const metaKey = u => META_PREFIX + u;
  const getMeta = u => ({ remoteRevision: 0, dirty: false, lastMutationId: null, linked: false, outside: false, closed: 0, lastSyncedAt: null, ...(readJson(metaKey(u)) || {}) });
  const setMeta = (u, m) => write(metaKey(u), JSON.stringify(m));

  const clearTimerNow = () => { if (timer != null) { clearTimer(timer); timer = null; } };
  const schedule = ms => {
    clearTimerNow();
    if (!uid || st.status === 'conflict') return;
    if (!online) { emit({ status: 'offline', retryInMs: null }); return; }
    timer = setTimer(() => { timer = null; run(); }, ms);
  };
  const retryLater = () => {
    const delay = Math.min(backoffMaxMs, backoffBaseMs * 2 ** attempt) * (0.75 + random() * 0.5);
    attempt += 1;
    emit({ retryInMs: Math.round(delay) });
    schedule(delay);
  };

  const applyRemote = (u, remote) => {
    suppress = true;
    try { store.replaceState(remote.state); } finally { suppress = false; }
    setMeta(u, { ...getMeta(u), remoteRevision: Number(remote.revision) || 0, dirty: false, linked: true, outside: false, closed: closedCount(remote.state), lastSyncedAt: remote.server_updated_at || null });
  };

  const markSynced = (u, revision, at) => {
    const meta = getMeta(u);
    setMeta(u, { ...meta, remoteRevision: Number(revision) || 0, dirty: false, linked: true, outside: false, closed: closedCount(store.getSnapshot()), lastSyncedAt: at || null });
    attempt = 0;
    emit({ status: 'synced', lastSyncedAt: at || null, error: null, retryInMs: null });
  };

  const pull = async () => {
    const { data, error } = await backend.getClient().from('faro_state')
      .select('schema_version,revision,state,server_updated_at,last_mutation_id,device_id').maybeSingle();
    if (error) throw error;
    return data || null;
  };

  const toConflict = (remoteRow, local) => emit({
    status: 'conflict', error: null, retryInMs: null,
    local, remote: { state: remoteRow.state, revision: Number(remoteRow.revision) || 0, serverUpdatedAt: remoteRow.server_updated_at || null, deviceId: remoteRow.device_id || null }
  });

  // Envia o snapshot local. expected = revisão que o aparelho acredita estar na nuvem.
  const push = async (u, expected, mutationId) => {
    const snapshot = store.getSnapshot();
    const { data, error } = await backend.getClient().rpc('faro_save_state', {
      p_expected_revision: expected, p_state: snapshot, p_device_id: backend.deviceId(), p_mutation_id: mutationId
    });
    if (error) throw error;
    if (u !== uid) return 'stale';
    if (data?.ok) {
      const meta = getMeta(u);
      if (meta.lastMutationId !== mutationId) {
        // O usuário mexeu durante o envio: mantém pendente com a nova revisão base.
        setMeta(u, { ...meta, remoteRevision: Number(data.revision) || 0, linked: true });
        return 'again';
      }
      markSynced(u, data.revision, data.server_updated_at);
      return 'ok';
    }
    // Conflito: a nuvem mudou (outro aparelho). Nada é sobrescrito.
    if (!data?.state) {
      // Nuvem vazia mas esperávamos revisão: recomeça do zero.
      setMeta(u, { ...getMeta(u), remoteRevision: 0 });
      return 'again';
    }
    toConflict({ state: data.state, revision: data.revision, server_updated_at: data.server_updated_at, device_id: data.device_id }, snapshot);
    return 'conflict';
  };

  const reconcile = async u => {
    const remote = await pull();
    if (u !== uid) return;
    let meta = getMeta(u);
    const local = store.getSnapshot();
    const localHas = hasData(local);

    if (!remote) {
      if (!localHas) return markSynced(u, 0, null);
      setMeta(u, { ...meta, remoteRevision: 0, lastMutationId: meta.lastMutationId || randomId() });
      return void (await push(u, 0, getMeta(u).lastMutationId));
    }
    meta = { ...meta, lastMutationId: meta.lastMutationId || randomId() };
    const revision = Number(remote.revision) || 0;
    const usable = remote.schema_version === 2;
    const sendLocal = async () => {
      // Nunca envia por cima um estado com menos dias fechados que a nuvem: o motorista decide.
      if (usable && closedCount(local) < closedCount(remote.state)) return toConflict(remote, local);
      setMeta(u, { ...meta, remoteRevision: revision, dirty: true });
      return void (await push(u, revision, meta.lastMutationId));
    };

    if (!usable) { // legado v1 é ignorado: só substituído quando houver dado local v2
      if (!localHas) return markSynced(u, revision, remote.server_updated_at);
      return sendLocal();
    }
    if (!localHas) return (applyRemote(u, remote), markSynced(u, revision, remote.server_updated_at));
    if (!hasData(remote.state)) return sendLocal();
    if (same(local, remote.state)) return markSynced(u, revision, remote.server_updated_at);

    if (!meta.linked || meta.outside || revision < meta.remoteRevision) return toConflict(remote, local);
    if (meta.dirty) return revision === meta.remoteRevision ? sendLocal() : toConflict(remote, local);
    if (revision > meta.remoteRevision) return (applyRemote(u, remote), markSynced(u, revision, remote.server_updated_at));
    return sendLocal();
  };

  async function run() {
    if (!uid || st.status === 'conflict') return;
    if (!online) return void emit({ status: 'offline' });
    if (running) { again = true; return; }
    running = true;
    const my = epoch; const u = uid;
    emit({ status: 'syncing', retryInMs: null });
    try {
      const meta = getMeta(u);
      let result;
      const risky = meta.outside || closedCount(store.getSnapshot()) < (meta.closed || 0);
      if (meta.linked && meta.dirty && meta.lastMutationId && !risky) result = await push(u, meta.remoteRevision, meta.lastMutationId);
      if (result === 'conflict' || result === 'stale') { /* tratado */ } else if (result === 'ok') { /* ok */ } else await reconcile(u);
      if (my === epoch && getMeta(u).dirty && st.status !== 'conflict' && st.status !== 'error') again = true;
    } catch (e) {
      if (my === epoch) {
        const code = String(e?.code || '');
        if (PERMANENT.has(code)) emit({ status: 'error', error: 'Não foi possível salvar na conta. Seus dados continuam neste aparelho.', retryInMs: null });
        else {
          emit({ status: online ? 'pending' : 'offline', error: 'Salvo no aparelho; tentaremos a conta novamente.' });
          if (online) retryLater();
        }
      }
    } finally {
      running = false;
      if (again && my === epoch && ['pending', 'synced', 'syncing'].includes(st.status)) { again = false; schedule(0); }
      again = false;
    }
  }

  const onLocalChange = () => {
    if (suppress || !uid) return;
    const meta = getMeta(uid);
    setMeta(uid, { ...meta, dirty: true, lastMutationId: randomId() });
    if (st.status === 'conflict') return; // espera a escolha; local atual será usado na resolução
    attempt = 0;
    emit({ status: online ? 'pending' : 'offline', error: null });
    schedule(debounceMs);
  };

  // Guarda o estado da conta ao sair (limpo ou pendente): nada se perde, e a nuvem continua sendo a fonte.
  const stashIfDirty = owner => {
    if (!owner) return;
    if (!getMeta(owner).dirty) return; // dado já na nuvem não precisa ficar em texto puro no aparelho
    write(STASH_PREFIX + owner, JSON.stringify(store.getSnapshot()));
  };

  const handleSignOut = () => {
    clearTimerNow(); epoch += 1;
    const owner = uid || read(OWNER_KEY);
    if (owner) {
      stashIfDirty(owner);
      suppress = true;
      try { store.replaceState(null); } finally { suppress = false; }
      drop(OWNER_KEY);
    }
    uid = null; again = false; attempt = 0;
    emit({ status: 'idle', error: null, retryInMs: null });
  };

  const handleSignIn = user => {
    if (uid === user.id) return;
    if (uid) handleSignOut();
    clearTimerNow(); epoch += 1;
    const owner = read(OWNER_KEY);
    uid = user.id;
    const stash = readJson(STASH_PREFIX + user.id);
    if (owner && owner !== user.id) stashIfDirty(owner); // dados locais são de outra conta: nunca sobem
    const m0 = getMeta(user.id);
    const localNow = store.getSnapshot();
    if (stash && m0.dirty && !(!owner && hasData(localNow))) {
      // Pendência guardada desta conta (saiu com dados não enviados): volta ao aparelho e sobe para ela.
      suppress = true;
      try { store.replaceState(stash); } finally { suppress = false; }
      drop(STASH_PREFIX + user.id);
      setMeta(user.id, { ...getMeta(user.id), dirty: true, lastMutationId: randomId() });
    } else if (owner && owner !== user.id) {
      suppress = true;
      try { store.replaceState(null); } finally { suppress = false; }
    } else if (!owner) {
      // Dados criados fora da conta: sobem so por escolha explicita se a nuvem ja tiver dados.
      if (hasData(localNow)) setMeta(user.id, { ...m0, dirty: true, outside: true, lastMutationId: m0.lastMutationId || randomId() });
    }
    write(OWNER_KEY, user.id);
    attempt = 0;
    emit({ status: 'pending', error: null });
    schedule(0);
  };

  const resolve = async choice => {
    if (st.status !== 'conflict' || !uid) return getStatus();
    const u = uid; const remote = st.remote;
    drop(STASH_PREFIX + u); // a escolha explicita encerra a copia antiga
    // Aparelho sem dado real nunca sobe por cima da nuvem: "usar este aparelho" vira "usar a nuvem".
    if (choice === 'local' && !hasData(store.getSnapshot())) choice = 'cloud';
    if (choice === 'cloud') {
      applyRemote(u, { state: remote.state, revision: remote.revision, server_updated_at: remote.serverUpdatedAt });
      markSynced(u, remote.revision, remote.serverUpdatedAt);
      return getStatus();
    }
    // Este aparelho vence: nova mutação, base = revisão atual da nuvem.
    const mutationId = randomId();
    setMeta(u, { ...getMeta(u), remoteRevision: remote.revision, dirty: true, lastMutationId: mutationId, linked: true });
    emit({ status: 'pending', error: null });
    if (!online) return void emit({ status: 'offline' }) || getStatus();
    running = true; const my = epoch;
    try { await push(u, remote.revision, mutationId); } catch { if (my === epoch) { emit({ status: 'pending', error: 'Salvo no aparelho; tentaremos a conta novamente.' }); retryLater(); } } finally { running = false; }
    return getStatus();
  };

  return {
    getStatus,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    start() {
      if (unsubStore) return;
      unsubStore = store.subscribe(onLocalChange);
      unsubAuth = backend.onAuthChange(({ event, user }) => {
        if (event === 'signedIn' && user) handleSignIn(user);
        else if (event === 'signedOut') handleSignOut();
      });
      const current = backend.getUser();
      if (current) handleSignIn(current);
    },
    stop() { clearTimerNow(); unsubStore?.(); unsubAuth?.(); unsubStore = unsubAuth = null; epoch += 1; uid = null; emit({ status: 'idle' }); },
    syncNow: () => { attempt = 0; clearTimerNow(); return run(); },
    // Antes de sair da conta: tenta enviar o pendente. { clean:false } = ainda há dados só neste aparelho.
    async flush() {
      if (uid && getMeta(uid).dirty) { clearTimerNow(); while (running) await new Promise(r => setTimer(r, 0)); await run(); }
      return { clean: !uid || !getMeta(uid).dirty };
    },
    hasPending: () => Boolean(uid && getMeta(uid).dirty),
    setOnline(value) {
      online = Boolean(value);
      if (!uid) return;
      if (!online) { clearTimerNow(); if (st.status !== 'conflict') emit({ status: 'offline' }); }
      else if (st.status !== 'conflict') { attempt = 0; emit({ status: 'pending' }); schedule(0); }
    },
    usarEsteAparelho: () => resolve('local'),
    usarNuvem: () => resolve('cloud')
  };
};
