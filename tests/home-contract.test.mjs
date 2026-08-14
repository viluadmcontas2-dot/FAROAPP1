import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile('faro-home.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(shell, /faro-home\.js\?v=1/);
assert.match(sw, /faro-home\.js\?v=1/);
assert.match(build, /'faro-home\.js'/);
assert.match(home, /insertBefore\(weekCard, monthCard\)/);
assert.match(home, /Hoje já está registrado/);
assert.match(home, /Registrar meu dia/);
assert.match(home, /nextCommitment/);
assert.match(home, /item\.days > 3/);
assert.match(home, /Próximo compromisso/);
assert.match(home, /week\.target - week\.actual/);
assert.match(home, /plannedWeekRemaining/);
assert.match(home, /window\.FaroHome/);
assert.doesNotMatch(home, /pendente|atrasado|vencido/i, 'B4 não pode inventar status de pagamento antes de B6');

console.log('FARO: Home organizada em Hoje, Semana e Mês sem inventar pagamento — ok');
