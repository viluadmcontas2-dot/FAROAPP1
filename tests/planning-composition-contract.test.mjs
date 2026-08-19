import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditPlanningComposition } from './helpers/planning-composition-audit.mjs';

const [shell, appShell, brand, home, navigation] = await Promise.all([
  readFile('legacy-shell.html', 'utf8'),
  readFile('app-shell.html', 'utf8'),
  readFile('faro-brand.js', 'utf8'),
  readFile('faro-home.js', 'utf8'),
  readFile('faro-navigation.js', 'utf8')
]);

const violations = auditPlanningComposition({ shell, appShell, brand, home, navigation });

assert.deepEqual(
  violations,
  [],
  `FARO UX-R2-00: composição de Planejar ainda viola o contrato:\n${violations
    .map(item => `- ${item.code}: ${item.detail}`)
    .join('\n')}`
);

console.log('FARO UX-R2-00: Planejar possui uma única arquitetura coerente — ok');
