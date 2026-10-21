// Navegador real (chromium do Playwright): CSP sem violacao, SW instala, app abre offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { buildTo, root } from './helpers/pwa-build.mjs';
import { forceStandalone } from './helpers/e2e-app.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { /* sem playwright */ } }
const EXE = process.env.FARO_CHROMIUM || '/opt/pw-browsers/chromium';
const skip = !chromium || !existsSync(EXE) ? 'Playwright/chromium indisponivel' : false;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const cfg = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const rules = cfg.headers.map((h) => ({ re: new RegExp(`^${h.source}$`), headers: h.headers }));

function serve(dir) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = join(dir, normalize(path));
      if (statSync(dir).isDirectory() && existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      if (!file.startsWith(dir) || !existsSync(file)) { rsp.writeHead(404); return rsp.end('nao encontrado'); }
      const h = { 'content-type': MIME[extname(file)] || 'application/octet-stream' };
      for (const r of rules) if (r.re.test(path)) for (const x of r.headers) h[x.key.toLowerCase()] = x.value;
      rsp.writeHead(200, h); rsp.end(readFileSync(file));
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

test('instalavel e offline com CSP estrita', { skip, timeout: 120000 }, async () => {
  const dir = buildTo();
  const srv = await serve(dir);
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'allow' });
    await ctx.addInitScript(forceStandalone); // o app só abre instalado
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', (m) => { if (/content security policy|refused to|violat/i.test(m.text())) problems.push(m.text()); });
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    const resp = await page.goto(url, { waitUntil: 'load' });
    assert.match(resp.headers()['content-security-policy'], /script-src 'self'/);
    await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, null, { timeout: 15000 });

    // registra o SW (o main ainda nao importa register.js; o teste faz o mesmo que ele)
    const ready = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => { navigator.serviceWorker.addEventListener('controllerchange', r); setTimeout(r, 4000); });
      return { active: !!reg.active, caches: await caches.keys() };
    });
    assert.ok(ready.active);
    assert.equal(ready.caches.length, 1); assert.match(ready.caches[0], /^faro-shell-[0-9a-f]{16}$/);
    assert.deepEqual(await page.evaluate(() => window.__csp), [], 'violacao de CSP');

    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, null, { timeout: 15000 });
    assert.ok((await page.locator('#root').innerHTML()).length > 200, 'app renderizou offline');
    // navegacao com parametros (?tela=...) tambem abre offline (cai no index em cache)
    await page.goto(url + '?tela=onb0', { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, null, { timeout: 15000 });
    assert.deepEqual(await page.evaluate(() => window.__csp), [], 'violacao de CSP offline');
    assert.deepEqual(problems, []);
  } finally { await browser.close(); srv.close(); }
});
