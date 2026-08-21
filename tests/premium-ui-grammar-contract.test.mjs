import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile('styles.css','utf8');

for (const token of [
  '--faro-radius-hero',
  '--faro-radius-card',
  '--faro-radius-row',
  '--faro-shadow-card',
  '--faro-shadow-hero',
  '--faro-space-1',
  '--faro-space-2',
  '--faro-space-3'
]) assert.match(css,new RegExp(token),`Token premium ausente: ${token}`);

for (const cls of [
  '.faro-hero',
  '.faro-action-card',
  '.faro-state-card',
  '.faro-detail-row',
  '.faro-card-eyebrow',
  '.faro-card-title',
  '.faro-card-value',
  '.faro-card-support',
  '.faro-card-action'
]) assert.equal(css.includes(cls),true,`Unidade/anatomia premium ausente: ${cls}`);

for (const tone of ['action','positive','attention','risk','neutral']) {
  assert.equal(css.includes(`[data-faro-tone="${tone}"]`),true,`Tom semântico ausente: ${tone}`);
}

assert.match(css,/min-height:var\(--faro-touch\)/,'Alvos de toque precisam respeitar o mínimo FARO');
assert.match(css,/prefers-reduced-motion:reduce/,'Gramática premium precisa respeitar reduced motion');
assert.match(css,/focus-visible/,'Gramática premium precisa manter foco visível');
assert.doesNotMatch(css,/\.faro-(?:action|state)-card\s+\.faro-(?:action|state)-card\s*\{/,
  'Fundação não deve incentivar card semântico dentro de card semântico');

console.log('FARO R2/UI0: gramática premium semântica, acessível e sem nesting decorativo — ok');
