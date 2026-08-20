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

// Regressão física 20/08/2026 — o mesmo card não pode misturar o mês inteiro
// (26 dias seg–sáb) com uma meta diária calculada só sobre os 10 dias restantes.
assert.match(invariants, /const baseMonthContext = app\.monthContext/,
  'Janela do primeiro mês deve estender o monthContext canônico, não duplicar o motor financeiro');
assert.match(invariants, /onboardingProfile\?\.configuredAt/,
  'Primeiro mês precisa conhecer quando o plano começou');
assert.match(invariants, /selectedDates\.filter\(date => date >= startKey\)/,
  'Dias anteriores ao início real do plano não podem continuar no denominador visível');
assert.match(invariants, /Dias restantes no plano/,
  'Detalhe deve dizer que o denominador é a janela restante, não o mês inteiro');
assert.match(invariants, /Custo variável\/km/,
  'Resumo precisa mostrar o custo variável realmente usado no cálculo');
assert.match(invariants, /c\.fuelKm \+ c\.costs\.perKm \+ app\.state\.revenueKm \* c\.costs\.percent/,
  'Custo variável/km deve ser apenas uma leitura dos componentes canônicos já calculados');

// Falsificador independente do snapshot visível na captura física.
const targetNet = 4000;
const fixed = 650;
const revenueKm = 2.25;
const fuelKm = 0.59;
const reservePerKm = 0.18;
const remainingPlanDays = 10;
const contributionKm = revenueKm - fuelKm - reservePerKm;
const requiredKm = (targetNet + fixed) / contributionKm;
const dailyKm = requiredKm / remainingPlanDays;
const dailyGross = dailyKm * revenueKm;
assert.ok(Math.abs(dailyKm - 314.19) < 0.1, 'Snapshot deve explicar ~314 km/dia quando restam 10 dias');
assert.ok(Math.abs(dailyGross - 706.93) < 0.1, 'Snapshot deve explicar ~R$707/dia sem esconder o denominador');

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

console.log('FARO HF2: bruto semanal e primeiro mês usam uma janela temporal visível e reconciliável — ok');
