import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildCsp, buildHeadersFile, buildRedirectsFile, inlineScriptHashes } from '../scripts/csp.mjs';

const read = path => readFile(path, 'utf8');
const vercel = JSON.parse(await read('vercel.json'));
const config = await read('faro-config.js');
const build = await read('scripts/build-static-site.mjs');
const pkg = JSON.parse(await read('package.json'));
const supabaseHost = config.match(/supabaseUrl: 'https:\/\/([^']+)'/)[1];

const csp = buildCsp();
const directives = Object.fromEntries(csp.split(/;\s*/).filter(Boolean).map(part => {
  const [name, ...values] = part.split(' ');
  return [name, values];
}));

// CSP: scripts só do próprio domínio + hashes dos 3 inline conhecidos; nunca unsafe-eval.
assert.deepEqual(directives['default-src'], ["'self'"]);
assert.ok(directives['script-src'].includes("'self'"));
assert.equal(directives['script-src'].filter(v => v.startsWith("'sha256-")).length, 3, 'index + app-shell + bootstrap');
assert.ok(!directives['script-src'].includes("'unsafe-inline'"), 'sem unsafe-inline em script-src');
assert.ok(!csp.includes('unsafe-eval'));
assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
assert.deepEqual(directives['object-src'], ["'none'"]);
assert.deepEqual(directives['base-uri'], ["'self'"]);
assert.deepEqual(directives['form-action'], ["'self'"]);
assert.deepEqual(directives['worker-src'], ["'self'"]);
assert.deepEqual(directives['manifest-src'], ["'self'"]);
assert.deepEqual(directives['font-src'], ["'self'"]);
assert.ok(directives['img-src'].includes('data:') && directives['img-src'].includes('blob:'));
assert.ok(directives['connect-src'].includes(`https://${supabaseHost}`) && directives['connect-src'].includes(`wss://${supabaseHost}`));
assert.ok(!/https?:\/\/(cdn|fonts)/.test(csp), 'CSP não libera mais nenhuma CDN');
// style-src precisa de unsafe-inline (módulos faro-* injetam <style> e há style="" no legado): decisão documentada.
assert.ok(directives['style-src'].includes("'unsafe-inline'"));
assert.ok(directives['upgrade-insecure-requests']);

// Hashes batem com o conteúdo real dos scripts inline.
const hashes = await inlineScriptHashes();
assert.equal(hashes.length, 3);
for (const hash of hashes) assert.match(hash, /^'sha256-[A-Za-z0-9+/]{43}='$/);

// vercel.json: mesma política, HSTS, anti-frame, cache correto.
const rules = new Map(vercel.headers.map(rule => [rule.source, new Map(rule.headers.map(h => [h.key, h.value]))]));
const all = rules.get('/(.*)');
assert.equal(all.get('Content-Security-Policy'), csp, 'vercel.json fora de sincronia: rode npm run headers:sync');
assert.match(all.get('Strict-Transport-Security'), /^max-age=\d{8,}; includeSubDomains; preload$/);
assert.equal(all.get('X-Frame-Options'), 'DENY');
assert.equal(all.get('Cross-Origin-Opener-Policy'), 'same-origin');
assert.equal(all.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(self)');
assert.ok(!all.has('Cache-Control'), 'regra global não pode misturar Cache-Control');
assert.equal(rules.get('/sw.js').get('Cache-Control'), 'no-cache, no-store, must-revalidate');
assert.equal(rules.get('/manifest.webmanifest').get('Cache-Control'), 'no-cache, no-store, must-revalidate');
const immutable = 'public, max-age=31536000, immutable';
for (const source of ['/vendor/fonts/(.*)', '/vendor/fontawesome-6.4.0/(.*)', '/vendor/chart-4.5.1.umd.min.js', '/vendor/supabase-js-2.112.3.mjs']) {
  assert.equal(rules.get(source)?.get('Cache-Control'), immutable, `${source} versionado deve ser immutable`);
}
assert.ok(!rules.has('/vendor/tailwind.css') || !rules.get('/vendor/tailwind.css').get('Cache-Control')?.includes('immutable'), 'CSS regenerável não é immutable');
assert.equal(pkg.scripts['headers:sync'], 'node scripts/sync-vercel-headers.mjs');

// Cloudflare Pages: _headers e _redirects gerados pelo build.
const headersFile = buildHeadersFile();
assert.match(headersFile, /^\/\*\n {2}Content-Security-Policy: /m);
assert.ok(headersFile.includes(`Content-Security-Policy: ${csp}`));
assert.match(headersFile, /Strict-Transport-Security: max-age=63072000; includeSubDomains; preload/);
assert.match(headersFile, /X-Frame-Options: DENY/);
assert.match(headersFile, /^\/sw\.js\n(?: {2}.+\n)*? {2}Cache-Control: no-cache, no-store, must-revalidate/m);
assert.match(headersFile, /^\/vendor\/fonts\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/m);
const globalBlock = headersFile.split(/\n(?=\/)/).find(block => block.startsWith('/*\n'));
assert.ok(!/Cache-Control/.test(globalBlock), 'Cloudflare concatena headers de regras sobrepostas: Cache-Control só em blocos específicos');
assert.equal(buildRedirectsFile().trim(), '/*  /index.html  200');
assert.match(build, /\.\/csp\.mjs/);
assert.match(build, /_headers/);
assert.match(build, /_redirects/);

console.log('FARO segurança de front: CSP com hashes, HSTS, anti-frame, cache correto e _headers/_redirects Cloudflare — ok');
