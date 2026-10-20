// Prova real (Chromium): serve _site com a CSP de scripts/csp.mjs e confirma zero violações durante o uso.
// Uso: npm run build && NODE_PATH=$(npm root -g) node scripts/verify-csp-browser.cjs
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve('_site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

(async () => {
  const { globalHeaders } = await import('./csp.mjs');
  const headers = globalHeaders();
  delete headers['Strict-Transport-Security']; // HTTP local
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { ...headers, 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const page = await context.newPage();
  const problems = [];
  page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => problems.push(String(e).slice(0, 200)));
  await page.goto(`${origin}/app-shell.html`);
  await page.waitForFunction(() => document.documentElement.dataset.faroPlatformReady === 'true', null, { timeout: 20000 });
  for (const view of ['day', 'history', 'settings', 'more', 'dashboard']) {
    await page.evaluate(v => window.__vettaApp.navigateToPrimary(v), view);
    await page.waitForTimeout(400);
  }
  const sdk = await page.evaluate(async () => typeof (await import('./vendor/supabase-js-2.112.3.mjs')).createClient);
  const chart = await page.evaluate(() => typeof window.Chart);
  await page.goto(`${origin}/index.html`); // redirect inline por hash
  await page.waitForURL('**/app-shell.html');
  const violations = await page.evaluate(() => window.__csp);
  console.log('supabase-js via import():', sdk, '| Chart:', chart);
  console.log('violações CSP (evento):', violations.length ? violations : 'nenhuma');
  const problemCount = problems.length;
  console.log('problemas de console/página:', problems.length ? problems : 'nenhum');
  // Prova negativa: um script inline sem hash precisa ser bloqueado.
  const blocked = await page.evaluate(() => new Promise(resolve => {
    document.addEventListener('securitypolicyviolation', () => resolve(true), { once: true });
    const s = document.createElement('script'); s.textContent = 'window.__x=1'; document.head.appendChild(s);
    setTimeout(() => resolve(false), 800);
  }));
  console.log('script inline injetado é bloqueado:', blocked);
  await browser.close(); server.close();
  if (violations.length || problemCount || !blocked || sdk !== 'function') process.exit(1);
})().catch(e => { console.error(e); process.exit(2); });
