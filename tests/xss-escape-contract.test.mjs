import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const files = readdirSync('.').filter(file => /^faro-(account|finance|reserves|planning|r3b|interactions|notifications|onboarding.*|tour|platform|energy|state|update|register|register-earnings|home-r2|brand-r2)\.js$/.test(file));
// Leitor lexical pequeno: balanceia expressões, strings e templates aninhados.
// Não interpreta JS nem confunde o primeiro `}` de um objeto com o fim de ${...}.
export function templates(source) {
  const found = [];
  function quoted(i) { const q = source[i++]; while (i < source.length) { if (source[i] === '\\') i += 2; else if (source[i++] === q) break; } return i; }
  function code(i, depth = 0) {
    while (i < source.length) {
      const c = source[i];
      if (c === '"' || c === "'") i = quoted(i);
      else if (c === '`') i = template(i);
      else if (source.slice(i,i+2) === '//') { const end = source.indexOf('\n',i); i = end < 0 ? source.length : end + 1; }
      else if (source.slice(i,i+2) === '/*') i = source.indexOf('*/',i+2) + 2;
      else if (c === '{') { depth++; i++; }
      else if (c === '}' && depth) { if (--depth === 0) return i; i++; }
      else i++;
    }
    return i;
  }
  function template(start) {
    let i = start + 1, literal = '', expressions = [];
    while (i < source.length) {
      if (source[i] === '\\') { literal += source.slice(i,i+2); i += 2; }
      else if (source[i] === '`') { found.push({ start, end:i+1, literal, expressions }); return i+1; }
      else if (source.slice(i,i+2) === '${') { const end = code(i+2,1); expressions.push(source.slice(i+2,end)); i = end+1; }
      else literal += source[i++];
    }
    throw Error('Template sem fechamento');
  }
  code(0);
  return found;
}
// Exceções de composição, nunca dados: cada template filho é examinado separadamente.
const compositions = new Set([
  "item.status === 'paid' ? TEMPLATE : TEMPLATE", // botões/atributos com IDs escapados
  "goal > 0 ? TEMPLATE : ''", "goal > 0 ? TEMPLATE : TEMPLATE",
  "goal > 0 ? TEMPLATE : '<p class=\"text-xs text-slate-500 mt-2\">Sem meta total definida. O saldo continua sendo acompanhado normalmente.</p>'",
  "profile.targetDate ? TEMPLATE : ''", "recent.length ? TEMPLATE : ''",
  "recent.map(entry => TEMPLATE).join('')",
  "recent.length ? recent.map(entry => TEMPLATE).join('') : '<div class=\"faro-r3b2-contribution\"><span>Nenhum aporte registrado ainda.</span></div>'",
  'primary', // billMarkup: dois botões locais; IDs escapados
  'brandMark(source)', 'chipsMarkup', 'keypadMarkup', 'storeMarkup', // faro-register: filhos já escapam source.key/label/asset
  'rows', // billGroup: items.map(billMarkup).join('')
  'groupLabel(title,items)',
  "billGroup('Precisa de você',urgent)", "billGroup('Próximos dias',next)",
  "billGroup('Mais adiante',later,{collapsed:later.length > 3})", "billGroup('Resolvidas',resolved,{collapsed:true})"
]);
function shape(expression) {
  const nested = templates(expression).sort((a,b) => a.start-b.start);
  let result = '', end = 0;
  for (const t of nested) { if (t.start < end) continue; result += expression.slice(end,t.start) + 'TEMPLATE'; end = t.end; }
  return result + expression.slice(end);
}
function htmlTemplate(source,t) {
  return /<[a-z!/]|data-r3-/.test(t.literal) || /innerHTML\s*=\s*$/.test(source.slice(Math.max(0,t.start-80),t.start)) || /window\.FaroSafe\.html$/.test(source.slice(0,t.start));
}
function wholeCall(expression, name) {
  const prefix = `window.FaroSafe.${name}(`;
  if (!expression.startsWith(prefix)) return false;
  const nested = new Map(templates(expression).map(t => [t.start,t.end]));
  let depth = 1;
  for (let i = prefix.length; i < expression.length; i++) {
    if (nested.has(i)) { i = nested.get(i)-1; continue; }
    if (expression[i] === "'" || expression[i] === '"') {
      const quote = expression[i++];
      while (i < expression.length && expression[i] !== quote) { if (expression[i] === '\\') i++; i++; }
    } else if (expression[i] === '(') depth++;
    else if (expression[i] === ')' && --depth === 0) return i === expression.length-1;
  }
  return false;
}
export function violations(source) {
  const errors = [];
  for (const t of templates(source)) {
    const html = htmlTemplate(source,t);
    if (!html) continue;
    const tagged = /window\.FaroSafe\.html$/.test(source.slice(0,t.start));
    for (const expression of t.expressions) {
      if (tagged && !/FaroSafe\.raw\(/.test(expression)) continue;
      if (wholeCall(expression,'esc')) continue;
      if (wholeCall(expression,'raw') && compositions.has(shape(expression.slice(20,-1)))) continue;
      errors.push(`${source.slice(0,t.start).split('\n').length}: ${expression.slice(0,100)}`);
    }
  }
  return errors;
}
assert.equal(violations('el.innerHTML = `<b>${name}</b>`').length, 1);
assert.equal(violations('el.innerHTML = `<b>${window.FaroSafe.esc(name)}</b>`').length, 0);
assert.equal(violations('el.innerHTML = `<b>${window.FaroSafe.raw(name)}</b>`').length, 1);
// Allowlist dos caminhos até innerHTML: rejeita aliases e concatenações novos.
// STATIC = literal; HTML = template verificado acima. Os map() compõem apenas
// esses templates; reserveMarkup/billMarkup também passam pela análise acima.
function sinkShapes(source) {
  let masked = '', end = 0;
  for (const t of templates(source).sort((a,b) => a.start-b.start)) {
    if (t.start < end) continue;
    masked += source.slice(end,t.start) + (t.expressions.length ? (htmlTemplate(source,t) ? 'HTML' : 'TEXT') : 'STATIC'); end = t.end;
  }
  masked += source.slice(end);
  masked = masked.replace(/window\.FaroSafe\.html(?:HTML|STATIC)/g,'HTML');
  masked = masked.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, 'STATIC');
  const shapes = [];
  for (const match of masked.matchAll(/\.innerHTML\s*(?:\+?=)|\.insertAdjacentHTML\s*\(/g)) {
    let i = match.index + match[0].length, start = i, depth = 0;
    for (; i < masked.length; i++) {
      const char = masked[i];
      if ('({['.includes(char)) depth++;
      if (')}]'.includes(char)) depth--;
      if (char === ';' && depth === 0) break;
    }
    shapes.push(masked.slice(start,i).replace(/\s+/g,' ').trim());
  }
  return shapes;
}
const allowedSinks = new Set([
  'STATIC', 'HTML',
  'rows.map(item => HTML).join(STATIC)', 'next ? HTML : STATIC',
  'draft.otherCosts.length ? draft.otherCosts.map((item,index) => HTML).join(STATIC) : STATIC',
  'WEEK.map(item => HTML).join(STATIC)',
  'rows.length ? rows.map(item => HTML).join(STATIC) : STATIC',
  'tutorial.steps.map(step => HTML).join(STATIC)',
  'model.reserveRules.length ? model.reserveRules.map(reserveMarkup).join(STATIC) : STATIC',
  'reserves.length ? reserves.map(reserve => { const balance = window.FaroReserves?.balanceFor?.(reserve.id) || 0; const profile = app.state.reserveProfiles?.[reserve.id] || {}; const goal = app.number(profile.goalAmount); const progress = goal > 0 ? Math.min(100,Math.max(0,balance/goal*100)) : null; const recent = window.FaroReserves?.contributionsFor?.(reserve.id)?.slice(0,3) || []; return HTML; }).join(STATIC) : STATIC',
  'reserves.map(reserve => { const balance = balanceFor(reserve.id); const profile = profileFor(reserve.id); const goal = app.number(profile.goalAmount); const progress = goal > 0 ? Math.min(100, Math.max(0, balance / goal * 100)) : null; const recent = contributionsFor(reserve.id).slice(0,3); return HTML; }).join(STATIC)'
]);
for (const file of files) {
  for (const sink of sinkShapes(readFileSync(file,'utf8'))) assert.ok(allowedSinks.has(sink), `${file}: sink não revisado: ${sink}`);
}
assert.ok(!allowedSinks.has(sinkShapes('el.innerHTML = user.name;')[0]));
assert.ok(!allowedSinks.has(sinkShapes('el.innerHTML = rows.map(item => `${item.name}`).join("");')[0]));
assert.equal(violations('el.innerHTML = `<p>${window.FaroSafe.esc(name) + unsafe()}</p>`').length,1);
assert.ok(!allowedSinks.has(sinkShapes('el.innerHTML = `<b>ok</b>` + user.name;')[0]));
const radar = readFileSync('faro-r3b.js','utf8');
assert.match(radar, /const rows = items\.map\(billMarkup\)\.join\(''\);/);
assert.match(radar, /const primary = item\.status === 'paid'\s*\? `<button[\s\S]*?: `<button[^`]+`;/);
assert.equal(violations('el.innerHTML = window.FaroSafe.html`<b>${name}</b>`').length, 0);
const errors = files.flatMap(file => violations(readFileSync(file,'utf8')).map(error => `${file}:${error}`));
assert.deepEqual(errors, [], 'Interpolações HTML devem passar pelo escape central; raw só admite composição revisada');
const context = { window:{} }; vm.runInNewContext(readFileSync('faro-safe.js','utf8'),context);
const { esc, html, raw } = context.window.FaroSafe;
assert.equal(esc('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
assert.equal(esc(null), ''); assert.equal(esc(undefined), ''); assert.equal(esc(0), '0');
assert.equal(String(html`<p>${'<img src=x>'}${raw('<b>ok</b>')}</p>`), '<p>&lt;img src=x&gt;<b>ok</b></p>');
assert.equal(String(html`${{ toString:() => '<img>' }}`), '&lt;img&gt;');
const shell = readFileSync('app-shell.html','utf8');
assert.ok(shell.indexOf('./faro-safe.js?v=1') < shell.indexOf('./faro-brand-r2.js?v=2'));
assert.match(shell,/\.\/faro-safe\.js\?v=1/);
assert.match(readFileSync('sw.js','utf8'), /'\.\/faro-safe\.js\?v=1'/);
assert.match(readFileSync('scripts/build-static-site.mjs','utf8'), /'faro-safe.js'/);
console.log('PASS escape central: contrato, composição e carregamento');
