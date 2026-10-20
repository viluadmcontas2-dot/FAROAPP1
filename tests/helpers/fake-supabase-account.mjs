// Harness de faro-account.js em vm com um Supabase falso que imita RLS, gatilho de revisão e paywall.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

export const tick = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
const clone = v => JSON.parse(JSON.stringify(v));

export async function accountHarness({ meta = null, state, rows = {}, sessionUser = null, paywall = false } = {}) {
  const elements = new Map();
  class Element {
    constructor(id) { this.id = id; this.listeners = {}; this.hidden = false; this.disabled = false; this.value = ''; this.dataset = {}; this.textContent = ''; this.classes = new Set();
      this.classList = { add: c => this.classes.add(c), remove: c => this.classes.delete(c), contains: c => this.classes.has(c), toggle: (c, v) => (v ? this.classes.add(c) : this.classes.delete(c)) }; }
    set innerHTML(html) { for (const m of html.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)) { const el = new Element(m[1]); el.hidden = /\shidden(?:[\s>])/.test(m[0]); if (/class="[^"]*hidden/.test(m[0])) el.classes.add('hidden'); elements.set(el.id, el); } }
    appendChild(el) { if (el.id) elements.set(el.id, el); } prepend(el) { elements.set(el.id, el); } setAttribute() {} focus() {} showModal() { this.open = true; } close() { this.open = false; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    click() { if (!this.disabled) return this.listeners.click?.(); }
  }
  const storage = new Map();
  if (meta) storage.set('faro-sync-meta-v1', JSON.stringify(meta));
  const app = {
    state: clone(state), saveCount: 0, toasts: [],
    save() { this.saveCount++; storage.set('faro-app-finance-v1', JSON.stringify(this.state)); },
    cloneDefaults: () => ({ records: [], onboardingComplete: false }), normalizeState: v => clone(v),
    syncInputs() {}, render() {}, toast(m) { this.toasts.push(m); }, exportData() { h.exported = clone(this.state); }
  };
  const server = { rows: clone(rows), writes: [], paywall, authUser: sessionUser, gate: null, beforeWrite: null };
  const exec = async q => {
    const isWrite = q.op !== 'select';
    if (isWrite) {
      server.writes.push({ table: q.table, op: q.op, filters: { ...q.filters }, payload: clone(q.payload) });
      if (server.beforeWrite && q.table === 'faro_state') { const fn = server.beforeWrite; server.beforeWrite = null; fn(q); }
      if (server.gate && q.table === 'faro_state') await server.gate;
    }
    if (q.table === 'faro_profiles') return paywallErr(q) || { data: null, error: null };
    if (q.table !== 'faro_state') return { data: null, error: null };
    const uid = q.filters.user_id ?? q.payload?.user_id;
    if (isWrite && uid !== server.authUser) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    const row = server.rows[uid];
    if (q.op === 'select') return { data: row ? [clone(row)] : [], error: null };
    const blocked = paywallErr(q); if (blocked) return blocked;
    if (q.op === 'insert') {
      if (row) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
      server.rows[uid] = { ...clone(q.payload), revision: 1, server_updated_at: 't1' };
      return { data: [clone(server.rows[uid])], error: null };
    }
    if (q.op === 'update') {
      if (!row || ('revision' in q.filters && row.revision !== q.filters.revision)) return { data: [], error: null };
      server.rows[uid] = { ...row, ...clone(q.payload), revision: row.revision + 1, server_updated_at: 't' + (row.revision + 1) };
      return { data: [clone(server.rows[uid])], error: null };
    }
    if (q.op === 'upsert') {
      server.rows[uid] = { ...(row || {}), ...clone(q.payload), revision: row ? row.revision + 1 : 1, server_updated_at: 'tu' };
      return { data: [clone(server.rows[uid])], error: null };
    }
    return { data: null, error: null };
  };
  const paywallErr = q => (server.paywall && q.op !== 'select' ? { data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "' + q.table + '"' } } : null);
  const from = table => {
    const q = { table, op: 'select', filters: {}, payload: null };
    const b = {
      select() { return b; }, eq(c, v) { q.filters[c] = v; return b; },
      insert(p) { q.op = 'insert'; q.payload = p; return b; }, update(p) { q.op = 'update'; q.payload = p; return b; },
      upsert(p) { q.op = 'upsert'; q.payload = p; return b; },
      async maybeSingle() { const r = await exec(q); return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error }; },
      async single() { const r = await exec(q); if (r.error) return r; const d = Array.isArray(r.data) ? r.data[0] : r.data; return d ? { data: d, error: null } : { data: null, error: { code: 'PGRST116', message: '0 rows' } }; },
      then(res, rej) { return exec(q).then(res, rej); }
    };
    return b;
  };
  let authCallback = null;
  const sessionOf = id => (id ? { user: { id, email: id + '@x.com' } } : null);
  const client = {
    from, rpc: async () => ({ data: null, error: null }),
    auth: {
      getSession: async () => ({ data: { session: sessionOf(server.authUser) } }),
      onAuthStateChange(cb) { authCallback = cb; },
      signInWithPassword: async ({ email }) => { server.authUser = email.split('@')[0]; return { data: { session: sessionOf(server.authUser) }, error: null }; },
      signOut: async () => { server.authUser = null; return { error: null }; }
    },
    functions: { invoke: async () => ({ data: null, error: null }) }
  };
  elements.set('view-more', new Element('view-more'));
  const timers = [];
  const windowListeners = {};
  const sandbox = {
    console: { log() {}, warn() {}, error() {} }, crypto: { randomUUID: (() => { let n = 0; return () => 'uuid-' + (++n); })() },
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {}, navigator: { onLine: true }, location: { reload() {}, origin: 'https://faro.test', pathname: '/' }, URL,
    localStorage: { getItem: k => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
    document: { getElementById: id => elements.get(id), createElement: () => new Element(), body: new Element(), head: new Element() },
    createClient: () => client
  };
  sandbox.window = { __vettaApp: app, FARO_CONFIG: { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'public' }, addEventListener(name, fn) { (windowListeners[name] ||= []).push(fn); } };
  vm.runInNewContext(readFileSync('faro-account.js', 'utf8').replace('await import(SDK_URL)', '({ createClient: globalThis.createClient })'), sandbox);
  await tick();
  const el = id => elements.get(id);
  const h = {
    app, storage, server, sandbox, el, timers,
    meta: () => JSON.parse(storage.get('faro-sync-meta-v1') || '{}'),
    fireAuth: async (event, userId) => { server.authUser = userId; authCallback?.(event, sessionOf(userId)); await tick(); },
    fireStorage: async (key, newValue) => { for (const fn of windowListeners.storage || []) fn({ key, newValue }); await tick(); },
    signIn: async userId => { el('faroEmail').value = userId + '@x.com'; el('faroPassword').value = 'senha-forte'; await el('faroSignIn').click(); await tick(); },
    runTimers: async () => { const list = timers.splice(0); for (const fn of list) await fn(); await tick(); },
    syncText: () => el('faroSyncStatus').textContent
  };
  return h;
}
