import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile('faro-home-r2.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
const routing = await readFile('faro-r3-routing.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(shell, /faro-home-r2\.js\?v=1/);
assert.match(sw, /faro-home-r2\.js\?v=1/);
assert.match(build, /'faro-home-r2\.js'/);
assert.doesNotMatch(shell, /faro-home\.js\?v=1/);
assert.match(home, /insertBefore\(weekCard, monthCard\)/);
assert.match(home, /Hoje já está registrado/);
assert.match(home, /Registrar meu dia/);
assert.match(home, /nextCommitment/);
assert.match(home, /item\.days > 3/);
assert.match(home, /Próximo compromisso/);
assert.match(home, /week\.target-week\.actual|week\.target - week\.actual/);
assert.match(home, /plannedWeekRemaining/);

// Home → Planejar converge para a mesma primary view e a atenção financeira cai no Money cockpit.
assert.match(home, /legacyPlanningCta\?\.remove\(\)/);
assert.match(home, /navigateToPrimary\('planning'\)/);
assert.match(home, /aria-label', 'Ver ou ajustar meta do mês'/);
assert.match(home, /event\.key !== 'Enter' && event\.key !== ' '/);
assert.match(home, /openSecondary\('planning-costs'\)/, 'Listener legado permanece caracterizado para o roteador R3 capturar');
assert.match(routing, /faroHomeAttention[\s\S]*stopImmediatePropagation\(\)[\s\S]*navigateToPrimary\('planning'\)[\s\S]*FaroPlanning\?\.openMoney/);

// Relógio/data e virada de mês não podem deixar a Home presa no período antigo.
assert.match(home, /let calendarKey = app\.todayKey\(\)/);
assert.match(home, /const refreshCalendarIfNeeded = \(\) =>/);
assert.match(home, /visibilitychange/);
assert.match(home, /pageshow/);
assert.match(home, /setInterval\(refreshCalendarIfNeeded,60\*1000\)/);

// O slider deixou de pertencer à Home e continua draft-only dentro do modal R3.
assert.doesNotMatch(home, /targetProfit.*range|optimizeTargetSlider/);
assert.match(planning, /slider\.removeAttribute\('data-model'\)/);
assert.match(planning, /let targetDraft = app\.state\.targetProfit/);
assert.match(planning, /app\.state\.targetProfit = targetDraft;[\s\S]*app\.save\(\)/);
assert.match(planning, /resetTargetDraft/);

assert.match(home, /window\.FaroHome/);

console.log('FARO UX-R3: Home diária converge para Planejar e atenção financeira abre o Money cockpit — ok');
