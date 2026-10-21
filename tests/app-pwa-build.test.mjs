import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildTo, listFiles, root } from './helpers/pwa-build.mjs';

const a = buildTo();
const b = buildTo();
const sw = (d) => readFileSync(join(d, 'sw.js'), 'utf8');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('sw.js existe e a versao e deterministica (duas builds -> mesmo hash)', () => {
  assert.ok(existsSync(join(a, 'sw.js')));
  const v = sw(a).match(/faro-shell-|"([0-9a-f]{12,})"/);
  assert.ok(/[0-9a-f]{12}/.test(sw(a)), 'versao hash no sw');
  assert.equal(sw(a), sw(b));
});
test('pre-cache cobre todos os arquivos de _site exceto sw.js', () => {
  const body = sw(a);
  const files = listFiles(a).filter((f) => f !== 'sw.js' && f !== '_headers');
  for (const f of files) assert.ok(body.includes(JSON.stringify(f)) || body.includes(`"${f}"`), `fora do pre-cache: ${f}`);
  assert.ok(body.includes('"index.html"') && body.includes('"app.js"') && body.includes('"app.css"'));
  assert.ok(files.some((f) => f.endsWith('.woff2')), 'fontes presentes');
});
test('sw sem importScripts e sem eval', () => {
  const s = sw(a);
  assert.ok(!/importScripts/.test(s)); assert.ok(!/\beval\(|new Function/.test(s));
  assert.ok(/SKIP_WAITING/.test(s));
});
test('index.html sem scripts inline nem handlers inline', () => {
  const h = readFileSync(join(a, 'index.html'), 'utf8');
  const scripts = [...h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 1);
  for (const [, attrs, body] of scripts) { assert.match(attrs, /\bsrc=/); assert.equal(body.trim(), ''); }
  assert.ok(!/\son[a-z]+\s*=/i.test(h), 'handler inline');
  assert.ok(!/<style/i.test(h));
});
test('manifest valido e icones existem nos tamanhos', () => {
  const m = JSON.parse(readFileSync(join(a, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.name, 'Faro'); assert.equal(m.lang, 'pt-BR'); assert.equal(m.start_url, './'); assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone'); assert.equal(m.theme_color, '#07090F'); assert.equal(m.background_color, '#07090F');
  const need = [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']];
  for (const [sz, purpose] of need) {
    const ic = m.icons.find((i) => i.sizes === sz && i.purpose === purpose);
    assert.ok(ic, `icone ${sz} ${purpose}`);
    const buf = readFileSync(join(a, ic.src));
    assert.equal(buf.readUInt32BE(16), Number(sz.split('x')[0])); // largura no IHDR do PNG
    assert.equal(buf.readUInt32BE(20), Number(sz.split('x')[0]));
  }
  assert.ok(!listFiles(a).some((f) => /^icon-(192|512)\.png$/.test(f)), 'sem icone do app antigo');
});
test('index aponta para icones novos', () => {
  const h = readFileSync(join(a, 'index.html'), 'utf8');
  assert.match(h, /icons\/icon-192\.png/);
});
test('vercel.json: cabecalhos e CSP estrita', () => {
  const v = JSON.parse(read('vercel.json'));
  assert.equal(v.outputDirectory, '_site');
  assert.equal(v.git.deploymentEnabled, false);
  const all = Object.fromEntries(v.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value]));
  const csp = all['Content-Security-Policy'];
  assert.ok(csp);
  const dir = Object.fromEntries(csp.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [k, ...r] = s.split(/\s+/); return [k, r]; }));
  assert.ok(!/unsafe-eval/.test(csp));
  assert.ok(!dir['script-src'].includes("'unsafe-inline'")); assert.deepEqual(dir['script-src'], ["'self'"]);
  assert.deepEqual(dir['default-src'], ["'self'"]);
  assert.deepEqual(dir['object-src'], ["'none'"]); assert.deepEqual(dir['base-uri'], ["'none'"]);
  assert.deepEqual(dir['frame-ancestors'], ["'none'"]); assert.deepEqual(dir['form-action'], ["'self'"]);
  assert.deepEqual(dir['font-src'], ["'self'"]);
  assert.ok(dir['connect-src'].includes('https://mjbyqhreptllilkggiri.supabase.co') && dir['connect-src'].includes('wss://mjbyqhreptllilkggiri.supabase.co'));
  assert.ok(!/\*/.test(csp));
  assert.equal(all['X-Content-Type-Options'], 'nosniff');
  assert.equal(all['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(all['Strict-Transport-Security'], /max-age=\d{7,}/);
  assert.match(all['Permissions-Policy'], /camera=\(\)/);
  const hdr = (src) => Object.fromEntries((v.headers.find((h) => h.source === src)?.headers || []).map((h) => [h.key, h.value]));
  assert.match(hdr('/sw.js')['Cache-Control'], /no-cache/);
  assert.match(hdr('/index.html')['Cache-Control'], /no-cache/);
  assert.match(hdr('/assets/fonts/(.*)')['Cache-Control'], /immutable/);
  assert.equal(hdr('/sw.js')['Service-Worker-Allowed'], '/');
});

test('vercel.json e _headers (Cloudflare) trazem os mesmos cabecalhos', () => {
  const v = JSON.parse(read('vercel.json'));
  const cf = readFileSync(join(a, '_headers'), 'utf8');
  assert.ok(!listFiles(a).length || !sw(a).includes('_headers'), '_headers fora do pre-cache');
  const parsed = {}; let cur;
  for (const line of cf.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = line.trim(); parsed[cur] = {}; } else { const i = line.indexOf(':'); parsed[cur][line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
  const fromV = {};
  for (const h of v.headers) fromV[h.source.replace('(.*)', '*')] = Object.fromEntries(h.headers.map((x) => [x.key, x.value]));
  assert.deepEqual(parsed, fromV);
  assert.match(parsed['/*']['Content-Security-Policy'], /script-src 'self';/);
});
test('wrangler.jsonc minimo', () => {
  const w = read('wrangler.jsonc');
  assert.match(w, /"name": "faroapp1"/); assert.match(w, /"directory": "\.\/_site"/); assert.match(w, /single-page-application/);
});
