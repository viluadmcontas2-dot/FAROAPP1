// Importação com limites excedidos: rejeita o arquivo INTEIRO, sem tocar no estado atual.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile('faro-state.js', 'utf8');
const defaults = () => ({ version: 3, targetProfit: 4000, workWeekdays: [1,2,3,4,5,6], extraDaysOff: 0, revenueKm: 2.25,
  fuel: { type: 'gnv', price: 4.79, efficiency: 13.2 }, compare: { gasPrice: 6.19 }, costs: [], records: [], events: [] });
const original = { ...defaults(), onboardingComplete: true, costs: [{ id: 'mine', name: 'Meu custo', value: 10 }], records: [{ id: 'r1', date: '2026-08-01', gross: 100 }] };
const app = {
  state: JSON.parse(JSON.stringify(original)), todayKey: () => '2026-08-15', number: v => Number(v) || 0,
  cloneDefaults: defaults, normalizeState(v) { return { ...defaults(), ...v }; }, migrateLegacy(v) { return { ...defaults(), ...v }; },
  saves: 0, save() { this.saves++; }, syncInputs() {}, render() {}, recordNumbers: r => r,
  toasts: [], toast(m) { this.toasts.push(m); }
};
const window = { __vettaApp: app };
vm.runInNewContext(source, { window, document: {}, URL, Blob, Date, Math, Number, JSON, Object, Array, String, Set, Map, console });
const savesBefore = app.saves;
const before = JSON.parse(JSON.stringify(app.state)); // já com as extensões do boot
const fileOf = obj => { const raw = JSON.stringify(obj); return { target: { value: 'x', files: [{ size: raw.length, text: async () => raw }] } }; };

const tooMany = { app: 'FARO', version: 3, data: { ...defaults(), costs: Array.from({ length: 201 }, (_, i) => ({ id: 'c' + i, name: 'n', value: 1 })), records: [] } };
await app.importData(fileOf(tooMany));
assert.deepEqual(JSON.parse(JSON.stringify(app.state)), before, 'estado atual não pode mudar quando o backup excede o limite');
assert.equal(app.saves, savesBefore, 'nada pode ser salvo');
assert.match(app.toasts.at(-1), /^Esse backup tem custos demais \(201\)\. O limite é 200\. Seus dados atuais não foram alterados\.$/);

const manyEvents = { app: 'FARO', version: 3, data: { ...defaults(), events: Array.from({ length: 2001 }, (_, i) => ({ id: 'e' + i, date: '2026-01-01', title: 't' })), records: [] } };
await app.importData(fileOf(manyEvents));
assert.deepEqual(JSON.parse(JSON.stringify(app.state)), before);
assert.match(app.toasts.at(-1), /eventos demais \(2001\)\. O limite é 2000/);

// No limite exato continua aceitando.
const ok = { app: 'FARO', version: 3, data: { ...defaults(), costs: Array.from({ length: 200 }, (_, i) => ({ id: 'c' + i, name: 'n', value: 1 })), records: [] } };
await app.importData(fileOf(ok));
assert.equal(app.state.costs.length, 200);
assert.equal(app.toasts.at(-1), 'Backup importado.');
console.log('import-limits-runtime: ok');
