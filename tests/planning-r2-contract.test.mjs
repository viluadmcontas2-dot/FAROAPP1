import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const planning = await readFile('faro-planning.js', 'utf8');
const invariants = await readFile('faro-planning-invariants.js', 'utf8');
const app = await readFile('app.js', 'utf8');

assert.match(planning, /dataset\.view = 'planning'/);
assert.match(planning, /slider\.removeAttribute\('data-model'\)/);
assert.match(planning, /let targetDraft = app\.state\.targetProfit/);
assert.match(planning, /targetDraft = clampTarget/);
assert.match(planning, /app\.state\.targetProfit = targetDraft;[\s\S]*app\.save\(\)/);
assert.match(planning, /resetTargetDraft/);
assert.match(planning, /createSubview\('planning-days'/);
assert.match(planning, /createSubview\('planning-operation'/);
assert.match(planning, /createSubview\('planning-costs'/);
assert.match(planning, /faroDreDetails/);
assert.match(planning, /<summary>Como o FARO chegou nesse valor\?<\/summary>/);
assert.match(planning, /app\.calculations\(\)/);
assert.doesNotMatch(planning, /const\s+contributionKm\s*=|function\s+calculations\s*\(/);

// Preview só faz override em memória e restaura o estado antes de retornar ao usuário.
assert.match(planning, /const calculationsWith = overrides =>/);
assert.match(planning, /finally \{[\s\S]*app\.state\.targetProfit = saved\.targetProfit[\s\S]*app\.state\.fuel = saved\.fuel/);
assert.doesNotMatch(planning, /calculationsWith[\s\S]{0,500}app\.save\(\)/, 'Preview não pode persistir rascunho');

// O motor legado continua declarando o target de render e o R2 preserva esse contrato.
assert.match(app, /this\.\$\('extraDaysOffBadge'\)\.textContent/);
assert.match(invariants, /id = 'extraDaysOffBadge'/);
assert.match(invariants, /hidden = true/);

console.log('FARO UX-R2: meta, drafts, subcontextos, DRE e invariantes do motor protegidos — ok');
