#!/usr/bin/env node
// Compila src/ui/template.body.html -> src/ui/view.gen.js (React.createElement estatico).
// (design/ guarda o original so como referencia historica; a fonte da verdade e src/ui.)
// Semantica identica ao runtime do design (sc-for, sc-if, {{ }}, style string, sc-camel-*),
// mas TODO o codigo e gerado aqui, no build: nada de eval/new Function em runtime (CSP estrita).
import { parseFragment } from 'parse5';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAMEL = 'sc-camel-';
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*/;
const NUMBER = /^-?\d+(\.\d+)?$/;
const SVG_CAMEL = new Set(['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-miterlimit', 'stroke-opacity', 'fill-opacity', 'fill-rule', 'clip-rule', 'clip-path', 'stop-color', 'stop-opacity',
  'text-anchor', 'font-size', 'font-weight', 'font-family', 'marker-end', 'marker-start', 'marker-mid', 'vector-effect']);

const kebabToCamel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const fail = (msg) => { throw new Error(`compile-template: ${msg}`); };

// ---------- expressoes ({{ ... }}) -> codigo JS estatico ----------
function parensWrapWhole(e) {
  let d = 0;
  for (let i = 0; i < e.length - 1; i++) {
    if (e[i] === '(') d++;
    else if (e[i] === ')') { d--; if (d === 0) return false; }
  }
  return true;
}
function findEquality(e) {
  let d = 0;
  for (let i = 0; i < e.length; i++) {
    const c = e[i];
    if (c === '[' || c === '(') d++;
    else if (c === ']' || c === ')') d--;
    else if (d === 0 && (c === '=' || c === '!') && e[i + 1] === '=') {
      if (i > 0 && (e[i - 1] === '=' || e[i - 1] === '!')) continue;
      if (!e.slice(0, i).trim()) continue;
      return { index: i, op: e[i + 2] === '=' ? c + '==' : c + '=' };
    }
  }
  return null;
}
const prop = k => (IDENT.test(k) && IDENT.exec(k)[0] === k ? `.${k}` : `[${JSON.stringify(k)}]`);

export function exprToJs(src, scope) {
  const e = String(src).trim();
  if (!e) return 'undefined';
  if (e[0] === '(' && e[e.length - 1] === ')' && parensWrapWhole(e)) return `(${exprToJs(e.slice(1, -1), scope)})`;
  const eq = findEquality(e);
  if (eq) return `(${exprToJs(e.slice(0, eq.index), scope)} ${eq.op} ${exprToJs(e.slice(eq.index + eq.op.length), scope)})`;
  if (e[0] === '!') return `!${exprToJs(e.slice(1), scope)}`;
  if (e === 'true' || e === 'false' || e === 'null') return e;
  if (e === 'undefined') return 'undefined';
  if (NUMBER.test(e)) return e;
  if (e.length >= 2 && (e[0] === '"' || e[0] === "'") && e[e.length - 1] === e[0] && !e.slice(1, -1).includes(e[0])) {
    return JSON.stringify(e.slice(1, -1));
  }
  const head = IDENT.exec(e);
  if (!head) fail(`expressao nao suportada: {{ ${e} }}`);
  let js = scope.has(head[0]) ? scope.get(head[0]) : `v${prop(head[0])}`;
  let i = head[0].length;
  while (i < e.length) {
    if (e[i] === '.') {
      const rest = e.slice(i + 1);
      const m = IDENT.exec(rest) || /^\d+/.exec(rest);
      if (!m) fail(`expressao nao suportada: {{ ${e} }}`);
      js += `?.${/^\d/.test(m[0]) ? `[${m[0]}]` : m[0]}`;
      i += 1 + m[0].length;
    } else if (e[i] === '[') {
      let d = 1, j = i + 1;
      while (j < e.length && d > 0) { if (e[j] === '[') d++; else if (e[j] === ']') { d--; if (!d) break; } j++; }
      if (d !== 0) fail(`expressao nao suportada: {{ ${e} }}`);
      js += `?.[${exprToJs(e.slice(i + 1, j), scope)}]`;
      i = j + 1;
    } else fail(`expressao nao suportada: {{ ${e} }}`);
  }
  return js;
}

// valor de atributo: "{{ x }}" puro mantem o tipo; misto vira string
function attrToJs(raw, scope) {
  const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
  if (whole && !/\{\{/.test(whole[1])) return { js: exprToJs(whole[1], scope), dynamic: true };
  if (raw.includes('{{')) {
    const parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
    const js = parts.map((s, i) => (i & 1 ? `(${exprToJs(s, scope)} ?? "")` : JSON.stringify(s))).filter(x => x !== '""').join(' + ');
    return { js: `"" + ${js}`, dynamic: true };
  }
  return { js: JSON.stringify(raw), dynamic: false };
}

// ---------- estilo ----------
function styleToJs(raw, scope, hoist) {
  const decls = raw.split(';').map(d => d.trim()).filter(Boolean);
  const entries = [];
  let ok = true;
  for (const d of decls) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const name = d.slice(0, i).trim();
    if (name.includes('{{')) { ok = false; break; }
    let key = name.startsWith('--') ? name : kebabToCamel(name.startsWith('-ms-') ? name.slice(1) : name);
    entries.push([key, d.slice(i + 1).trim()]);
  }
  if (!ok) return { js: `$css(${attrToJs(raw, scope).js})`, dynamic: true };
  let dynamic = false;
  const body = entries.map(([k, val]) => {
    const a = attrToJs(val, scope);
    dynamic ||= a.dynamic;
    return `${JSON.stringify(k)}: ${a.js}`;
  }).join(', ');
  if (!dynamic) return { js: hoist(`{ ${body} }`), dynamic: false };
  return { js: `{ ${body} }`, dynamic: true };
}

// ---------- gerador ----------
export function compileTemplate(source) {
  // o runtime do design codifica atributos camelCase como sc-camel-*; parse5 minusculiza os nomes
  const html = source
    .replace(/<helmet(\s|>)/gi, '<sc-helmet$1').replace(/<\/helmet\s*>/gi, '</sc-helmet>')
    .replace(/(\s)([a-z]+[A-Z][A-Za-z0-9]*)(\s*=)/g, (_, sp, n, eq) => sp + CAMEL + n.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + eq);
  const frag = parseFragment(html);

  const hoisted = [];
  const hoist = (js) => { const i = hoisted.indexOf(js); if (i >= 0) return `S${i}`; hoisted.push(js); return `S${hoisted.length - 1}`; };
  const pseudo = new Map(); // classe -> css
  let uid = 0;

  const pseudoClass = (state, value) => {
    if (value.includes('{{')) fail(`style-${state} nao pode ter {{ }}`);
    const decls = value.split(';').map(d => d.trim()).filter(Boolean)
      .map(d => (/!\s*important$/i.test(d) ? d : `${d} !important`)).join(';');
    const rule = `:${state}{${decls}}`;
    for (const [c, r] of pseudo) if (r === rule) return c;
    const cls = `scp${pseudo.size.toString(36)}`;
    pseudo.set(cls, rule);
    return cls;
  };

  function children(node, scope) {
    return (node.childNodes || []).map(c => walk(c, scope)).filter(x => x != null);
  }
  const seq = (kids) => (kids.length === 1 ? kids[0] : `h(Fragment, null, ${kids.join(', ')})`);

  function walk(node, scope) {
    if (node.nodeName === '#text') return walkText(node.value, scope);
    if (node.nodeName === '#comment' || node.nodeName === '#documentType') return null;
    const tag = node.tagName;
    if (tag === 'sc-for') return walkFor(node, scope);
    if (tag === 'sc-if') return walkIf(node, scope);
    if (tag === 'sc-helmet' || tag === 'script' || tag === 'style') return null; // fontes/CSS vao para app.css
    return walkElement(node, scope);
  }

  function walkText(txt, scope) {
    if (!txt.includes('{{')) {
      if (!txt.trim() && !txt.includes(' ')) return null; // mesma regra do runtime
      return JSON.stringify(txt);
    }
    const parts = txt.split(/\{\{([\s\S]+?)\}\}/g);
    const items = parts.map((p, i) => (i & 1 ? `$t(${exprToJs(p, scope)})` : p ? JSON.stringify(p) : null)).filter(Boolean);
    return items.length === 1 ? items[0] : `h(Fragment, null, ${items.join(', ')})`;
  }

  const attrMap = (el, name) => (el.attrs || []).find(a => a.name === name)?.value;

  function walkFor(el, scope) {
    const list = exprToJs((attrMap(el, 'list') || '').replace(/^\s*\{\{([\s\S]+?)\}\}\s*$/, '$1'), scope);
    const as = attrMap(el, 'as') || 'item';
    const n = uid++;
    const inner = new Map(scope);
    inner.set(as, `i${n}`);
    inner.set('$index', `x${n}`);
    const kids = children(el.content || el, inner);
    return `h(Fragment, null, $arr(${list}).map((i${n}, x${n}) => h(Fragment, { key: x${n} }${kids.length ? ', ' + kids.join(', ') : ''})))`;
  }

  function walkIf(el, scope) {
    const val = exprToJs((attrMap(el, 'value') || '').replace(/^\s*\{\{([\s\S]+?)\}\}\s*$/, '$1'), scope);
    const kids = children(el, scope);
    return `(${val} ? ${kids.length ? seq(kids) : 'null'} : null)`;
  }

  function walkElement(el, scope) {
    const tag = el.tagName;
    const props = [];
    const pseudoCls = [];
    let className = null;
    for (const { name, value } of el.attrs) {
      if (name === 'sc-name' || name === 'data-dc-tpl' || name.startsWith('hint-')) continue;
      let key = name;
      if (key.startsWith(CAMEL)) key = kebabToCamel(key.slice(CAMEL.length));
      if (key.startsWith('style-')) { pseudoCls.push(pseudoClass(key.slice(6), value)); continue; }
      if (key === 'style') { props.push(`style: ${styleToJs(value, scope, hoist).js}`); continue; }
      if (key === 'class') { className = attrToJs(value, scope); continue; }
      if (key === 'for') key = 'htmlFor';
      else if (/^on[a-z]/.test(key)) key = 'on' + key[2].toUpperCase() + key.slice(3);
      else if (key.startsWith('on') && /^on[A-Z]/.test(key)) { /* ja camel */ }
      else if (SVG_CAMEL.has(key)) key = kebabToCamel(key);
      const a = attrToJs(value, scope);
      if (key === 'value' || key === 'checked') {
        props.push(`${key}: ${a.dynamic ? `${a.js} ?? ${key === 'checked' ? 'false' : '""'}` : a.js}`);
      } else props.push(`${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${a.js}`);
    }
    if (className || pseudoCls.length) {
      if (className && !className.dynamic) {
        props.unshift(`className: ${JSON.stringify([JSON.parse(className.js), ...pseudoCls].join(' '))}`);
      } else if (className) {
        props.unshift(pseudoCls.length
          ? `className: [${className.js}, ${JSON.stringify(pseudoCls.join(' '))}].filter(Boolean).join(" ")`
          : `className: ${className.js}`);
      } else props.unshift(`className: ${JSON.stringify(pseudoCls.join(' '))}`);
    }
    const kids = children(el.content || el, scope);
    return `h(${JSON.stringify(tag)}, ${props.length ? `{ ${props.join(', ')} }` : 'null'}${kids.length ? ', ' + kids.join(', ') : ''})`;
  }

  const top = children(frag, new Map());
  const body = top.length ? `h(Fragment, null,\n    ${top.join(',\n    ')})` : 'null';
  const code = `// GERADO — não editar. Fonte: src/ui/template.body.html. Regerar: node tools/compile-template.mjs
/* eslint-disable */
import { createElement as h, Fragment } from 'react';

const $arr = (x) => (Array.isArray(x) ? x : []);
const $t = (x) => (x == null || typeof x === 'boolean' ? null : x);
const $css = (css) => {
  const o = {};
  for (const d of String(css).split(';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const p = d.slice(0, i).trim();
    o[p.startsWith('--') ? p : p.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = d.slice(i + 1).trim();
  }
  return o;
};
${hoisted.map((s, i) => `const S${i} = ${s};`).join('\n')}

export function View(v = {}) {
  return ${body};
}
`;
  const css = [...pseudo].map(([c, r]) => `.${c}${r}`).join('\n');
  return { code, css: css ? css + '\n' : '' };
}

// ---------- CLI ----------
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const { code, css } = compileTemplate(readFileSync(resolve(root, 'src/ui/template.body.html'), 'utf8'));
  mkdirSync(resolve(root, 'src/ui'), { recursive: true });
  // so grava se mudou: builds em paralelo (testes) nunca leem um arquivo truncado no meio da reescrita
  const writeIfChanged = (file, text) => { try { if (readFileSync(file, 'utf8') === text) return; } catch { /* ainda nao existe */ } writeFileSync(file, text); };
  writeIfChanged(resolve(root, 'src/ui/view.gen.js'), code);
  writeIfChanged(resolve(root, 'src/ui/pseudo.gen.css'), css);
  console.log(`view.gen.js: ${code.length} bytes; pseudo.gen.css: ${css.length} bytes`);
}
