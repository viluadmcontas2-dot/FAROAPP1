import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile('faro-home.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');

assert.match(shell, /faro-home\.js\?v=1/);
assert.match(sw, /faro-home\.js\?v=1/);
assert.match(build, /'faro-home\.js'/);
assert.match(home, /insertBefore\(weekCard, monthCard\)/);
assert.match(home, /Hoje já está registrado/);
assert.match(home, /Registrar meu dia/);
assert.match(home, /nextCommitment/);
assert.match(home, /item\.days > 3/);
assert.match(home, /Próximo compromisso/);
assert.match(home, /week\.target - week\.actual/);
assert.match(home, /plannedWeekRemaining/);

// B9 9.18–9.22: relógio/data e virada de mês não podem deixar a Home presa no período antigo.
assert.match(home, /let calendarKey = app\.todayKey\(\)/, 'Home precisa memorizar a data que está exibindo');
assert.match(home, /const refreshCalendarIfNeeded = \(\) => \{[\s\S]*const nextKey = app\.todayKey\(\);[\s\S]*if \(nextKey === calendarKey\) return false;[\s\S]*calendarKey = nextKey;[\s\S]*app\.render\(\);/,
  'Mudança de data precisa recalcular o app inteiro');
assert.match(home, /document\.addEventListener\('visibilitychange'[\s\S]*document\.visibilityState === 'visible'[\s\S]*refreshAfterResume\(\)/,
  'Retorno ao primeiro plano precisa conferir mudança de calendário');
assert.match(home, /window\.addEventListener\('pageshow', refreshAfterResume\)/, 'Retomada da página precisa conferir mudança de calendário');
assert.match(home, /window\.setInterval\(refreshCalendarIfNeeded, 60 \* 1000\)/, 'App aberto continuamente precisa detectar virada de dia sem navegação');

// B9 9.44: slider principal não pode recriar toda a Home várias vezes dentro do mesmo frame.
assert.match(home, /const optimizeTargetSlider = \(\) => \{[\s\S]*cloneNode\(true\)[\s\S]*slider\.replaceWith\(optimized\)/,
  'Slider FARO precisa substituir o listener legado que renderiza a cada input');
assert.match(home, /app\.state\.targetProfit = app\.number\(event\.currentTarget\.value\);[\s\S]*app\.save\(\);/,
  'Cada valor do slider precisa continuar sendo salvo imediatamente');
assert.match(home, /if \(renderFrame !== null\) return;[\s\S]*renderFrame = requestAnimationFrame\(\(\) => \{[\s\S]*app\.render\(\);/,
  'Render do slider precisa ser limitado a no máximo um por frame');

assert.match(home, /window\.FaroHome/);
assert.doesNotMatch(home, /pendente|atrasado|vencido/i, 'B4 não pode inventar status de pagamento antes de B6');

console.log('FARO: Home, calendário e slider de meta protegidos contra estado antigo e renders redundantes — ok');
