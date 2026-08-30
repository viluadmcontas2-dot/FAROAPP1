import assert from 'node:assert/strict';
import { auditPlanningComposition } from './helpers/planning-composition-audit.mjs';

const clean = auditPlanningComposition({
  shell: '<section id="view-planning"></section>',
  appShell: 'faro-home.js faro-navigation.js',
  brand: 'const BRAND = "FARO";',
  home: 'const dashboard = document.getElementById("view-dashboard");',
  navigation: "planning: 'Planejar'"
});
assert.deepEqual(clean, [], 'Harness não pode inventar violações numa composição limpa');

const broken = auditPlanningComposition({
  shell: '<button data-secondary-view="planning"></button><section id="view-planning">edição do planejamento continua em Ajustes</section>',
  appShell: 'faro-brand.js faro-home.js faro-navigation.js',
  brand: `
    const targetCard = document.getElementById('targetProfitDisplay')?.closest('.card-vetta');
    const distributionCard = document.getElementById('dreGross')?.closest('.card-vetta');
    [targetCard, distributionCard].filter(Boolean).forEach(card => planningDetails.appendChild(card));
  `,
  home: `dashboard.querySelector('input[data-model="targetProfit"][type="range"]')`,
  navigation: `
    settings: 'Planejar',
    document.getElementById('faroManageCosts')?.addEventListener('click', () => app.navigateToPrimary('settings'));
  `
});

const codes = new Set(broken.map(item => item.code));
for (const expected of [
  'PLANNING_DESTINATION_SPLIT',
  'PLANNING_COSTS_ROUTE_SPLIT',
  'TARGET_CARD_REPARENTED_BY_BRAND',
  'DRE_REPARENTED_BY_BRAND',
  'SLIDER_OWNER_ORDER_CONFLICT',
  'LEGACY_ADJUSTES_MENTAL_MODEL'
]) {
  assert.ok(codes.has(expected), `Harness precisa detectar ${expected}`);
}

console.log('FARO UX-R2-00: harness distingue composição limpa de composição quebrada — ok');
