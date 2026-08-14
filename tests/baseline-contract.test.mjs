import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';

execFileSync(process.execPath, ['scripts/build-netlify-of.mjs'], { stdio: 'inherit' });

const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = path => readFile(path, 'utf8');

const integrity = JSON.parse(await read('ci/baseline-integrity.json'));
const rootAppBuffer = await readFile('app.js');
const rootApp = rootAppBuffer.toString('utf8');
const legacyBuffer = await readFile('legacy-shell.html');
const legacy = legacyBuffer.toString('utf8');
const markBuffer = await readFile('faro-mark.svg');
const iconBuffer = await readFile('icon.svg');
const shell = await read('app-shell.html');
const brand = await read('faro-brand.js');
const platform = await read('faro-platform.js');
const energy = await read('faro-energy.js');
const onboarding = await read('faro-onboarding.js');
const sw = await read('sw.js');
const index = await read('index.html');
const workflow = await read('.github/workflows/validar-faro-v1-comercial.yml');
const manifest = JSON.parse(await read('manifest.webmanifest'));

const builtApp = await read('_site/app.js');
const builtLegacy = await read('_site/legacy-shell.html');
const builtPlatform = await read('_site/faro-platform.js');
const builtEnergy = await read('_site/faro-energy.js');
const builtOnboarding = await read('_site/faro-onboarding.js');
const builtSw = await read('_site/sw.js');

assert.equal(sha256(rootAppBuffer), integrity.protectedCore.appJsSha256, 'app.js fonte mudou fora do contrato');
assert.equal(sha256(legacyBuffer), integrity.protectedCore.legacyShellSha256, 'legacy-shell mudou fora do contrato');
assert.equal(sha256(markBuffer), integrity.protectedCore.faroMarkSha256, 'marca FARO mudou fora do contrato');
assert.equal(sha256(iconBuffer), integrity.protectedCore.iconSha256, 'ícone FARO mudou fora do contrato');
assert.equal(builtLegacy, legacy);
assert.match(builtApp, /const STORAGE_KEY = 'faro-app-finance-v1';/);

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
      if (depth === 0) return source.slice(start, source[i + 1] === ',' ? i + 2 : i + 1);
    }
  }
  throw new Error(`Método ${name} sem fechamento`);
}

for (const [name, expected] of Object.entries(integrity.coreFunctionSha256)) {
  assert.equal(sha256(firstMethod(rootApp, name)), expected, `${name} mudou fora do escopo`);
}

assert.match(index, /location\.replace\('\.\/app-shell\.html'\)/);
assert.doesNotMatch(index, /Instalar FARO|login|assinatura|password|senha|access-gate/i);
assert.doesNotMatch(index, /serviceWorker\.register/);
assert.match(shell, /faro-platform\.js\?v=2/);
assert.match(shell, /faro-energy\.js\?v=1/);
assert.match(shell, /faro-home\.js\?v=1/);
assert.match(shell, /faro-onboarding\.js\?v=2/);
assert.match(platform, /const INSTALL_GATE_ENFORCED = true/);
assert.match(platform, /window\.FaroPlatform/);
assert.match(platform, /canEnterProduct/);
assert.doesNotMatch(platform, /stripe|assinatura|password|senha/i);
assert.equal(builtPlatform, platform);

for (const source of [energy, builtEnergy]) {
  assert.match(source, /type: 'electric'/);
  assert.match(source, /label: 'Elétrico'/);
  assert.match(source, /unit: 'kWh'/);
  assert.match(source, /baseChangeFuelType/);
  assert.match(source, /baseUpdateFuelFromForm/);
  assert.match(source, /type !== 'electric'/);
  assert.match(source, /Elétrico selecionado\. Informe preço por kWh e rendimento/);
  assert.match(source, /window\.FaroEnergy/);
}
assert.equal(builtEnergy, energy);

for (const source of [onboarding, builtOnboarding]) {
  assert.match(source, /const DRAFT_KEY = 'faro-onboarding-draft-v2'/);
  assert.match(source, /const escapeHtml = value =>/);
  assert.match(source, /data-faro-step="rental"/);
  assert.match(source, /data-faro-step="finance"/);
  assert.match(source, /data-faro-step="costs"/);
  assert.match(source, /data-faro-step="reserve"/);
  assert.match(source, /Quanto você paga por semana\?/);
  assert.match(source, /Valor da parcela mensal/);
  assert.match(source, /rentalDueWeekday: ''/);
  assert.match(source, /financeDueDay: ''/);
  assert.match(source, /<option value="">Escolha o dia<\/option>/);
  assert.match(source, /Escolha o dia em que o aluguel normalmente vence\./);
  assert.match(source, /Informe o dia do vencimento da parcela\./);
  assert.match(source, /escapeHtml\(item\.name\)/);
  assert.doesNotMatch(source, /rentalDueWeekday:\s*5/);
  assert.doesNotMatch(source, /financeDueDay:\s*10/);
  assert.doesNotMatch(source, /financeDueDay\s*=.*\|\|\s*10/);
  assert.match(source, /otherCosts: \[\]/);
  assert.match(source, /pendingCost:/);
  assert.match(source, /dueDay:clampDueDay|dueDay: clampDueDay/);
  assert.match(source, /plannedOnly:true|plannedOnly: true/);
  assert.match(source, /maintenancePerKmDeferred:true|maintenancePerKmDeferred: true/);
  assert.match(source, /data-target-add="50"/);
  assert.match(source, /data-target-add="100"/);
  assert.match(source, /data-target-add="500"/);
  assert.match(source, /batteryKwh/);
  assert.match(source, /rangeKm/);
  assert.match(source, /draft\.energyEfficiency = draft\.batteryKwh > 0 \? draft\.rangeKm \/ draft\.batteryKwh : 0/);
  assert.match(source, /Farejando sua operação\.\.\./);
  assert.match(source, /setTimeout\(showResult, 4000\)/);
  assert.match(source, /draft\.stepId = 'processing'/);
  assert.match(source, /draft\.stepId = 'result'/);
  assert.match(source, /if \(draft\.stepId === 'processing'\) showProcessing\(\)/);
  assert.match(source, /else if \(draft\.stepId === 'result'\) showResult\(\)/);
  assert.match(source, /faroTargetNumber.*addEventListener\('blur'/s);
  assert.match(source, /app\.state\.onboardingComplete = true;[\s\S]*clearDraft\(\);[\s\S]*navigateToPrimary\('dashboard'\)/);
  assert.doesNotMatch(source, /const showResult = \(\) => \{\s*app\.state\.onboardingComplete = true/);
  assert.doesNotMatch(source, /DEFAULT_MAINTENANCE_KM|maintenance-onboarding|other-monthly-onboarding/);
  assert.doesNotMatch(source, /state\.records\.push|state\.records\.splice/);
  assert.doesNotMatch(source, /id="faroRentalWeekly"[^>]*step="\.01"/);
  assert.doesNotMatch(source, /id="faroFinanceMonthly"[^>]*step="\.01"/);
}

for (const source of [sw, builtSw]) {
  assert.match(source, /faro-v1-core-6/);
  assert.match(source, /faro-v1-external-2/);
  assert.match(source, /faro-platform\.js\?v=2/);
  assert.match(source, /faro-energy\.js\?v=1/);
  assert.match(source, /faro-home\.js\?v=1/);
  assert.match(source, /faro-onboarding\.js\?v=2/);
  assert.match(source, /Promise\.allSettled\(EXTERNAL_SEEDS\.map\(cacheExternalSeed\)\)/);
  assert.match(source, /Dependência externa nunca pode impedir o núcleo FARO de instalar/);
  assert.match(source, /cdn\.tailwindcss\.com/);
  assert.match(source, /cdn\.jsdelivr\.net/);
  assert.match(source, /cdnjs\.cloudflare\.com/);
  assert.match(source, /fonts\.gstatic\.com/);
}

assert.match(shell, /APP DO MOTORISTA!/);
assert.match(shell, /faro-mark\.svg/);
assert.match(brand, /replaceAll\('VETTA', BRAND\)/);
assert.match(brand, /const setupDailyJourney = \(\) =>/);
assert.doesNotMatch(brand, /state\.records\.push|state\.records\.splice/);
assert.equal(manifest.name, 'FARO — APP DO MOTORISTA!');
assert.equal(manifest.short_name, 'FARO');

for (const requiredId of ['view-dashboard','view-planning','view-day','targetProfitDisplay','dreGross','recordHours','recordFuel','saveDayButton','previewNet','historyList','onboardingModal']) {
  assert.match(legacy, new RegExp(`id="${requiredId}"`), `baseline precisa manter ${requiredId}`);
}

assert.match(workflow, /^name: Validar FARO v1 comercial/m);
assert.match(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /^\s*push:/m, 'Push comum deve consumir zero Actions por padrão');
assert.match(workflow, /name: Conferir onboarding e PWA sem publicar/);
assert.match(workflow, /node --check faro-energy\.js/);
assert.match(workflow, /permissions:\n  contents: read/);
assert.doesNotMatch(workflow, /actions\/deploy-pages|netlify\s+(deploy|build)|gh-pages|publish-dir|wrangler\s+deploy/i);

const root = await readdir('.');
for (const forbidden of ['PROJECT_STATE.md','LEARNING_RULES.md','PWA_RULES.md','SKILLS.md','START_HERE.md','TESTING_RULES.md']) {
  assert.equal(root.includes(forbidden), false, `${forbidden} não pertence a esta fotografia`);
}

for (const path of ['faro-platform.js','faro-energy.js','faro-home.js','faro-onboarding.js','sw.js','app-shell.html']) {
  assert.ok((await stat(path)).size > 0, `${path} não pode estar vazio`);
}

console.log('FARO: onboarding retomável, Home integrada, elétrico coerente, PWA protegido e núcleo financeiro preservado — ok');