// Service worker do Faro 2.0. Empacotado por scripts/build-app.mjs (esbuild, iife) em _site/sw.js.
// __SW_VERSION__ e __SW_PRECACHE__ sao trocados no build (versao = hash do conteudo do build).
import { decide, isCacheableResponse, plainResponse } from './sw-policy.js';

const VERSION = __SW_VERSION__;
const PRECACHE = __SW_PRECACHE__; // caminhos relativos ao scope, ex.: "app.js"
const CACHE = `faro-shell-${VERSION}`;
const PREFIX = 'faro-shell-';
const scopeUrl = (p) => new URL(p, self.registration.scope).href;
const INDEX = () => scopeUrl('index.html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache:'reload' ignora o cache HTTP: o pre-cache tem que ser exatamente este build
    await Promise.all(PRECACHE.map(async (p) => {
      const res = await fetch(new Request(scopeUrl(p), { cache: 'reload' }));
      if (!isCacheableResponse(res)) throw new Error(`pre-cache falhou: ${p}`);
      await cache.put(scopeUrl(p), plainResponse(res));
    }));
    // sem skipWaiting aqui: a atualizacao so assume quando o app pedir (mensagem SKIP_WAITING)
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(PREFIX) && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const d = event.data;
  if (d && d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d && d.type === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const kind = decide({
    url: req.url, method: req.method, mode: req.mode,
    hasAuth: req.headers.has('authorization'),
  }, self.location.origin);
  if (kind === 'bypass') return; // rede direta, sem cache
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (kind === 'navigate') {
      const hit = await cache.match(INDEX());
      if (hit) return plainResponse(hit);
      try { return await fetch(req); } catch { return new Response('Sem conexão.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }); }
    }
    const url = new URL(req.url); url.search = '';
    const hit = await cache.match(url.href);
    if (hit) return hit;
    return fetch(req);
  })());
});
