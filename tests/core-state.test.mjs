import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION, defaultState, normalizeState, LIMITS } from '../src/core/state.js';

const clone = x => JSON.parse(JSON.stringify(x));

test('defaultState e valido, sem dados de mentira', () => {
  const s = defaultState();
  assert.equal(SCHEMA_VERSION, 2);
  assert.equal(s.schemaVersion, 2);
  assert.equal(s.onboarded, false);
  assert.deepEqual(s.recs, {});
  assert.deepEqual(s.paid, {});
  assert.equal(s.xp, 0);
  assert.equal(s.exps.length, 0);
  assert.ok(s.pots.every(p => p.v === 0));
  assert.deepEqual(normalizeState(s), s); // ja nasce normalizado
});

test('normalizeState e idempotente', () => {
  const s = defaultState();
  s.recs['2026-10-20'] = { p: { uber: 100.5 }, km: 50, h: 8, exp: 3, closed: true };
  s.paid['luz:2026-10-25'] = 1;
  const n = normalizeState(s);
  assert.deepEqual(normalizeState(n), n);
  assert.equal(n.recs['2026-10-20'].km, 50);
});

test('nunca lanca com qualquer entrada', () => {
  for (const x of [undefined, null, 0, 1, NaN, 'x', '{', '{"a":1}', [], [1, 2], true, () => 1, Symbol('s'), { schemaVersion: 2 }, { bills: 'x' }, { recs: [] }, { recs: 5, paid: 'a' }])
    assert.doesNotThrow(() => normalizeState(x));
  const cyc = {}; cyc.self = cyc; cyc.bills = cyc;
  assert.doesNotThrow(() => normalizeState(cyc));
  assert.deepEqual(normalizeState(null), defaultState());
});

test('estado de outra versao e ignorado', () => {
  assert.deepEqual(normalizeState({ schemaVersion: 1, vehicle: 'dono', xp: 999 }), defaultState());
});

test('__proto__ e chaves perigosas nao poluem nem entram', () => {
  const evil = JSON.parse('{"schemaVersion":2,"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":2}},' +
    '"recs":{"__proto__":{"p":{},"km":1},"2026-10-01":{"p":{"__proto__":50,"constructor":5,"uber":10},"km":10,"closed":true}},' +
    '"paid":{"__proto__:2026-10-01":1,"luz:2026-10-25":1},"seen":{"__proto__":1,"home":1},' +
    '"fuel":{"__proto__":{"price":1},"gasolina":{"price":7,"eff":10,"__proto__":{"x":1}}}}');
  const n = normalizeState(evil);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.getPrototypeOf(n.recs), Object.prototype);
  assert.deepEqual(Object.keys(n.recs), ['2026-10-01']);
  assert.deepEqual(Object.keys(n.recs['2026-10-01'].p), ['uber']);
  assert.deepEqual(Object.keys(n.paid), ['luz:2026-10-25']);
  assert.deepEqual(Object.keys(n.seen), ['home']);
  assert.equal(n.fuel.gasolina.price, 7);
  assert.equal('polluted' in n, false);
});

test('chaves desconhecidas sao descartadas', () => {
  const s = clone(defaultState());
  s.hack = '<script>';
  s.bills[0].evil = 1;
  s.pots[0].evil = 1;
  const n = normalizeState(s);
  assert.equal('hack' in n, false);
  assert.equal('evil' in n.bills[0], false);
  assert.equal('evil' in n.pots[0], false);
});

test('numeros: NaN, Infinity, strings, extremos', () => {
  const s = clone(defaultState());
  s.xp = 'Infinity'; s.save = 1e300; s.spend = -5; s.wear = NaN; s.daysWeek = 99; s.revKmManual = 'abc';
  s.fuel.gasolina = { price: Infinity, eff: -3 };
  s.recs['2026-10-02'] = { p: { uber: 'NaN', n99: '12,5', indrive: 1e30 }, km: 1e12, h: 500, exp: -9, closed: 'yes' };
  const n = normalizeState(s);
  assert.equal(n.xp, defaultState().xp);
  assert.equal(n.save, LIMITS.maxMoney);
  assert.equal(n.spend, 0);
  assert.equal(n.wear, defaultState().wear);
  assert.equal(n.daysWeek, 7);
  assert.equal(n.revKmManual, defaultState().revKmManual);
  assert.equal(n.fuel.gasolina.price, defaultState().fuel.gasolina.price);
  assert.equal(n.fuel.gasolina.eff, 1);
  const r = n.recs['2026-10-02'];
  assert.equal(r.p.uber, 0);
  assert.equal(r.p.n99, 0); // "12,5" nao e numero JSON valido; so numeros sao aceitos em valores de recs
  assert.equal(r.p.indrive, LIMITS.maxMoney);
  assert.ok(r.km <= LIMITS.maxKm && r.h <= 24 && r.exp === 0);
  assert.equal(r.closed, false);
  for (const v of [n.xp, n.save, n.spend, n.wear, r.km, r.h]) assert.ok(Number.isFinite(v));
});

test('strings gigantes e de controle sao cortadas', () => {
  const s = clone(defaultState());
  s.bills[3].name = 'A'.repeat(1e6) + '\u0000\u0007';
  s.bills[3].icon = 'ph-x" onclick="alert(1)';
  s.bills[3].color = 'red;background:url(x)';
  s.sources[0].name = '\n\t  ';
  const n = normalizeState(s);
  assert.ok(n.bills[3].name.length <= LIMITS.name);
  assert.equal(/[\u0000-\u001f]/.test(n.bills[3].name), false);
  assert.match(n.bills[3].icon, /^[a-z0-9 -]*$/);
  assert.match(n.bills[3].color, /^#[0-9a-f]{6}$/i);
  assert.ok(n.sources[0].name.length > 0); // nome vazio cai no padrao
});

test('arrays e mapas enormes sao limitados', () => {
  const s = clone(defaultState());
  s.bills = Array.from({ length: 50000 }, (_, i) => ({ id: 'b' + i, name: 'c' + i, v: 10, cat: 'casa', rec: 'mensal', due: 5, on: true }));
  s.exps = Array.from({ length: 50000 }, (_, i) => ({ id: 'e' + i, date: '2026-10-01', cat: 'Outros', v: 1 }));
  s.moves = Array.from({ length: 50000 }, () => ({ t: 'x', p: 'y', v: 1 }));
  s.pots = Array.from({ length: 5000 }, (_, i) => ({ id: 'p' + i, name: 'p', v: 1 }));
  s.sources = Array.from({ length: 500 }, (_, i) => ({ k: 's' + i, name: 'n' }));
  s.recs = {};
  for (let i = 0; i < 20000; i++) s.recs[`${2000 + (i % 100)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`] = { p: { uber: 1 }, km: 1, closed: true };
  s.paid = {};
  for (let i = 0; i < 30000; i++) s.paid[`b${i}:2026-10-01`] = 1;
  const n = normalizeState(s);
  assert.ok(n.bills.length <= LIMITS.bills);
  assert.ok(n.exps.length <= LIMITS.exps);
  assert.ok(n.moves.length <= LIMITS.moves);
  assert.ok(n.pots.length <= LIMITS.pots);
  assert.ok(n.sources.length <= LIMITS.sources);
  assert.ok(Object.keys(n.recs).length <= LIMITS.recs);
  assert.ok(Object.keys(n.paid).length <= LIMITS.paid);
  assert.ok(JSON.stringify(n).length < 2e6);
});

test('invariantes: ids unicos, pots/bills basicos sempre existem, datas validas', () => {
  const s = clone(defaultState());
  s.bills = [{ id: 'x', name: 'A', v: 1, cat: 'casa', rec: 'mensal', due: 40 }, { id: 'x', name: 'B', v: 1 }, { id: 'a:b', name: 'C', v: 1 }, { name: 'sem id', v: 1 }];
  s.pots = [{ id: 'reserva', name: 'R', v: 5 }];
  s.recs = { '2026-02-30': { p: {}, km: 1 }, 'ontem': { p: {} } };
  s.paid = { 'x:2026-13-01': 1, 'x:2026-10-10': 1, 'x:2026-10-10 ': 1 };
  const n = normalizeState(s);
  assert.equal(n.bills.filter(b => b.id === 'x').length, 1);
  assert.equal(n.bills.find(b => b.id === 'x').due, 31);
  assert.ok(n.bills.some(b => b.id === 'aluguel-carro') && n.bills.some(b => b.id === 'parcela-carro'));
  assert.ok(!n.bills.some(b => b.id === 'a:b'));
  for (const id of ['carro', 'casa', 'reserva']) assert.ok(n.pots.some(p => p.id === id), id);
  assert.equal(n.pots.find(p => p.id === 'reserva').v, 5);
  assert.deepEqual(Object.keys(n.recs), []);
  assert.deepEqual(Object.keys(n.paid), ['x:2026-10-10']);
});

test('aceita estado valido completo sem perder dados', () => {
  const s = clone(defaultState());
  s.onboarded = true; s.onboardedAt = '2026-10-01'; s.vehicle = 'financiado'; s.energy = 'eletrico'; s.theme = 'dia';
  s.exps = [{ id: 'e1', date: '2026-10-21', time: '13:05', cat: 'Alimentação', icon: 'ph-duotone ph-fork-knife', v: 24 }];
  s.moves = [{ t: 'Fechamento do dia', p: 'Cofre do carro', v: 42, d: '2026-10-20' }];
  s.rem.week = false; s.seen.plan = 1; s.xp = 1240;
  const n = normalizeState(s);
  assert.deepEqual(n, s);
});

test('normalizeState: conta semanal limita due a 0..6; mensal a 1..31 (por recorrencia)', () => {
  const mk = (rec, due) => normalizeState({ schemaVersion: 2, bills: [{ id: 'x', name: 'X', v: 10, rec, due }] }).bills.find(b => b.id === 'x').due;
  assert.equal(mk('semanal', 3), 3);
  assert.equal(mk('semanal', 0), 0);
  assert.equal(mk('semanal', 10), 6);
  assert.equal(mk('mensal', 10), 10);
  assert.equal(mk('mensal', 0), 1);
  assert.equal(mk('mensal', 40), 31);
});
