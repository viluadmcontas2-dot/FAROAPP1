import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const tour = await readFile('faro-tour.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
const onboarding = await readFile('faro-onboarding.js', 'utf8');
const commit = await readFile('faro-onboarding-commit.js', 'utf8');
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

const onboardingIndex = shell.indexOf('faro-onboarding.js?v=3');
const commitIndex = shell.indexOf('faro-onboarding-commit.js?v=1');
const tourIndex = shell.indexOf('faro-tour.js?v=2');
assert.ok(onboardingIndex >= 0 && onboardingIndex < commitIndex && commitIndex < tourIndex,
  'Owner final precisa carregar entre onboarding e tour');
assert.match(commit, /window\.dispatchEvent\(new CustomEvent\('faro:onboarding-complete'\)\)/,
  'Owner final precisa emitir o handoff somente depois do próprio commit');
assert.match(commit, /cloneNode\(true\)[\s\S]*replaceWith\(/,
  'Owner final precisa remover o listener anônimo anterior do CTA');
assert.doesNotMatch(tour, /getElementById\('faroFinish'\)|querySelector\(['"]#faroFinish['"]\)/,
  'Tour não pode ser segundo owner do botão final do onboarding');
assert.match(tour, /window\.addEventListener\('faro:onboarding-complete'/,
  'Tour deve consumir apenas o evento de domínio pós-persistência');
assert.match(commit, /onboardingComplete\s*=\s*true;[\s\S]*app\.save\(\);[\s\S]*modal\.classList\.add\('hidden'\);[\s\S]*navigateToPrimary\('dashboard'\);[\s\S]*faro:onboarding-complete/,
  'Persistir → fechar onboarding → Home → handoff deve ser a sequência canônica');
assert.match(commit, /finalizing|aria-busy/,
  'Duplo toque não pode executar a conclusão duas vezes');
assert.match(commit, /try\s*\{[\s\S]*app\.syncInputs\(\)[\s\S]*app\.render\(\)[\s\S]*\}\s*catch/,
  'Falha de refresh depois do commit não pode prender o onboarding');

const startAt = tour.indexOf('function start(');
const nextAt = tour.indexOf('function next()', startAt);
const startBlock = tour.slice(startAt, nextAt);
assert.match(startBlock, /!app\.state\.onboardingComplete/,
  'Tour jamais pode aparecer enquanto onboarding estiver incompleto');
assert.match(startBlock, /state\.status === 'active'/,
  'Tour ativo precisa retomar o passo salvo em vez de travar o handoff');
assert.match(startBlock, /state\.status === 'done'[\s\S]*state\.status === 'skipped'/,
  'Tour concluído ou pulado não pode reiniciar automaticamente');
assert.match(tour, /function complete\(\)[\s\S]*navigateToPrimary\('dashboard'\)/,
  'Fim do tour precisa devolver o motorista ao ponto de partida real');

assert.doesNotMatch(tour, /app\.state\.(targetProfit|workWeekdays|fuel|costs|records|paymentOccurrences|reserveContributions)\s*=/,
  'Tour é preferência de UI e não pode gravar estado financeiro');

console.log('FARO HF1: commit owner único e tour percorre telas reais sem concorrência — ok');