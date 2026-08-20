import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const planning = await readFile('faro-planning.js','utf8');
const interactions = await readFile('faro-interactions.js','utf8');
const r3b = await readFile('faro-r3b.js','utf8');
const routing = await readFile('faro-r3-routing.js','utf8');
const shell = await readFile('app-shell.html','utf8');
const sw = await readFile('sw.js','utf8');
const build = await readFile('scripts/build-netlify-of.mjs','utf8');
const app = await readFile('app.js','utf8');

// O substrato R3-A mantém as cinco intenções; R3-B recompõe a ordem visual em runtime.
for (const id of ['faroOpenMeta','faroOpenAgenda','faroOpenPlanDetail','faroOpenOperation','faroOpenMoney']) {
  assert.match(planning, new RegExp(`id=\\"${id}\\"`), `${id} precisa existir no cockpit`);
}
assert.match(planning, /faro-r3-grid[\s\S]*faroOpenMeta[\s\S]*faroOpenAgenda[\s\S]*faroOpenPlanDetail[\s\S]*faro-r3-grid[\s\S]*faroOpenOperation[\s\S]*faroOpenMoney/);
assert.match(r3b, /root\.insertBefore\(hero, firstGrid\)/);
assert.match(r3b, /Seu plano para/);
assert.doesNotMatch(planning, /Ajuste o que muda sua rota\. O resto fica fora do caminho\./);

// Cards são launchers: complexidade entra em dialog ou detalhe focado.
assert.match(planning, /createDialog\('faroMetaDialog'/);
assert.match(planning, /createDialog\('faroAgendaDialog'/);
assert.match(planning, /createDialog\('faroOperationDialog'/);
assert.match(planning, /createDialog\('faroMoneyDialog'[\s\S]*'page'\)/);
assert.match(r3b, /variant:'focus'/);
assert.match(r3b, /variant:'workspace'/);
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
assert.doesNotMatch(r3b, /app\.state\.[A-Za-z0-9_]+\s*=/);

// Compromissos continuam usando os owners financeiros existentes.
assert.match(planning, /faroMoneyTabBills/);
assert.match(planning, /faroMoneyTabReserves/);
assert.match(planning, /FaroFinance\?\.occurrences/);
assert.match(planning, /FaroFinance\?\.markPaid/);
assert.match(planning, /FaroFinance\?\.undoPaid/);
assert.match(planning, /FaroReserves\?\.balanceFor/);
assert.match(planning, /paymentCenter\.classList\.add\('hidden'\)/);
assert.match(planning, /reserveCenter\.classList\.add\('hidden'\)/);
assert.doesNotMatch(planning, /\[paymentCenter, reserveCenter, costCard\][\s\S]*appendChild/);

// Fundação modal: dialog nativo, foco devolvido, centralização R3-B e reduced-motion.
assert.match(interactions, /dialog\.showModal/);
assert.match(interactions, /event\.preventDefault\(\);[\s\S]*close\(dialog, 'cancel'\)/);
assert.match(interactions, /restoreFocus/);
assert.match(interactions, /prefers-reduced-motion:reduce/);
assert.match(interactions, /translateY\(22px\)/);
assert.match(interactions, /\.faro-action-card:active\{transform:scale\(\.982\)\}/);
assert.match(interactions, /faro-dialog--focus/);
assert.match(interactions, /faro-dialog--workspace/);

// Entradas antigas convergem para o cockpit.
assert.match(routing, /navigateToPrimary\('planning'\)/);
assert.match(routing, /FaroPlanning\?\.openMoney/);
assert.match(routing, /faroHomeAttention/);

// R3-B.3 mantém um único Money dialog e abre os formulários como fluxo interno,
// delegando a gravação aos writers canônicos em vez de abrir modais legados atrás da top-layer.
assert.match(routing, /const \$ = id => document\.getElementById\(id\)/);
assert.match(routing, /const moneyDialog = \$\('faroMoneyDialog'\)/);
assert.match(routing, /flow\.id = 'faroMoneyInlineFlow'/);
assert.match(routing, /moneyShell\?\.appendChild\(flow\)/);
assert.match(routing, /saveCostThroughCanonicalWriter[\s\S]*app\.saveCost\(\)/);
assert.match(routing, /saveContributionThroughCanonicalWriter[\s\S]*save\.dataset\.mode = 'contribution'[\s\S]*save\.click\(\)/);
assert.match(routing, /data-r3-reserve-contribute/);
assert.match(routing, /data-r3-reserve-goal/);
assert.match(routing, /#faroMoneyAddBill/);
assert.match(routing, /#faroMoneyCreateReserve/);
assert.match(routing, /event\.stopImmediatePropagation\(\)/);

// PWA/build carregam a geração R3-B.3 atual.
assert.match(shell, /faro-interactions\.js\?v=2[\s\S]*faro-planning\.js\?v=2[\s\S]*faro-planning-invariants\.js\?v=1[\s\S]*faro-r3b\.js\?v=1[\s\S]*faro-r3-routing\.js\?v=2/);
assert.match(sw, /faro-v1-core-19/);
assert.match(sw, /faro-interactions\.js\?v=2/);
assert.match(sw, /faro-planning\.js\?v=2/);
assert.match(sw, /faro-r3b\.js\?v=1/);
assert.match(sw, /faro-r3-routing\.js\?v=2/);
assert.match(build, /'faro-interactions\.js'/);
assert.match(build, /'faro-r3b\.js'/);
assert.match(build, /'faro-r3-routing\.js'/);

// Motor canônico continua externo à nova gramática visual.
assert.match(app, /this\.\$\('extraDaysOffBadge'\)\.textContent/);
assert.doesNotMatch(planning, /STORAGE_KEY|localStorage\.setItem\([^)]*targetProfit/);

console.log('FARO UX-R3-B.3: cockpit, fluxo Money interno, writers canônicos e cache 19 reconciliados — ok');
