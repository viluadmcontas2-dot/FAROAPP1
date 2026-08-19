import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const update = await readFile('faro-update.js', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(update, /app\.showUpdateBanner = function\(\) \{\s*hideLegacyUpdateUi\(\);\s*\}/s);
assert.match(update, /app\.applyUpdate = function\(\) \{[\s\S]*return checkForUpdate\(\{ force: true \}\);[\s\S]*\}/);
assert.match(update, /const CHECK_INTERVAL_MS = 15 \* 60 \* 1000;/);
assert.match(update, /registration\.update\(\)/);
assert.match(update, /visibilitychange[\s\S]*document\.visibilityState === 'visible'[\s\S]*checkForUpdate\(\)/);
assert.match(update, /window\.addEventListener\('online', \(\) => checkForUpdate\(\{ force: true \}\)\)/);
assert.match(update, /window\.addEventListener\('pageshow', \(\) => checkForUpdate\(\)\)/);
assert.match(update, /worker\.postMessage\(\{ type: 'FARO_ACTIVATE_WHEN_SAFE' \}\)/);
assert.doesNotMatch(update, /location\.reload|skipWaiting\s*\(/);

assert.match(sw, /const CORE_CACHE = 'faro-v1-core-16'/, 'UX-R3-B.3 precisa invalidar o cache anterior');
assert.match(sw, /\.\/faro-update\.js\?v=1/);
assert.match(sw, /\.\/faro-interactions\.js\?v=2/);
assert.match(sw, /\.\/faro-planning\.js\?v=2/);
assert.match(sw, /\.\/faro-r3b\.js\?v=1/);
assert.match(sw, /\.\/faro-r3-routing\.js\?v=2/);
assert.match(sw, /\.\/faro-tour\.js\?v=1/);
assert.match(sw, /self\.addEventListener\('message', event => \{\s*if \(event\.data\?\.type === 'FARO_ACTIVATE_WHEN_SAFE'\) self\.skipWaiting\(\);\s*\}\);/s);

const installStart = sw.indexOf("self.addEventListener('install'");
const activateStart = sw.indexOf("self.addEventListener('activate'");
const messageStart = sw.indexOf("self.addEventListener('message'");
assert.ok(installStart >= 0 && activateStart > installStart && messageStart > activateStart);
const installBlock = sw.slice(installStart, activateStart);
const activateBlock = sw.slice(activateStart, messageStart);
assert.doesNotMatch(installBlock, /skipWaiting\s*\(/);
assert.doesNotMatch(activateBlock, /clients\.claim\s*\(/);

assert.match(shell, /faro-update\.js\?v=1/);
assert.match(shell, /faro-interactions\.js\?v=2/);
assert.match(shell, /faro-r3b\.js\?v=1/);
assert.match(shell, /faro-r3-routing\.js\?v=2/);
assert.ok(shell.indexOf('faro-update.js?v=1') < shell.indexOf('faro-state.js?v=1'));
assert.match(build, /'faro-update\.js'/);
assert.match(build, /'faro-r3b\.js'/);

console.log('FARO UX-R3-B.3: atualização silenciosa preservada e cache da navegação atual renovado — ok');