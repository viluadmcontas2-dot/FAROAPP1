import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditPlanningComposition } from './helpers/planning-composition-audit.mjs';

const [shell, appShell, brand, home, planning, navigation, r3b] = await Promise.all([
  readFile('legacy-shell.html', 'utf8'),
  readFile('app-shell.html', 'utf8'),
  readFile('faro-brand-r2.js', 'utf8'),
  readFile('faro-home-r2.js', 'utf8'),
  readFile('faro-planning.js', 'utf8'),
  readFile('faro-navigation.js', 'utf8'),
  readFile('faro-r3b.js', 'utf8')
]);

const violations = auditPlanningComposition({ shell, appShell, brand, home, planning, navigation });

assert.deepEqual(
  violations,
  [],
  `FARO UX-R3-B: composição base de Planejar ainda viola o contrato:\n${violations.map(item => `- ${item.code}: ${item.detail}`).join('\n')}`
);

assert.match(appShell, /faro-brand-r2\.js\?v=3/);
assert.match(appShell, /faro-home-r2\.js\?v=3/);
assert.match(appShell, /faro-interactions\.js\?v=2/);
assert.match(appShell, /faro-planning\.js\?v=2/);
assert.match(appShell, /faro-planning-invariants\.js\?v=1/);
assert.match(appShell, /faro-r3b\.js\?v=1/);
assert.match(appShell, /faro-r3-routing\.js\?v=3/);
assert.doesNotMatch(appShell, /faro-brand\.js\?v=2/);
assert.doesNotMatch(appShell, /faro-home\.js\?v=1/);
assert.match(r3b, /root\.insertBefore\(hero, firstGrid\)/, 'R3-B precisa tornar o planejamento o primeiro protagonista sem criar outro owner');
assert.doesNotMatch(r3b, /app\.state\.[A-Za-z0-9_]+\s*=/, 'Camada visual R3-B não pode virar writer');

// Browser regression: Planning retires the legacy goal card while the inherited
// render() chain still calls renderGoalBalance() after a successful daily save.
assert.match(planning,
  /const baseGoalBalance = app\.renderGoalBalance;[\s\S]*app\.renderGoalBalance = function\(\.\.\.args\)\s*\{[\s\S]*if \(!document\.getElementById\('goalBalancePanel'\)\) return;[\s\S]*return baseGoalBalance\.apply\(this, args\)/,
  'Planejar deve desativar somente o consumidor visual aposentado, sem impedir salvar dias ou recalcular finanças');

// R3B visually replaces the original hero stat nodes. Base planning render
// must resolve both original and restructured IDs after a persisted day save.
assert.match(r3b, /id="faroPlanDays"/);
assert.match(r3b, /id="faroPlanKm"/);
assert.match(planning, /\$\('faroPlanHeroDays'\)\s*\|\|\s*\$\('faroPlanDays'\)/);
assert.match(planning, /\$\('faroPlanHeroKm'\)\s*\|\|\s*\$\('faroPlanKm'\)/);

console.log('FARO UX-R3-B.3: Planejar mantém owner único e carrega routing v3 — ok');
