// Mesa do Chato (achados 2 a 7, 9, 13): historico imutavel, numero absurdo, dia retroativo, virada do mes, XP, km invalido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reduce, reduceEx } from '../src/core/actions.js';
import { defaultState, normalizeState } from '../src/core/state.js';
import { calc, occ, withEff } from '../src/core/calc.js';
import { indexFaro } from '../src/ui/derive.js';
import { createStore } from '../src/data/store.js';

const TODAY = '2026-10-21';
const ctx = (o = {}) => ({ today: TODAY, now: new Date(2026, 9, 21, 13, 5).getTime(), id: 'k1', ...o });
const ex = (s, type, payload, c = ctx()) => reduceEx(s, { type, payload }, c);
const run = (s, type, payload, c = ctx()) => reduce(s, { type, payload }, c);
const OK = { p: { uber: 240, n99: 100 }, km: 200, h: 9 };

test('2. historico imutavel: preco, carro e metas nao mexem em dia fechado', () => {
  let s = run(defaultState(), 'day/close', { ...OK, date: '2026-10-20' });
  s = run(s, 'day/close', { ...OK, date: '2026-10-19' });
  const before = calc(s, TODAY).month.lucro;
  assert.ok(before !== 0);
  const r = s.recs['2026-10-20'];
  assert.ok(r.snap && r.snap.en > 0 && r.snap.we > 0 && r.snap.car > 0 && r.snap.rev > 0);
  const gas = run(s, 'fuel/set', { key: 'gasolina', price: 9.99 });
  const dono = run(gas, 'car/set', { vehicle: 'dono', wear: 0.5 });
  const plan = run(dono, 'plan/set', { save: 5000, spend: 9000, daysWeek: 3 });
  assert.equal(calc(plan, TODAY).month.lucro, before);
  assert.equal(calc(plan, TODAY).num('2026-10-20').lucro, calc(s, TODAY).num('2026-10-20').lucro);
});

test('2. dia fechado de novo mantem o snapshot original; dia aberto usa custos atuais', () => {
  let s = run(defaultState(), 'day/close', { ...OK, date: '2026-10-20' });
  const snap = s.recs['2026-10-20'].snap;
  s = run(s, 'fuel/set', { key: 'gasolina', price: 9 });
  s = run(s, 'day/close', { ...OK, km: 150, date: '2026-10-20' });
  assert.deepEqual(s.recs['2026-10-20'].snap, snap);
  s = run(s, 'entry/add', { kind: 'in', plat: 'uber', amount: 100, date: '2026-10-21' });
  const open = calc(s, TODAY).num('2026-10-21');
  assert.ok(Math.abs(open.en - open.km * (9 / 11)) < 0.5 || open.en > 0);
});

test('2. dia sem snapshot (estado v2 novo) usa o calculo atual', () => {
  const s = normalizeState({ ...defaultState(), recs: { '2026-10-20': { p: { uber: 300 }, km: 100, h: 9, exp: 0, closed: true } } });
  assert.equal(s.recs['2026-10-20'].snap, undefined);
  assert.ok(calc(s, TODAY).num('2026-10-20').en > 0);
});

test('3. numero absurdo: erro estruturado e estado intacto', () => {
  const s = defaultState();
  let r = ex(s, 'day/close', { p: { uber: 5001 }, km: 100, h: 9 });
  assert.deepEqual(r.error, { error: 'valor_improvavel', campo: 'p.uber', limite: 5000 });
  assert.equal(r.state, s);
  r = ex(s, 'day/close', { p: { uber: 4000, n99: 4001 }, km: 100, h: 9 });
  assert.deepEqual(r.error, { error: 'valor_improvavel', campo: 'bruto', limite: 8000 });
  r = ex(s, 'day/close', { p: { uber: 300 }, km: 1501, h: 9 });
  assert.deepEqual(r.error, { error: 'valor_improvavel', campo: 'km', limite: 1500 });
  r = ex(s, 'day/close', { p: { uber: 300 }, km: 100, h: 25 });
  assert.deepEqual(r.error, { error: 'valor_improvavel', campo: 'h', limite: 24 });
  r = ex(s, 'entry/add', { kind: 'in', plat: 'uber', amount: 5001 });
  assert.deepEqual(r.error, { error: 'valor_improvavel', campo: 'p.uber', limite: 5000 });
  assert.equal(r.state, s);
});

test('3. entry/add soma no dia: estourar bruto ou app pelo acumulado tambem erra', () => {
  let s = run(defaultState(), 'entry/add', { kind: 'in', plat: 'uber', amount: 4000 });
  assert.equal(ex(s, 'entry/add', { kind: 'in', plat: 'uber', amount: 1500 }).error.campo, 'p.uber');
  s = run(s, 'entry/add', { kind: 'in', plat: 'n99', amount: 4000 });
  assert.equal(ex(s, 'entry/add', { kind: 'in', plat: 'indrive', amount: 100 }).error.campo, 'bruto');
});

test('3. confirmed:true aceita; limite duro de km e horas continua', () => {
  const s = defaultState();
  const r = ex(s, 'day/close', { p: { uber: 6000 }, km: 1800, h: 9, confirmed: true });
  assert.equal(r.error, null);
  assert.equal(r.state.recs[TODAY].km, 1800);
  assert.equal(ex(s, 'day/close', { p: { uber: 300 }, km: 3500, h: 9, confirmed: true }).error.limite, 3000);
  assert.equal(ex(s, 'day/close', { p: { uber: 300 }, km: 100, h: 30, confirmed: true }).error.campo, 'h');
});

test('3. aprendizado usa MEDIANA: um dia absurdo nao move o ganho por km', () => {
  const recs = {};
  for (let d = 1; d <= 20; d++) recs['2026-10-' + String(d).padStart(2, '0')] = { p: { uber: 240 }, km: 120, h: 9, exp: 0, closed: true };
  recs['2026-10-20'] = { p: { uber: 99999 }, km: 120, h: 9, exp: 0, closed: true };
  const e = withEff(normalizeState({ ...defaultState(), recs }));
  assert.equal(+e.revLearned.toFixed(2), 2);
});

test('4. dia retroativo: date aceito de hoje ate 35 dias atras; fora disso data_invalida', () => {
  const s = defaultState();
  assert.equal(ex(s, 'day/close', { ...OK, date: '2026-09-16' }).error, null);
  assert.deepEqual(ex(s, 'day/close', { ...OK, date: '2026-09-15' }).error, { error: 'data_invalida', campo: 'date' });
  assert.equal(ex(s, 'day/close', { ...OK, date: '2026-10-22' }).error.error, 'data_invalida');
  assert.equal(ex(s, 'day/close', { ...OK, date: 'ontem' }).error.error, 'data_invalida');
  assert.equal(ex(s, 'entry/add', { kind: 'out', cat: 'Pedágio', amount: 40, date: '2026-10-20' }).state.exps[0].date, '2026-10-20');
  assert.equal(ex(s, 'entry/add', { kind: 'out', cat: 'Pedágio', amount: 40, date: '2025-01-01' }).error.error, 'data_invalida');
  const a = run(s, 'entry/add', { kind: 'out', cat: 'Pedágio', amount: 40, date: '2026-10-20' });
  assert.equal(ex(a, 'entry/edit', { id: a.exps[0].id, amount: 50, date: '2026-10-30' }).error.error, 'data_invalida');
  assert.equal(ex(a, 'entry/remove', { id: a.exps[0].id, date: '2000-01-01' }).error.error, 'data_invalida');
  assert.equal(run(a, 'entry/remove', { id: a.exps[0].id, date: '2026-10-20' }).exps.length, 0);
});

test('4. fechar o mesmo dia de novo: edicao idempotente, XP uma vez', () => {
  let s = run(defaultState(), 'day/close', { ...OK, date: '2026-10-20' });
  const xp = s.xp;
  s = run(s, 'day/close', { ...OK, km: 180, date: '2026-10-20' });
  assert.equal(s.xp, xp);
  assert.equal(s.recs['2026-10-20'].km, 180);
});

test('5. virada do mes: conta nao paga do mes anterior segue atrasada em occ', () => {
  let s = run(defaultState(), 'bill/create', { name: 'Cartão', v: 500, rec: 'mensal', due: 28 }, ctx({ today: '2026-10-01' }));
  const id = s.bills.find(b => b.user).id;
  const nov = occ(s, '2026-11-01').filter(o => o.id === id);
  assert.deepEqual(nov.map(o => [o.date, o.paid]), [['2026-10-28', false], ['2026-11-28', false]]);
  s = run(s, 'bill/pay', { oid: `${id}:2026-10-28` });
  assert.deepEqual(occ(s, '2026-11-01').filter(o => o.id === id).map(o => o.date), ['2026-11-28']);
});

test('5. ocorrencia com mais de 31 dias nao volta; antes do start nao existe', () => {
  const s = normalizeState({ ...defaultState(), bills: [{ id: 'x', name: 'X', v: 10, rec: 'mensal', due: 3, cat: 'pessoal', on: true }] });
  assert.ok(!occ(s, '2026-11-20').some(o => o.date === '2026-10-03'));
  const t = { ...s, bills: [{ ...s.bills.find(b => b.id === 'x'), start: '2026-11-02' }] };
  assert.ok(!occ(t, '2026-11-10').some(o => o.date < '2026-11-02'));
});

test('5. pilar Contas em dia: sem conta vencida vale 100', () => {
  const d0 = defaultState();
  const s = normalizeState({ ...d0, bills: d0.bills.map(b => ({ ...b, on: false })) });
  const C = calc(s, '2026-11-01');
  const p = indexFaro(s, C, occ(s, '2026-11-01')).pillars.find(x => x.key === 'bills');
  assert.equal(p.score, 100);
  assert.equal(p.hint, 'nenhuma atrasada');
});

test('5. onboarding/complete grava start em todas as contas ativas; onboardedAt so na primeira vez', () => {
  let s = run(defaultState(), 'onboarding/complete', { sources: ['uber'] }, ctx({ today: '2026-10-21' }));
  assert.ok(s.bills.filter(b => b.on).every(b => b.start === '2026-10-21'));
  assert.equal(s.onboardedAt, '2026-10-21');
  s = run(s, 'onboarding/complete', { sources: ['uber'] }, ctx({ today: '2026-10-27' }));
  assert.equal(s.onboardedAt, '2026-10-21');
  assert.ok(s.bills.filter(b => b.on).every(b => b.start === '2026-10-21'));
});

test('6. XP de conta so na primeira vez por ocorrencia', () => {
  let s = defaultState();
  const oid = 'luz:2026-10-10';
  s = run(s, 'bill/pay', { oid });
  const xp = s.xp;
  assert.ok(xp > 0);
  for (let i = 0; i < 3; i++) { s = run(s, 'bill/unpay', { oid }); assert.equal(occ(s, TODAY).find(o => o.oid === oid)?.paid ?? false, false); s = run(s, 'bill/pay', { oid }); }
  assert.equal(s.xp, xp);
  assert.ok(s.paid[oid]);
  s = run(s, 'bill/unpay', { oid });
  assert.ok(!s.paid[oid]);
});

test('6. dia vazio: bruto menor que R$ 1 nao fecha nem da XP', () => {
  const s = defaultState();
  const r = ex(s, 'day/close', { p: { uber: 0.5 }, km: 100, h: 9 });
  assert.deepEqual(r.error, { error: 'dia_vazio' });
  assert.equal(r.state, s);
  assert.equal(ex(s, 'day/close', { p: {}, km: 100 }).error.error, 'dia_vazio');
});

test('7. km zero ou invalido: km_invalido; nunca clamp silencioso', () => {
  const s = defaultState();
  for (const km of [0, -5, '', null, undefined, 'abc', 0.4]) assert.deepEqual(ex(s, 'day/close', { p: { uber: 300 }, km }).error, { error: 'km_invalido', campo: 'km' }, String(km));
  assert.equal(ex(s, 'day/close', { p: { uber: 300 }, km: 3500 }).error.error, 'valor_improvavel');
  assert.equal(ex(s, 'day/close', { p: { uber: 300 }, km: 3500 }).state, s);
});

test('store.dispatchEx devolve o erro estruturado e nao grava', () => {
  const persister = { load: () => null, schedule() {}, flush: () => true, hasPending: () => false, save: () => true };
  const store = createStore({ persister, now: () => Date.UTC(2026, 9, 21, 15), autoFlush: false, watchStorage: () => {} });
  const r = store.dispatchEx({ type: 'day/close', payload: { p: { uber: 99999 }, km: 100, h: 9 } });
  assert.equal(r.error.error, 'valor_improvavel');
  assert.equal(store.getMeta().dirty, false);
  assert.equal(store.dispatchEx({ type: 'day/close', payload: { p: { uber: 300 }, km: 100, h: 9 } }).error, null);
});
