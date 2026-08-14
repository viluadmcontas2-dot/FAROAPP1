import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const finance = await readFile('faro-finance.js', 'utf8');
const home = await readFile('faro-home.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(shell, /faro-finance\.js\?v=1/);
assert.match(sw, /faro-finance\.js\?v=1/);
assert.match(build, /'faro-finance\.js'/);
assert.match(finance, /paymentOccurrences/);
assert.match(finance, /paymentTrackingStartedAt/);
assert.match(finance, /occurrenceId/);
assert.match(finance, /dueWeekday/);
assert.match(finance, /dueDay/);
assert.match(finance, /status: 'paid'/);
assert.match(finance, /costName: occurrence\.cost\.name/);
assert.match(finance, /kindSnapshot: occurrence\.cost\.kind/);
assert.match(finance, /MARCAR PAGO/);
assert.match(finance, /DESFAZER/);
assert.match(finance, /Marcar pago não remove o custo dos próximos períodos/);
assert.match(finance, /faroPlanDailyGross/);
assert.match(finance, /app\.calculations\(\)/);
assert.doesNotMatch(finance, /cost\.active\s*=\s*false|\.active\s*=\s*false/, 'Marcar pago não pode desativar regra recorrente');
assert.doesNotMatch(finance, /dailyGross\s*=|dailyKm\s*=|contributionKm\s*=/, 'B6 UX não deve criar motor financeiro paralelo');
assert.match(home, /FaroFinance\?\.nextPendingOccurrence/);

console.log('FARO: recorrência, ocorrência, pago/desfazer e Planejar usam a fonte financeira existente — ok');
