import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const notifications = await readFile('faro-notifications.js', 'utf8');
const config = await readFile('faro-config.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const build = await readFile('scripts/build-static-site.mjs', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const schema = await readFile('supabase/migrations/20260814173000_faro_commercial_foundation.sql', 'utf8');

// Uma permissão simples; categorias não viram quatro perguntas ao motorista.
assert.match(notifications, /Avisos úteis do FARO/);
assert.match(notifications, /Notification\.requestPermission\(\)/);
assert.match(notifications, /faroNoticesToggle.*addEventListener\('click'/s);
assert.doesNotMatch(notifications, /permission.*finance|permission.*radar|permission.*marketing|permission.*product/i);

// Inscrição é por usuário + aparelho e pode ser desativada sem mexer na conta.
assert.match(notifications, /from\('faro_push_devices'\)/);
assert.match(notifications, /device_id:deviceId/);
assert.match(notifications, /platform:'web'/);
assert.match(notifications, /active/);
assert.match(notifications, /subscription\.unsubscribe\(\)/);
assert.doesNotMatch(notifications, /auth\.signOut|deleteUser|state\s*=/);
assert.match(schema, /unique \(user_id, device_id\)/);

// Não pede permissão quando a fundação comercial ainda está desligada.
assert.match(config, /pushEnabled: false/);
assert.match(notifications, /if \(!canOffer\(\)\) \{[\s\S]*card\.classList\.add\('hidden'\)/);

// Worker recebe aviso, mas nunca aceita navegação para domínio externo.
assert.match(sw, /addEventListener\('push'/);
assert.match(sw, /showNotification/);
assert.match(sw, /addEventListener\('notificationclick'/);
assert.match(sw, /url\.origin === self\.location\.origin/);
assert.match(sw, /clients\.openWindow/);

// Nenhum Admin/Radar é implementado nesta fundação.
for (const source of [notifications, sw]) {
  assert.doesNotMatch(source, /admin panel|painel admin|createRadar|saveEvent|eventModal/i);
}

assert.match(shell, /faro-notifications\.js\?v=1/);
assert.match(build, /'faro-notifications\.js'/);
assert.match(sw, /faro-notifications\.js\?v=1/);

console.log('FARO: avisos úteis por aparelho, permissão única e worker seguro preparados sem Admin/Radar — ok');
