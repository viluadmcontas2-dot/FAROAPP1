// Compilador do template do design -> view.gen.js (sem eval/new Function em runtime).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileTemplate } from '../tools/compile-template.mjs';

const root = resolve(import.meta.dirname, '..');

async function load(html) {
  const { code } = compileTemplate(html);
  const dir = mkdtempSync(join(tmpdir(), 'faro-tpl-'));
  const f = join(dir, 'v.mjs');
  // o modulo gerado importa 'react': aponta para o react do projeto
  writeFileSync(f, code.replace("from 'react'", `from '${pathToFileURL(join(root, 'node_modules/react/index.js'))}'`));
  return (await import(pathToFileURL(f))).View;
}
const html = (View, vals) => renderToStaticMarkup(View(vals));

test('texto, caminho pontilhado e valores vazios', async () => {
  const View = await load('<div class="a {{ t.c }}">Oi {{ u.name }}!<b>{{ n }}</b>{{ nada }}{{ f }}</div>');
  assert.equal(html(View, { t: { c: 'x' }, u: { name: 'Ana' }, n: 0, f: false }),
    '<div class="a x">Oi Ana!<b>0</b></div>');
  assert.equal(html(View, {}), '<div class="a ">Oi !<b></b></div>');
});

test('sc-if: verdadeiro, falso e negacao', async () => {
  const View = await load('<sc-if value="{{ a }}"><i>A</i></sc-if><sc-if value="{{ !a }}"><i>B</i></sc-if><sc-if value="{{ k === \'x\' }}"><i>C</i></sc-if>');
  assert.equal(html(View, { a: true, k: 'x' }), '<i>A</i><i>C</i>');
  assert.equal(html(View, { a: 0, k: 'y' }), '<i>B</i>');
});

test('sc-for: escopo local, aninhado, nao-array vira lista vazia', async () => {
  const View = await load('<ul><sc-for list="{{ rows }}" as="r"><li>{{ r.n }}:<sc-for list="{{ r.xs }}" as="x"><b>{{ x }}{{ r.n }}</b></sc-for></li></sc-for></ul>');
  assert.equal(html(View, { rows: [{ n: 'a', xs: [1, 2] }, { n: 'b', xs: [] }] }),
    '<ul><li>a:<b>1a</b><b>2a</b></li><li>b:</li></ul>');
  assert.equal(html(View, { rows: 'nao' }), '<ul></ul>');
  // variavel do for nao vaza nem apaga a de fora
  const V2 = await load('<sc-for list="{{ l }}" as="p"><i>{{ p }}</i></sc-for><u>{{ p }}</u>');
  assert.equal(html(V2, { l: ['x'], p: 'fora' }), '<i>x</i><u>fora</u>');
});

test('style string vira objeto (com {{ }}), class vira className, vendor prefix', async () => {
  const View = await load('<div style="color:{{ c }};-webkit-font-smoothing:antialiased;z-index:5;--k:{{ k }}" class="q">x</div>');
  const out = html(View, { c: 'red', k: '3px' });
  assert.match(out, /style="color:red;-webkit-font-smoothing:antialiased;z-index:5;--k:3px"/);
  assert.match(out, /class="q"/);
});

test('atributos sc-camel-*, eventos e SVG', async () => {
  const View = await load('<button sc-camel-on-click="{{ go }}" aria-label="ok">b</button><svg sc-camel-view-box="0 0 10 10" width="10"><circle cx="1" stroke-width="2" stroke-linecap="round"></circle></svg><input sc-camel-input-mode="numeric" value="{{ v }}" sc-camel-on-change="{{ ch }}">');
  let clicked = 0;
  const el = View({ go: () => clicked++, v: '5', ch: () => {} });
  const kids = el.props.children;
  assert.equal(typeof kids[0].props.onClick, 'function');
  kids[0].props.onClick();
  assert.equal(clicked, 1);
  const out = renderToStaticMarkup(el);
  assert.match(out, /viewBox="0 0 10 10"/);
  assert.match(out, /stroke-width="2"/);
  assert.match(out, /stroke-linecap="round"/);
  assert.match(out, /inputMode="numeric"|inputmode="numeric"/);
  assert.match(out, /value="5"/);
});

test('ref passa para o React e style-active vira classe de pseudo estado', async () => {
  const { code, css } = compileTemplate('<div ref="{{ r }}" style-active="transform:scale(.9)">x</div>');
  assert.match(css, /:active\{transform:scale\(\.9\) !important\}/);
  assert.match(code, /ref/);
  assert.doesNotMatch(code, /\beval\b|new Function/);
});

test('expressao nao suportada falha na compilacao (nunca em runtime)', () => {
  assert.throws(() => compileTemplate('<b>{{ a + b }}</b>'), /nao suportada|não suportada/i);
  assert.throws(() => compileTemplate('<b>{{ foo() }}</b>'), /suportada/i);
});

test('view.gen.js real: cabecalho de arquivo gerado e sem eval/new Function', () => {
  const f = join(root, 'src/ui/view.gen.js');
  assert.ok(existsSync(f), 'rode: node tools/compile-template.mjs');
  const src = readFileSync(f, 'utf8');
  assert.match(src.split('\n').slice(0, 3).join('\n'), /GERADO/);
  assert.doesNotMatch(src, /\beval\s*\(|new Function|Function\(/);
  assert.doesNotMatch(src, /\{\{|sc-if|sc-for|sc-camel/);
});

test('view.gen.js esta em dia com src/ui/template.body.html', async () => {
  const tpl = readFileSync(join(root, 'src/ui/template.body.html'), 'utf8');
  const { code } = compileTemplate(tpl);
  assert.equal(readFileSync(join(root, 'src/ui/view.gen.js'), 'utf8'), code, 'view.gen.js desatualizado: rode node tools/compile-template.mjs');
});

test('app real renderiza onboarding e home a partir do store (sem dado de mentira)', async () => {
  const { default: App } = await import(pathToFileURL(join(root, 'src/ui/logic.js')));
  const { createStore } = await import(pathToFileURL(join(root, 'src/data/store.js')));
  const store = createStore({ persister: { load: () => null, schedule() {}, flush: () => true }, autoFlush: false });
  const broken = /\{\{|sc-if|sc-for|undefined|NaN/;
  const onboarding = renderToStaticMarkup(React.createElement(App, { store }));
  assert.match(onboarding, /Farejar meu lucro/);
  assert.doesNotMatch(onboarding, broken);
  store.dispatch({ type: 'onboarding/complete', payload: {} });
  const home = renderToStaticMarkup(React.createElement(App, { store }));
  assert.ok(home.length > 2000, 'html renderizado muito curto');
  assert.match(home, /Lucro líquido estimado/);
  assert.doesNotMatch(home, broken);
  assert.doesNotMatch(home, /9:41|Chevrolet|84\.320/, 'sem moldura nem dado de mentira do protótipo');
});

test('bundle de producao (_site) sem eval/new Function e sem scripts inline', () => {
  const out = mkdtempSync(join(tmpdir(), 'faro-site-'));
  execFileSync(process.execPath, [join(root, 'scripts/build-app.mjs')], { cwd: root, env: { ...process.env, FARO_APP_OUT: out }, stdio: 'pipe' });
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(idx, /<meta name="viewport"/);
  assert.match(idx, /rel="manifest"/);
  assert.doesNotMatch(idx.replace(/<script[^>]*\bsrc=[^>]*><\/script>/g, ''), /<script/i, 'script inline proibido (CSP)');
  assert.doesNotMatch(idx, /\son[a-z]+=/i);
  const walk = d => readdirSync(d).flatMap(n => statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]);
  const js = walk(out).filter(f => f.endsWith('.js'));
  assert.ok(js.length >= 1, 'sem js no bundle');
  for (const f of js) {
    const s = readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /\beval\s*\(/, f);
    assert.doesNotMatch(s, /new\s+Function\s*\(/, f);
    assert.doesNotMatch(s, /\{\{\s*[a-z]/i, `${f} ainda tem marcacao {{ }}`);
  }
  assert.ok(walk(out).some(f => f.endsWith('.woff2')), 'fontes locais ausentes');
});
