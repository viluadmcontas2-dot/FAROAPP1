import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile('faro-home-r2.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
const invariants = await readFile('faro-planning-invariants.js', 'utf8');
const onboarding = await readFile('faro-onboarding.js', 'utf8');
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

// HF2 — Semana é uma projeção operacional em bruto, mas sem criar um segundo motor financeiro.
assert.match(invariants, /const baseWeekContext = app\.weekContext/,
  'Semântica semanal deve estender o contexto existente, não criar outro state owner');
assert.match(invariants, /actualGross \+ c\.dailyGross \* remainingDays/,
  'Bruto semanal precisa derivar do dailyGross canônico já recalculado');
assert.match(invariants, /actualNet \+ c\.dailyNet \* remainingDays/,
  'Líquido-alvo da semana precisa derivar do dailyNet canônico');
assert.match(invariants, /target:\s*targetGross[\s\S]*actual:\s*actualGross/,
  'Consumidores legados de week.target/week.actual devem passar a receber bruto de forma consistente');
assert.match(invariants, /targetNet[\s\S]*actualNet[\s\S]*remainingGross/,
  'View model semanal deve preservar também a consequência líquida e o restante bruto');
assert.doesNotMatch(invariants, /contributionKm|fuelCostKm\(|monthlyFixed\s*[+*/-]/,
  'Camada semanal não pode duplicar a fórmula financeira do motor');
assert.match(home, /Bruto necessário/);
assert.match(home, /Bruto realizado/);
assert.match(home, /bruto para buscar[\s\S]*líquido/,
  'Home precisa explicar a relação bruto necessário → líquido buscado');
assert.match(invariants, /Bruto necessário\/semana/,
  'Resultado do onboarding deve rotular explicitamente o valor semanal como bruto');
assert.match(onboarding, /id="faroPlanWeek"/);

// Home → Planejar converge para a mesma primary view e a atenção financeira cai no Money cockpit.
assert.match(home, /legacyPlanningCta\?\.remove\(\)/);
assert.match(home, /navigateToPrimary\('planning'\)/);
assert.match(home, /aria-label', 'Ver ou ajustar meta do mês'/);
assert.match(home, /event\.key !== 'Enter' && event\.key !== ' '/);
assert.match(home, /openSecondary\('planning-costs'\)/, 'Listener legado permanece caracterizado para o roteador R3 capturar');
assert.match(routing, /const openMoneyFrom = opener => \{[\s\S]*navigateToPrimary\('planning'\)[\s\S]*FaroPlanning\?\.openMoney/);
assert.match(routing, /const homeAttention = document\.getElementById\('faroHomeAttention'\)[\s\S]*stopImmediatePropagation\(\)[\s\S]*openMoneyFrom\(homeAttention\)/);

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

console.log('FARO HF2: Home e onboarding mostram bruto semanal necessário derivado do motor canônico — ok');
