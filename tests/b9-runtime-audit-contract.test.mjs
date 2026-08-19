import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('app.js', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const shell = await readFile('legacy-shell.html', 'utf8');
const home = await readFile('faro-home-r2.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
const register = await readFile('faro-register.js', 'utf8');
const finance = await readFile('faro-finance.js', 'utf8');
const navigation = await readFile('faro-navigation.js', 'utf8');
const state = await readFile('faro-state.js', 'utf8');
const update = await readFile('faro-update.js', 'utf8');

// Retorno após interrupção revalida Home e preserva rascunho do Registro.
assert.match(home, /document\.addEventListener\('visibilitychange'[\s\S]*document\.visibilityState === 'visible'[\s\S]*refreshAfterResume\(\)/);
assert.match(register, /window\.addEventListener\('pagehide', saveDraft\)/);
assert.match(register, /document\.addEventListener\('visibilitychange'[\s\S]*document\.visibilityState === 'hidden'[\s\S]*saveDraft\(\)/);

// Router único + fallback para Início em rota desconhecida.
assert.match(app, /history\.pushState\(\{ vettaNavigation: true, view, primaryView: view \}/);
assert.match(app, /window\.addEventListener\('popstate', event => this\.restoreNavigation\(event\.state\)\)/);
assert.match(navigation, /!viewExists \|\| !primaryExists/);
assert.match(navigation, /this\.showView\('dashboard', 'dashboard'\)/);
assert.match(planning, /app\.openSecondary\(view\)/);
assert.doesNotMatch(planning, /app\.openSecondary\s*=|app\.navigateToPrimary\s*=/);

// Histórico grande não é remontado em toda alteração fora da tela.
assert.match(navigation, /if \(this\.currentView !== 'history'\) return;/);
assert.match(navigation, /baseRenderHistory\.apply\(this, args\)/);

// Camadas FARO têm guardas contra instalação duplicada.
assert.match(home, /document\.getElementById\('faroHomeFoundation'\)\) return/);
assert.match(register, /document\.getElementById\('faroRegisterFoundation'\)\) return/);
assert.match(navigation, /document\.getElementById\('faroNavigationFoundation'\)\) return/);
assert.match(finance, /if \(!app \|\| window\.FaroFinance\) return/);
assert.match(state, /if \(!app \|\| window\.FaroState\) return/);
assert.match(update, /if \(!app \|\| window\.FaroUpdate\) return/);
assert.match(planning, /window\.FaroPlanning\) return/);

// Gráficos e caches antigos são liberados.
assert.match(app, /if \(this\.compareChart\) this\.compareChart\.destroy\(\)/);
assert.match(app, /if \(this\.revenueChart\) this\.revenueChart\.destroy\(\)/);
assert.match(app, /if \(this\.historyChart\) this\.historyChart\.destroy\(\)/);
assert.match(sw, /const allowed = new Set\(\[CORE_CACHE, EXTERNAL_CACHE\]\)/);
assert.match(sw, /keys\.filter\(key => !allowed\.has\(key\)\)\.map\(key => caches\.delete\(key\)\)/);

// R2 substitui throttling de autosave por draft: arrastar não salva/renderiza o app.
assert.match(planning, /slider\.removeAttribute\('data-model'\)/);
assert.match(planning, /slider\?\.addEventListener\('input'[\s\S]*targetDraft = clampTarget[\s\S]*renderTargetDraft\(\)/);
assert.match(planning, /faroTargetApply[\s\S]*app\.state\.targetProfit = targetDraft[\s\S]*app\.save\(\)[\s\S]*app\.render\(\)/);

// Dependências externas existentes têm consumidores claros.
assert.match(shell, /https:\/\/cdn\.tailwindcss\.com/);
assert.match(shell, /https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js/);
assert.match(shell, /font-awesome\/6\.4\.0\/css\/all\.min\.css/);
assert.match(shell, /Plus\+Jakarta\+Sans/);
assert.match(app, /new Chart\(/);
assert.match(sw, /'https:\/\/cdn\.tailwindcss\.com'/);
assert.match(sw, /'https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js'/);

console.log('FARO UX-R2: interrupção, router, listeners, caches, gráficos e draft de meta protegidos — ok');
