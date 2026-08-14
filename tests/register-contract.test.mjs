import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const register = await readFile('faro-register.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(shell, /faro-register\.js\?v=1/);
assert.match(sw, /faro-register\.js\?v=1/);
assert.match(build, /'faro-register\.js'/);
assert.match(register, /const DRAFT_KEY = 'faro-record-draft-v1'/);
for (const chip of ['\+ R\$50','\+ R\$100','\+ R\$200','\+ 5 km','\+ 10 km','\+ 50 km']) assert.match(register, new RegExp(chip));
assert.match(register, /current \+ increment/);
assert.match(register, /localStorage\.setItem\(DRAFT_KEY/);
assert.match(register, /visibilitychange/);
assert.match(register, /editingExisting/);
assert.match(register, /if \(saving\) return/);
assert.match(register, /aria-busy/);
assert.match(register, /remainingWeek/);
assert.match(register, /Na semana, faltam/);
assert.match(register, /No mês, faltam/);
assert.match(register, /setAttribute\('inputmode', 'decimal'\)/);
assert.match(register, /\$\('clearDayButton'\)\?\.addEventListener\('click'[\s\S]*clearDraft\(\)/);
assert.doesNotMatch(register, /state\.records\.push|state\.records\.splice/);
assert.doesNotMatch(register, /dailyGross\s*=|dailyNet\s*=/, 'Registro UX não cria motor financeiro paralelo');

console.log('FARO: Registro rápido com chips, rascunho, limpar coerente, teclado decimal e proteção de save — ok');
