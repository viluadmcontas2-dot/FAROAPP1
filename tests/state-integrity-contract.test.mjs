import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const state = await readFile('faro-state.js', 'utf8');
const app = await readFile('app.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');
const account = await readFile('faro-account.js', 'utf8');
const navigation = await readFile('faro-navigation.js', 'utf8');

const contains = (source, snippet, label) => assert.equal(source.includes(snippet), true, label);

for (const required of [
  'paymentOccurrences',
  'paymentTrackingStartedAt',
  'reserveContributions',
  'reserveProfiles'
]) contains(state, required, `Guardião precisa normalizar ${required}`);

contains(state, 'const baseCloneDefaults = app.cloneDefaults', 'Todo estado novo precisa passar pelo guardião');
contains(state, 'const baseNormalizeState = app.normalizeState', 'Todo estado importado/restaurado precisa passar pelo guardião');
contains(state, 'return ensureExtensions(baseCloneDefaults.call(this))', 'Logout/defaults precisam nascer com extensões válidas');
contains(state, 'return ensureExtensions(baseNormalizeState.call(this, value))', 'Backup/remoto precisam manter extensões válidas');
contains(state, 'if (!Array.isArray(state.paymentOccurrences)) state.paymentOccurrences = []', 'Pagamento ausente deve virar lista vazia, nunca dado inventado');
contains(state, 'if (!Array.isArray(state.reserveContributions)) state.reserveContributions = []', 'Aportes ausentes devem virar lista vazia');
contains(state, 'state.reserveProfiles = {}', 'Perfis de reserva antigos precisam de objeto vazio válido');
assert.doesNotMatch(state, /paymentOccurrences\.push|reserveContributions\.push/, 'Guardião não pode inventar pagamentos ou aportes');

// 9.13 — cache do PWA e estado financeiro precisam permanecer em superfícies diferentes.
contains(app, 'localStorage.getItem(STORAGE_KEY)', 'Estado financeiro precisa ser lido do armazenamento local, não do cache do PWA');
contains(app, 'localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))', 'Estado financeiro precisa ser salvo no armazenamento local');
assert.doesNotMatch(sw, /localStorage|indexedDB|STORAGE_KEY/, 'Service worker não pode ler, gravar ou apagar o armazenamento financeiro');

// 9.14 — backup manual precisa ter identidade FARO e continuar passando pela normalização canônica ao restaurar.
contains(state, 'app.exportData = function()', 'Camada FARO precisa assumir a exportação de backup');
contains(state, "app: 'FARO'", 'Backup precisa se identificar como FARO');
contains(state, 'version: Number(this.state?.version || 1)', 'Backup precisa carregar a versão real do estado exportado');
contains(state, 'link.download = `faro-backup-${this.todayKey()}.json`', 'Arquivo de backup precisa usar nome FARO');
contains(state, "this.toast('Backup FARO exportado.')", 'Confirmação do backup precisa usar identidade FARO');

contains(app, 'const normalized = { ...base, ...value }', 'Normalização canônica deve preservar campos adicionais já existentes');
contains(app, 'this.state = data.version >= 3 ? this.normalizeState(data) : this.migrateLegacy(data)', 'Importação precisa passar por normalização');
contains(account, 'app.state = app.normalizeState(remote.state || {})', 'Restauração da conta precisa passar por normalização');
contains(account, 'app.state = app.cloneDefaults()', 'Logout precisa usar defaults protegidos pelo guardião');

assert.doesNotMatch(navigation, /this\.state\s*=\s*this\.cloneDefaults\(\)/, 'Reset de parâmetros não pode substituir o estado financeiro inteiro');
contains(navigation, 'this.state.targetProfit = fresh.targetProfit', 'Reset deve alterar só parâmetros futuros');

const stateIndex = shell.indexOf('faro-state.js?v=1');
const financeIndex = shell.indexOf('faro-finance.js?v=1');
const reservesIndex = shell.indexOf('faro-reserves.js?v=1');
const accountIndex = shell.indexOf('faro-account.js?v=1');
assert.ok(stateIndex > -1 && stateIndex < financeIndex && stateIndex < reservesIndex && stateIndex < accountIndex, 'Guardião de estado precisa carregar antes de Financeiro, Reservas e Conta');
contains(sw, 'faro-state.js?v=1', 'PWA precisa armazenar o guardião de estado');
contains(build, "'faro-state.js'", 'Build precisa copiar o guardião de estado');

console.log('FARO: cache separado dos dados, backup FARO, restauração, logout e reset preservam o estado financeiro — ok');
