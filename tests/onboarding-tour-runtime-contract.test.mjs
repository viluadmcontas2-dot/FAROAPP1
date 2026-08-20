import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const onboarding = await readFile('faro-onboarding.js', 'utf8');
const tour = await readFile('faro-tour.js', 'utf8');

// HF1 physical regression: the final onboarding gesture has exactly one owner.
const finishStart = onboarding.indexOf("$('faroFinish').addEventListener('click'");
assert.ok(finishStart >= 0, 'Onboarding precisa possuir o gesto final');
const finishEnd = onboarding.indexOf("$('faroRentalWeekly').value", finishStart);
const finishBlock = onboarding.slice(finishStart, finishEnd);

assert.match(finishBlock, /app\.state\.onboardingComplete = true;[\s\S]*app\.save\(\);/,
  'Onboarding precisa persistir conclusão antes do handoff');
assert.match(finishBlock, /modal\.classList\.add\('hidden'\);[\s\S]*navigateToPrimary\('dashboard'\);[\s\S]*faro:onboarding-complete/,
  'Handoff só pode acontecer depois de fechar onboarding e entrar na Home real');
assert.match(finishBlock, /disabled\s*=\s*true|finaliz/i,
  'Gesto final precisa ser idempotente contra duplo toque');

assert.doesNotMatch(tour, /getElementById\('faroFinish'\)|querySelector\(['"]#faroFinish['"]\)/,
  'Tour não pode observar diretamente o botão final do onboarding');
assert.match(tour, /window\.addEventListener\('faro:onboarding-complete'/,
  'Tour deve consumir somente o evento de domínio pós-commit');

const startAt = tour.indexOf('function start(');
assert.ok(startAt >= 0, 'Tour precisa ter start explícito');
const nextAt = tour.indexOf('function next()', startAt);
const startBlock = tour.slice(startAt, nextAt);
assert.match(startBlock, /!app\.state\.onboardingComplete/,
  'Tour jamais pode iniciar ou retomar enquanto onboarding estiver incompleto');
assert.match(startBlock, /state\.status\s*===\s*'active'/,
  'Tour ativo precisa ser retomável sem resetar o passo');
assert.doesNotMatch(startBlock, /state\.status !== 'idle'\) return/,
  'Estado active não pode deadlockar o handoff pós-onboarding');

console.log('FARO HF1 runtime contract: owner único, handoff pós-persistência e retomada sem sobreposição — ok');
