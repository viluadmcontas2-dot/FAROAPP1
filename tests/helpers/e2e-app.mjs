// Apoio dos testes de ponta a ponta: compila o app, serve com CSP estrita (sem unsafe-eval) e abre o Chromium via Playwright.
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { HEADER_RULES } from '../../src/pwa/headers.mjs';

const root = resolve(import.meta.dirname, '../..');
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright';
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
export const SHOTS_DIR = process.env.FARO_SHOTS_DIR || '/tmp/claude-0/-home-user/f00bba1b-1dfe-5280-8100-5acdaf884b86/scratchpad/shots';

// A mesma CSP que vai para producao (src/pwa/headers.mjs): sem 'unsafe-eval', sem script/estilo inline.
export const CSP = HEADER_RULES.find(r => r.path === '/*').headers['Content-Security-Policy'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

export const browserAvailable = () => existsSync(CHROMIUM) && existsSync(PLAYWRIGHT);

export function buildSite() {
  const out = mkdtempSync(join(tmpdir(), 'faro-e2e-'));
  execFileSync(process.execPath, [join(root, 'scripts/build-app.mjs')], { cwd: root, env: { ...process.env, FARO_APP_OUT: out }, stdio: 'pipe' });
  return out;
}

export function serve(dir) {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(dir, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!file.startsWith(dir) || !existsSync(file)) { res.writeHead(404).end('nao achei'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'content-security-policy': CSP, 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(done => server.close(done)) })));
}

export async function launch() {
  const { chromium } = createRequire(import.meta.url)(PLAYWRIGHT);
  return chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
}

export const prepareShots = () => { mkdirSync(SHOTS_DIR, { recursive: true }); return SHOTS_DIR; };
export const cleanup = dir => rmSync(dir, { recursive: true, force: true });

// Junta tudo o que o navegador reporta de errado: console.error, exceções da página e pedidos que falharam.
export function watchErrors(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => errors.push(`requestfailed: ${r.url()} ${r.failure() && r.failure().errorText}`));
  return errors;
}
