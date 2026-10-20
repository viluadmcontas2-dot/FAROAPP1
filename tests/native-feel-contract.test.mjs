import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const css = await read('styles.css');
const shell = await read('app-shell.html');
const sw = await read('sw.js');
const build = await read('scripts/build-static-site.mjs');
const pwa = await read('faro-pwa.js');
const sources = (await readdir('.')).filter(name => /^faro-.*\.js$/.test(name));

// 1) Tipografia mínima 12px: nada de font-size < 12px nem text-[<12px] nos módulos faro-* e no CSS.
for (const file of [...sources, 'styles.css']) {
  const source = await read(file);
  for (const match of source.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
    assert.ok(Number(match[1]) >= 12, `${file}: font-size ${match[1]}px < 12px`);
  }
  for (const match of source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
    assert.ok(Number(match[1]) >= 12, `${file}: text-[${match[1]}px] < 12px`);
  }
}
// O legado (app.js/legacy-shell.html, protegidos por SHA) é coberto por override no CSS.
for (const size of [8, 9, 10, 11]) {
  assert.match(css, new RegExp(`\\.text-\\\\\\[${size}px\\\\\\][^{]*\\{[^}]*font-size:\\s*12px\\s*!important`), `override text-[${size}px]`);
}

// 2) Toque, rolagem e seleção de app nativo.
assert.match(css, /html\{[^}]*overscroll-behavior:\s*none/);
assert.match(css, /html\{[^}]*-webkit-tap-highlight-color:\s*transparent/);
assert.match(css, /button:not\(:disabled\):active[^{]*\{[^}]*transform:\s*scale\(\.9[5-8]\)/, 'feedback :active sutil');
assert.match(css, /user-select:\s*none[^}]*-webkit-touch-callout:\s*none|-webkit-touch-callout:\s*none[^}]*user-select:\s*none/);
assert.doesNotMatch(css, /body\{[^}]*user-select:\s*none/, 'nunca user-select:none no body (texto de conteúdo precisa ser copiável)');
assert.doesNotMatch(css, /touch-action:\s*pan-x pan-y/, 'pinch-zoom não pode ser bloqueado');
const tailwindCss = await read('vendor/tailwind.css');
assert.match(await read('tailwind.config.cjs'), /hoverOnlyWhenSupported:\s*true/);
assert.doesNotMatch(tailwindCss.replace(/@media \(hover:hover\)\{[^@]*?\}\}/g, ''), /:hover/, 'nenhum :hover do Tailwind fora de @media (hover:hover)');
assert.doesNotMatch(css.replace(/@media\s*\(hover:\s*hover\)[^{]*\{[\s\S]*?\}\}/g, ''), /:hover/, 'styles.css sem :hover fora de @media (hover:hover)');
assert.match(css, /@media\s*\(pointer:\s*coarse\)\{[^}]*input[^}]*font-size:\s*16px\s*!important/, 'inputs 16px: iOS não dá zoom ao focar');
assert.match(css, /nav\.sticky\.top-0\{[^}]*env\(safe-area-inset-top\)/, 'barra superior respeita a safe-area');
assert.match(css, /\.min-h-screen[^{]*\{[^}]*100dvh/);
assert.match(css, /\.animate-enter\{animation:fadeInUp/, 'transição de entrada entre telas');
assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*animation-duration:\.001ms!important/, 'transições de tela respeitam reduced-motion');

// 3) Contraste AA: tons fracos do legado reforçados.
assert.match(css, /\.text-slate-400\{color:#64748B!important\}/i);
assert.match(css, /\.text-emerald-600\{color:#047857!important\}/i);

// 4) Módulo PWA: persistência, badge, theme-color, transições, atalhos, update.
for (const needle of [
  'navigator.storage.persist',
  'setAppBadge', 'clearAppBadge',
  'meta[name="theme-color"]',
  "prefers-reduced-motion: reduce",
  "params.get('atalho')", 'registrar: ', 'inicio: ',
  'FARO_ACTIVATE_WHEN_SAFE', 'Nova versão', 'Atualizar', 'controllerchange'
]) assert.ok(pwa.includes(needle), `faro-pwa.js precisa conter ${needle}`);
assert.doesNotMatch(pwa, /clients\.claim|skipWaiting\(\)/, 'troca de versão só por ação do motorista/saída segura');
assert.match(pwa, /window\.FaroPwa = Object\.freeze/);

// 5) Carregado pelo shell, pré-cacheado e copiado pelo build.
assert.ok(shell.includes('./faro-pwa.js?v=1'));
assert.ok(shell.indexOf('faro-pwa.js') > shell.indexOf('faro-r2-polish.js'), 'faro-pwa.js carrega depois de todos os módulos de tela');
assert.ok(sw.includes("'./faro-pwa.js?v=1'"));
assert.ok(build.includes("'faro-pwa.js'"));

console.log('FARO sensação nativa: 12px+, toque, safe-area, contraste AA e módulo PWA — ok');
