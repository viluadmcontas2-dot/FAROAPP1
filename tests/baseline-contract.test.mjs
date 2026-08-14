import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';

execFileSync(process.execPath, ['scripts/build-netlify-of.mjs'], { stdio: 'inherit' });

const sha256 = value => createHash('sha256').update(value).digest('hex');
const rootAppBuffer = await readFile('app.js');
const rootApp = rootAppBuffer.toString('utf8');
const rootBrand = await readFile('faro-brand.js', 'utf8');
const rootOnboarding = await readFile('faro-onboarding.js', 'utf8');
const rootShell = await readFile('app-shell.html', 'utf8');
const legacyShellBuffer = await readFile('legacy-shell.html');
const legacyShell = legacyShellBuffer.toString('utf8');
const rootIndex = await readFile('index.html', 'utf8');
const rootManifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
const rootSw = await readFile('sw.js', 'utf8');
const workflow = await readFile('.github/workflows/validar-faro-v1-comercial.yml', 'utf8');
const integrity = JSON.parse(await readFile('ci/baseline-integrity.json', 'utf8'));

const builtApp = await readFile('_site/app.js', 'utf8');
const builtBrand = await readFile('_site/faro-brand.js', 'utf8');
const builtOnboarding = await readFile('_site/faro-onboarding.js', 'utf8');
const builtShell = await readFile('_site/app-shell.html', 'utf8');
const builtLegacyShell = await readFile('_site/legacy-shell.html', 'utf8');
const builtIndex = await readFile('_site/index.html', 'utf8');
const builtManifest = JSON.parse(await readFile('_site/manifest.webmanifest', 'utf8'));
const builtSw = await readFile('_site/sw.js', 'utf8');

assert.equal(sha256(rootAppBuffer), integrity.runtimeSourceAppJsSha256, 'app.js fonte deve continuar byte a byte igual ao baseline aprovado');
assert.equal(sha256(legacyShellBuffer), '2562a71314dc3f4fe834985e1a39e022e1565c1268a732917ad267a3cf09ab7b', 'legacy-shell deve ser o app-shell aprovado do ZIP, sem reescrita');
assert.equal(builtLegacyShell, legacyShell);

for (const text of [rootIndex, builtIndex]) {
  assert.doesNotMatch(text, /\bVETTA\b/);
  assert.doesNotMatch(text, /TESTE NETLIFY OF/);
  assert.doesNotMatch(text, /CalculaAê/);
}
for (const shell of [rootShell, builtShell]) {
  assert.match(shell, /replaceAll\('VETTA', 'FARO'\)/);
  assert.match(shell, /replaceAll\('TESTE NETLIFY OF', 'FARO'\)/);
  assert.match(shell, /replaceAll\('CalculaAê', 'FARO'\)/);
}
assert.match(rootShell, /APP DO MOTORISTA!/);
assert.match(rootShell, /faro-mark\.svg/);
assert.match(rootShell, /legacy-shell\.html/);
assert.match(rootShell, /faro-brand\.js\?v=2/);
assert.match(rootShell, /faro-onboarding\.js\?v=1/);

// Invariante aprendida no gate antigo: o bootstrap técnico do PWA nunca pode depender de login,
// assinatura ou de uma tela que impeça o próprio app de chegar à camada capaz de instalar.
assert.match(rootIndex, /location\.replace\('\.\/app-shell\.html'\)/);
assert.doesNotMatch(rootIndex, /Preparando instalação|Instalar Calcula|Instalar FARO|login|assinatura|password|senha|access-gate/i);
assert.doesNotMatch(rootIndex, /serviceWorker\.register/);
assert.match(rootOnboarding, /setupInstallGateFoundation/);
assert.match(rootOnboarding, /const INSTALL_GATE_ENFORCED = false/);
assert.match(rootOnboarding, /liberado-para-testes/);

assert.equal(rootManifest.name, 'FARO — APP DO MOTORISTA!');
assert.equal(rootManifest.short_name, 'FARO');
assert.deepEqual(rootManifest.icons, [{ src: './icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]);
assert.match(rootSw, /faro-v1-onboarding-1/);
assert.match(rootSw, /faro-brand\.js\?v=2/);
assert.match(rootSw, /faro-onboarding\.js\?v=1/);
assert.match(rootSw, /\.\/icon\.svg/);
assert.match(rootSw, /\.\/faro-mark\.svg/);

for (const script of [rootBrand, builtBrand]) {
  assert.match(script, /replaceAll\('VETTA', BRAND\)/);
  assert.match(script, /replaceAll\('TESTE NETLIFY OF', BRAND\)/);
  assert.match(script, /replaceAll\('CalculaAê', BRAND\)/);
  assert.match(script, /app\.shareSummary = async function/);
  assert.match(script, /app\.exportData = function/);
  assert.match(script, /app\.printReport = function/);
  assert.match(script, /app\.toast = function/);
  assert.match(script, /faro-backup-/);
  assert.match(script, /const setupDailyJourney = \(\) =>/);
  assert.match(script, /faroPlanningDetails/);
  assert.match(script, /faroOptionalDetails/);
  assert.match(script, /faroDailyResult/);
  assert.match(script, /const baseSaveDay = app\.saveDay/);
  assert.match(script, /const baseShowView = app\.showView/);
  assert.match(script, /targetProfitDisplay/);
  assert.match(script, /dreGross/);
  assert.match(script, /recordHours/);
  assert.match(script, /recordFuel/);
  assert.match(script, /this\.recordNumbers\(saved, context\)/);
  assert.match(script, /this\.calculations\(\)/);
  assert.doesNotMatch(script, /state\.records\.push|state\.records\.splice/);
}

for (const script of [rootOnboarding, builtOnboarding]) {
  assert.match(script, /Farejando sua operação\.\.\./);
  assert.match(script, /data-mascot-slot="future"/);
  assert.match(script, /electric: \{ type: 'electric', label: 'Elétrico', unit: 'kWh'/);
  assert.match(script, /vehicle: initialVehicle/);
  assert.match(script, /kind: 'weekly'/);
  assert.match(script, /dueWeekday: draft\.rentalDueWeekday/);
  assert.match(script, /name: 'Parcela do carro'/);
  assert.match(script, /revenueKmEstimated/);
  assert.match(script, /maintenanceEstimated/);
  assert.match(script, /app\.state\.onboardingProfile/);
  assert.match(script, /app\.calculations\(\)/);
  assert.match(script, /app\.weekContext\(c\)/);
  assert.match(script, /faroOnboardingTargetSlider/);
  assert.match(script, /faroOnboardingTargetNumber/);
  assert.match(script, /Estimativa inicial|estimativa inicial/);
  assert.doesNotMatch(script, /state\.records\.push|state\.records\.splice/);
}

for (const requiredId of [
  'view-dashboard', 'view-planning', 'view-day', 'targetProfitDisplay', 'dreGross',
  'recordHours', 'recordFuel', 'saveDayButton', 'previewNet', 'historyList', 'onboardingModal'
]) {
  assert.match(legacyShell, new RegExp(`id="${requiredId}"`), `baseline precisa manter ${requiredId} para a camada de experiência`);
}

assert.match(builtApp, /const STORAGE_KEY = 'faro-app-finance-v1';/);
assert.match(builtApp, /onboardingComplete: false,/);
assert.doesNotMatch(builtApp, /Onboarding reservado para fase futura/);
assert.equal(builtManifest.name, 'FARO — APP DO MOTORISTA!');
assert.match(builtSw, /faro-v1-onboarding-1/);
assert.equal(builtOnboarding, rootOnboarding);

for (const [path, expected] of Object.entries(integrity.brandAssets)) {
  const data = await readFile(path);
  assert.equal(sha256(data), expected, `${path} deve reproduzir o ativo FARO aprovado`);
  assert.ok((await stat(path)).size > 0, `${path} não pode estar vazio`);
}

function firstMethod(source, name) {
  const marker = `  ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Método ${name} não localizado`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        if (source[end] === ',') end += 1;
        return source.slice(start, end);
      }
    }
  }
  throw new Error(`Método ${name} sem fechamento`);
}

for (const [name, expected] of Object.entries(integrity.coreFunctionSha256)) {
  assert.equal(sha256(firstMethod(rootApp, name)), expected, `${name} mudou fora do escopo do onboarding`);
}

const root = await readdir('.');
assert.equal(root.includes('.github'), true, 'A branch comercial deve manter a validação remota explícita');
assert.match(workflow, /^name: Validar FARO v1 comercial/m);
assert.match(workflow, /name: Conferir onboarding e PWA sem publicar/);
assert.match(workflow, /permissions:\n  contents: read/);
assert.match(workflow, /actions\/checkout@v7/);
assert.match(workflow, /actions\/setup-node@v6/);
assert.doesNotMatch(workflow, /deploy|pages|netlify|publish/i, 'A workflow de validação não pode publicar ou fazer deploy');

for (const forbidden of ['PROJECT_STATE.md','LEARNING_RULES.md','PWA_RULES.md','SKILLS.md','START_HERE.md','TESTING_RULES.md']) {
  assert.equal(root.includes(forbidden), false, `${forbidden} não deve existir nesta fotografia`);
}

const forbiddenGate = /access-gate|password|senha/i;
assert.doesNotMatch(rootShell + rootBrand, forbiddenGate);

console.log('FARO onboarding completo, bootstrap PWA protegido e baseline financeiro preservado: ok');
