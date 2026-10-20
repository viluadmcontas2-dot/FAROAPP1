// Prova real (Chromium): instala o SW, desliga a rede, recarrega e confirma app 100% offline sem CDN.
// Uso: npm run build && NODE_PATH=$(npm root -g) node scripts/verify-offline-browser.cjs
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve('_site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});


server.listen(0, '127.0.0.1');
(async () => {
  await new Promise(r => server.once('listening', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  const external = new Set();
  context.on('request', req => { if (!req.url().startsWith(origin) && !req.url().startsWith('data:')) external.add(req.url()); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${origin}/app-shell.html`);
  await page.waitForFunction(() => document.documentElement.dataset.faroPlatformReady === 'true', null, { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open('faro-v1-core-25')).keys()).length > 40, null, { timeout: 15000 });
  console.log('online: shell pronto, SW instalado, requests externos =', [...external].length);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.faroPlatformReady === 'true', null, { timeout: 15000 });
  const hasChart = await page.evaluate(() => typeof window.Chart === 'function');
  const faFont = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('900 16px "Font Awesome 6 Free"'); });
  const twWorks = await page.evaluate(() => getComputedStyle(document.body).display !== '' && !!document.querySelector('link[href*="vendor/tailwind.css"]'));
  console.log('offline: reload ok | Chart global =', hasChart, '| FA carregada =', faFont, '| tailwind local =', twWorks);
  const offlinePage = await context.newPage();
  const resp = await offlinePage.goto(`${origin}/rota-que-nunca-foi-visitada.html`).catch(e => ({ err: String(e) }));
  console.log('offline: rota inédita ->', resp && resp.status ? resp.status() : resp);
  console.log('hosts externos tocados:', [...external]);
  console.log('erros de página:', errors.length ? errors : 'nenhum');
  await browser.close(); server.close();
  if (external.size || !hasChart || errors.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(2); });
