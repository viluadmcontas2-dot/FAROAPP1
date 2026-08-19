import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const tour = await readFile('faro-tour.js', 'utf8');
const planning = await readFile('faro-planning.js', 'utf8');
const onboarding = await readFile('faro-onboarding.js', 'utf8');

assert.match(tour, /faro-ui-tour-v1/);
assert.match(tour, /title:'Hoje'/);
assert.match(tour, /title:'Registrar'/);
assert.match(tour, /title:'Planejar'/);
assert.match(tour, /title:'Histórico'/);
assert.match(tour, /title:'Central'/);
assert.equal((tour.match(/title:'/g) || []).length, 5, 'Tour deve ensinar exatamente cinco destinos principais');
assert.match(tour, /PULAR/);
assert.match(tour, /VOLTAR/);
assert.match(tour, /PRÓXIMO/);
assert.match(tour, /status:'active'/);
assert.match(tour, /status:'done'/);
assert.match(tour, /status:'skipped'/);
assert.match(tour, /replay:\(\) => start\(\{ replay:true \}\)/);
assert.match(tour, /faroReplayTour/);
assert.match(tour, /prefers-reduced-motion:reduce/);
assert.match(tour, /alvo obrigatório ausente/);
assert.match(tour, /faroFinish/);
assert.match(onboarding, /id="faroFinish"/);
assert.match(planning, /dataset\.faroTour = 'planning'/);
assert.match(planning, /dataset\.faroTour = 'today'/);
assert.doesNotMatch(tour, /app\.state\.(targetProfit|workWeekdays|fuel|costs|records|paymentOccurrences|reserveContributions)\s*=/,
  'Tour é preferência de UI e não pode gravar estado financeiro');

console.log('FARO UX-R2: tour pós-onboarding é curto, retomável, pulável e isolado do financeiro — ok');
