import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const read = path => readFile(path, 'utf8');
const shell = await read('app-shell.html');
const legacy = await read('legacy-shell.html');
const sw = await read('sw.js');
const build = await read('scripts/build-static-site.mjs');
const account = await read('faro-account.js');
const offline = await read('offline.html');
const pkg = JSON.parse(await read('package.json'));

// 1) Dependências hospedadas localmente, com versão fixa.
const vendorFiles = [
  'vendor/tailwind.css',
  'vendor/chart-4.5.1.umd.min.js',
  'vendor/supabase-js-2.112.3.mjs',
  'vendor/fontawesome-6.4.0/css/all.min.css',
  'vendor/fontawesome-6.4.0/webfonts/fa-solid-900.woff2',
  'vendor/fontawesome-6.4.0/webfonts/fa-regular-400.woff2',
  'vendor/fontawesome-6.4.0/webfonts/fa-brands-400.woff2',
  'vendor/fonts/plus-jakarta-sans.css',
  'vendor/fonts/plus-jakarta-sans-latin-400-normal.woff2',
  'vendor/fonts/plus-jakarta-sans-latin-800-normal.woff2'
];
for (const file of vendorFiles) await access(file);
assert.equal(pkg.devDependencies?.tailwindcss, '3.4.17', 'Tailwind só como devDependency, versão fixa');
assert.equal(pkg.dependencies, undefined, 'Sem dependências de runtime');
assert.ok(pkg.scripts['vendor:css'], 'Script que regenera o CSS compilado');
await access('tailwind.config.cjs');

// 2) Transformação do shell legado: nenhuma origem externa sobra.
const swapsSource = shell.match(/\/\*VENDOR_SWAPS\*\/([\s\S]*?)\/\*END_VENDOR_SWAPS\*\//)?.[1];
assert.ok(swapsSource, 'app-shell.html precisa declarar a tabela VENDOR_SWAPS');
const swaps = new Function(`return ${swapsSource}`)();
let html = legacy;
for (const [from, to] of swaps) {
  assert.ok(html.includes(from), `trecho legado ausente: ${from.slice(0, 60)}`);
  html = html.replace(from, to);
}
assert.doesNotMatch(html, /https?:\/\/(cdn\.|fonts\.|cdnjs)/, 'shell legado não pode carregar nada de CDN');
assert.doesNotMatch(html, /tailwind\.config\s*=/, 'config inline do Tailwind CDN deve sair');
assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
for (const needed of ['./vendor/tailwind.css', './vendor/chart-4.5.1.umd.min.js', './vendor/fontawesome-6.4.0/css/all.min.css', './vendor/fonts/plus-jakarta-sans.css']) {
  assert.ok(html.includes(needed), `shell precisa referenciar ${needed}`);
}
assert.ok(html.indexOf('./vendor/tailwind.css') > html.indexOf('./styles.css'), 'Tailwind compilado vem depois do styles.css, como o CDN fazia (preserva a cascata)');

// 3) Supabase SDK local.
assert.match(account, /const SDK_URL = '\.\/vendor\/supabase-js-2\.112\.3\.mjs'/);
assert.doesNotMatch(account, /jsdelivr/);

// 4) Service worker: pré-cache completo, sem CDN, SWR, offline e fluxo de update.
assert.doesNotMatch(sw, /https:\/\/(cdn|fonts)/, 'sw.js não pode mais semear CDNs');
for (const file of vendorFiles) assert.ok(sw.includes(`'./${file}'`), `sw.js precisa pré-cachear ${file}`);
assert.ok(sw.includes("'./offline.html'"), 'sw.js precisa pré-cachear a página offline');
assert.match(sw, /async function staleWhileRevalidate/);
assert.match(sw, /staleWhileRevalidate\(event\.request/);
assert.match(sw, /offline\.html/);
assert.match(sw, /cache: 'reload'/, 'Precache precisa ignorar o cache HTTP para não congelar versão antiga');
assert.doesNotMatch(sw, /clients\.claim\s*\(/, 'Contrato de update seguro continua valendo');
assert.doesNotMatch(sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'")), /skipWaiting/);

// Todo arquivo de vendor (exceto ttf de fallback) está no pré-cache e é copiado pelo build.
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full)); else out.push(full);
  }
  return out;
}
const everyVendor = (await walk('vendor')).filter(file => !file.endsWith('.ttf'));
for (const file of everyVendor) assert.ok(sw.includes(`'./${file}'`), `${file} fora do pré-cache`);
assert.match(build, /vendor/, 'build precisa copiar vendor/');
assert.match(build, /'offline\.html'/);

// 5) Página offline autônoma (sem scripts externos) e acessível.
assert.match(offline, /<html lang="pt-BR">/);
assert.match(offline, /Sem conexão/);
assert.match(offline, /Tentar de novo/);
assert.doesNotMatch(offline, /https?:\/\//);

console.log('FARO PWA offline: vendor local, SW com pré-cache/SWR/offline e shell sem CDN — ok');
