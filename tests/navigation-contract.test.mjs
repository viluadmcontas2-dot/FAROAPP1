import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const navigation = await readFile('faro-navigation.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');
const sw = await readFile('sw.js', 'utf8');

// Intenções humanas sem criar um segundo router.
assert.match(navigation, /day: 'Registrar'/);
assert.match(navigation, /settings: 'Planejar'/);
assert.match(navigation, /more: 'Central'/);
assert.doesNotMatch(navigation, /navigateToPrimary\s*=|openSecondary\s*=|initializeNavigation\s*=/);
assert.match(navigation, /faroManageCosts[\s\S]*navigateToPrimary\('settings'\)/);

// Histórico continua consumindo o registro real e prioriza lista antes da análise.
assert.match(navigation, /app\.state\.records/);
assert.match(navigation, /recordNumbers\(record, app\.monthContext/);
assert.match(navigation, /insertBefore\(historyListSection, historyChart\)/);
assert.match(navigation, /openSecondary\('day'\)/);
assert.match(navigation, /currentPrimaryView === 'history'/);
assert.match(navigation, /history\.replaceState\(\{ vettaNavigation: true, view: 'history', primaryView: 'history' \}/);
assert.match(navigation, /row\.tabIndex = 0/);
assert.match(navigation, /setAttribute\('role', 'button'\)/);
assert.match(navigation, /event\.key !== 'Enter' && event\.key !== ' '/);

// Radar sai da superfície v1 sem destruir o legado.
assert.match(navigation, /dataset\.faroDeferred = 'radar'/);
assert.match(navigation, /eventCard\.classList\.add\('hidden'\)/);
assert.doesNotMatch(navigation, /state\.events\s*=|state\.events\.splice|delete\s+app\.state\.events/);

// Reset fica isolado e altera apenas parâmetros futuros.
assert.match(navigation, /id = 'faroSafetyZone'/);
assert.match(navigation, /Zona de segurança/);
assert.match(navigation, /more\.appendChild\(safety\)/);
assert.match(navigation, /this\.state\.targetProfit = fresh\.targetProfit/);
assert.match(navigation, /this\.state\.workWeekdays = \[\.\.\.fresh\.workWeekdays\]/);
assert.match(navigation, /this\.state\.fuel = \{ \.\.\.fresh\.fuel \}/);
assert.match(navigation, /Seus dias, custos, pagamentos e reservas serão preservados/);
assert.doesNotMatch(navigation, /this\.state\s*=\s*\{\s*\.\.\.this\.cloneDefaults/);
assert.doesNotMatch(navigation, /paymentOccurrences\s*=|reserveContributions\s*=|records\s*=/);

// O módulo precisa existir na fotografia instalada e no build.
assert.match(shell, /faro-navigation\.js\?v=1/);
assert.match(build, /'faro-navigation\.js'/);
assert.match(sw, /faro-navigation\.js\?v=1/);

console.log('FARO: navegação humana, Histórico acessível, retorno contextual, Reset seguro e Radar fora da superfície v1 — ok');
