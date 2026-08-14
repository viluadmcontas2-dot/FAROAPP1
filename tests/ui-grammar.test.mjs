import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile('styles.css', 'utf8');

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

console.log('FARO: toque, foco, estados, safe-area, motion e contraste transversal — ok');
