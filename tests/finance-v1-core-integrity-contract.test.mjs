import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('app.js', 'utf8');
const withoutBoot = source.replace(/\napp\.init\(\);\s*$/, '\n');

const noop = () => {};
const fakeElement = () => ({
  style:{},
  classList:{ add:noop, remove:noop, toggle:noop },
  appendChild:noop,
  setAttribute:noop,
  insertAdjacentHTML:noop,
  insertAdjacentElement:noop,
  remove:noop,
  querySelector:() => null,
  closest:() => null
});
const sandbox = {
  window: { addEventListener: noop },
  console,
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  document: {
    head: { appendChild:noop },
    body: { appendChild:noop },
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: fakeElement
  },
  navigator: { onLine: true },
  history: { state:null, replaceState:noop, pushState:noop, back:noop },
  location: { href:'https://faro.invalid/' },
  CustomEvent: class {},
  setTimeout,
  clearTimeout,
  Intl,
  Date,
  Math,
  JSON,
  Number,
  String,
  Set,
  Map
};
sandbox.window.window = sandbox.window;
vm.runInNewContext(withoutBoot, sandbox, { filename:'app.js' });

const app = sandbox.window.__vettaApp;
assert.ok(app, 'app.js precisa expor o core FARO sem depender do bootstrap visual');

app.state = app.normalizeState({
  targetProfit: 4000,
  workWeekdays: [1,2,3,4,5,6],
  extraDaysOff: 0,
  revenueKm: 2,
  fuel: { type:'custom', label:'Atual', unit:'L', price:10, efficiency:10 },
  costs: [
    { id:'fixed-current', name:'Custo atual', kind:'monthly', category:'obligation', value:1000, active:true }
  ],
  records: [],
  events: []
});

const historicalZero = app.recordNumbers({
  id:'day-2026-08-01',
  date:'2026-08-01',
  gross:100,
  km:10,
  fuelSpend:0,
  fuelCostKmSnapshot:0,
  perKmCostSnapshot:0,
  percentCostSnapshot:0,
  fixedShareSnapshot:0
}, { plannedDays:10 });

assert.equal(historicalZero.fuel, 0,
  'snapshot histórico explícito de combustível=0 precisa permanecer zero mesmo se o combustível atual tiver custo');
assert.equal(historicalZero.fixedShare, 0,
  'snapshot histórico explícito de rateio fixo=0 precisa permanecer zero mesmo se hoje existirem custos fixos');
assert.equal(historicalZero.net, 100,
  'um registro histórico congelado sem custos não pode ser reescrito economicamente por parâmetros futuros');

const legacyWithoutSnapshots = app.recordNumbers({
  id:'day-legacy', date:'2026-08-02', gross:100, km:10, fuelSpend:0
}, { plannedDays:10 });
assert.equal(legacyWithoutSnapshots.fuel, 10,
  'registro realmente sem snapshot ainda pode usar o custo atual como fallback de compatibilidade');
assert.equal(legacyWithoutSnapshots.fixedShare, 100,
  'registro realmente sem snapshot ainda pode usar o rateio fixo atual como fallback de compatibilidade');

console.log('FARO_FINANCE_V1 N2: snapshots históricos explícitos zero permanecem fatos; ausência real ainda usa fallback — ok');
