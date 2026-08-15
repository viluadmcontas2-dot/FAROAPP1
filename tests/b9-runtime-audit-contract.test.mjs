import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('app.js', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const shell = await readFile('legacy-shell.html', 'utf8');
const home = await readFile('faro-home.js', 'utf8');
const register = await readFile('faro-register.js', 'utf8');
const finance = await readFile('faro-finance.js', 'utf8');
const navigation = await readFile('faro-navigation.js', 'utf8');
const state = await readFile('faro-state.js', 'utf8');
const update = await readFile('faro-update.js', 'utf8');

// 9.35–9.36 — retorno após interrupção precisa revalidar Home e preservar rascunho do Registro.
assert.match(home, /document\.addEventListener\('visibilitychange'[\s\S]*document\.visibilityState === 'visible'[\s\S]*refreshAfterResume\(\)/);
assert.match(register, /window\.addEventListener\('pagehide', saveDraft\)/);
assert.match(register, /document\.addEventListener\('visibilitychange'[\s\S]*document\.visibilityState === 'hidden'[\s\S]*saveDraft\(\)/);

// 9.38–9.39 — router único + fallback para Início em rota desconhecida.
assert.match(app, /history\.pushState\(\{ vettaNavigation: true, view, primaryView: view \}/);
assert.match(app, /window\.addEventListener\('popstate', event => this\.restoreNavigation\(event\.state\)\)/);
assert.match(navigation, /!viewExists \|\| !primaryExists/);
assert.match(navigation, /this\.showView\('dashboard', 'dashboard'\)/);

// 9.40–9.41 — Histórico grande não deve ser remontado em toda alteração fora da tela.
assert.match(navigation, /if \(this\.currentView !== 'history'\) return;/);
assert.match(navigation, /baseRenderHistory\.apply\(this, args\)/);

// 9.42 — camadas FARO precisam ter guardas para não instalar listeners/wrappers duas vezes na mesma página.
assert.match(home, /document\.getElementById\('faroHomeFoundation'\)\) return/);
assert.match(register, /document\.getElementById\('faroRegisterFoundation'\)\) return/);
assert.match(navigation, /document\.getElementById\('faroNavigationFoundation'\)\) return/);
assert.match(finance, /if \(!app \|\| window\.FaroFinance\) return/);
assert.match(state, /if \(!app \|\| window\.FaroState\) return/);
assert.match(update, /if \(!app \|\| window\.FaroUpdate\) return/);

// 9.43 — gráficos antigos e caches antigos precisam ser liberados em vez de crescer por geração.
assert.match(app, /if \(this\.compareChart\) this\.compareChart\.destroy\(\)/);
assert.match(app, /if \(this\.revenueChart\) this\.revenueChart\.destroy\(\)/);
assert.match(app, /if \(this\.historyChart\) this\.historyChart\.destroy\(\)/);
assert.match(sw, /const allowed = new Set\(\[CORE_CACHE, EXTERNAL_CACHE\]\)/);
assert.match(sw, /keys\.filter\(key => !allowed\.has\(key\)\)\.map\(key => caches\.delete\(key\)\)/);

// 9.44 — slider de meta só pode disparar um render por frame.
assert.match(home, /requestAnimationFrame\(\(\) => \{[\s\S]*app\.render\(\)/);

// 9.45 — dependências externas existentes têm consumidores claros na fotografia atual.
assert.match(shell, /https:\/\/cdn\.tailwindcss\.com/);
assert.match(shell, /https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js/);
assert.match(shell, /font-awesome\/6\.4\.0\/css\/all\.min\.css/);
assert.match(shell, /Plus\+Jakarta\+Sans/);
assert.match(shell, /class="[^"]*\bfas\b/);
assert.match(app, /new Chart\(/);
assert.match(sw, /'https:\/\/cdn\.tailwindcss\.com'/);
assert.match(sw, /'https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js'/);
assert.match(sw, /'https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css'/);
assert.match(sw, /'https:\/\/fonts\.googleapis\.com\/css2\?family=Plus\+Jakarta\+Sans/);

console.log('FARO B9: interrupção, navegação, listeners, caches, gráficos, renders e dependências 9.35–9.45 protegidos — ok');
