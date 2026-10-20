// Contrato Cloudflare Pages: confere o _headers/_redirects gerados por `npm run build`
// contra os limites oficiais (https://developers.cloudflare.com/pages/configuration/headers/ e /redirects/).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

execFileSync(process.execPath, ['scripts/build-static-site.mjs'], { stdio: 'pipe' });
const headers = await readFile('_site/_headers', 'utf8');
const redirects = await readFile('_site/_redirects', 'utf8');

// _headers: no máximo 100 regras; cada linha com no máximo 2000 caracteres.
const hLines = headers.split('\n');
const rules = hLines.filter(l => l.trim() && !l.startsWith(' ') && !l.startsWith('\t') && !l.startsWith('#'));
assert.ok(rules.length >= 1 && rules.length <= 100, `_headers tem ${rules.length} regras (limite 100)`);
for (const l of hLines) assert.ok(l.length <= 2000, `linha de _headers com ${l.length} caracteres (limite 2000)`);

// Sintaxe: cada regra tem no máximo 1 splat; cabeçalhos são indentados "Nome: valor".
const blocks = new Map();
let cur = null;
for (const l of hLines) {
  if (!l.trim() || l.startsWith('#')) continue;
  if (/^\s/.test(l)) { assert.ok(cur, 'cabeçalho sem regra'); assert.match(l.trim(), /^!?\s?[A-Za-z0-9-]+(:\s.*)?$/, `linha inválida: ${l.slice(0, 60)}`); blocks.get(cur).push(l.trim()); }
  else { cur = l.trim(); assert.ok((cur.match(/\*/g) || []).length <= 1, `mais de um splat em ${cur}`); blocks.set(cur, []); }
}
const has = (rule, re) => (blocks.get(rule) || []).some(h => re.test(h));
assert.ok(has('/sw.js', /^Cache-Control:.*no-cache/i), 'sw.js precisa de no-cache');
assert.ok(has('/manifest.webmanifest', /^Cache-Control:.*no-cache/i), 'manifest precisa de no-cache');
assert.ok(has('/index.html', /^Cache-Control:.*no-cache/i), 'index.html precisa de no-cache');
const vendorRules = [...blocks.keys()].filter(r => r.startsWith('/vendor/'));
assert.ok(vendorRules.length >= 1);
for (const r of vendorRules) assert.ok(has(r, /^Cache-Control:.*max-age=31536000.*immutable/i), `${r} precisa de imutável`);
assert.ok(has('/*', /^Content-Security-Policy:/), 'CSP global');

// _redirects: linhas <= 1000 caracteres, 3 campos, fallback SPA único sem loop.
const rLines = redirects.split('\n').filter(l => l.trim() && !l.startsWith('#'));
assert.ok(rLines.length <= 2100, 'limite combinado de redirects');
for (const l of rLines) { assert.ok(l.length <= 1000, 'linha de _redirects > 1000'); assert.equal(l.trim().split(/\s+/).length, 3, `linha mal formada: ${l}`); }
assert.deepEqual(rLines.map(l => l.trim().split(/\s+/)), [['/*', '/index.html', '200']], 'fallback SPA /* /index.html 200');
// Sem loop: o destino não casa com a origem como redirect (status 200 = reescrita, não 301/302).
assert.ok(!rLines.some(l => /\s30[1278]$/.test(l)), 'sem redirect 3xx que possa fazer loop');

// Documentação de deploy presente.
for (const f of ['docs/deploy/cloudflare-pages.md', 'docs/deploy/supabase-free.md']) {
  const t = await readFile(f, 'utf8');
  assert.ok(t.length > 500, `${f} vazio`);
}
const cf = await readFile('docs/deploy/cloudflare-pages.md', 'utf8');
for (const k of ['npm run build', '_site', 'NODE_VERSION', 'FARO_APP_URL', '.pages.dev']) assert.ok(cf.includes(k), `cloudflare-pages.md sem "${k}"`);

console.log('FARO Cloudflare Pages contract: _headers/_redirects dentro dos limites + docs de deploy — ok');
