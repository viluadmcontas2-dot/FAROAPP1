import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const finance = await readFile('faro-finance.js', 'utf8');
const onboarding = await readFile('faro-onboarding.js', 'utf8');
const home = await readFile('faro-home-r2.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
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

// Onboarding e Planejar continuam com IDs separados.
assert.match(onboarding, /id="faroPlanDailyGross"/);
assert.match(onboarding, /id="faroPlanEnergyKm"/);
assert.doesNotMatch(finance, /id="faroPlanDailyGross"/);
assert.doesNotMatch(finance, /id="faroPlanEnergyKm"/);
assert.match(finance, /id="faroPlanningDailyGross"/);
assert.match(finance, /id="faroPlanningEnergyKm"/);

// Financeiro continua fonte canônica; Planejar só compõe e chama calculations().
assert.match(finance, /app\.calculations\(\)/);
assert.match(planning, /app\.calculations\(\)/);
assert.doesNotMatch(finance, /cost\.active\s*=\s*false|\.active\s*=\s*false/, 'Marcar pago não pode desativar regra recorrente');
assert.doesNotMatch(finance, /dailyGross\s*=|dailyKm\s*=|contributionKm\s*=/, 'Financeiro UX não deve criar motor paralelo');
assert.doesNotMatch(planning, /function\s+calculations|const\s+calculations\s*=|dailyGross\s*=|contributionKm\s*=/, 'Planejar não pode criar fórmula financeira paralela');
assert.match(home, /FaroFinance\?\.nextPendingOccurrence/);
assert.match(planning, /paymentCenter[\s\S]*reserveCenter[\s\S]*costCard/);
assert.match(planning, /openSubview\('planning-costs'\)/);

console.log('FARO UX-R2: recorrência, pagamentos, reservas e previews continuam consumindo o motor financeiro canônico — ok');
