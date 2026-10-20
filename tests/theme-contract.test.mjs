// Tema global FARO (mockups v3 aprovados): preto, papel quente e âmbar no app inteiro.
// Contrato estático: falha se o azul antigo voltar às telas sem um override de tema que o neutralize.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const theme = await read('faro-theme.css');
const styles = await read('styles.css');
const shell = await read('app-shell.html');
const sw = await read('sw.js');
const build = await read('scripts/build-static-site.mjs');

// 1) Tokens da marca em UM lugar (faro-theme.css), com os valores aprovados.
const tokens = {
  '--faro-black': '#15130E', '--faro-paper': '#F6F1E4', '--faro-amber': '#F2B705',
  '--faro-profit': '#0A7A47', '--faro-loss': '#B3261E', '--faro-on-amber': 'var(--faro-black)'
};
for (const [name, value] of Object.entries(tokens)) {
  assert.match(theme, new RegExp(`${name}:\\s*${value.replace(/[()]/g, '\\$&')}[;}]`, 'i'), `faro-theme.css precisa definir ${name}: ${value}`);
}
const defined = source => [...source.matchAll(/(--faro-[a-z0-9-]+)\s*:/g)].map(match => match[1]);
const themeTokens = new Set(defined((theme.match(/:root\{[^}]*\}/) || [''])[0]));
const sources = (await readdir('.')).filter(name => /^faro-.*\.js$/.test(name));
for (const file of [...sources, 'styles.css']) {
  const source = await read(file);
  // O modo escuro só do Início (já existente) pode redefinir tokens --faro-home-* dentro de prefers-color-scheme.
  const light = source.replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{:root\{[^}]*\}\}/g, '');
  for (const token of defined(light)) {
    assert.ok(!themeTokens.has(token), `${file} redefine ${token}; o token mora só em faro-theme.css`);
  }
  for (const hex of ['#15130E', '#F6F1E4', '#F2B705', '#0A7A47', '#B3261E']) {
    assert.ok(!light.toUpperCase().includes(hex), `${file} repete ${hex} em vez de usar o token de faro-theme.css`);
  }
}

// 2) Carregado por último (depois do Tailwind), pré-cacheado, copiado pelo build e com cache novo.
assert.match(shell, /vendor\/tailwind\.css\\?" rel=\\?"stylesheet\\?"><link href=\\?"\.\/faro-theme\.css\?v=1\\?" rel=\\?"stylesheet\\?">/, 'faro-theme.css entra logo depois do tailwind.css (ganha a cascata)');
assert.ok(sw.includes("'./faro-theme.css?v=1'"), 'faro-theme.css precisa estar no pré-cache');
assert.ok(build.includes("'faro-theme.css'"), 'o build precisa copiar faro-theme.css');
assert.match(sw, /const CORE_CACHE = 'faro-v1-core-36'/, 'tema novo precisa renovar o cache instalado');

// 3) Azul antigo: lista fechada de tons do tema anterior (Tailwind blue + navy vetta).
const BLUE_HEX = ['#2563EB', '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', '#1E40AF', '#1E3A8A', '#172554',
  '#0B1121', '#111E39', '#12325D', '#16213B', '#132444', '#173B6D', '#F3F8FF', '#F8FBFF', '#F3F7FF', '#F6F8FC'];
const BLUE_RGB = ['37,99,235', '29,78,216', '96,165,250', '30,64,175', '191,219,254'];
const blueLiteral = new RegExp(`(?:${BLUE_HEX.join('|')})(?![0-9a-f])|(?:${BLUE_RGB.map(v => v.replace(/,/g, ',\\s*')).join('|')})`, 'gi');
const blueClass = /!?(?:bg|text|border|from|to|via|ring|shadow)-(?:blue|indigo|sky)-\d+(?:\/\d+)?|!?(?:bg|text)-vetta-900/g;

// 3a) Telas que este tema controla direto: nenhum azul antigo (allowlist justificada).
const ALLOW_DIRECT = {
  'faro-theme.css': [
    { pattern: /--faro-focus:\s*#1D4ED8/i, why: 'anel de foco azul do mockup v3 aprovado (--focus:#1D4ED8): acessibilidade, não é cor de marca' }
  ],
  'faro-home-r2.js': [
    { pattern: /registerButton\.classList\.remove\([^)]*'bg-blue-600'[^)]*\)/, why: 'remove a classe azul do botão legado (não aplica azul)' }
  ]
};
const strip = (file, source) => (ALLOW_DIRECT[file] || []).reduce((text, item) => text.replace(new RegExp(item.pattern.source, 'gi'), ''), source);
for (const file of ['styles.css', 'faro-theme.css', 'faro-navigation.js', 'faro-brand-r2.js', 'faro-home-r2.js', 'faro-register.js']) {
  let source = strip(file, await read(file));
  // Em CSS, seletores podem citar classes azuis do legado para neutralizá-las; só os valores declarados contam.
  if (file.endsWith('.css')) source = [...source.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).join('\n');
  const hits = [...(source.match(blueLiteral) || []), ...(source.match(blueClass) || [])];
  assert.deepEqual(hits, [], `${file} ainda usa azul antigo: ${[...new Set(hits)].join(', ')}`);
}

// 3b) Módulos que não podemos editar (Codex/núcleo por SHA): todo azul precisa ter override no tema.
const escapeClass = name => '.' + name.replace(/([!/:\[\]])/g, '\\$1');
const ALLOW_LOCKED = [
  { file: 'app.js', pattern: /backgroundColor: '#2563EB'|borderColor: '#2563EB'|'#2563EB'/, why: 'cores do Chart.js desenhadas no <canvas> do relatório (sem CSS); núcleo protegido por SHA' },
  { file: 'legacy-shell.html', pattern: /<meta name="theme-color" content="#0B1121">/, why: 'meta trocada em runtime pelo app-shell (theme-color #FFFFFF)' },
  { file: 'legacy-shell.html', pattern: /colors:\{vetta:\{900:'#0B1121'/, why: 'config do Tailwind CDN removida pelo app-shell (VENDOR_SWAPS); bg-vetta-900 é vestida pelo tema' },
  { file: 'legacy-shell.html', pattern: /boxShadow:\{float:'0 10px 30px -5px rgba\(37,99,235/, why: 'config do Tailwind CDN removida pelo app-shell (VENDOR_SWAPS); a sombra shadow-float não é usada em tela' },
  { file: 'faro-r3b.js', pattern: /upcoming:'37,99,235'|accent='37,99,235'|accent:'(?:37,99,235|30,64,175)'/, why: 'acento inline (--r3b-accent/--faro-dialog-accent) sobrescrito com !important no tema' }
];
const lockedFiles = ['app.js', 'legacy-shell.html', ...sources.filter(name => !['faro-navigation.js', 'faro-brand-r2.js', 'faro-home-r2.js', 'faro-register.js'].includes(name))];
const missing = [];
for (const file of lockedFiles) {
  const source = await read(file);
  for (const cls of new Set(source.match(blueClass) || [])) {
    if (!theme.includes(escapeClass(cls))) missing.push(`${file}: classe ${cls} sem override ${escapeClass(cls)}`);
  }
  const ruleRanges = [];
  for (const rule of source.matchAll(/([^{}`;]+)\{([^{}]*)\}/g)) {
    const body = rule[2].replace(/var\(--[a-z0-9-]+,\s*[0-9,\s.]+\)/gi, '');
    ruleRanges.push([rule.index, rule.index + rule[0].length]);
    if (!blueLiteral.test(body)) { blueLiteral.lastIndex = 0; continue; }
    blueLiteral.lastIndex = 0;
    // Chaves de objeto/função JS (Chart.js, config do Tailwind, acentos) não são regras CSS: caem na allowlist abaixo.
    if (/\b(?:const|let|var|return)\b|=>|:\s|:\s*$|\(\s*$|\[\s*$|\s=\s|=\s*$/.test(rule[1].trim())) { ruleRanges.pop(); continue; }
    const selectors = rule[1].replace(/^[\s\S]*?(?=[#.\[@a-z:*])/i, '').split(',').map(s => s.trim()).filter(Boolean);
    if (selectors.some(s => /^\d+%$|^from$|^to$/.test(s))) continue; // keyframes usam a variável de acento sobrescrita
    for (const selector of selectors) {
      const exact = new RegExp('(?:^|[\\s,>])' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]', 'm');
      if (!exact.test(theme)) missing.push(`${file}: regra "${selector}" com azul sem override no tema`);
    }
  }
  for (const hit of source.matchAll(blueLiteral)) {
    if (ruleRanges.some(([start, end]) => hit.index >= start && hit.index < end)) continue;
    const near = source.slice(Math.max(0, hit.index - 40), hit.index + 20);
    if (!ALLOW_LOCKED.some(item => item.file === file && item.pattern.test(near))) missing.push(`${file}: azul solto "${near.trim()}" sem allowlist`);
  }
}
assert.deepEqual(missing, [], 'Azul antigo sem override:\n' + missing.join('\n'));

// 4) Identidade nas superfícies globais (barra inferior, topo, botões primários, modais e toasts).
for (const selector of ['nav.fixed.bottom-0', '.nav-item.active', 'nav.sticky.top-0', '#installButton', '.modal-sheet', '.toast', '#faroInstallGate .faro-install-button', '.faro-tour-next', '.update-banner']) {
  assert.ok(theme.includes(selector), `tema precisa vestir ${selector}`);
}
assert.match(theme, /\.nav-item\.active[^{]*\{[^}]*var\(--faro-amber/, 'item ativo da barra inferior em âmbar');
assert.match(theme, /\.nav-item span[^{]*\{[^}]*font-size:\s*12px/, 'rótulos da barra legíveis (>=12px)');
// Toda regra do tema usa :root:root (especificidade 0,2,0); só os tokens (:root) ficam de fora.
for (const rule of theme.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)) {
  const selector = rule[1].trim();
  if (selector === ':root' || /^(@|\d|from|to)/.test(selector)) continue;
  for (const part of selector.split(',')) assert.match(part.trim(), /^:root:root/, `regra do tema sem :root:root: ${part.trim()}`);
}

console.log('FARO tema global: tokens únicos, carregado por último, azul antigo neutralizado — ok');
