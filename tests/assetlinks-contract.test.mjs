// Contrato Play Store (TWA): assetlinks.json válido, copiado no build e servido como JSON.
// Aceita o placeholder do SHA-256; com FARO_REQUIRE_REAL_ASSETLINKS=1 exige o SHA real.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const PACKAGE = 'br.com.faro.motorista';
const strict = process.env.FARO_REQUIRE_REAL_ASSETLINKS === '1';

execFileSync(process.execPath, ['scripts/build-static-site.mjs'], { stdio: 'pipe' });
const source = await readFile('.well-known/assetlinks.json', 'utf8');
const built = await readFile('_site/.well-known/assetlinks.json', 'utf8');
assert.equal(built, source, 'o build precisa copiar assetlinks.json sem alterar');

const links = JSON.parse(source);
assert.ok(Array.isArray(links) && links.length >= 1, 'assetlinks.json deve ser uma lista não vazia');
for (const item of links) {
  assert.deepEqual(item.relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(item.target.namespace, 'android_app');
  assert.equal(item.target.package_name, PACKAGE);
  const prints = item.target.sha256_cert_fingerprints;
  assert.ok(Array.isArray(prints) && prints.length >= 1, 'precisa de ao menos 1 SHA-256');
  for (const p of prints) {
    const real = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(p);
    const placeholder = /^PREENCHER_/.test(p);
    assert.ok(real || placeholder, `SHA-256 inválido: ${p}`);
    if (strict) assert.ok(real, 'FARO_REQUIRE_REAL_ASSETLINKS=1: ainda há SHA-256 placeholder');
  }
}

const headers = await readFile('_site/_headers', 'utf8');
const block = headers.split('\n').reduce((acc, l) => {
  if (l.trim() && !/^\s/.test(l)) acc.cur = l.trim();
  else if (acc.cur === '/.well-known/assetlinks.json') acc.lines.push(l.trim());
  return acc;
}, { cur: null, lines: [] }).lines;
assert.ok(block.some(l => /^Content-Type:\s*application\/json/i.test(l)), 'header Content-Type JSON para assetlinks (_headers)');
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const v = vercel.headers.find(h => h.source === '/.well-known/assetlinks.json');
assert.ok(v && v.headers.some(h => /content-type/i.test(h.key) && /application\/json/.test(h.value)), 'header Content-Type JSON para assetlinks (vercel.json)');

const twa = JSON.parse(await readFile('twa-manifest.json', 'utf8'));
assert.equal(twa.packageId, PACKAGE);
assert.ok(!JSON.stringify(twa).match(/password|storePassword|keyPassword/i), 'sem senhas no twa-manifest');
console.log('assetlinks contract ok' + (strict ? ' (estrito)' : ' (placeholder aceito)'));
