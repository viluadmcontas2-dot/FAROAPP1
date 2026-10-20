// Fonte única dos cabeçalhos de segurança/cache: alimenta vercel.json (via headers:sync) e _headers (Cloudflare Pages, gerado no build).
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const sha256 = text => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

// Scripts inline conhecidos (CSP por hash, sem 'unsafe-inline' em script-src):
// 1) index.html (redirect), 2) app-shell.html (carrega o shell legado), 3) bootstrap injetado por app-shell.html no document.write.
export async function inlineScriptHashes() {
  const index = await readFile('index.html', 'utf8');
  const shell = await readFile('app-shell.html', 'utf8');
  const inline = source => [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const [indexScript] = inline(index);
  const [shellScript] = inline(shell);
  const literal = shell.match(/const bootstrap = `([\s\S]*?)`;/)[1];
  // O texto real injetado é o do template literal já avaliado (ex.: <\/script> vira </script>).
  const evaluated = new Function(`return \`${literal}\`;`)();
  const bootstrapScript = inline(evaluated)[0];
  return [indexScript, shellScript, bootstrapScript].map(sha256);
}

async function supabaseHost() {
  const config = await readFile('faro-config.js', 'utf8');
  return config.match(/supabaseUrl: 'https:\/\/([^']+)'/)[1];
}

let hashCache = null;
let hostCache = null;
export function prime(hashes, host) { hashCache = hashes; hostCache = host; }

// buildCsp é síncrona para uso fácil em testes; chame `await loadCspInputs()` antes (os testes importam já pronto).
export function buildCsp() {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashCache.join(' ')}`,
    // 'unsafe-inline' só em estilos: módulos faro-* injetam <style> e o shell legado usa style="". Sem execução de código.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' https://${hostCache} wss://${hostCache}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests'
  ].join('; ');
}

export async function loadCspInputs() { prime(await inlineScriptHashes(), await supabaseHost()); }
await loadCspInputs();

const NO_STORE = 'no-cache, no-store, must-revalidate';
const REVALIDATE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';

// Cada regra: caminho no Vercel, caminho no Cloudflare Pages e cabeçalhos. Cache-Control NUNCA vai na regra global
// (Cloudflare soma os valores de regras sobrepostas).
export function headerRules() {
  return [
    { vercel: '/sw.js', cf: '/sw.js', headers: { 'Cache-Control': NO_STORE, 'Service-Worker-Allowed': '/' } },
    { vercel: '/manifest.webmanifest', cf: '/manifest.webmanifest', headers: { 'Cache-Control': NO_STORE, 'Content-Type': 'application/manifest+json; charset=utf-8' } },
    { vercel: '/.well-known/assetlinks.json', cf: '/.well-known/assetlinks.json', headers: { 'Cache-Control': 'public, max-age=3600', 'Content-Type': 'application/json; charset=utf-8' } },
    { vercel: '/index.html', cf: '/index.html', headers: { 'Cache-Control': NO_STORE } },
    { vercel: '/app-shell.html', cf: '/app-shell.html', headers: { 'Cache-Control': REVALIDATE } },
    { vercel: '/legacy-shell.html', cf: '/legacy-shell.html', headers: { 'Cache-Control': REVALIDATE } },
    { vercel: '/offline.html', cf: '/offline.html', headers: { 'Cache-Control': REVALIDATE } },
    // Só o que tem versão no caminho é immutable; vendor/tailwind.css é regenerável e fica de fora.
    { vercel: '/vendor/fonts/(.*)', cf: '/vendor/fonts/*', headers: { 'Cache-Control': IMMUTABLE } },
    { vercel: '/vendor/fontawesome-6.4.0/(.*)', cf: '/vendor/fontawesome-6.4.0/*', headers: { 'Cache-Control': IMMUTABLE } },
    { vercel: '/vendor/chart-4.5.1.umd.min.js', cf: '/vendor/chart-4.5.1.umd.min.js', headers: { 'Cache-Control': IMMUTABLE } },
    { vercel: '/vendor/supabase-js-2.112.3.mjs', cf: '/vendor/supabase-js-2.112.3.mjs', headers: { 'Cache-Control': IMMUTABLE } }
  ];
}

export function globalHeaders() {
  return {
    'Content-Security-Policy': buildCsp(),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
}

export function buildVercelHeaders() {
  const toList = headers => Object.entries(headers).map(([key, value]) => ({ key, value }));
  return [
    ...headerRules().map(rule => ({ source: rule.vercel, headers: toList(rule.headers) })),
    { source: '/(.*)', headers: toList(globalHeaders()) }
  ];
}

export function buildHeadersFile() {
  const block = (path, headers) => `${path}\n${Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
  return [block('/*', globalHeaders()), ...headerRules().map(rule => block(rule.cf, rule.headers))].join('\n');
}

export function buildRedirectsFile() {
  // Mesmo comportamento do rewrite do Vercel: qualquer rota cai no index.html (200, não redireciona).
  return '/*  /index.html  200\n';
}
