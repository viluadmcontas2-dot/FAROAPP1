import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'legacy-shell.html',
  'app-shell.html',
  'faro-brand.js',
  'faro-platform.js',
  'faro-state.js',
  'faro-energy.js',
  'faro-home.js',
  'faro-register.js',
  'faro-finance.js',
  'faro-reserves.js',
  'faro-navigation.js',
  'faro-account.js',
  'faro-notifications.js',
  'faro-onboarding.js'
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
assert.deepEqual(duplicates, [], `IDs declarados por mais de uma superfície:\n${duplicates.join('\n')}`);

const shell = await readFile('app-shell.html', 'utf8');
const orderedModules = [
  'faro-brand.js?v=2',
  'faro-platform.js?v=3',
  'faro-state.js?v=1',
  'faro-energy.js?v=1',
  'faro-home.js?v=1',
  'faro-register.js?v=1',
  'faro-finance.js?v=1',
  'faro-reserves.js?v=1',
  'faro-navigation.js?v=1',
  'faro-config.js?v=1',
  'faro-account.js?v=1',
  'faro-notifications.js?v=1',
  'faro-onboarding.js?v=2'
];

let previous = -1;
for (const module of orderedModules) {
  const current = shell.indexOf(module);
  assert.ok(current > previous, `${module} precisa permanecer depois do módulo anterior na cadeia FARO`);
  previous = current;
}

const stateIndex = orderedModules.indexOf('faro-state.js?v=1');
assert.ok(stateIndex < orderedModules.indexOf('faro-finance.js?v=1'), 'Estado precisa ser protegido antes do Financeiro');
assert.ok(stateIndex < orderedModules.indexOf('faro-reserves.js?v=1'), 'Estado precisa ser protegido antes das Reservas');
assert.ok(stateIndex < orderedModules.indexOf('faro-account.js?v=1'), 'Estado precisa ser protegido antes da Conta');
assert.ok(orderedModules.indexOf('faro-register.js?v=1') < orderedModules.indexOf('faro-navigation.js?v=1'), 'Navegação precisa envolver o save do Registro por último para restaurar o contexto de origem');

console.log('FARO: IDs únicos e ordem dos módulos protegida contra colisões silenciosas — ok');
