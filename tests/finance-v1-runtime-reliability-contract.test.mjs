import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [shell, sw, build, verifyWorkflow, releaseWorkflow] = await Promise.all([
  readFile('app-shell.html', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('scripts/build-static-site.mjs', 'utf8'),
  readFile('.github/workflows/manual-faro-verify.yml', 'utf8'),
  readFile('.github/workflows/manual-faro-release-verify.yml', 'utf8')
]);

const shellBlock = sw.match(/const APP_SHELL = \[([\s\S]*?)\];/);
assert.ok(shellBlock, 'N4 precisa conseguir auditar APP_SHELL do service worker');
const cachedRefs = [...shellBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
assert.ok(cachedRefs.length > 20, 'N4 espera um shell PWA explícito, não cache implícito');
assert.equal(new Set(cachedRefs).size, cachedRefs.length, 'APP_SHELL não pode conter entradas duplicadas');

for (const ref of cachedRefs.filter(ref => /\.js\?v=/.test(ref))) {
  assert.equal(shell.includes(ref), true, `app-shell.html precisa carregar a mesma geração cacheada: ${ref}`);
}

const copyBlock = build.match(/const copyFiles = \[([\s\S]*?)\];/);
assert.ok(copyBlock, 'N4 precisa conseguir auditar a lista explícita de arquivos do build');
const copiedPaths = new Set([...copyBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1]));
for (const ref of cachedRefs) {
  if (ref === './') continue;
  const path = ref.replace(/^\.\//, '').split('?')[0];
  assert.equal(copiedPaths.has(path), true, `Build precisa copiar todo recurso local do APP_SHELL: ${path}`);
}
for (const required of ['sw.js', 'manifest.webmanifest', 'app-shell.html', 'legacy-shell.html', 'index.html']) {
  assert.equal(copiedPaths.has(required), true, `Build N4 precisa incluir ${required}`);
}

for (const [name, workflow] of [['verify', verifyWorkflow], ['release', releaseWorkflow]]) {
  assert.match(workflow, /workflow_dispatch/, `${name}: CI governado precisa ser manual/seletivo`);
  assert.match(workflow, /npm run check/, `${name}: CI governado precisa executar a suíte completa`);
  assert.match(workflow, /npm run build/, `${name}: N4 exige construir o artefato real no CI, não apenas checar sintaxe/contratos`);
  assert.match(workflow, /finance-v1-built-artifact-contract\.test\.mjs/,
    `${name}: N4 exige auditar o conteúdo de _site depois da construção`);
  assert.doesNotMatch(workflow, /netlify\s+deploy|vercel\s+deploy|deploy_to_vercel/i,
    `${name}: workflow de verificação não pode publicar`);
}

console.log('FARO_FINANCE_V1 N4: shell, SW, build provider-neutral e CI manual compartilham a mesma geração executável — ok');
