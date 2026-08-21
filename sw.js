const CORE_CACHE = 'faro-v1-core-22';
const EXTERNAL_CACHE = 'faro-v1-external-2';

const APP_SHELL = [
  './',
  './index.html',
  './app-shell.html',
  './legacy-shell.html',
  './app.js?v=3.5.1-faro1',
  './faro-brand-r2.js?v=1',
  './faro-platform.js?v=3',
  './faro-update.js?v=1',
  './faro-state.js?v=1',
  './faro-energy.js?v=1',
  './faro-home-r2.js?v=1',
  './faro-register-earnings.js?v=1',
  './faro-register.js?v=2',
  './faro-finance.js?v=1',
  './faro-reserves.js?v=1',
  './faro-interactions.js?v=2',
  './faro-planning.js?v=2',
  './faro-planning-invariants.js?v=1',
  './faro-r3b.js?v=1',
  './faro-r3-routing.js?v=3',
  './faro-navigation.js?v=1',
  './faro-config.js?v=1',
  './faro-account.js?v=1',
  './faro-notifications.js?v=1',
  './faro-r2-polish.js?v=1',
  './faro-onboarding.js?v=3',
  './faro-onboarding-commit.js?v=1',
  './faro-tour.js?v=2',
  './styles.css',
  './manifest.webmanifest?v=2',
  './faro-mark.svg',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './assets/platforms/faro-platform-99.svg',
  './assets/platforms/faro-platform-indrive.svg',
  './assets/platforms/faro-platform-uber.svg'
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
    console.warn('FARO: dependência externa não foi pré-cacheada', url, error);
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const core = await caches.open(CORE_CACHE);
    await core.addAll(APP_SHELL);
    await Promise.allSettled(EXTERNAL_SEEDS.map(cacheExternalSeed));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const allowed = new Set([CORE_CACHE, EXTERNAL_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => !allowed.has(key)).map(key => caches.delete(key)));
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'FARO_ACTIVATE_WHEN_SAFE') self.skipWaiting();
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
      if (event.request.mode === 'navigate') return (await caches.match('./index.html')) || (await caches.match('./'));
      throw error;
    }
  })());
});

const safeFaroUrl = value => {
  try {
    const url = new URL(value || './', self.location.origin);
    return url.origin === self.location.origin ? url.href : new URL('./', self.location.origin).href;
  } catch {
    return new URL('./', self.location.origin).href;
  }
};

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json?.() || {}; }
  catch { payload = { body: event.data?.text?.() || '' }; }
  const title = String(payload.title || 'FARO');
  const options = {
    body: String(payload.body || 'Você tem uma atualização útil no FARO.'),
    icon: './icon-192.png', badge: './icon-192.png', tag: String(payload.tag || 'faro-aviso'),
    data: { url: safeFaroUrl(payload.url) }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = safeFaroUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});