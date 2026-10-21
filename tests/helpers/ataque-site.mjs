// Apoio dos testes de ataque no navegador: serve o _site/ construido com os cabecalhos REAIS de _site/_headers
// (mesma semantica do Cloudflare: '/*' vale para todas as rotas, 404 e SPA fallback inclusos), sobe uma origem
// "externa" controlada pelo atacante e um Supabase FALSO (rota interceptada: nada chega ao Supabase real).
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { createRequire } from 'node:module';

export const root = resolve(import.meta.dirname, '../..');
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright';
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
export const SUPABASE_HOST = 'mjbyqhreptllilkggiri.supabase.co';
export const browserAvailable = () => existsSync(CHROMIUM) && existsSync(PLAYWRIGHT);
export const STATE_KEY = 'faro-v2-state';
export const TOKEN_KEY = `sb-${SUPABASE_HOST.split('.')[0]}-auth-token`;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json; charset=utf-8', '.json': 'application/json' };

export function buildSite() {
  const out = mkdtempSync(join(tmpdir(), 'faro-atk-'));
  execFileSync(process.execPath, [join(root, 'scripts/build-app.mjs')], { cwd: root, env: { ...process.env, FARO_APP_OUT: out }, stdio: 'pipe' });
  return out;
}
export const cleanup = dir => rmSync(dir, { recursive: true, force: true });

// Le o arquivo _headers gerado e devolve os cabecalhos que o Cloudflare aplicaria a `pathname` (regras somadas em ordem).
export function parseHeadersFile(text) {
  const rules = []; let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { path: line.trim(), headers: {} }; rules.push(cur); continue; }
    const i = line.indexOf(':');
    cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}
export const headersFor = (rules, pathname) => {
  const out = {};
  for (const r of rules) {
    const ok = r.path.endsWith('*') ? pathname.startsWith(r.path.slice(0, -1)) : pathname === r.path;
    if (ok) Object.assign(out, r.headers);
  }
  return out;
};

// Servidor do app. Se `dir/index.html` existir: arquivo ou (navegacao desconhecida) SPA fallback; senao 404 com cabecalhos.
export function serveSite(dir) {
  const rules = parseHeadersFile(readFileSync(join(dir, '_headers'), 'utf8'));
  const log = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { pathname = '/'; }
    log.push(`${req.method} ${req.url}`);
    const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let file = join(dir, clean);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    const inside = file.startsWith(dir) && !file.endsWith('_headers');
    if (inside && existsSync(file)) {
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', ...headersFor(rules, pathname) });
      res.end(readFileSync(file));
    } else if (req.headers['sec-fetch-mode'] === 'navigate' && !extname(pathname)) {
      res.writeHead(200, { 'content-type': MIME['.html'], ...headersFor(rules, pathname) }); res.end(readFileSync(join(dir, 'index.html')));
    } else {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...headersFor(rules, pathname) }); res.end('nao achei');
    }
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({
    url: `http://127.0.0.1:${server.address().port}/`, origin: `http://127.0.0.1:${server.address().port}`, rules, log,
    close: () => new Promise(done => server.close(done)),
  })));
}

// Origem do atacante: tudo que ela recebe e prova de que algo vazou/carregou.
export function serveEvil({ victimUrl = '' } = {}) {
  const hits = [];
  const server = createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    const p = new URL(req.url, 'http://x').pathname;
    const cors = { 'access-control-allow-origin': '*' };
    if (p === '/evil.js') { res.writeHead(200, { 'content-type': 'text/javascript', ...cors }); res.end('window.__pwned="evil.js"'); }
    else if (p === '/evil.css') { res.writeHead(200, { 'content-type': 'text/css', ...cors }); res.end('body{background:red !important}'); }
    else if (p === '/frame.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<!doctype html><iframe id=v src="${victimUrl}" width=400 height=600></iframe>`); }
    else if (p === '/x.png') { res.writeHead(200, { 'content-type': 'image/png', ...cors }); res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')); }
    else { res.writeHead(200, { 'content-type': 'text/html', ...cors }); res.end('<!doctype html><title>evil</title>'); }
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({
    url: `http://127.0.0.1:${server.address().port}`, hits,
    setVictim: u => { victimUrl = u; },
    close: () => new Promise(done => server.close(done)),
  })));
}

export async function launch({ standalone = true } = {}) {
  const { chromium } = createRequire(import.meta.url)(PLAYWRIGHT);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  if (standalone) {
    const nc = browser.newContext.bind(browser);
    browser.newContext = async (...a) => {
      const c = await nc(...a);
      await c.addInitScript(() => {
        const real = window.matchMedia.bind(window);
        window.matchMedia = q => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false } : real(q));
      });
      return c;
    };
  }
  return browser;
}

// ---- Supabase FALSO (GoTrue + PostgREST minimos) -------------------------------------------------------------
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
export const fakeJwt = (sub, email) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.assinatura-falsa`;
export function makeFakeSupabase() {
  const users = new Map(); // email -> { id, password }
  const states = new Map(); // uid -> row
  const subs = new Map();
  const calls = []; // { method, path, uid }
  const byToken = new Map();
  const api = {
    users, states, subs, calls, offline: false, confirmed: true,
    addUser(email, password, id) { users.set(email, { id: id || `u-${users.size + 1}`, password }); return users.get(email).id; },
    async handle(route) {
      const req = route.request(); const u = new URL(req.url()); const p = u.pathname; const method = req.method();
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (api.offline) return route.abort('internetdisconnected');
      const json = (status, body) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const auth = (req.headers().authorization || '').replace(/^Bearer /, '');
      const uid = byToken.get(auth) || null;
      calls.push({ method, path: p + u.search, uid });
      if (p === '/auth/v1/token') {
        const body = JSON.parse(req.postData() || '{}');
        const rec = users.get(String(body.email || '').toLowerCase());
        if (!rec || rec.password !== body.password) return json(400, { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        const token = fakeJwt(rec.id, body.email); byToken.set(token, rec.id);
        return json(200, { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `rt-${rec.id}`, user: { id: rec.id, aud: 'authenticated', role: 'authenticated', email: body.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } });
      }
      if (p === '/auth/v1/logout') { byToken.delete(auth); return route.fulfill({ status: 204, headers: cors }); }
      if (p === '/auth/v1/signup') {
        const body = JSON.parse(req.postData() || '{}');
        // resposta IDENTICA para e-mail novo e ja cadastrado (anti-enumeracao): o servidor real faz o mesmo com confirmacao ligada
        return json(200, { id: 'x', aud: 'authenticated', email: body.email, identities: users.has(body.email) ? [] : [{ id: 'i' }] });
      }
      if (p === '/auth/v1/recover') return json(200, {});
      if (p === '/auth/v1/user') return uid ? json(200, { id: uid }) : json(401, { msg: 'no' });
      if (p === '/rest/v1/faro_state') return json(200, uid && states.has(uid) ? [{ ...states.get(uid) }] : []);
      if (p === '/rest/v1/faro_subscriptions') return json(200, uid && subs.has(uid) ? [subs.get(uid)] : []);
      if (p === '/rest/v1/faro_profiles') return route.fulfill({ status: 201, headers: cors, body: '' });
      if (p === '/rest/v1/rpc/faro_save_state') {
        if (!uid) return json(401, { code: '28000', message: 'not_authenticated' });
        const a = JSON.parse(req.postData() || '{}'); const cur = states.get(uid); const exp = a.p_expected_revision;
        const ok = r => json(200, { ok: true, revision: r.revision, server_updated_at: new Date().toISOString() });
        if (!cur && exp === 0) { const r = { schema_version: 2, revision: 1, state: a.p_state, device_id: a.p_device_id, last_mutation_id: a.p_mutation_id, server_updated_at: new Date().toISOString() }; states.set(uid, r); return ok(r); }
        if (cur && cur.revision === exp) { const r = { ...cur, revision: exp + 1, state: a.p_state, device_id: a.p_device_id, last_mutation_id: a.p_mutation_id }; states.set(uid, r); return ok(r); }
        return json(200, { ok: false, conflict: true, revision: cur?.revision || 0, state: cur?.state || null, server_updated_at: new Date().toISOString(), device_id: cur?.device_id });
      }
      return json(404, { message: 'fake: rota desconhecida' });
    },
  };
  return api;
}

// Pagina de ataque: coleta violacoes de CSP e execucao de payload; bloqueia TUDO que nao seja o app, a origem do atacante ou o Supabase falso.
export async function attackPage(context, { site, evil, fake, blocked = [], sw = false }) {
  await context.addInitScript(keepSw => {
    window.__viol = []; window.__pwned = undefined;
    document.addEventListener('securitypolicyviolation', e => window.__viol.push(`${e.violatedDirective} ${e.blockedURI}`));
    if (!keepSw) delete Object.getPrototypeOf(navigator).serviceWorker; // o SW tem teste proprio (seguranca-sw-estado)
  }, sw);
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === SUPABASE_HOST) return fake ? fake.handle(route) : (blocked.push(`supabase:${u.pathname}`), route.abort('blockedbyclient'));
    if (u.origin === site.origin || (evil && u.origin === evil.url)) return route.continue();
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    blocked.push(route.request().url()); return route.abort('blockedbyclient'); // nunca sai para a internet real
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('dialog', d => d.accept());
  return { page, errors, blocked };
}

export const flush = page => page.waitForTimeout(700);
export const readState = page => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)).state; } catch { return null; } }, STATE_KEY);
export const bodyText = page => page.evaluate(() => document.body.innerText);
export const seedBlob = (state, rev = 1) => JSON.stringify({ v: 2, rev, dirty: false, savedAt: Date.now(), state });
