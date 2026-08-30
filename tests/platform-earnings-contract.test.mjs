import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

let helperSource = '';
try { helperSource = await readFile('faro-register-earnings.js', 'utf8'); } catch {}
assert.ok(helperSource, 'helper faro-register-earnings.js precisa existir');

const sandbox = { window: {} };
vm.runInNewContext(helperSource, sandbox);
const api = sandbox.window.FaroRegisterEarnings;
assert.ok(api, 'helper precisa expor window.FaroRegisterEarnings');
assert.deepEqual(JSON.parse(JSON.stringify(api.normalize({ uber:'180,50', ninetyNine:'120', indrive:'', extras:'40' }))), {
  uber: 180.5,
  ninetyNine: 120,
  indrive: 0,
  extras: 40
});
assert.equal(api.total({ uber:180, ninetyNine:120, indrive:70, extras:40 }), 410);
assert.equal(api.hasAny({ uber:0, ninetyNine:0, indrive:0, extras:0 }), false);
assert.equal(api.hasAny({ uber:0, ninetyNine:1, indrive:0, extras:0 }), true);
assert.throws(() => api.normalize({ uber:-1 }), /negativo/i);

const expectedAssets = new Map([
  ['assets/platforms/faro-platform-99.svg', 'd10212afb5788d77f617dcea0efcb85145c42dfca4641c0d8cf04dbc44b5e51b'],
  ['assets/platforms/faro-platform-indrive.svg', '9d045ddec23b41327e27e0d056469b3596279976bc3b0fb6b8e24198889c2794'],
  ['assets/platforms/faro-platform-uber.svg', 'e1b09c8e1a04c3acbd508dc27cf6e248e62895dde72f03332529720245df9329']
]);

for (const [path, wanted] of expectedAssets) {
  let svg = '';
  try { svg = await readFile(path, 'utf8'); } catch {}
  assert.ok(svg, `${path} precisa existir`);
  assert.equal(createHash('sha256').update(svg).digest('hex'), wanted, `${path} precisa preservar o asset aprovado byte a byte`);
  assert.doesNotMatch(svg, /<image\b|data:image|base64/i, `${path} não pode embutir bitmap`);
  assert.match(svg, /<svg\b[^>]*viewBox=/i, `${path} precisa ter viewBox vetorial`);
}

const build = await readFile('scripts/build-static-site.mjs', 'utf8');
assert.match(build, /'faro-register-earnings\.js'/, 'build precisa copiar o helper de ganhos por origem');
for (const path of expectedAssets.keys()) {
  assert.equal(build.includes(`'${path}'`), true, `build precisa copiar ${path}`);
}

const register = await readFile('faro-register.js', 'utf8');
assert.match(register, /De onde veio seu faturamento\?/, 'Registrar precisa explicar a origem dos ganhos');
assert.match(register, /faro-platform-uber\.svg/, 'Uber precisa usar o asset aprovado');
assert.match(register, /faro-platform-99\.svg/, '99 precisa usar o asset aprovado');
assert.match(register, /faro-platform-indrive\.svg/, 'inDrive precisa usar o asset aprovado');
assert.match(register, /Extras\/Outros/, 'Registrar precisa oferecer ganhos extras');
assert.match(register, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'Origens precisam usar grade mobile 2x2');
assert.match(register, /Total do dia/, 'Total automático precisa ser explícito');
assert.match(register, /Detalhar por aplicativo/, 'Registro legado precisa permitir optar pelo detalhamento');
assert.match(register, /faro-action-card/, 'Cada origem precisa consumir a anatomia premium de Action Card');
assert.match(register, /faro-state-card/, 'Total precisa consumir a anatomia premium de State Card');
assert.match(register, /data-faro-platform-state/, 'Cada plataforma precisa expor estado humano no card');
assert.match(register, /Não usado/, 'Plataforma sem valor precisa dizer que não foi usada');
assert.match(register, /activeSources\.has\(key\)\s*\?\s*activeSources\.delete\(key\)\s*:\s*activeSources\.add\(key\)/,
  'Tocar novamente deve recolher o campo sem apagar o valor');
assert.match(register, /const baseRecordDraft = app\.recordDraft/, 'Integração precisa estender o draft canônico existente');
assert.match(register, /earningsBySource/, 'Draft detalhado precisa carregar breakdown de origem');
assert.match(register, /FaroRegisterEarnings\.total|earningsApi\.total/, 'gross detalhado precisa vir da soma canônica das origens');
assert.doesNotMatch(register, /state\.records\.(push|splice)/, 'Camada FARO não pode criar segundo writer de registros');
assert.doesNotMatch(register, /dailyGross\s*=|dailyNet\s*=/, 'Feature não pode criar motor financeiro paralelo');

console.log('platform-earnings-contract: helper, assets, build, anatomia premium e integração canônica de Registrar — ok');
