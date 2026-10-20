import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const png = async path => {
  const buffer = await readFile(path);
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${path} precisa ser PNG válido`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
};

const manifest = JSON.parse(await read('manifest.webmanifest'));
const index = await read('index.html');
const shell = await read('app-shell.html');
const sw = await read('sw.js');
const build = await read('scripts/build-static-site.mjs');

// Arquivos de ícone gerados a partir do símbolo da marca.
assert.deepEqual(await png('icon-192.png'), [192, 192]);
assert.deepEqual(await png('icon-512.png'), [512, 512]);
assert.deepEqual(await png('icon-maskable-512.png'), [512, 512]);
assert.deepEqual(await png('apple-touch-icon.png'), [180, 180]);
assert.deepEqual(await png('favicon-32.png'), [32, 32]);

// Manifest: PNG any + maskable separados (nunca "any maskable" no mesmo arquivo).
const pngIcons = manifest.icons.filter(icon => icon.type === 'image/png');
const has = (src, sizes, purpose) => pngIcons.some(icon => icon.src === src && icon.sizes === sizes && icon.purpose === purpose);
assert.ok(has('./icon-192.png', '192x192', 'any'));
assert.ok(has('./icon-512.png', '512x512', 'any'));
assert.ok(has('./icon-maskable-512.png', '512x512', 'maskable'));

assert.equal(manifest.display, 'standalone');
assert.deepEqual(manifest.display_override, ['standalone', 'minimal-ui']);
assert.equal(manifest.lang, 'pt-BR');
assert.equal(manifest.dir, 'ltr');
assert.ok(manifest.categories.includes('finance'));
assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);

// Atalhos: Registrar dia e Início, dentro do escopo, com ícone.
const labels = manifest.shortcuts.map(shortcut => shortcut.name);
assert.deepEqual(labels, ['Registrar dia', 'Início']);
for (const shortcut of manifest.shortcuts) {
  assert.match(shortcut.url, /^\.\/app-shell\.html\?atalho=(registrar|inicio)$/);
  assert.ok(shortcut.short_name && shortcut.icons?.[0]?.src.endsWith('.png'), 'atalho precisa de ícone PNG');
}

// iOS: apple-touch-icon PNG 180 + metas de app standalone nas duas entradas.
for (const [name, html] of [['index', index], ['app-shell', shell]]) {
  assert.match(html, /<link rel="apple-touch-icon" href="\.\/apple-touch-icon\.png">/, `${name}: apple-touch-icon PNG`);
  assert.match(html, /<link rel="icon" href="\.\/favicon-32\.png" type="image\/png" sizes="32x32">/, `${name}: favicon PNG`);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes">/, `${name}: apple capable`);
  assert.match(html, /<meta name="mobile-web-app-capable" content="yes">/, `${name}: mobile capable`);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="FARO">/, `${name}: título iOS`);
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="default">/, `${name}: status bar`);
}
// O shell legado é reescrito em runtime: o ícone SVG não pode sobreviver como apple-touch-icon.
assert.match(shell, /<link rel="apple-touch-icon" href="\.\/icon\.svg">'?,\s*'<link rel="apple-touch-icon" href="\.\/apple-touch-icon\.png">/);

for (const file of ['icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png']) {
  assert.ok(sw.includes(`./${file}`), `sw.js precisa pré-cachear ${file}`);
  assert.ok(build.includes(`'${file}'`), `build precisa copiar ${file}`);
}

console.log('FARO PWA: ícones PNG, manifest completo, atalhos, screenshots e metas iOS — ok');
