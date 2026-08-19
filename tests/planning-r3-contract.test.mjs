import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const planning = await readFile('faro-planning.js','utf8');
const interactions = await readFile('faro-interactions.js','utf8');
const routing = await readFile('faro-r3-routing.js','utf8');
const shell = await readFile('app-shell.html','utf8');
const sw = await readFile('sw.js','utf8');
const build = await readFile('scripts/build-netlify-of.mjs','utf8');
const app = await readFile('app.js','utf8');

// Composição 2–1–2: cinco intenções, com Meu planejamento protagonista horizontal.
for (const id of ['faroOpenMeta','faroOpenAgenda','faroOpenPlanDetail','faroOpenOperation','faroOpenMoney']) {
  assert.match(planning, new RegExp(`id=\\"${id}\\"`), `${id} precisa existir no cockpit`);
}
assert.match(planning, /faro-r3-grid[\s\S]*faroOpenMeta[\s\S]*faroOpenAgenda[\s\S]*faroOpenPlanDetail[\s\S]*faro-r3-grid[\s\S]*faroOpenOperation[\s\S]*faroOpenMoney/);
assert.match(planning, /Meu planejamento/);
assert.match(planning, /Organize seu mês\./);
assert.doesNotMatch(planning, /Ajuste o que muda sua rota\. O resto fica fora do caminho\./);

// Cards são launchers: complexidade entra em dialog/sheet ou detalhe focado.
assert.match(planning, /createDialog\('faroMetaDialog'/);
assert.match(planning, /createDialog\('faroAgendaDialog'/);
assert.match(planning, /createDialog\('faroOperationDialog'/);
assert.match(planning, /createDialog\('faroMoneyDialog'[\s\S]*'page'\)/);
assert.match(planning, /detailView\.id = 'view-planning-detail'/);
assert.match(planning, /app\.openSecondary\('planning-detail'\)/);
assert.doesNotMatch(planning, /createSubview\('planning-costs'|createSubview\('planning-days'|createSubview\('planning-operation'/);

// Meta continua draft-only e salva uma única vez ao aplicar.
assert.match(planning, /slider\.removeAttribute\('data-model'\)/);
assert.match(planning, /let targetDraft = app\.state\.targetProfit/);
assert.match(planning, /slider\.addEventListener\('input'[\s\S]*targetDraft = clampTarget/);
assert.match(planning, /faroTargetApply[\s\S]*app\.state\.targetProfit = targetDraft;[\s\S]*app\.save\(\); app\.syncInputs\(\); app\.render\(\)/);
assert.match(planning, /faroTargetCancel[\s\S]*interactions\.close\(metaDialog/);
assert.match(planning, /const calculationsWith = overrides =>/);
assert.match(planning, /finally \{[\s\S]*app\.state\.targetProfit = saved\.targetProfit[\s\S]*app\.state\.fuel = saved\.fuel/);
assert.doesNotMatch(planning, /function\s+calculations|const\s+calculations\s*=|contributionKm\s*=/);

// Dinheiro é superfície focada e não reparenta centros gigantes para o primeiro nível.
assert.match(planning, /faroMoneyTabBills/);
assert.match(planning, /faroMoneyTabReserves/);
assert.match(planning, /FaroFinance\?\.occurrences/);
assert.match(planning, /FaroFinance\?\.markPaid/);
assert.match(planning, /FaroFinance\?\.undoPaid/);
assert.match(planning, /FaroReserves\?\.balanceFor/);
assert.match(planning, /paymentCenter\.classList\.add\('hidden'\)/);
assert.match(planning, /reserveCenter\.classList\.add\('hidden'\)/);
assert.doesNotMatch(planning, /\[paymentCenter, reserveCenter, costCard\][\s\S]*appendChild/);

// Modal foundation: dialog nativo, foco devolvido, cancelamento e reduced-motion.
assert.match(interactions, /dialog\.showModal/);
assert.match(interactions, /event\.preventDefault\(\);[\s\S]*close\(dialog, 'cancel'\)/);
assert.match(interactions, /restoreFocus/);
assert.match(interactions, /prefers-reduced-motion: reduce/);
assert.match(interactions, /translateY\(22px\)/);
assert.match(interactions, /\.faro-action-card:active\{transform:scale\(\.982\)\}/);

// Entradas antigas de dinheiro convergem para o cockpit R3.
assert.match(routing, /navigateToPrimary\('planning'\)/);
assert.match(routing, /FaroPlanning\?\.openMoney/);
assert.match(routing, /faroHomeAttention/);

// Formulários legados não podem abrir atrás do <dialog> da top-layer.
assert.match(routing, /const moneyDialog = document\.getElementById\('faroMoneyDialog'\)/);
assert.match(routing, /FaroInteractions\?\.close\?\.\(moneyDialog, 'handoff'\)/);
assert.match(routing, /setTimeout\(callback, handoffDelay\(\)\)/);
assert.match(routing, /data-r3-reserve-contribute/);
assert.match(routing, /data-r3-reserve-goal/);
assert.match(routing, /#faroMoneyAddBill/);
assert.match(routing, /#faroMoneyCreateReserve/);
assert.match(routing, /event\.stopImmediatePropagation\(\)/);

// PWA/build carregam a mesma geração.
assert.match(shell, /faro-interactions\.js\?v=1[\s\S]*faro-planning\.js\?v=2[\s\S]*faro-r3-routing\.js\?v=1/);
assert.match(sw, /faro-v1-core-14/);
assert.match(sw, /faro-interactions\.js\?v=1/);
assert.match(sw, /faro-planning\.js\?v=2/);
assert.match(sw, /faro-r3-routing\.js\?v=1/);
assert.match(build, /'faro-interactions\.js'/);
assert.match(build, /'faro-r3-routing\.js'/);

// Motor canônico continua externo à nova gramática visual.
assert.match(app, /this\.\$\('extraDaysOffBadge'\)\.textContent/);
assert.doesNotMatch(planning, /STORAGE_KEY|localStorage\.setItem\([^)]*targetProfit/);

console.log('FARO UX-R3-A: cockpit 2–1–2, sheets, detalhe focado, dinheiro, handoff de modais e motion nativo protegidos — ok');
