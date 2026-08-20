import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';

execFileSync(process.execPath, ['scripts/build-netlify-of.mjs'], { stdio: 'inherit' });

const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = path => readFile(path, 'utf8');
const integrity = JSON.parse(await read('ci/baseline-integrity.json'));

const rootAppBuffer = await readFile('app.js');
const legacyBuffer = await readFile('legacy-shell.html');
const markBuffer = await readFile('faro-mark.svg');
const iconBuffer = await readFile('icon.svg');
const rootApp = rootAppBuffer.toString('utf8');
const legacy = legacyBuffer.toString('utf8');
const shell = await read('app-shell.html');
const brand = await read('faro-brand-r2.js');
const planning = await read('faro-planning.js');
const interactions = await read('faro-interactions.js');
const r3b = await read('faro-r3b.js');
const routing = await read('faro-r3-routing.js');
const home = await read('faro-home-r2.js');
const tour = await read('faro-tour.js');
const platform = await read('faro-platform.js');
const update = await read('faro-update.js');
const state = await read('faro-state.js');
const energy = await read('faro-energy.js');
const onboarding = await read('faro-onboarding.js');
const sw = await read('sw.js');
const index = await read('index.html');
const manifest = JSON.parse(await read('manifest.webmanifest'));

assert.equal(sha256(rootAppBuffer), integrity.protectedCore.appJsSha256, 'app.js fonte mudou fora do contrato');
assert.equal(sha256(legacyBuffer), integrity.protectedCore.legacyShellSha256, 'legacy-shell mudou fora do contrato');
assert.equal(sha256(markBuffer), integrity.protectedCore.faroMarkSha256, 'marca FARO mudou fora do contrato');
assert.equal(sha256(iconBuffer), integrity.protectedCore.iconSha256, 'ícone FARO mudou fora do contrato');

function firstMethod(source, name) {
  const marker = `  ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Método ${name} não localizado`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (quote) { if (ch === '\\') escaped = true; else if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return source.slice(start, source[i + 1] === ',' ? i + 2 : i + 1);
  }
  throw new Error(`Método ${name} sem fechamento`);
}

for (const [name, expected] of Object.entries(integrity.coreFunctionSha256)) {
  assert.equal(sha256(firstMethod(rootApp, name)), expected, `${name} mudou fora do escopo`);
}

assert.match(index, /location\.replace\('\.\/app-shell\.html'\)/);
assert.doesNotMatch(index, /Instalar FARO|login|assinatura|password|senha|access-gate/i);
assert.match(shell, /faro-brand-r2\.js\?v=1/);
assert.match(shell, /faro-home-r2\.js\?v=1/);
assert.match(shell, /faro-interactions\.js\?v=2/);
assert.match(shell, /faro-planning\.js\?v=2/);
assert.match(shell, /faro-planning-invariants\.js\?v=1/);
assert.match(shell, /faro-r3b\.js\?v=1/);
assert.match(shell, /faro-r3-routing\.js\?v=2/);
assert.match(shell, /faro-tour\.js\?v=1/);
assert.doesNotMatch(shell, /faro-brand\.js\?v=2/);
assert.doesNotMatch(shell, /faro-home\.js\?v=1/);
assert.match(shell, /faro-platform\.js\?v=3/);
assert.match(shell, /faro-update\.js\?v=1/);
assert.match(shell, /faro-state\.js\?v=1/);
assert.match(shell, /faro-energy\.js\?v=1/);
assert.match(shell, /faro-onboarding\.js\?v=2/);

assert.match(platform, /const INSTALL_GATE_ENFORCED = true/);
assert.match(platform, /window\.FaroPlatform/);
assert.match(platform, /canEnterProduct/);
assert.doesNotMatch(platform, /stripe|assinatura|password|senha/i);
assert.match(update, /FARO_ACTIVATE_WHEN_SAFE/);
assert.match(state, /window\.FaroState|FaroState/);

assert.match(energy, /type: 'electric'/);
assert.match(energy, /label: 'Elétrico'/);
assert.match(energy, /unit: 'kWh'/);
assert.match(energy, /baseChangeFuelType/);
assert.match(energy, /baseUpdateFuelFromForm/);

assert.match(onboarding, /const DRAFT_KEY = 'faro-onboarding-draft-v2'/);
assert.match(onboarding, /data-faro-step="rental"/);
assert.match(onboarding, /data-faro-step="finance"/);
assert.match(onboarding, /data-faro-step="costs"/);
assert.match(onboarding, /data-faro-step="reserve"/);
assert.match(onboarding, /Farejando sua operação\.\.\./);
assert.match(onboarding, /id="faroFinish"/);
assert.match(onboarding, /app\.state\.onboardingComplete = true/);
assert.doesNotMatch(onboarding, /state\.records\.push|state\.records\.splice/);

assert.match(brand, /replaceAll\('VETTA', BRAND\)/);
assert.match(brand, /const setupDailyJourney = \(\) =>/);
assert.doesNotMatch(brand, /planningDetails|targetProfitDisplay.*closest\('\.card-vetta'\)/s, 'Brand R2 não pode ser owner de Planejar');
assert.match(home, /navigateToPrimary\('planning'\)/);
assert.match(planning, /planning\.replaceChildren\(root\)/);
assert.match(planning, /slider\.removeAttribute\('data-model'\)/);
assert.match(planning, /id=\"faroOpenMeta\"[\s\S]*id=\"faroOpenAgenda\"[\s\S]*id=\"faroOpenPlanDetail\"[\s\S]*id=\"faroOpenOperation\"[\s\S]*id=\"faroOpenMoney\"/);
assert.match(interactions, /showModal/);
assert.match(interactions, /faro-dialog--focus/);
assert.match(r3b, /Seu plano para/);
assert.match(r3b, /root\.insertBefore\(hero, firstGrid\)/);
assert.match(routing, /FaroPlanning\?\.openMoney/);
assert.match(tour, /faro-ui-tour-v1/);

for (const source of [sw, await read('_site/sw.js')]) {
  assert.match(source, /faro-v1-core-18/);
  assert.match(source, /faro-platform\.js\?v=3/);
  assert.match(source, /faro-update\.js\?v=1/);
  assert.match(source, /faro-brand-r2\.js\?v=1/);
  assert.match(source, /faro-home-r2\.js\?v=1/);
  assert.match(source, /faro-interactions\.js\?v=2/);
  assert.match(source, /faro-planning\.js\?v=2/);
  assert.match(source, /faro-r3b\.js\?v=1/);
  assert.match(source, /faro-r3-routing\.js\?v=2/);
  assert.match(source, /faro-tour\.js\?v=1/);
  assert.match(source, /Promise\.allSettled\(EXTERNAL_SEEDS\.map\(cacheExternalSeed\)\)/);
}

assert.equal(await read('_site/legacy-shell.html'), legacy);
assert.match(await read('_site/app.js'), /const STORAGE_KEY = 'faro-app-finance-v1';/);
for (const path of ['faro-brand-r2.js','faro-home-r2.js','faro-interactions.js','faro-planning.js','faro-planning-invariants.js','faro-r3b.js','faro-r3-routing.js','faro-tour.js','faro-platform.js','faro-update.js','faro-state.js','faro-energy.js','faro-onboarding.js','sw.js','app-shell.html']) {
  assert.ok((await stat(path)).size > 0, `${path} não pode estar vazio`);
  assert.ok((await stat(`_site/${path}`)).size > 0, `${path} precisa estar presente no build`);
}

for (const requiredId of ['view-dashboard','view-planning','view-day','targetProfitDisplay','dreGross','recordHours','recordFuel','saveDayButton','previewNet','historyList','onboardingModal']) {
  assert.match(legacy, new RegExp(`id="${requiredId}"`), `baseline precisa manter ${requiredId}`);
}

assert.equal(manifest.name, 'FARO — APP DO MOTORISTA!');
assert.equal(manifest.short_name, 'FARO');
assert.equal(manifest.start_url, './app-shell.html');
assert.equal(manifest.display, 'standalone');

console.log('FARO físico: núcleo financeiro e shell legado intactos; cache 18 propagado no build — ok');