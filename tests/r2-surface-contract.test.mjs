import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const polish = await readFile('faro-r2-polish.js', 'utf8');
const tour = await readFile('faro-tour.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');

assert.match(polish, /faroHistoryAnalytics/);
assert.match(polish, /<summary>Ver evolução do líquido<\/summary>/);
assert.match(polish, /centralIntro\?\.remove\(\)/);
assert.match(polish, /heading\.textContent = 'Central'/);
assert.match(polish, /Conta e dados/);
assert.match(polish, /Ferramentas/);
assert.match(polish, /Aplicativo/);
assert.match(polish, /Ajuda/);
assert.match(polish, /Segurança/);
assert.match(tour, /id = 'faroTourHelp'/);
assert.match(polish, /insertBefore\(help, safety\)/);
assert.ok(shell.indexOf('faro-tour.js?v=2') < shell.indexOf('faro-r2-polish.js?v=1'), 'Tour deve criar Ajuda antes do polish ordenar a Central');

console.log('FARO UX-R2: Histórico prioriza lista e Central mantém Ajuda antes da zona de segurança — ok');
