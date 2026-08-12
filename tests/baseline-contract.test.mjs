import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';

execFileSync(process.execPath, ['scripts/build-netlify-of.mjs'], { stdio: 'inherit' });

const app = await readFile('_site/app.js', 'utf8');
const shell = await readFile('_site/app-shell.html', 'utf8');
const index = await readFile('_site/index.html', 'utf8');
const manifest = JSON.parse(await readFile('_site/manifest.webmanifest', 'utf8'));
const sw = await readFile('_site/sw.js', 'utf8');

assert.match(app, /const STORAGE_KEY = 'faro-app-finance-v1';/);
assert.match(app, /onboardingComplete: true,/);
assert.match(app, /prepareOnboarding\(\) \{\n    \/\/ Onboarding reservado para fase futura\.\n    return;/);
assert.doesNotMatch(app, /vetta-driver-intelligence-v3/);
assert.match(shell + index, /TESTE NETLIFY OF/);
assert.match(index, /location\.replace\('\.\/app-shell\.html'\)/);
assert.doesNotMatch(index, /Preparando instalação|Instale uma vez|Verificando instalação/i);
assert.doesNotMatch(app + shell + index, /data-vetta-access-gate|access-gate|password|senha/i);
assert.equal(manifest.name, 'TESTE NETLIFY OF');
assert.equal(manifest.short_name, 'TESTE NETLIFY OF');
assert.match(sw, /teste-netlify-of-open-access-1/);

const root = await readdir('.');
assert.equal(root.includes('.github'), false, 'Nenhum workflow deve existir nesta fotografia limpa');
for (const forbidden of ['PROJECT_STATE.md','LEARNING_RULES.md','PWA_RULES.md','SKILLS.md','START_HERE.md','TESTING_RULES.md']) {
  assert.equal(root.includes(forbidden), false, `${forbidden} deve ficar no Notion, não no repositório`);
}
console.log('baseline contract: ok');
