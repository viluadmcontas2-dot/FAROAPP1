import fs from 'node:fs';
import assert from 'node:assert/strict';

const routing = fs.readFileSync(new URL('../faro-r3-routing.js', import.meta.url), 'utf8');
const planning = fs.readFileSync(new URL('../faro-planning.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('../app-shell.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

assert.match(routing, /mode:'single-workspace-depth'/, 'R3-B.3 must declare the single-workspace navigation mode');
assert.match(routing, /faroMoneyInlineFlow/, 'Compromissos must own an internal depth surface');
assert.match(routing, /window\.addEventListener\('click',[\s\S]*true\);/, 'Financial launcher interception must happen in capture phase before legacy dialog handlers');
assert.match(routing, /#faroMoneyAddBill|faroMoneyAddBill/, 'Add bill must be routed internally');
assert.match(routing, /#faroMoneyCreateReserve|faroMoneyCreateReserve/, 'Create reserve must be routed internally');
assert.match(routing, /data-r3b2-edit-cost/, 'Edit bill must be routed internally');
assert.match(routing, /data-r3-reserve-contribute/, 'Reserve contribution must be routed internally');
assert.match(routing, /data-r3-reserve-goal/, 'Reserve goal must be routed internally');
assert.match(routing, /app\.saveCost\(\)/, 'Bill/reserve edits must reuse the canonical cost writer');
assert.match(routing, /faroReserveSave/, 'Reserve contribution/goal must reuse the canonical reserve writer');
assert.doesNotMatch(routing, /app\.openCostModal\(/, 'R3-B.3 must not navigate from Compromissos into the legacy cost modal');
assert.doesNotMatch(routing, /reopenAfterLegacy|afterMoneyClose|afterWorkspaceClose/, 'R3-B.3 must not close and reopen the workspace around financial actions');
assert.doesNotMatch(routing, /app\.state\.costs\s*=|reserveContributions\.push|reserveProfiles\s*=/, 'Routing must not become a competing financial state writer');
assert.match(routing, /event\.key !== 'Escape'[\s\S]*closeFlow\(\)/, 'Escape inside depth must return one level, not dismiss the whole workspace');
assert.match(routing, /faro-dialog-close[\s\S]*closeFlow\(\)/, 'The visible close affordance must behave as Back while inside depth');
assert.match(planning, /faroMoneyDialog/, 'The coherent navigation must stay inside the existing Compromissos workspace');
assert.match(shell, /faro-r3-routing\.js\?v=2/, 'The shell must request the R3-B.3 routing generation');
assert.match(sw, /faro-v1-core-20/, 'Current onboarding hotfix generation must use the active PWA cache');
assert.match(sw, /faro-r3-routing\.js\?v=2/, 'The service worker must cache the same R3-B.3 routing generation');

console.log('planning-r3b3-navigation-contract: ok');
