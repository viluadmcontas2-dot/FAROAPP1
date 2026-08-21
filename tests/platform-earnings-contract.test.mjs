import assert from 'node:assert/strict';
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

console.log('platform-earnings-contract: normalização e soma canônica — ok');
