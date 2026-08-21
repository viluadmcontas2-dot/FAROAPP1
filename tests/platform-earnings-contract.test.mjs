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

const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');
assert.match(build, /'faro-register-earnings\.js'/, 'build precisa copiar o helper de ganhos por origem');
for (const path of expectedAssets.keys()) {
  assert.equal(build.includes(`'${path}'`), true, `build precisa copiar ${path}`);
}

console.log('platform-earnings-contract: normalização, soma canônica, assets e build — ok');
