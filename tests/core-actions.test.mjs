import test from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../src/core/actions.js';
import { defaultState, normalizeState } from '../src/core/state.js';
import { calc, sepAmounts, occ } from '../src/core/calc.js';

const TODAY = '2026-10-21';
const ctx = (o = {}) => ({ today: TODAY, now: new Date(2026, 9, 21, 13, 5).getTime(), id: 'k1', ...o });
const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(freeze); } return o; };
const fresh = () => freeze(defaultState()); // congelado: qualquer mutacao lanca erro
const run = (s, type, payload, c = ctx()) => reduce(s, { type, payload }, c);
const CLOSE = { p: { uber: 241.8, n99: 112.5, indrive: 64, extra: 20 }, km: 206, h: 9 };

test('acao desconhecida ou lixo devolve o mesmo estado', () => {
  const s = fresh();
  assert.equal(run(s, 'nao/existe', {}), s);
  assert.equal(reduce(s, null, ctx()), s);
  assert.equal(reduce(s, { type: '__proto__' }, ctx()), s);
  assert.equal(reduce(s, { type: 'toString' }, ctx()), s);
});

test('onboarding/complete aplica escolhas e marca como pronto', () => {
  const s = run(fresh(), 'onboarding/complete', {
    vehicle: 'financiado', energy: 'etanol', fuel: { etanol: { price: 4.5, eff: 8 } }, daysWeek: 5, save: 300, spend: 800,
    sources: ['uber', 'n99'], bills: [{ id: 'internet', on: false }, { id: 'parcela-carro', v: 1600 }],
  });
  assert.equal(s.onboarded, true);
  assert.equal(s.onboardedAt, TODAY);
  assert.equal(s.vehicle, 'financiado');
  assert.equal(s.fuel.etanol.price, 4.5);
  assert.equal(s.fuel.gasolina.price, 6.29);
  assert.deepEqual(s.sources.map(x => x.k), ['uber', 'n99']);
  assert.equal(s.bills.find(b => b.id === 'internet').on, false);
  assert.equal(s.bills.find(b => b.id === 'parcela-carro').v, 1600);
});

test('day/close grava o dia, da XP uma vez e ignora km zero', () => {
  let s = run(fresh(), 'day/close', CLOSE);
  assert.equal(s.recs[TODAY].closed, true);
  assert.equal(s.recs[TODAY].km, 206);
  assert.equal(s.recs[TODAY].p.uber, 241.8);
  assert.equal(s.xp, 40);
  s = run(freeze(s), 'day/close', { ...CLOSE, km: 210 });
  assert.equal(s.recs[TODAY].km, 210);
  assert.equal(s.xp, 40); // fechar de novo o mesmo dia nao duplica XP
  const s0 = fresh();
  assert.equal(run(s0, 'day/close', { ...CLOSE, km: 0 }), s0);
});

test('day/close aceita texto do teclado e mantem os gastos ja lancados', () => {
  let s = run(fresh(), 'entry/add', { kind: 'out', amount: 24, cat: 'Alimentação' });
  s = run(freeze(s), 'day/close', { p: { uber: '241,80', n99: 'abc', __proto__: 5 }, km: '206', h: 40 });
  const r = s.recs[TODAY];
  assert.equal(r.p.uber, 241.8);
  assert.equal(r.p.n99, 0);
  assert.equal(r.exp, 24);
  assert.equal(r.km, 206);
  assert.equal(r.h, 24);
  assert.equal({}.polluted, undefined);
});

test('day/separate move o dinheiro para os cofres uma unica vez', () => {
  let s = run(fresh(), 'day/close', CLOSE);
  const a = sepAmounts(calc(s, TODAY), TODAY);
  const before = s.xp;
  s = run(freeze(s), 'day/separate', { sep: { carro: true, casa: true, reserva: true } });
  const pot = id => s.pots.find(p => p.id === id).v;
  assert.equal(pot('carro'), Math.round(a.carro * 100) / 100);
  assert.equal(pot('casa'), Math.round(a.casa * 100) / 100);
  assert.equal(pot('reserva'), a.reserva);
  assert.equal(s.moves.length, 3);
  assert.equal(s.moves[0].d, TODAY);
  assert.equal(s.xp, before + 20);
  const again = run(freeze(s), 'day/separate', { sep: { carro: true, casa: true, reserva: true } });
  assert.equal(again, s); // idempotente
});

test('day/separate: pular nao mexe nos cofres e dia aberto nao separa', () => {
  const closed = freeze(run(fresh(), 'day/close', CLOSE));
  const skipped = run(closed, 'day/separate', { sep: { carro: false, casa: false, reserva: false } });
  assert.deepEqual(skipped.pots, closed.pots);
  assert.equal(skipped.xp, closed.xp);
  const open = fresh();
  assert.equal(run(open, 'day/separate', { sep: { carro: true } }), open);
});

test('entry/add ganho soma no bruto do dia; fonte desconhecida e ignorada', () => {
  let s = run(fresh(), 'entry/add', { kind: 'in', amount: '42,50', plat: 'uber' });
  s = run(freeze(s), 'entry/add', { kind: 'in', amount: 10, plat: 'uber' });
  assert.equal(s.recs[TODAY].p.uber, 52.5);
  assert.equal(s.recs[TODAY].closed, false);
  const f = freeze(s);
  assert.equal(run(f, 'entry/add', { kind: 'in', amount: 5, plat: 'naoexiste' }), f);
  assert.equal(run(f, 'entry/add', { kind: 'in', amount: 5, plat: '__proto__' }), f);
  assert.equal(run(f, 'entry/add', { kind: 'in', amount: 0, plat: 'uber' }), f);
  assert.equal(run(f, 'entry/add', { kind: 'in', amount: -5, plat: 'uber' }).recs[TODAY].p.uber, 57.5); // sinal e descartado
});

test('entry/add gasto: data/hora reais, combustivel nao desconta duas vezes', () => {
  let s = run(fresh(), 'entry/add', { kind: 'out', amount: 24, cat: 'Alimentação' });
  s = run(freeze(s), 'entry/add', { kind: 'out', amount: 100, cat: 'Combustível' }, ctx({ id: 'k2' }));
  assert.equal(s.exps.length, 2);
  assert.deepEqual([s.exps[0].date, s.exps[0].time, s.exps[0].id], [TODAY, '13:05', 'ek1']);
  assert.equal(s.recs[TODAY].exp, 24);
});

test('entry/edit e entry/remove acertam o total do dia', () => {
  let s = run(fresh(), 'entry/add', { kind: 'out', amount: 24, cat: 'Alimentação' });
  s = run(freeze(s), 'entry/add', { kind: 'out', amount: 10, cat: 'Pedágio' }, ctx({ id: 'k2' }));
  s = run(freeze(s), 'entry/edit', { id: 'ek1', amount: 30, cat: 'Combustível' });
  assert.equal(s.recs[TODAY].exp, 10);
  assert.equal(s.exps.find(e => e.id === 'ek1').cat, 'Combustível');
  s = run(freeze(s), 'entry/remove', { id: 'ek2' });
  assert.equal(s.recs[TODAY].exp, 0);
  assert.equal(s.exps.length, 1);
  const f = freeze(s);
  assert.equal(run(f, 'entry/remove', { id: 'nada' }), f);
});

test('bill/pay e unpay: chave billId:ISO e XP so na primeira vez', () => {
  const oid = occ(fresh(), TODAY).find(o => o.id === 'luz').oid;
  assert.equal(oid, 'luz:2026-10-25');
  let s = run(fresh(), 'bill/pay', { oid });
  assert.equal(s.paid[oid], 1);
  assert.equal(s.xp, 10);
  const f = freeze(s);
  assert.equal(run(f, 'bill/pay', { oid }), f);
  s = run(f, 'bill/unpay', { oid });
  assert.equal('luz:2026-10-25' in s.paid, false);
  for (const bad of ['luz:2026-13-01', 'naoexiste:2026-10-25', '__proto__:2026-10-25', 'luz', 5, null]) assert.equal(run(f, 'bill/pay', { oid: bad }), f, String(bad));
});

test('bill/create: vence a partir de hoje; update e deactivate', () => {
  let s = run(fresh(), 'bill/create', { name: ' Escola ', icon: 'ph-graduation-cap', color: '#3DDC97', cat: 'pessoal', v: '300,50', due: 10 }, ctx({ id: 'zz' }));
  const b = s.bills.find(x => x.name === 'Escola');
  assert.equal(b.id, 'uzz');
  assert.equal(b.v, 300.5);
  assert.equal(b.user, true);
  assert.equal(b.start, TODAY);
  assert.ok(!occ(s, TODAY).some(o => o.id === 'uzz' && o.date < TODAY)); // dia 10 ja passou: 1o vencimento so no mes que vem
  s = run(freeze(s), 'bill/update', { id: 'uzz', v: 350, due: 27, name: 'Escola nova' });
  assert.deepEqual([s.bills.find(x => x.id === 'uzz').v, s.bills.find(x => x.id === 'uzz').due, s.bills.find(x => x.id === 'uzz').name], [350, 27, 'Escola nova']);
  assert.equal(occ(s, TODAY).find(o => o.id === 'uzz').date, '2026-10-27');
  s = run(freeze(s), 'bill/deactivate', { id: 'uzz' });
  assert.ok(!occ(s, TODAY).some(o => o.id === 'uzz'));
  const f = fresh();
  assert.equal(run(f, 'bill/create', { name: '  ', v: 10 }), f);
  assert.equal(run(f, 'bill/create', { name: 'x', v: 0 }), f);
  assert.equal(run(f, 'bill/update', { id: 'nada', v: 1 }), f);
});

test('ajustes: carro, combustivel, desgaste, meta, lembretes, tema, guias', () => {
  let s = run(fresh(), 'car/set', { vehicle: 'dono', energy: 'gnv', flexUse: 'etanol', wear: 0.2 });
  assert.deepEqual([s.vehicle, s.energy, s.flexUse, s.wear], ['dono', 'gnv', 'etanol', 0.2]);
  s = run(freeze(s), 'fuel/set', { key: 'gnv', price: 5, eff: 14 });
  assert.deepEqual(s.fuel.gnv, { price: 5, eff: 14 });
  s = run(freeze(s), 'plan/set', { save: 500, spend: 900, daysWeek: 5, revKmMode: 'manual', revKmManual: 2.5 });
  assert.deepEqual([s.save, s.spend, s.daysWeek, s.revKmMode, s.revKmManual], [500, 900, 5, 'manual', 2.5]);
  s = run(freeze(s), 'rem/set', { key: 'week', on: false });
  assert.equal(s.rem.week, false);
  s = run(freeze(s), 'theme/set', { theme: 'dia' });
  assert.equal(s.theme, 'dia');
  s = run(freeze(s), 'seen/mark', { screen: 'plan' });
  s = run(freeze(s), 'intro/seen', { screen: 'bills' });
  s = run(freeze(s), 'guide/dismiss', {});
  assert.deepEqual([s.seen.plan, s.introSeen.bills, s.guide], [1, 1, false]);
  s = run(freeze(s), 'xp/add', { amount: 25 });
  assert.equal(s.xp, 25);
});

test('ajustes com lixo sao contidos', () => {
  const s = run(fresh(), 'plan/set', { save: 1e99, spend: -1, daysWeek: 'x', revKmMode: 'hack' });
  assert.equal(s.save, 1e9);
  assert.equal(s.spend, 0);
  assert.equal(s.daysWeek, 6);
  assert.equal(s.revKmMode, 'auto');
  assert.equal(run(fresh(), 'theme/set', { theme: '<x>' }).theme, 'noturno');
  assert.deepEqual(Object.keys(run(fresh(), 'seen/mark', { screen: '__proto__' }).seen), []);
  assert.equal(run(fresh(), 'xp/add', { amount: 1e12 }).xp, 1000);
  assert.equal(run(fresh(), 'xp/add', { amount: -50 }).xp, 0);
});

test('fontes de renda e categorias de gasto', () => {
  let s = run(fresh(), 'source/add', { name: 'Vendas no carro', icon: 'ph-shopping-bag' }, ctx({ id: 'v1' }));
  assert.equal(s.sources.length, 6);
  assert.equal(s.sources.at(-1).k, 'uv1');
  assert.equal(s.sources.at(-1).icon, 'ph-duotone ph-shopping-bag');
  s = run(freeze(s), 'source/add', { name: 'Outra', icon: 'ph-gift' }, ctx({ id: 'v2' }));
  const f = freeze(s);
  assert.equal(run(f, 'source/add', { name: 'Cheia' }, ctx({ id: 'v3' })), f); // limite de 7
  s = run(f, 'expcat/add', { name: 'Multa', icon: 'ph-receipt' });
  assert.equal(s.expCats.at(-1).name, 'Multa');
  assert.equal(run(freeze(s), 'expcat/add', { name: 'Multa' }), s);
});

test('pot/move: colocar e tirar de um cofre', () => {
  let s = run(fresh(), 'pot/move', { id: 'reserva', dir: 'in', amount: 100 });
  assert.equal(s.pots.find(p => p.id === 'reserva').v, 100);
  assert.equal(s.moves[0].v, 100);
  s = run(freeze(s), 'pot/move', { id: 'reserva', dir: 'out', amount: 30 });
  assert.equal(s.pots.find(p => p.id === 'reserva').v, 70);
  assert.equal(s.moves[0].v, -30);
  const f = freeze(s);
  assert.equal(run(f, 'pot/move', { id: 'reserva', dir: 'out', amount: 999 }), f); // nao fica negativo
});

test('toda transicao devolve estado normalizado e nao muta o anterior', () => {
  let s = fresh();
  for (const [t, p] of [['day/close', CLOSE], ['day/separate', { sep: { carro: true, casa: true, reserva: true } }], ['entry/add', { kind: 'out', amount: 9.999, cat: 'Pedágio' }], ['bill/pay', { oid: 'luz:2026-10-25' }]]) {
    s = freeze(run(s, t, p));
    assert.deepEqual(normalizeState(s), s);
  }
});
