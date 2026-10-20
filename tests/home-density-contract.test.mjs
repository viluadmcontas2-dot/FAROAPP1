// Início menos denso: escala única de espaçamento, ordem por proximidade e detalhes recolhidos.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const theme = await readFile('faro-theme.css', 'utf8');
const home = await readFile('faro-home-r2.js', 'utf8');
const style = home.slice(home.indexOf('style.textContent'));

// 1) Escala 4/8/12/16/24 definida em UM lugar (faro-theme.css) e só consumida pelo Início.
for (const [token, px] of [['--sp-1', 4], ['--sp-2', 8], ['--sp-3', 12], ['--sp-4', 16], ['--sp-5', 24]]) {
  assert.match(theme, new RegExp(`${token}:\\s*${px}px`), `faro-theme.css precisa definir ${token}: ${px}px`);
  assert.doesNotMatch(home, new RegExp(`${token}:\\s*\\d`), `${token} só pode ser definido em faro-theme.css`);
}
assert.match(style, /#view-dashboard\{[^}]*display:flex[^}]*flex-direction:column[^}]*gap:var\(--sp-3\)/,
  'O Início precisa de um único gap entre blocos, vindo do token');
assert.match(style, /#view-dashboard>\*\+\*\{margin-top:0\}/, 'space-y-6 do legado não pode somar com o gap');
assert.ok((style.match(/var\(--sp-\d\)/g) || []).length >= 12, 'Início deve usar os tokens de espaçamento');
assert.doesNotMatch(style, /#faro(?:HomeStreak|AchievementsLine|HomeDetails)[^{]*\{[^}]*margin-top:\d+px/, 'margens dos blocos usam token, não px solto');

// 2) Ordem lógica por proximidade: herói+meta, ação, status, conquistas, detalhes.
const order = id => Number(new RegExp(`${id}[^{]*\\{[^}]*order:(\\d+)`).exec(style)?.[1]);
const sequence = ['#faroHomeHero', '#faroHomeGoal', '\\[data-faro-primary="true"\\]\\.faro-action-card', '#faroHomeAttention', '#faroHomeStreak', '#faroAchievementsLine', '#faroHomeDetails'].map(order);
assert.ok(sequence.every(Number.isFinite), 'todo bloco do Início precisa de order explícito: ' + sequence);
assert.deepEqual([...sequence].sort((a, b) => a - b), sequence, 'ordem: herói, meta, registrar, atenção, sequência, conquistas, detalhes');

// 3) Divulgação progressiva: Detalhes nasce recolhido; a meta (número, ritmo e frase) fica junta no topo.
assert.doesNotMatch(home, /details\.open\s*=\s*true|<details[^>]*\bopen\b/, 'Detalhes não pode nascer aberto');
assert.match(home, /const goal = document\.createElement\('button'\)[\s\S]*id="faroGoalText"/, 'a frase da meta fica dentro do bloco da meta');
assert.match(home, /<summary><span>Detalhes<\/span>/);
assert.match(style, /#faroHomeDetails \.card-vetta\{[^}]*padding:var\(--sp-4\)/, 'cards internos usam o mesmo padding');

// 4) Alvos de toque e texto mínimo.
assert.doesNotMatch(style, /font(?:-size)?:[^;}]*\b(?:9|10|11)px/, 'nenhum texto do Início abaixo de 12px');
assert.match(style, /#faroHomeDetails>summary\{[^}]*min-height:48px/);
console.log('home-density-contract ok');
