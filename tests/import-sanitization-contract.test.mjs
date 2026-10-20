import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile('faro-state.js', 'utf8');
const defaults = () => ({ version: 3, targetProfit: 4000, workWeekdays: [1,2,3,4,5,6], extraDaysOff: 0, revenueKm: 2.25,
  fuel: { type: 'gnv', price: 4.79, efficiency: 13.2 }, compare: { gasPrice: 6.19 }, costs: [], records: [], events: [] });
const app = {
  state: {}, todayKey: () => '2026-08-15', number: v => (Number.isFinite(Number(v)) ? Number(v) : 0),
  cloneDefaults: defaults, normalizeState(v) { return { ...defaults(), ...v }; }, save() {}, recordNumbers: r => r,
  toasts: [], toast(m) { this.toasts.push(m); }
};
const window = { __vettaApp: app };
vm.runInNewContext(source, { window, document: {}, URL, Blob, Date, Math, Number, JSON, Object, Array, String, Set, Map, Array });
const sanitize = v => JSON.parse(JSON.stringify(window.FaroState.sanitize(v)));
const ID = /^[A-Za-z0-9_-]{1,64}$/;

// 1) ida-e-volta: backup histórico válido sai IDÊNTICO
const valid = { ...defaults(), onboardingComplete: true,
  costs: [{ id: 'maintenance-default', name: 'Reserva', kind: 'per_km', category: 'reserve', value: 0.18, active: true },
          { id: 'cost-lq2x1-ab3d9', name: 'Seguro', kind: 'monthly', category: 'obligation', value: 210.5, active: true, dueDay: 10 }],
  records: [{ id: 'day-2026-08-14', date: '2026-08-14', gross: 300, km: 120, hours: 9, fuelSpend: 0, fuelCostKmSnapshot: 0, fixedShareSnapshot: 0,
    fuelTypeSnapshot: 'gnv', earningsBySource: { uber: 300 }, updatedAt: '2026-08-14T20:00:00.000Z' }],
  events: [{ id: 'event-lq-1', title: 'Revisão', date: '2026-09-01', category: 'maintenance', notes: 'Troca de óleo' }],
  paymentOccurrences: [{ id: 'cost-lq2x1-ab3d9:2026-08-10', costId: 'cost-lq2x1-ab3d9', dueDate: '2026-08-10', status: 'paid', amount: 210.5, costName: 'Seguro', kindSnapshot: 'monthly' }],
  paymentTrackingStartedAt: '2026-08-01',
  reserveContributions: [{ id: 'reserve-entry-1', reserveId: 'maintenance-default', date: '2026-08-14', amount: 50, createdAt: '2026-08-14T20:00:00.000Z' }],
  reserveProfiles: { 'maintenance-default': { goalAmount: 1000, targetDate: null, updatedAt: '2026-08-14T20:00:00.000Z' } } };
assert.deepEqual(sanitize(JSON.parse(JSON.stringify(valid))), valid, 'Backup histórico válido precisa importar idêntico');

// 2) malicioso
const evil = `"><img src=x onerror=window.__xss=1>`;
const bad = JSON.parse(`{"__proto__":{"polluted":1},"constructor":{"prototype":{"p2":1}},"targetProfit":"abc","revenueKm":1e999,"extraDaysOff":"3",
 "costs":[{"id":${JSON.stringify(evil)},"name":${JSON.stringify('x'.repeat(5000))},"value":"NaN","kind":${JSON.stringify(evil)},"category":"reserve","__proto__":{"q":1}}],
 "records":[{"id":${JSON.stringify(evil)},"date":"2026-08-14","gross":"999","km":1e999,"fuelCostKmSnapshot":"x"},{"id":"a","date":${JSON.stringify(evil)}}],
 "events":[{"id":${JSON.stringify(evil)},"title":"t","date":"2026-09-01","category":${JSON.stringify(evil)}}],
 "paymentOccurrences":[{"id":${JSON.stringify(evil + ':2026-08-10')},"costId":${JSON.stringify(evil)},"dueDate":"2026-08-10","amount":"1e999x"}],
 "reserveContributions":[{"id":${JSON.stringify(evil)},"reserveId":${JSON.stringify(evil)},"date":"2026-08-14","amount":1e999}],
 "reserveProfiles":{${JSON.stringify(evil)}:{"goalAmount":"20"},"__proto__":{"z":1}}}`);
const out = sanitize(bad);
assert.equal({}.polluted, undefined); assert.equal({}.p2, undefined);
assert.equal(Object.hasOwn(out, '__proto__'), false); assert.equal(Object.hasOwn(out, 'constructor'), false);
assert.equal(out.targetProfit, 4000); assert.equal(out.revenueKm, 2.25); assert.equal(out.extraDaysOff, 3);
const c = out.costs[0];
assert.match(c.id, ID); assert.equal(c.name.length, 200); assert.equal(c.value, 0); assert.match(c.kind, ID); assert.equal(c.q, undefined);
assert.match(out.records[0].id, ID); assert.equal(out.records[0].gross, 999); assert.ok(!out.records[0].km, 'km infinito some');
assert.equal('fuelCostKmSnapshot' in out.records[0], false);
assert.equal(out.records.length, 1, 'registro com data hostil é descartado');
assert.match(out.events[0].id, ID); assert.match(out.events[0].category === '' ? 'ok' : out.events[0].category, /^[A-Za-z0-9_-]+$/);
const occ = out.paymentOccurrences[0];
assert.equal(occ.costId, c.id, 'referência de custo continua coerente'); assert.equal(occ.id, `${c.id}:2026-08-10`); assert.equal(occ.amount, 0);
assert.equal(out.reserveContributions[0].reserveId, c.id); assert.equal(out.reserveContributions[0].amount, 0); assert.match(out.reserveContributions[0].id, ID);
assert.deepEqual(Object.keys(out.reserveProfiles), [c.id]); assert.equal(out.reserveProfiles[c.id].goalAmount, 20);
assert.equal(JSON.stringify(out).includes('<'), false, 'nenhum < sobrevive nos ids/categorias');
assert.deepEqual(sanitize(JSON.parse(JSON.stringify(out))), out, 'saneamento é idempotente');
assert.deepEqual(sanitize(bad), out, 'ids regenerados são determinísticos');

// 3) limites
const many = sanitize({ ...defaults(), costs: Array.from({ length: 900 }, (_, i) => ({ id: 'c' + i, name: 'n', value: 1 })) });
assert.equal(many.costs.length, 200);
console.log('FARO: importação saneada (ids, números, tamanhos, __proto__) e backup válido idêntico — ok');
