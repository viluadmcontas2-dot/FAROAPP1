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

assert.match(appShell, /faro-brand-r2\.js\?v=1/);
assert.match(appShell, /faro-home-r2\.js\?v=1/);
assert.match(appShell, /faro-interactions\.js\?v=2/);
assert.match(appShell, /faro-planning\.js\?v=2/);
assert.match(appShell, /faro-planning-invariants\.js\?v=1/);
assert.match(appShell, /faro-r3b\.js\?v=1/);
assert.match(appShell, /faro-r3-routing\.js\?v=1/);
assert.doesNotMatch(appShell, /faro-brand\.js\?v=2/);
assert.doesNotMatch(appShell, /faro-home\.js\?v=1/);
assert.match(r3b, /root\.insertBefore\(hero, firstGrid\)/, 'R3-B precisa tornar o planejamento o primeiro protagonista sem criar outro owner');
assert.doesNotMatch(r3b, /app\.state\.[A-Za-z0-9_]+\s*=/, 'Camada visual R3-B não pode virar writer');

console.log('FARO UX-R3-B: Planejar mantém owner único e recebe identity pass pós-invariantes — ok');
