import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const navigation = await readFile('faro-navigation.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
const home = await readFile('faro-home-r2.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');
const sw = await readFile('sw.js', 'utf8');

// R2: a barra nasce legada como settings, mas Planejar assume o nó antes da navegação operar.
assert.match(planning, /dataset\.view = 'planning'/);
assert.match(planning, /setAttribute\('aria-label', 'Planejar'\)/);
assert.match(shell, /faro-planning\.js\?v=1[\s\S]*faro-navigation\.js\?v=1/);
assert.match(home, /navigateToPrimary\('planning'\)/);
assert.match(planning, /openSubview\('planning-costs'\)/);
assert.doesNotMatch(home, /navigateToPrimary\('settings'\)|openSecondary\('settings'\)/);

// Não cria segundo router: continua consumindo navigateToPrimary/openSecondary/navigateBack do app.js.
assert.doesNotMatch(planning, /app\.navigateToPrimary\s*=|app\.openSecondary\s*=|app\.navigateBack\s*=/);
assert.match(planning, /app\.openSecondary\(view\)/);
assert.match(planning, /app\.navigateBack\(\)/);

// Voltar/popstate continuam no router existente e estado inválido cai em Início.
assert.match(navigation, /const baseRestoreNavigation = app\.restoreNavigation/);
assert.match(navigation, /document\.getElementById\(`view-\$\{requestedView\}`\)/);
assert.match(navigation, /document\.getElementById\(`view-\$\{requestedPrimary\}`\)/);
assert.match(navigation, /if \(!viewExists \|\| !primaryExists\) \{[\s\S]*view:'dashboard', primaryView:'dashboard'[\s\S]*history\.replaceState\(safe[\s\S]*this\.showView\('dashboard', 'dashboard'\)/);
assert.match(navigation, /return baseRestoreNavigation\.call\(this, state\)/);

// Histórico continua sob demanda e usa o registro real.
assert.match(navigation, /const baseRenderHistory = app\.renderHistory/);
assert.match(navigation, /if \(this\.currentView !== 'history'\) return/);
assert.match(navigation, /app\.state\.records/);
assert.match(navigation, /recordNumbers\(record, app\.monthContext/);
assert.match(navigation, /openSecondary\('day'\)/);
assert.match(navigation, /currentPrimaryView === 'history'/);
assert.match(navigation, /row\.tabIndex = 0/);
assert.match(navigation, /setAttribute\('role', 'button'\)/);

// Radar e reset permanecem isolados.
assert.match(navigation, /dataset\.faroDeferred = 'radar'/);
assert.match(navigation, /eventCard\.classList\.add\('hidden'\)/);
assert.match(navigation, /id = 'faroSafetyZone'/);
assert.match(navigation, /this\.state\.targetProfit = fresh\.targetProfit/);
assert.doesNotMatch(navigation, /paymentOccurrences\s*=|reserveContributions\s*=|records\s*=/);

assert.match(shell, /faro-navigation\.js\?v=1/);
assert.match(build, /'faro-navigation\.js'/);
assert.match(sw, /faro-navigation\.js\?v=1/);

console.log('FARO UX-R2: Planejar é destino único e continua usando o router canônico com retorno seguro — ok');
