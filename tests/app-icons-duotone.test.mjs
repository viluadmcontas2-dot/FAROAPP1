// Ícones Phosphor duotone: cada ícone usado precisa das DUAS camadas (::before com opacidade e ::after),
// ambas com `content`, e a fonte duotone embutida precisa ter os dois glifos (senão o ícone aparece pela metade).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { browserAvailable, buildSite, serve, launch, prepareShots, cleanup } from './helpers/e2e-app.mjs';

const root = resolve(import.meta.dirname, '..');
const skip = browserAvailable() ? false : 'Chromium ou Playwright não encontrados (veja tests/helpers/e2e-app.mjs)';

// mesmas fontes de verdade do tools/extract-assets.py (gerado view.gen.js fica de fora)
const files = ['src/ui/template.body.html', ...readdirSync(join(root, 'src/ui')).filter(f => f.endsWith('.js') && f !== 'view.gen.js').map(f => 'src/ui/' + f)];
const src = files.map(f => readFileSync(join(root, f), 'utf8')).join('\n');
const WEIGHTS = new Set(['fill', 'bold', 'duotone', 'light', 'thin']);
const used = [...new Set([...src.matchAll(/\bph-([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map(m => m[1]))].filter(n => !WEIGHTS.has(n)).sort();
// os que aparecem de fato como `ph-duotone ph-X` + os escolhidos por lista dinâmica (`'ph-duotone ' + icone`)
const duoLiteral = [...src.matchAll(/ph-duotone ph-([a-z0-9-]+)/g)].map(m => m[1]);
const CATEGORIA = 'car-battery'; // ícone de categoria de gasto (ICON_OUT em src/ui/kit.js)

let siteDir, server, browser;
test.before(async () => { if (skip) return; siteDir = buildSite(); server = await serve(siteDir); browser = await launch(); });
test.after(async () => { if (browser) await browser.close(); if (server) await server.close(); if (siteDir) cleanup(siteDir); });

test('há ícones duotone usados para conferir', { skip }, () => { assert.ok(duoLiteral.length >= 5, String(duoLiteral.length)); });

test('cada ícone usado em duotone tem ::before e ::after com content e a fonte carregada', { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.goto(server.url);
  await page.evaluate(names => {
    const wrap = document.createElement('div'); wrap.id = 'duo-test';
    wrap.innerHTML = names.map(n => `<i class="ph-duotone ph-${n}"></i>`).join('');
    document.body.append(wrap);
  }, used);
  await page.evaluate(() => document.fonts.load('32px "Phosphor-Duotone"', '\ue028\ue029'));
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const out = { fontOk: document.fonts.check('32px "Phosphor-Duotone"'), loaded: [...document.fonts].filter(f => f.family.replace(/"/g, '') === 'Phosphor-Duotone' && f.status === 'loaded').length, falta: [] };
    for (const el of document.querySelectorAll('#duo-test i')) {
      const n = el.className.replace('ph-duotone ', '');
      const b = getComputedStyle(el, '::before'), a = getComputedStyle(el, '::after');
      const ok = b.content !== 'none' && b.content !== 'normal' && a.content !== 'none' && a.content !== 'normal' && b.fontFamily.includes('Phosphor-Duotone') && a.fontFamily.includes('Phosphor-Duotone');
      if (!ok) out.falta.push(n + ` (before=${b.content} after=${a.content})`);
    }
    return out;
  });
  assert.ok(r.fontOk && r.loaded >= 1, 'fonte Phosphor-Duotone não carregou');
  assert.deepEqual(r.falta.filter(x => duoLiteral.some(n => x.startsWith('ph-' + n + ' '))), [], 'ícones duotone sem as duas camadas');
  assert.deepEqual(r.falta, [], 'ícones (incl. escolhidos por lista) sem as duas camadas');
  await page.close();
});

test('a fonte duotone embutida tem os dois glifos de cada camada', { skip }, () => {
  const css = readFileSync(join(root, 'src/ui/app.css'), 'utf8');
  const font = css.match(/font-family:"Phosphor-Duotone";src:url\("\.\.\/\.\.\/(assets\/fonts\/[^"]+)"/)[1];
  const pairs = {};
  for (const m of css.matchAll(/\.ph-duotone\.ph-([a-z0-9-]+):(before|after)\s*\{\s*content:\s*"\\([0-9a-f]+)"/g)) (pairs[m[1]] ||= {})[m[2]] = parseInt(m[3], 16);
  const cps = Object.values(pairs).flatMap(p => [p.before, p.after]);
  assert.ok(cps.every(Number.isInteger), 'camada sem content no CSS');
  const py = `import sys,json\nfrom fontTools.ttLib import TTFont\nf=TTFont(sys.argv[1]);cm=f.getBestCmap();print(json.dumps([c for c in json.loads(sys.argv[2]) if c not in cm]))`;
  const missing = JSON.parse(execFileSync('python3', ['-I', '-c', py, join(root, font), JSON.stringify(cps)]).toString());
  assert.deepEqual(missing, [], 'codepoints sem glifo na fonte');
});

test('captura: ícone de categoria de gasto desenha as duas camadas', { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 240, height: 120 }, deviceScaleFactor: 4 });
  await page.goto(server.url);
  // CSP estrita bloqueia style inline em HTML; por CSSOM (el.style) pode
  await page.evaluate(n => {
    const box = document.createElement('div'); box.id = 'cat-test';
    Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: '2147483647', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4380d', fontSize: '64px' });
    const i = document.createElement('i'); i.className = 'ph-duotone ph-' + n; box.append(i); document.documentElement.append(box);
  }, CATEGORIA);
  await page.evaluate(() => document.fonts.load('64px "Phosphor-Duotone"', '\ue028\ue029'));
  await page.evaluate(() => document.fonts.ready);
  const dir = prepareShots();
  const buf = await page.screenshot({ path: join(dir, process.env.ICON_SHOT || 'icone-categoria-atual.png') });
  // duotone = traço forte (::after) + preenchimento a 20% (::before); sem as duas, vira bloco chapado ou meio ícone
  const dark = await page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0, tint = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 90) n++; else if (d[i] > 235 && d[i + 1] > 195 && d[i + 1] < 235 && d[i + 2] < 225) tint++; // traço forte da cor do ícone (#d4380d); a camada a 20% fica bem mais clara
    return { n, tint };
  }, buf.toString('base64'));
  assert.ok(dark.n > 300, `traço principal ausente (pixels fortes: ${dark.n})`);
  assert.ok(dark.tint > 300, `camada secundária (20%) ausente: sobrou um bloco chapado (pixels claros: ${dark.tint})`);
  await page.close();
});
