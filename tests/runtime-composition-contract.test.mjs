import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Owners que declaram superfícies simultâneas entram no detector de IDs.
// R3-B fica fora desta lista porque substitui o innerHTML do hero existente
// preservando IDs canônicos; ele não mantém duas cópias desses nós no DOM.
const files = [
  'legacy-shell.html',
  'app-shell.html',
  'faro-brand-r2.js',
  'faro-platform.js',
  'faro-update.js',
  'faro-state.js',
  'faro-energy.js',
  'faro-home-r2.js',
  'faro-register.js',
  'faro-finance.js',
  'faro-reserves.js',
  'faro-interactions.js',
  'faro-planning.js',
  'faro-planning-invariants.js',
  'faro-r3-routing.js',
  'faro-navigation.js',
  'faro-account.js',
  'faro-notifications.js',
  'faro-onboarding.js',
  'faro-tour.js',
  'faro-r2-polish.js'
];

const declarations = new Map();
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/\bid=["']([^"']+)["']/g)) {
    const id = match[1];
    const owners = declarations.get(id) || [];
    owners.push(file);
    declarations.set(id, owners);
  }
}

const duplicates = [...declarations.entries()]
  .filter(([, owners]) => new Set(owners).size > 1)
  .map(([id, owners]) => `${id} → ${[...new Set(owners)].join(', ')}`);
assert.deepEqual(duplicates, [], `IDs declarados por mais de uma superfície ativa:\n${duplicates.join('\n')}`);

const shell = await readFile('app-shell.html', 'utf8');
const r3b = await readFile('faro-r3b.js', 'utf8');
const orderedModules = [
  'faro-brand-r2.js?v=1',
  'faro-platform.js?v=3',
  'faro-update.js?v=1',
  'faro-state.js?v=1',
  'faro-energy.js?v=1',
  'faro-home-r2.js?v=1',
  'faro-register.js?v=1',
  'faro-finance.js?v=1',
  'faro-reserves.js?v=1',
  'faro-interactions.js?v=2',
  'faro-planning.js?v=2',
  'faro-planning-invariants.js?v=1',
  'faro-r3b.js?v=1',
  'faro-r3-routing.js?v=2',
  'faro-navigation.js?v=1',
  'faro-config.js?v=1',
  'faro-account.js?v=1',
  'faro-notifications.js?v=1',
  'faro-onboarding.js?v=2',
  'faro-tour.js?v=1',
  'faro-r2-polish.js?v=1'
];

let previous = -1;
for (const module of orderedModules) {
  const current = shell.indexOf(module);
  assert.ok(current > previous, `${module} precisa permanecer depois do módulo anterior na cadeia FARO`);
  previous = current;
}

assert.doesNotMatch(shell, /faro-brand\.js\?v=2/, 'Brand legado não pode continuar ativo junto do owner R2');
assert.doesNotMatch(shell, /faro-home\.js\?v=1/, 'Home legado não pode continuar ativo junto do owner R2');
assert.match(r3b, /hero\.innerHTML =/);
assert.match(r3b, /root\.insertBefore\(hero, firstGrid\)/);
assert.doesNotMatch(r3b, /appendChild\(hero\.cloneNode|cloneNode\(true\)[\s\S]*faroOpenPlanDetail/, 'R3-B não pode duplicar o card protagonista');

const updateIndex = orderedModules.indexOf('faro-update.js?v=1');
const stateIndex = orderedModules.indexOf('faro-state.js?v=1');
const planningIndex = orderedModules.indexOf('faro-planning.js?v=2');
const invariantsIndex = orderedModules.indexOf('faro-planning-invariants.js?v=1');
const r3bIndex = orderedModules.indexOf('faro-r3b.js?v=1');
const routingIndex = orderedModules.indexOf('faro-r3-routing.js?v=2');
const navigationIndex = orderedModules.indexOf('faro-navigation.js?v=1');
assert.ok(updateIndex < stateIndex, 'Política de atualização precisa estar pronta antes do estado');
assert.ok(stateIndex < orderedModules.indexOf('faro-finance.js?v=1'), 'Estado precisa estar protegido antes do Financeiro');
assert.ok(orderedModules.indexOf('faro-finance.js?v=1') < planningIndex, 'Financeiro precisa expor consumidores antes do cockpit');
assert.ok(orderedModules.indexOf('faro-reserves.js?v=1') < planningIndex, 'Reservas precisam existir antes do cockpit');
assert.ok(orderedModules.indexOf('faro-interactions.js?v=2') < planningIndex, 'Fundação de dialog/motion precisa existir antes do Planejar R3');
assert.ok(planningIndex < invariantsIndex, 'Invariantes precisam complementar o owner estrutural antes do acabamento');
assert.ok(invariantsIndex < r3bIndex, 'R3-B só pode recompor depois que o owner e suas invariantes existirem');
assert.ok(r3bIndex < routingIndex, 'Identidade R3-B precisa estar pronta antes das rotas herdadas chamarem o cockpit');
assert.ok(routingIndex < navigationIndex, 'Rotas herdadas precisam convergir antes da navegação operacional');
assert.ok(orderedModules.indexOf('faro-onboarding.js?v=2') < orderedModules.indexOf('faro-tour.js?v=1'), 'Tour precisa ligar seu handoff depois que onboarding criar o CTA final');
assert.ok(orderedModules.indexOf('faro-tour.js?v=1') < orderedModules.indexOf('faro-r2-polish.js?v=1'), 'Central só pode finalizar hierarquia depois que Ajuda/tour existir');

console.log('FARO UX-R3-B: módulos ativos, ownership real e ordem do identity pass protegidos — ok');
