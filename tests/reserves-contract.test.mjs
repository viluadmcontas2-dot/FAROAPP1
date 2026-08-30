import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const reserves = await readFile('faro-reserves.js','utf8');
const shell = await readFile('app-shell.html','utf8');
const sw = await readFile('sw.js','utf8');
const build = await readFile('scripts/build-static-site.mjs','utf8');

assert.match(shell,/faro-reserves\.js\?v=1/);
assert.match(sw,/faro-reserves\.js\?v=1/);
assert.match(build,/'faro-reserves\.js'/);
assert.match(reserves,/reserveContributions/);
assert.match(reserves,/reserveProfiles/);
assert.match(reserves,/balanceFor/);
assert.match(reserves,/Quanto você guardou de verdade\?/);
assert.match(reserves,/R\$.*realmente guardados|Dinheiro que você realmente separou/);
assert.match(reserves,/goalAmount/);
assert.match(reserves,/targetDate/);
assert.match(reserves,/SALVAR APORTE/);
assert.match(reserves,/Aporte removido\. O planejamento da reserva continua igual/);
assert.match(reserves,/app\.openCostModal\(\)/);
assert.match(reserves,/applyCostTemplate\?\.\('reserve'\)/);
assert.doesNotMatch(reserves,/state\.targetProfit\s*=|state\.costs\.push\(/,'Aporte real não pode aumentar a meta ou duplicar regra financeira');

console.log('FARO: reserva planejada e dinheiro realmente guardado permanecem conceitos separados — ok');
