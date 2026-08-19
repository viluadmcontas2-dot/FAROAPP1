import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const r3b = await readFile('faro-r3b.js','utf8');
const interactions = await readFile('faro-interactions.js','utf8');
const planning = await readFile('faro-planning.js','utf8');
const shell = await readFile('app-shell.html','utf8');
const sw = await readFile('sw.js','utf8');
const build = await readFile('scripts/build-netlify-of.mjs','utf8');
const app = await readFile('app.js','utf8');

// R3-B é camada de identidade/interação, não outro motor financeiro.
assert.match(r3b, /window\.FaroPlanning/);
assert.match(r3b, /window\.FaroInteractions/);
assert.doesNotMatch(r3b, /localStorage|STORAGE_KEY/);
assert.doesNotMatch(r3b, /app\.state\.[A-Za-z0-9_]+\s*=/, 'R3-B não pode virar writer financeiro');
assert.match(app, /this\.\$\('extraDaysOffBadge'\)\.textContent/);
assert.match(planning, /app\.state\.targetProfit = targetDraft/);

// Identidade FARO: Plus Jakarta real, sem peso sintético 900 no novo acabamento.
assert.match(r3b, /Plus Jakarta Sans/);
assert.doesNotMatch(r3b, /font-weight\s*:\s*900/);
assert.doesNotMatch(interactions, /font-weight\s*:\s*900/);
assert.match(r3b, /#0B1121/);
assert.match(r3b, /#2563EB/);
assert.match(r3b, /faro-mark\.svg/);

// Ordem física final: plano protagonista antes das quatro ferramentas.
assert.match(r3b, /root\.insertBefore\(hero, firstGrid\)/);
assert.match(r3b, /Seu plano para/);
assert.match(r3b, /Para sobrar/);
assert.match(r3b, /Entender meu plano/);
for (const copy of ['Meta do mês','Dias na pista','Custo para rodar','Compromissos']) assert.match(r3b,new RegExp(copy));
assert.doesNotMatch(r3b, /setText\([^\n]*['"]Dinheiro['"]|setText\([^\n]*['"]Agenda['"]|setText\([^\n]*['"]Operação['"]/);

// Microcopy precisa responder intenção + consequência, não arquitetura interna.
assert.match(r3b, /Quanto você quer que sobre no fim do mês\?/);
assert.match(r3b, /Quais dias você pretende rodar\?/);
assert.match(r3b, /Quanto custa colocar o carro na pista\?/);
assert.match(r3b, /O que seu mês já tem comprometido/);
assert.match(r3b, /Aplicar no meu plano/);
assert.match(r3b, /Aplicar dias ao meu plano/);
assert.match(r3b, /Com esses dias, você terá/);
assert.match(r3b, /Com esses números, o FARO estima/);

// Cada intenção recebe a superfície correta.
assert.match(r3b, /id:'faroMetaDialog', variant:'focus'/);
assert.match(r3b, /id:'faroAgendaDialog', variant:'focus'/);
assert.match(r3b, /id:'faroOperationDialog', variant:'focus'/);
assert.match(r3b, /id:'faroMoneyDialog', variant:'workspace'/);
assert.match(interactions, /\.faro-dialog--focus\{width:min\(92vw,430px\)[\s\S]*margin:auto\}/);
assert.match(interactions, /\.faro-dialog--workspace\{width:min\(94vw,570px\)[\s\S]*margin:auto\}/);
assert.match(interactions, /scale\(\.94\)/);
assert.match(interactions, /backdrop-filter:blur\(8px\)/);
assert.match(interactions, /restoreFocus/);
assert.match(interactions, /prefers-reduced-motion:reduce/);
assert.match(r3b, /document\.startViewTransition/);

// Build/PWA precisam carregar exatamente a camada validada.
assert.match(shell, /faro-interactions\.js\?v=2[\s\S]*faro-planning\.js\?v=2[\s\S]*faro-planning-invariants\.js\?v=1[\s\S]*faro-r3b\.js\?v=1[\s\S]*faro-r3-routing\.js\?v=1/);
assert.match(sw, /faro-v1-core-15/);
assert.match(sw, /faro-interactions\.js\?v=2/);
assert.match(sw, /faro-r3b\.js\?v=1/);
assert.match(build, /'faro-r3b\.js'/);

console.log('FARO UX-R3-B: identidade, ordem protagonista, microcopy e modais centrais protegidos — ok');
