import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const app = readFileSync('app.js', 'utf8');
const installPage = readFileSync('index.html', 'utf8');
const appShell = readFileSync('app-shell.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const netlify = readFileSync('netlify.toml', 'utf8');
const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
const accessGate = readFileSync('netlify/edge-functions/access-gate.js', 'utf8');
const robotAccess = readFileSync('netlify/edge-functions/robot-access.js', 'utf8');

assert.equal((app.match(/app\.init\(\);/g) || []).length, 1);
assert.equal((app.match(/saveCostButton'\)\.addEventListener\('click'/g) || []).length, 1);
for (const forbidden of ["'./parts/", 'new Function', 'stopImmediatePropagation', "const RELEASE = '3.1.0'", "const RELEASE = '3.2.0'", "const RELEASE = '3.3.0'", 'vettaPatchStyles', 'Custos fixos migrados']) {
  assert.ok(!app.includes(forbidden), `Conteúdo proibido: ${forbidden}`);
}
assert.ok(app.includes('type="button" id="saveCostButton"'));
assert.ok(app.includes('type="button" id="closeCostModal"'));
assert.ok(app.includes("const APP_RELEASE = '3.5.1'"));
assert.ok(appShell.includes('app.js?v=3.5.1'));
assert.ok(installPage.includes('beforeinstallprompt'));
assert.ok(installPage.includes('./manifest.webmanifest'));
assert.ok(!installPage.includes('appRoot'));

assert.ok(sw.includes("calculaae-install-flow-5"));
assert.ok(sw.includes('const APP_SHELL = ['));
assert.ok(sw.includes('cache.addAll(APP_SHELL)'));
assert.ok(sw.includes('cache.put(event.request, response.clone())'));
assert.ok(sw.includes('caches.match(event.request, { ignoreSearch: true })'));
assert.ok(sw.includes("caches.match('./index.html')"));

assert.equal(manifest.id, './');
assert.equal(manifest.start_url, './app-shell.html');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some(icon => icon.src === './icon-192.png'));
assert.ok(manifest.icons.some(icon => icon.src === './icon-512.png'));

assert.ok(netlify.includes('publish = "_site"'));
assert.ok(netlify.includes('edge_functions = "netlify/edge-functions"'));
assert.ok(netlify.includes('path = "/__vetta-robot-access"'));
assert.ok(netlify.includes('function = "robot-access"'));
assert.ok(netlify.includes('function = "calculaae-access-gate"'));
for (const path of ['/manifest.webmanifest', '/sw.js', '/icon.svg', '/icon-192.png', '/icon-512.png']) {
  assert.ok(netlify.includes(`"${path}"`), `${path} deve ficar fora da barreira de acesso`);
}
assert.ok(accessGate.includes("runtimeEnv('VETTA_ACCESS_CREDENTIALS_JSON')"));
assert.ok(accessGate.includes("runtimeEnv('VETTA_ACCESS_SESSION_SECRET')"));
assert.ok(accessGate.includes("data-vetta-access-gate=\"true\""));
assert.ok(robotAccess.includes("runtimeEnv('VETTA_ACCESS_ROBOT_HASH')"));
assert.ok(robotAccess.includes("runtimeEnv('VETTA_ACCESS_CREDENTIALS_JSON')"));
assert.ok(robotAccess.includes("runtimeEnv('VETTA_ACCESS_SESSION_SECRET')"));
assert.equal(`${accessGate}\n${robotAccess}`.match(/\b[a-f0-9]{64}\b/gi), null, 'hash real não pode estar no repositório');

console.log('VETTA 3.5.1 protected PWA production verification passed');
