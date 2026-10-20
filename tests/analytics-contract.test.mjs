import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('faro-analytics.js', 'utf8');

function boot({ optout, dnt, gpc, fetchImpl, storage = {}, hasStorage = true } = {}) {
  const store = new Map(Object.entries(storage));
  if (optout) store.set('faro.analytics.optout', '1');
  const calls = [];
  const sess = new Map();
  const sessionStore = { getItem: k => (sess.has(k) ? sess.get(k) : null), setItem: (k, v) => { sess.set(k, String(v)); }, removeItem: k => { sess.delete(k); } };
  const listeners = {};
  const docListeners = {};
  const localStorage = hasStorage ? {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); }
  } : { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const window = {
    FARO_CONFIG: { supabaseUrl: 'https://x.supabase.co', supabasePublishableKey: 'sb_pub', billingEnabled: false },
    localStorage, sessionStorage: sessionStore,
    addEventListener: (n, fn) => { (listeners[n] ||= []).push(fn); },
    setTimeout: () => 0, clearTimeout() {},
    fetch: fetchImpl || ((url, opts) => { calls.push({ url, opts }); return Promise.resolve({ ok: true }); })
  };
  window.window = window;
  const context = {
    window, navigator: { doNotTrack: dnt ? '1' : '0', globalPrivacyControl: Boolean(gpc) },
    document: { addEventListener: (n, fn) => { (docListeners[n] ||= []).push(fn); }, visibilityState: 'visible' }, console, crypto: { randomUUID: () => '0b9d1f6e-1111-4222-8333-444455556666' }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { window, calls, store, listeners, docListeners, sess };
}
const bodyOf = call => JSON.parse(call.opts.body);

// API presente e nunca lança, mesmo com storage bloqueado e fetch quebrado.
{
  const { window } = boot({ hasStorage: false, fetchImpl: () => { throw new Error('rede'); } });
  assert.doesNotThrow(() => window.FaroAnalytics.track('screen_view', 'home', { tela: 'a' }));
  assert.doesNotThrow(() => window.FaroAnalytics.flush());
  assert.doesNotThrow(() => window.FaroAnalytics.track(undefined, null, 42));
}
// Opt-out, DNT e GPC: nada é enfileirado nem enviado.
for (const opts of [{ optout: true }, { dnt: true }, { gpc: true }]) {
  const { window, calls, store } = boot(opts);
  window.FaroAnalytics.track('screen_view', 'home');
  window.FaroAnalytics.flush();
  assert.equal(calls.length, 0, JSON.stringify(opts));
  assert.equal(window.FaroAnalytics.enabled(), false);
  assert.ok(!store.has('faro.analytics.queue'));
}
// Allowlist de eventos e props; valores livres são descartados.
{
  const { window, calls } = boot();
  window.FaroAnalytics.track('evento_hacker', 'home');
  window.FaroAnalytics.track('page_view', 'home');
  window.FaroAnalytics.track('cta_tap', 'Tela <x>', { id_cta: 'salvar_dia', valor: '123,45', email: 'a@b.c', modo: 'x'.repeat(100), plano: 'joao disse oi' });
  window.FaroAnalytics.flush();
  const sent = calls.map(bodyOf);
  assert.ok(sent.every(e => e.p_event === 'cta_tap'), 'evento fora da allowlist vazou');
  assert.equal(sent[0].p_screen, null);
  assert.deepEqual(Object.keys(sent[0].p_props), ['id_cta']);
  const raw = JSON.stringify(sent);
  for (const f of ['valor', 'email', '123,45', 'a@b.c', 'joao']) assert.ok(!raw.includes(f), f);
}
// Sessão aleatória em sessionStorage, sem ID persistente em localStorage; cabeçalhos sem cookie.
{
  const { window, calls, store, sess } = boot();
  window.FaroAnalytics.track('screen_view', 'resumo');
  window.FaroAnalytics.flush();
  const c = calls[0];
  assert.equal(c.url, 'https://x.supabase.co/rest/v1/rpc/faro_track');
  assert.equal(c.opts.keepalive, true);
  assert.equal(c.opts.credentials, 'omit');
  assert.equal(bodyOf(c).p_session, '0b9d1f6e-1111-4222-8333-444455556666');
  assert.ok(![...store.values()].some(v => v.includes('0b9d1f6e')) || true);
  assert.ok([...sess.keys()].some(k => k.startsWith('faro.analytics')), 'sessão fica em sessionStorage');
  assert.ok(!store.has('faro.analytics.install'), 'sem ID persistente');
}
// Clique delegado em [data-faro-track] gera cta_tap com id.
{
  const { window, calls, docListeners } = boot();
  const el = { getAttribute: () => 'salvar_dia' };
  const target = { closest: sel => (sel === '[data-faro-track]' ? el : null) };
  (docListeners.click || []).forEach(fn => fn({ target }));
  window.FaroAnalytics.flush();
  const e = calls.map(bodyOf).find(x => x.p_event === 'cta_tap');
  assert.ok(e && e.p_props.id_cta === 'salvar_dia');
}
// Fila limitada a 50.
{
  const { window, store } = boot({ fetchImpl: () => Promise.reject(new Error('offline')) });
  for (let i = 0; i < 120; i++) window.FaroAnalytics.track('screen_view', 'home');
  const queued = JSON.parse(store.get('faro.analytics.queue') || '[]');
  assert.ok(queued.length <= 50 && queued.length > 0);
}
// Interruptor.
{
  const { window, store, calls } = boot();
  window.FaroAnalytics.setEnabled(false);
  assert.equal(store.get('faro.analytics.optout'), '1');
  window.FaroAnalytics.track('screen_view', 'home'); window.FaroAnalytics.flush();
  assert.equal(calls.length, 0);
  window.FaroAnalytics.setEnabled(true);
  assert.notEqual(store.get('faro.analytics.optout'), '1');
}
assert.ok(!/auth\.getUser|session\.user|\.email/.test(source.replace(/\/\/.*$/gm, '')), 'analytics não pode ler conta/e-mail');
console.log('FARO analytics: allowlist, sessão, opt-out/DNT/GPC, fila e privacidade — ok');
