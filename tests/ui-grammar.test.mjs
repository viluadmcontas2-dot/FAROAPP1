import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile('styles.css', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');

assert.match(css, /--faro-touch:48px/);
assert.match(css, /button:not\(\.toggle\),\[role="button"\],\.nav-item,\.details-summary\{min-height:var\(--faro-touch\)\}/);
assert.match(css, /:focus-visible/);
assert.match(css, /button:disabled,\[aria-disabled="true"\]/);
assert.match(css, /env\(safe-area-inset-bottom\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /@media\(prefers-contrast:more\)/);
assert.match(css, /input\[type=range\]\{min-height:var\(--faro-touch\)/);
assert.match(css, /\.input-vetta\[aria-invalid="true"\]/);
assert.match(css, /\.faro-status\[data-tone="attention"\]/);
assert.match(css, /\.faro-status\[data-tone="risk"\]/);

// B9 9.46–9.48: motion reduzido, contraste reforçado, toque mínimo e zoom do usuário.
assert.match(css, /animation-duration:\.001ms!important/);
assert.match(css, /transition-duration:\.001ms!important/);
assert.match(css, /@media\(prefers-contrast:more\)[\s\S]*border-color:#CBD5E1/);
assert.match(css, /--faro-touch:48px/);
assert.match(shell, /\.replace\('width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover', 'width=device-width,initial-scale=1,viewport-fit=cover'\)/,
  'Casca FARO precisa remover a trava de zoom herdada sem alterar o baseline protegido');
assert.doesNotMatch(shell.match(/<meta name="viewport" content="([^"]+)"/)?.[1] || '', /user-scalable=no|maximum-scale=1/,
  'Viewport próprio da casca FARO também precisa permitir ampliação');

console.log('FARO: toque, foco, zoom, estados, safe-area, motion e contraste transversal — ok');
