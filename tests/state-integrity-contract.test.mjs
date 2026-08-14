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

console.log('FARO: backup antigo, remoto antigo, logout e reset preservam estruturas financeiras modernas — ok');
