// Cliente Supabase falso (sem rede) com a mesma semântica de faro_save_state do servidor.
export const makeServer = () => ({ states: new Map(), subs: new Map(), devices: [], rpcCalls: 0, down: false, invoke: {}, users: new Map() });

export const makeFakeCreateClient = (server) => (url, key, options) => {
  let session = server.initialSession ? { user: { ...server.initialSession } } : null; let authCb = null;
  const uid = () => session?.user?.id;
  const net = () => { if (server.down) { const e = new Error('Failed to fetch'); e.name = 'AuthRetryableFetchError'; e.status = 0; throw e; } };
  const emitAuth = (ev) => authCb?.(ev, session);
  const auth = {
    onAuthStateChange: cb => { authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    getSession: async () => { net(); return { data: { session }, error: null }; },
    signInWithPassword: async ({ email, password }) => {
      net();
      const u = server.users.get(email);
      if (!u || u.password !== password) return { data: {}, error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 } };
      if (!u.confirmed) return { data: {}, error: { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 } };
      session = { user: { id: u.id, email } }; emitAuth('SIGNED_IN');
      return { data: { session }, error: null };
    },
    signUp: async ({ email, password }) => {
      net();
      if (!server.users.has(email)) server.users.set(email, { id: `id-${server.users.size + 1}`, password, confirmed: !!server.autoConfirm });
      if (server.autoConfirm) { session = { user: { id: server.users.get(email).id, email } }; return { data: { session, user: session.user }, error: null }; }
      return { data: { session: null, user: { id: 'x' } }, error: null };
    },
    signOut: async () => { session = null; emitAuth('SIGNED_OUT'); return { error: null }; },
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null })
  };
  const table = name => {
    const q = { filters: {}, op: null, payload: null };
    const run = async () => {
      net();
      if (name === 'faro_state' && q.op === 'select') return { data: server.states.get(uid()) ? { ...server.states.get(uid()) } : null, error: null };
      if (name === 'faro_subscriptions') return { data: server.subs.get(q.filters.user_id) || null, error: null };
      if (name === 'faro_push_devices' && q.op === 'upsert') { server.devices.push(q.payload); return { error: null }; }
      if (name === 'faro_push_devices' && q.op === 'update') { server.devices.forEach(d => { d.active = false; }); return { error: null }; }
      return { data: null, error: null };
    };
    const b = {
      select() { q.op = q.op || 'select'; return b; },
      upsert(p) { q.op = 'upsert'; q.payload = p; return b; },
      update(p) { q.op = 'update'; q.payload = p; return b; },
      eq(k, v) { q.filters[k] = v; return b; },
      maybeSingle: run,
      then(res, rej) { return run().then(res, rej); }
    };
    return b;
  };
  const rpc = async (fn, a) => {
    net(); server.rpcCalls += 1;
    if (!uid()) return { data: null, error: { code: '28000', message: 'not_authenticated' } };
    if (server.rpcError) return { data: null, error: server.rpcError };
    const cur = server.states.get(uid());
    const exp = a.p_expected_revision;
    const ok = r => ({ data: { ok: true, revision: r.revision, server_updated_at: 't' + r.revision }, error: null });
    if (!cur && exp === 0) { const r = { schema_version: 2, revision: 1, state: a.p_state, device_id: a.p_device_id, last_mutation_id: a.p_mutation_id, server_updated_at: 't1' }; server.states.set(uid(), r); return ok(r); }
    if (cur && cur.revision === exp) { const r = { ...cur, revision: exp + 1, state: a.p_state, device_id: a.p_device_id, last_mutation_id: a.p_mutation_id }; server.states.set(uid(), r); return ok(r); }
    if (cur && cur.last_mutation_id === a.p_mutation_id && cur.device_id === a.p_device_id) return { data: { ok: true, replay: true, revision: cur.revision, server_updated_at: 't' + cur.revision }, error: null };
    return { data: { ok: false, conflict: true, revision: cur?.revision || 0, state: cur?.state || null, server_updated_at: 't', device_id: cur?.device_id }, error: null };
  };
  return { auth, from: table, rpc, functions: { invoke: async (name, opts) => { net(); (server.calls ||= []).push({ name, body: opts && opts.body }); const r = typeof server.invoke[name] === 'function' ? server.invoke[name](opts) : server.invoke[name]; if (r instanceof Error) return { data: null, error: r }; return { data: r ?? null, error: null }; } }, _setSession: s => { session = s; } };
};

export const memStorage = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; };

export const GOOD = { supabaseUrl: 'https://abc.supabase.co', supabasePublishableKey: 'sb_publishable_x', billingEnabled: true, pushEnabled: true };
