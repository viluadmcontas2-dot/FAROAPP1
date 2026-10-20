import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

assert.ok(existsSync('scripts/qa-ui-browser.cjs'), 'O script de QA deve existir');
const help = spawnSync(process.execPath, ['scripts/qa-ui-browser.cjs', '--help'], {
  encoding: 'utf8', timeout: 5000, env: { ...process.env, FARO_CHROME_BIN: '/nao-existe' }
});
assert.equal(help.status, 0, help.stderr || help.error?.message);
assert.match(help.stdout, /Uso:.*qa-ui-browser/);
assert.equal(JSON.parse(readFileSync('package.json')).scripts['qa:ui'], 'node scripts/qa-ui-browser.cjs');
console.log('PASS contrato QA UI: arquivo, --help sem navegador e script npm');
