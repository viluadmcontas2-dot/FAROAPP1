import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const update = await readFile('faro-update.js', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(update, /app\.showUpdateBanner = function\(\) \{\s*hideLegacyUpdateUi\(\);\s*\}/s, 'Atualização não pode mostrar banner ao motorista');
assert.match(update, /app\.applyUpdate = function\(\) \{[\s\S]*return checkForUpdate\(\{ force: true \}\);[\s\S]*\}/, 'Ação legada deve virar checagem silenciosa forçada, sem UI');
assert.match(update, /const CHECK_INTERVAL_MS = 15 \* 60 \* 1000;/, 'Checagem automática precisa respeitar cooldown de 15 minutos');
assert.match(update, /if \(!force && now - lastCheckAt < CHECK_INTERVAL_MS\) return false;/, 'Retornos frequentes ao app não podem consultar atualização sem limite');
assert.match(update, /registration\.update\(\)/, 'FARO precisa checar atualizações sozinho');
assert.match(update, /visibilitychange[\s\S]*document\.visibilityState === 'visible'[\s\S]*checkForUpdate\(\)/, 'FARO deve checar atualização ao voltar ao primeiro plano respeitando cooldown');
assert.match(update, /window\.addEventListener\('online', \(\) => checkForUpdate\(\{ force: true \}\)\)/, 'Retorno da internet deve permitir checagem imediata');
assert.match(update, /window\.addEventListener\('pageshow', \(\) => checkForUpdate\(\)\)/, 'Reabertura da página deve respeitar cooldown');
assert.match(update, /window\.addEventListener\('pagehide', event => \{\s*if \(!event\.persisted\) activateWaitingWorker\(\);\s*\}\);/s, 'Worker em espera só deve ser ativado quando a página realmente estiver saindo');
assert.match(update, /worker\.postMessage\(\{ type: 'FARO_ACTIVATE_WHEN_SAFE' \}\)/, 'Ativação segura precisa usar mensagem explícita e restrita');
assert.doesNotMatch(update, /location\.reload|skipWaiting\s*\(/, 'Módulo de atualização não pode recarregar a página nem ativar worker diretamente');

assert.match(sw, /const CORE_CACHE = 'faro-v1-core-12'/, 'Política segura atual exige geração de cache core-12');
assert.match(sw, /\.\/faro-update\.js\?v=1/, 'Worker precisa armazenar o módulo de atualização silenciosa');
assert.match(sw, /self\.addEventListener\('message', event => \{\s*if \(event\.data\?\.type === 'FARO_ACTIVATE_WHEN_SAFE'\) self\.skipWaiting\(\);\s*\}\);/s, 'Worker só pode antecipar ativação após sinal explícito de saída segura');

const installStart = sw.indexOf("self.addEventListener('install'");
const activateStart = sw.indexOf("self.addEventListener('activate'");
const messageStart = sw.indexOf("self.addEventListener('message'");
assert.ok(installStart >= 0 && activateStart > installStart && messageStart > activateStart, 'Ciclo install/activate/message precisa existir na ordem esperada');
const installBlock = sw.slice(installStart, activateStart);
const activateBlock = sw.slice(activateStart, messageStart);
assert.doesNotMatch(installBlock, /skipWaiting\s*\(/, 'Install não pode tomar a sessão ativa');
assert.doesNotMatch(activateBlock, /clients\.claim\s*\(/, 'Activate não pode assumir a página que o motorista ainda está usando');

assert.match(shell, /faro-update\.js\?v=1/, 'Shell precisa carregar a política silenciosa');
assert.ok(shell.indexOf('faro-update.js?v=1') < shell.indexOf('faro-state.js?v=1'), 'Política de atualização deve estar pronta antes dos módulos de produto');
assert.match(build, /'faro-update\.js'/, 'Build precisa publicar o módulo de atualização silenciosa');

console.log('FARO: atualização automática com cooldown e ativação somente na saída segura — ok');
