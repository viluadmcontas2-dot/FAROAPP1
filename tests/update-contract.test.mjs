import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const update = await readFile('faro-update.js', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(update, /app\.showUpdateBanner = function\(\) \{\s*hideLegacyUpdateUi\(\);\s*\}/s, 'Atualização não pode mostrar banner ao motorista');
assert.match(update, /app\.applyUpdate = function\(\) \{[\s\S]*return checkForUpdate\(\);[\s\S]*\}/, 'Ação legada deve virar apenas checagem silenciosa');
assert.match(update, /registration\.update\(\)/, 'FARO precisa checar atualizações sozinho');
assert.match(update, /visibilitychange/, 'FARO deve checar atualização quando volta ao primeiro plano');
assert.match(update, /window\.addEventListener\('online'/, 'FARO deve checar atualização quando a internet volta');
assert.match(update, /window\.addEventListener\('pageshow'/, 'FARO deve checar atualização ao reabrir/retomar a página');
assert.doesNotMatch(update, /location\.reload|SKIP_WAITING|skipWaiting|postMessage/, 'Módulo de atualização não pode forçar recarga nem troca de worker durante uso ativo');

assert.match(sw, /const CORE_CACHE = 'faro-v1-core-11'/, 'Nova política de atualização exige nova geração de cache');
assert.match(sw, /\.\/faro-update\.js\?v=1/, 'Worker precisa armazenar o módulo de atualização silenciosa');
assert.doesNotMatch(sw, /skipWaiting\s*\(/, 'Worker novo deve esperar o ciclo natural e não interromper clientes abertos');
assert.doesNotMatch(sw, /SKIP_WAITING/, 'Não deve existir atalho manual para forçar ativação no meio do uso');

assert.match(shell, /faro-update\.js\?v=1/, 'Shell precisa carregar a política silenciosa');
assert.ok(shell.indexOf('faro-update.js?v=1') < shell.indexOf('faro-state.js?v=1'), 'Política de atualização deve estar pronta antes dos módulos de produto');
assert.match(build, /'faro-update\.js'/, 'Build precisa publicar o módulo de atualização silenciosa');

console.log('FARO: atualização automática em background, sem banner e sem recarga forçada durante uso ativo — ok');
