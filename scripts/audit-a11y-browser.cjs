// Auditoria axe-core (contraste AA, alvos, nomes) por tela. Uso:
// AXE_PATH=<caminho/axe.min.js> NODE_PATH=$(npm root -g) node scripts/audit-a11y-browser.cjs [--car] [--min-font]
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
const car = process.argv.includes('--car');
const day = offset => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };
const state = { version: 3, onboardingComplete: true, targetProfit: 4000, workWeekdays: [1, 2, 3, 4, 5, 6], extraDaysOff: 0, revenueKm: 2.25, fuel: { type: 'gnv', label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 }, costs: [{ id: 'maintenance-default', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: 0.18, active: true }], records: [1, 2, 3].map(i => ({ date: day(i), gross: 280 + i * 17, km: 150 + i * 6, hours: 9, fuelSpend: 60 })), events: [] };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await context.addInitScript(({ state, car }) => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    localStorage.setItem('faro-app-finance-v1', JSON.stringify(state));
    localStorage.setItem('faro-ui-tour-v1', JSON.stringify({ done: true, completed: true, seen: true }));
    if (car) localStorage.setItem('faro-car-mode-v1', 'on');
  }, { state, car });
  const page = await context.newPage();
  await page.goto(`${origin}/app-shell.html`);
  await page.waitForFunction(() => document.documentElement.dataset.faroPlatformReady === 'true', null, { timeout: 20000 });
  await page.addScriptTag({ path: process.env.AXE_PATH });
  let total = 0;
  for (const view of ['dashboard', 'day', 'history', 'settings', 'more']) {
    await page.evaluate(v => window.__vettaApp.navigateToPrimary(v), view);
    await page.waitForTimeout(900);
    const result = await page.evaluate(() => axe.run(document, { runOnly: ['color-contrast'] }));
    const nodes = result.violations.flatMap(v => v.nodes.map(n => ({ target: n.target.join(' '), msg: (n.any[0] || {}).message || '' })));
    total += nodes.length;
    console.log(`${view}: ${nodes.length} falhas de contraste`);
    for (const n of nodes.slice(0, 40)) console.log('  ', n.target.slice(0, 80), '|', n.msg.replace(/Element has insufficient color contrast of /, '').slice(0, 110));
    const small = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.children.length === 0 && el.textContent.trim() && getComputedStyle(el).visibility !== 'hidden' && el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 11.99).map(el => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}:${getComputedStyle(el).fontSize}`));
    console.log(`  fontes <12px visíveis: ${small.length}`, small.slice(0, 6));
    const tiny = await page.evaluate(() => [...document.querySelectorAll('button,a[href],[role=button],select,summary,input:not([type=hidden]):not([type=range])')].filter(el => el.offsetParent !== null).map(el => [el, el.getBoundingClientRect()]).filter(([, r]) => r.height > 0 && (r.height < 47.5 || r.width < 47.5)).map(([el, r]) => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`));
    console.log(`  alvos <48px: ${tiny.length}`, tiny.slice(0, 8));
  }
  await browser.close(); server.close();
  console.log('TOTAL contraste:', total);
})().catch(e => { console.error(e); process.exit(2); });
