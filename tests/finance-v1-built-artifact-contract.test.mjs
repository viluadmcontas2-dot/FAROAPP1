import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');
const copyBlock = build.match(/const copyFiles = \[([\s\S]*?)\];/);
assert.ok(copyBlock, 'Build precisa declarar copyFiles para auditoria do artefato');
const copiedPaths = [...copyBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1]);

for (const path of copiedPaths) {
  const source = await readFile(path);
  const built = await readFile(`_site/${path}`);
  if (path === 'app.js') {
    const expected = source.toString('utf8').replace(
      "const STORAGE_KEY = 'vetta-driver-intelligence-v3';",
      "const STORAGE_KEY = 'faro-app-finance-v1';"
    );
    assert.equal(built.toString('utf8'), expected,
      'app.js construído só pode divergir pela transformação explícita da STORAGE_KEY FARO');
    continue;
  }
  assert.deepEqual(built, source, `_site/${path} precisa ser byte-a-byte igual ao source governado`);
}

const baseline = JSON.parse(await readFile('_site/.well-known/faro-baseline.json', 'utf8'));
assert.equal(baseline.name, 'FARO');
assert.equal(baseline.tagline, 'APP DO MOTORISTA!');
assert.equal(typeof baseline.branch, 'string');
assert.ok(Object.hasOwn(baseline, 'commit'), 'Baseline construído precisa carregar o campo commit');

console.log('FARO_FINANCE_V1 N4: _site reproduz source governado e transformação explícita do app.js — ok');
