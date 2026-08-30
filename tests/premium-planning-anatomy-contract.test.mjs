import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const r3b = await readFile('faro-r3b.js','utf8');
const routing = await readFile('faro-r3-routing.js','utf8');
const css = await readFile('styles.css','utf8');

assert.match(r3b,/mode:'financial-radar'/,'Planejar financeiro precisa manter o radar como modo ativo');
assert.match(r3b,/const moneyViewModel =/,'Radar precisa continuar derivando um view-model único');
for (const state of ['calm','upcoming','attention','risk']) assert.match(r3b,new RegExp(state),`Estado financeiro ausente: ${state}`);
assert.match(r3b,/root\.insertBefore\(hero, firstGrid\)/,'Hero/meta precisa permanecer protagonista do cockpit');
assert.match(r3b,/faro-r3b-card-cta/,'Tiles precisam expor consequência/próxima ação');
assert.match(css,/#view-planning \.faro-r3-hero\{[^}]*var\(--faro-radius-hero\)/s,'Hero R3 precisa consumir a fundação premium');
assert.match(css,/#view-planning \.faro-r3-tile[^\{]*\{[^}]*var\(--faro-radius-card\)/s,'Tiles R3 precisam consumir a fundação premium');
assert.match(routing,/mode:'single-workspace-depth'/,'Compromissos precisa manter profundidade única');
assert.match(routing,/flowCommitPending/,'Criação financeira inline precisa continuar idempotente');
assert.doesNotMatch(r3b,/app\.state\.[A-Za-z0-9_]+\s*=/,'R3-B premium não pode virar writer');
assert.doesNotMatch(r3b,/localStorage|STORAGE_KEY/,'R3-B não pode criar estado paralelo');

console.log('FARO R2/PLAN: Planejar e Compromissos compartilham gramática premium sem novo owner — ok');
