// Service worker: não guarda HTML (fallback da SPA) sob URL de asset e não cresce por query string.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('sw.js', 'utf8');
const store = new Map();
const cache = {
  async put(req, res) { store.set(typeof req === 'string' ? req : req.url, res); },
  async match(req) { return store.get(typeof req === 'string' ? req : req.url); }
};
const listeners = {};
let nextResponse;
const sandbox = {
  self: { location: { origin: 'https://faro.test' }, registration: { scope: 'https://faro.test/' }, addEventListener: (t, f) => { listeners[t] = f; }, skipWaiting() {} },
  caches: { open: async () => cache, match: async () => undefined, keys: async () => [], delete: async () => true },
  fetch: async () => nextResponse,
  Request, Response, URL, setTimeout, Promise, console
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const run = async (url, mode = 'no-cors') => {
  let answer;
  listeners.fetch({ request: Object.assign(new Request(url), {}), respondWith: p => { answer = p; }, waitUntil() {} });
  const request = new Request(url);
  void mode; void request;
  return answer && (await answer);
};

// HTML sob URL de asset: devolve ao usuário, mas não entra no cache.
nextResponse = new Response('<!doctype html><p>spa', { status: 200, headers: { 'content-type': 'text/html' } });
await run('https://faro.test/faro-novo.js');
assert.equal(store.size, 0, 'HTML sob URL .js não pode ser cacheado');

// Asset de verdade entra uma vez só, mesmo com query string diferente.
nextResponse = new Response('console.log(1)', { status: 200, headers: { 'content-type': 'text/javascript' } });
await run('https://faro.test/faro-state.js?v=1');
nextResponse = new Response('console.log(2)', { status: 200, headers: { 'content-type': 'text/javascript' } });
await run('https://faro.test/faro-state.js?v=2');
await run('https://faro.test/faro-state.js?v=3');
assert.equal(store.size, 1, 'query string não pode multiplicar entradas de asset');
assert.ok(store.has('https://faro.test/faro-state.js'), 'chave do asset sem query');
assert.match(source, /const CORE_CACHE = 'faro-v1-core-39'/);
console.log('FARO sw cache hardening — ok');
