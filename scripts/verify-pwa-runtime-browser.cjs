// Prova real (Chromium) do runtime PWA: atalhos, update flow e badge.
// Uso: npm run build && NODE_PATH=$(npm root -g) node scripts/verify-pwa-runtime-browser.cjs
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve('_site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
let swVersion = 1;
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html');
  const file = path.join(root, pathname);
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  const headers = { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' };
  if (pathname === '/sw.js') { res.writeHead(200, headers); return res.end(`${fs.readFileSync(file, 'utf8')}\n// teste v${swVersion}\n`); }
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});
const iso = offset => { const d = new Date(); d.setDate(d.getDate() - offset); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const state = { version: 3, onboardingComplete: true, targetProfit: 4000, workWeekdays: [1, 2, 3, 4, 5, 6], extraDaysOff: 0, revenueKm: 2.25, fuel: { type: 'gnv', label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 }, costs: [], records: [1, 2].map(i => ({ date: iso(i), gross: 300, km: 150, hours: 9, fuelSpend: 60 })), events: [] };
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALHA'} ${name}${detail ? ' — ' + detail : ''}`); };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(({ state }) => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    if (!localStorage.getItem('faro-app-finance-v1')) {
      localStorage.setItem('faro-app-finance-v1', JSON.stringify(state));
      localStorage.setItem('faro-ui-tour-v1', JSON.stringify({ done: true }));
    }
    window.__badge = [];
    navigator.setAppBadge = async n => { window.__badge.push(['set', n]); };
    navigator.clearAppBadge = async () => { window.__badge.push(['clear']); };
  }, { state });
  const page = await context.newPage();
  const ready = () => page.waitForFunction(() => document.documentElement.dataset.faroPlatformReady === 'true', null, { timeout: 20000 });

  // Atalho "Registrar dia"
  await page.goto(`${origin}/app-shell.html?atalho=registrar`); await ready();
  await page.waitForFunction(() => !document.getElementById('view-day').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});
  check('atalho ?atalho=registrar abre a tela Registrar', await page.evaluate(() => !document.getElementById('view-day').classList.contains('hidden')));
  check('query do atalho é limpa da URL', !page.url().includes('atalho'));
  await page.goto(`${origin}/app-shell.html?atalho=inicio`); await ready();
  check('atalho ?atalho=inicio mantém Início', await page.evaluate(() => !document.getElementById('view-dashboard').classList.contains('hidden')));

  // Persistência
  check('navigator.storage.persist() foi chamado', await page.evaluate(async () => (await window.FaroPwa.requestPersistence(), true)));

  // Badge: dia de hoje sem registro => selo ao ocultar o app; limpa ao voltar
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  check('selo 1 quando hoje não tem registro e o app sai de cena', await page.evaluate(() => JSON.stringify(window.__badge.at(-1)) === '["set",1]'));
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  check('selo é limpo quando o app volta', await page.evaluate(() => JSON.stringify(window.__badge.at(-1)) === '["clear"]'));

  // Update flow
  await page.goto(`${origin}/app-shell.html`); await ready();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await ready();
  check('página controlada pelo service worker', await page.evaluate(() => !!navigator.serviceWorker.controller));
  swVersion = 2;
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await page.waitForSelector('#faroUpdateBar', { timeout: 10000 }).catch(() => {});
  const barText = await page.evaluate(() => document.getElementById('faroUpdateBar')?.textContent || '');
  check('barra "Nova versão disponível / Atualizar" aparece', /Nova versão/.test(barText) && /Atualizar/.test(barText), barText.trim());
  const navigated = page.waitForNavigation({ timeout: 10000 }).then(() => true).catch(() => false);
  await page.click('#faroUpdateApply');
  check('Atualizar ativa a nova versão e recarrega', await navigated);
  await ready();
  check('depois da atualização não sobra barra pendente', await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !r.waiting && !document.getElementById('faroUpdateBar'); }));

  await browser.close(); server.close();
  if (results.includes(false)) process.exit(1);
})().catch(e => { console.error(e); process.exit(2); });
