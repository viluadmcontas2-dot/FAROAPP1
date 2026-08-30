import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile('faro-state.js', 'utf8');

const app = {
  state: {},
  todayKey: () => '2026-08-15',
  number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  },
  cloneDefaults() { return {}; },
  normalizeState(value) { return value && typeof value === 'object' ? value : {}; },
  save() {},
  recordNumbers(record) {
    const gross = this.number(record.gross);
    const km = this.number(record.km);
    const fuelRate = this.number(record.fuelCostKmSnapshot) || 0.5;
    const fuel = this.number(record.fuelSpend) > 0 ? this.number(record.fuelSpend) : km * fuelRate;
    const variable = 0;
    const percentCost = 0;
    const contribution = gross - fuel;
    const fixedShare = this.number(record.fixedShareSnapshot) > 0 ? this.number(record.fixedShareSnapshot) : 20;
    return {
      ...record,
      gross,
      km,
      fuel,
      variable,
      percentCost,
      contribution,
      fixedShare,
      net: contribution - fixedShare,
      costPerKm: km > 0 ? fuel / km : 0
    };
  }
};

const context = vm.createContext({ window: { __vettaApp: app }, console, Object, JSON, Number, Date, Math });
vm.runInContext(source, context, { filename: 'faro-state.js' });

const zeroSnapshot = app.recordNumbers({
  gross: 100,
  km: 10,
  fuelSpend: 0,
  fuelCostKmSnapshot: 0,
  fixedShareSnapshot: 0
});
assert.equal(zeroSnapshot.fuel, 0, 'Snapshot explícito de combustível zero não pode herdar combustível atual');
assert.equal(zeroSnapshot.fixedShare, 0, 'Snapshot explícito de custo fixo zero não pode herdar custo futuro');
assert.equal(zeroSnapshot.contribution, 100);
assert.equal(zeroSnapshot.net, 100);
assert.equal(zeroSnapshot.costPerKm, 0);

const legacyWithoutSnapshot = app.recordNumbers({ gross: 100, km: 10, fuelSpend: 0 });
assert.equal(legacyWithoutSnapshot.fuel, 5, 'Registro antigo sem snapshot mantém fallback legado');
assert.equal(legacyWithoutSnapshot.fixedShare, 20, 'Registro antigo sem snapshot mantém fallback legado');
assert.equal(legacyWithoutSnapshot.net, 75);

const nonZeroSnapshot = app.recordNumbers({
  gross: 100,
  km: 10,
  fuelSpend: 0,
  fuelCostKmSnapshot: 0.3,
  fixedShareSnapshot: 10
});
assert.equal(nonZeroSnapshot.fuel, 3);
assert.equal(nonZeroSnapshot.fixedShare, 10);
assert.equal(nonZeroSnapshot.net, 87);

console.log('FARO: snapshots históricos explícitos, inclusive zero, permanecem imutáveis — ok');
