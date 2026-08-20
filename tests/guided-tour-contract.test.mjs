import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const tour = await readFile('faro-tour.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
const onboarding = await readFile('faro-onboarding.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');

assert.match(tour, /faro-ui-tour-v1/);
assert.match(tour, /title:'Hoje'[\s\S]*view:'dashboard'/);
assert.match(tour, /title:'Registrar'[\s\S]*view:'day'/);
assert.match(tour, /title:'Planejar'[\s\S]*view:'planning'/);
assert.match(tour, /title:'Histórico'[\s\S]*view:'history'/);
assert.match(tour, /title:'Central'[\s\S]*view:'more'/);
assert.equal((tour.match(/title:'/g) || []).length, 5, 'Tour deve ensinar exatamente cinco destinos principais');
assert.match(tour, /PULAR/);
assert.match(tour, /VOLTAR/);
assert.match(tour, /PRÓXIMO/);
assert.match(tour, /IR PARA O INÍCIO/);
assert.match(tour, /status:'active'/);
assert.match(tour, /status:'done'/);
assert.match(tour, /status:'skipped'/);
assert.match(tour, /replay:\(\) => start\(\{ replay:true/);
assert.match(tour, /faroReplayTour/);
assert.match(tour, /prefers-reduced-motion:reduce/);
assert.match(tour, /alvo obrigatório ausente/);
assert.match(onboarding, /id="faroFinish"/);
assert.match(planning, /dataset\.faroTour = 'planning'/);
assert.match(planning, /dataset\.faroTour = 'today'/);

// Handoff pós-onboarding: onboarding continua dono da conclusão; tour só começa depois do commit do gesto.
const onboardingIndex = shell.indexOf('faro-onboarding.js');
const tourIndex = shell.indexOf('faro-tour.js');
assert.ok(onboardingIndex >= 0 && tourIndex > onboardingIndex, 'Onboarding precisa carregar antes do tour');
assert.match(tour, /queueMicrotask\(\(\) =>/,
  'Tour deve observar a conclusão somente depois que os listeners do gesto terminaram');
assert.match(tour, /faro:onboarding-complete/,
  'Handoff precisa virar um evento explícito, sem segunda navegação concorrente no mesmo clique');
const finishStart = tour.indexOf("const finish = document.getElementById('faroFinish')");
assert.ok(finishStart >= 0, 'Bridge pós-onboarding precisa existir');
const finishEnd = tour.indexOf('const schedulePlace', finishStart);
const finishBlock = tour.slice(finishStart, finishEnd);
assert.doesNotMatch(finishBlock, /state\s*=\s*\{\s*status:'active',\s*step:0/,
  'Clique final não pode resetar o tour diretamente');
assert.match(finishBlock, /app\.state\.onboardingComplete/,
  'Bridge só pode liberar tour depois da persistência do onboarding');
assert.match(tour, /if \(!replay && state\.status !== 'idle'\) return/,
  'Start normal precisa ser idempotente contra duplo clique/reentrada');
assert.match(tour, /function complete\(\)[\s\S]*navigateToPrimary\('dashboard'\)/,
  'Fim do tour precisa devolver o motorista ao ponto de partida real');

assert.doesNotMatch(tour, /app\.state\.(targetProfit|workWeekdays|fuel|costs|records|paymentOccurrences|reserveContributions)\s*=/,
  'Tour é preferência de UI e não pode gravar estado financeiro');

console.log('FARO HF1: onboarding entrega uma vez e tour didático percorre telas reais sem reset concorrente — ok');
