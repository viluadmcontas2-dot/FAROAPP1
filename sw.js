const CORE_CACHE = 'faro-v1-core-5';
const EXTERNAL_CACHE = 'faro-v1-external-2';

const APP_SHELL = [
  './',
  './index.html',
  './app-shell.html',
  './legacy-shell.html',
  './app.js?v=3.5.1-faro1',
  './faro-brand.js?v=2',
  './faro-platform.js?v=1',
  './faro-energy.js?v=1',
  './faro-home.js?v=1',
  './faro-register.js?v=1',
  './faro-finance.js?v=1',
  './faro-reserves.js?v=1',
  './faro-onboarding.js?v=2',
  './styles.css',
  './manifest.webmanifest',
  './faro-mark.svg',
  './icon.svg'
];

const EXTERNAL_SEEDS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

const EXTERNAL_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]);

async function cacheExternalSeed(url) {
  try {
    const request = new Request(url, { mode: 'no-cors', cache: 'no-store' });
    const response = await fetch(request);
    const cache = await caches.open(EXTERNAL_CACHE);
    await cache.put(request, response.clone());
  } catch (error) {
    // Dependência externa nunca pode impedir o núcleo FARO de instalar.
    console.warn('FARO: dependência externa não foi pré-cacheada', url, error);
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const core = await caches.open(CORE_CACHE);
    await core.addAll(APP_SHELL);
    await Promise.allSettled(EXTERNAL_SEEDS.map(cacheExternalSeed));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const allowed = new Set([CORE_CACHE, EXTERNAL_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => !allowed.has(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function externalResponse(request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      const cache = await caches.open(EXTERNAL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('', { status: 503, statusText: 'FARO offline: recurso externo indisponível' });
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    if (EXTERNAL_HOSTS.has(url.hostname)) event.respondWith(externalResponse(event.request));
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response.ok) {
        const cache = await caches.open(CORE_CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
      throw error;
    }
  })());
});
