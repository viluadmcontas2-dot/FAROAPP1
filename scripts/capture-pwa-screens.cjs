// Captura telas 390x844 do build (_site ou outra pasta) para screenshots do manifest e comparação visual.
// Uso: NODE_PATH=$(npm root -g) node scripts/capture-pwa-screens.cjs <pastaSite> <prefixoSaida> [--manifest]
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const [siteArg = '_site', prefix = 'shot', flag] = process.argv.slice(2);
const root = path.resolve(siteArg);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
server.listen(0, '127.0.0.1');

const day = offset => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };
const state = {
  version: 3, onboardingComplete: true, targetProfit: 4000, workWeekdays: [1, 2, 3, 4, 5, 6], extraDaysOff: 0, revenueKm: 2.25,
  fuel: { type: 'gnv', label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 },
  costs: [{ id: 'maintenance-default', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: 0.18, active: true }, { id: 'fixed-default', name: 'Custos fixos iniciais', kind: 'monthly', category: 'obligation', value: 650, active: true }],
  records: [1, 2, 3, 4, 5].map(i => ({ date: day(i), gross: 280 + i * 17, km: 150 + i * 6, hours: 9, fuelSpend: 60 + i * 2 })),
  events: []
};

(async () => {
  await new Promise(r => server.once('listening', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  await context.addInitScript(({ state }) => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    try {
      localStorage.setItem('faro-app-finance-v1', JSON.stringify(state));
      localStorage.setItem('faro-ui-tour-v1', JSON.stringify({ done: true, completed: true, seen: true }));
    } catch {}
  }, { state });
  const page = await context.newPage();
  const requests = [];
  page.on('requestfailed', r => requests.push(r.url()));
  await page.goto(`${origin}/app-shell.html`);
  await page.waitForFunction(() => document.documentElement.dataset.faroPlatformReady === 'true', null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const views = flag === '--manifest' ? { home: 'dashboard', register: 'day' } : { dashboard: 'dashboard', day: 'day', history: 'history', settings: 'settings', more: 'more', planning: 'planning' };
  for (const [name, view] of Object.entries(views)) {
    await page.evaluate(v => window.__vettaApp.navigateToPrimary(v), view);
    await page.waitForTimeout(2000);
    const out = flag === '--manifest' ? `screenshot-${name}.png` : `${prefix}-${name}.png`;
    await page.screenshot({ path: out });
    console.log('ok', out);
  }
  if (requests.length) console.log('requests falhos:', requests.slice(0, 5));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(2); });
