import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const planning = await readFile('faro-planning.js', 'utf8');
const invariants = await readFile('faro-planning-invariants.js', 'utf8');
const app = await readFile('app.js', 'utf8');

// Invariantes conquistadas no R2 precisam sobreviver à recomposição visual R3.
assert.match(planning, /dataset\.view = 'planning'/);
assert.match(planning, /slider\.removeAttribute\('data-model'\)/);
assert.match(planning, /let targetDraft = app\.state\.targetProfit/);
assert.match(planning, /targetDraft = clampTarget/);
assert.match(planning, /app\.state\.targetProfit = targetDraft;[\s\S]*app\.save\(\)/);
assert.match(planning, /resetTargetDraft/);
assert.match(planning, /faroDreDetails/);
assert.match(planning, /Como o FARO chegou nesses números\?/);
assert.match(planning, /app\.calculations\(\)/);
assert.doesNotMatch(planning, /const\s+contributionKm\s*=|function\s+calculations\s*\(/);

// Preview continua usando o motor canônico com override efêmero e restauração garantida.
assert.match(planning, /const calculationsWith = overrides =>/);
assert.match(planning, /finally \{[\s\S]*app\.state\.targetProfit = saved\.targetProfit[\s\S]*app\.state\.fuel = saved\.fuel/);
assert.doesNotMatch(planning, /calculationsWith[\s\S]{0,500}app\.save\(\)/, 'Preview não pode persistir rascunho');

// O motor legado continua declarando o target de render e a composição preserva esse contrato.
assert.match(app, /this\.\$\('extraDaysOffBadge'\)\.textContent/);
assert.match(invariants, /id = 'extraDaysOffBadge'/);
assert.match(invariants, /hidden = true/);

// Campo exato continua delegando ao owner do slider, sem virar writer financeiro.
assert.match(invariants, /const freeInput = exact\.cloneNode\(true\)/);
assert.match(invariants, /freeInput\.addEventListener\('change', commitExact\)/);
assert.match(invariants, /freeInput\.addEventListener\('blur', commitExact\)/);
assert.match(invariants, /slider\.dispatchEvent\(new Event\('input'/);
assert.doesNotMatch(invariants, /app\.state\.targetProfit\s*=|app\.save\(\)/, 'Guard de digitação não pode virar writer financeiro');

console.log('FARO UX-R2→R3: drafts, DRE, digitação exata e invariantes do motor preservados — ok');
