// Paridade: os numeros do nucleo real (src/core/calc.js, datas ISO) devem bater com a logica
// ORIGINAL do design (design/logic.dc.js, TODAY=21, MDAYS=31) para outubro de 2026 (21/10 = quarta).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { calc, occ, activeBills, sepAmounts, withEff, streak, level } from '../src/core/calc.js';
import { normalizeState, defaultState } from '../src/core/state.js';

const TODAY = '2026-10-21';
const iso = d => `2026-10-${String(d).padStart(2, '0')}`;

// ---- sandbox com a logica original
const src = fs.readFileSync(new URL('../design/logic.dc.js', import.meta.url), 'utf8').replace(/^<script[^>]*>/, '').replace(/<\/script>\s*$/, '');
const React = { createElement() {}, Fragment: {}, useState() {}, useRef() {}, useEffect() {}, createRef: () => ({ current: null }) };
const Component = vm.runInNewContext(src + ';Component', { DCLogic: class {}, React, JSON, Math, Object, Set, parseInt, parseFloat, Number, String, Array });
const design = new Component();
const baseProto = () => JSON.parse(JSON.stringify(design.state));
const D = ps => { const s = design.eff(ps); return { s, C: design.calc(s) }; };

// ---- conversor estado do prototipo -> v2 (data real)
function toV2(ps) {
  const recs = {};
  for (const [d, r] of Object.entries(ps.recs)) recs[iso(d)] = { p: r.p, km: r.km, h: r.h, exp: r.exp || 0, closed: r.closed };
  const paid = {};
  for (const k of Object.keys(ps.paid)) { const [id, d] = k.split(':'); paid[`${id}:${iso(d)}`] = 1; }
  return normalizeState({
    ...defaultState(), onboarded: true, vehicle: ps.vehicle, energy: ps.energy, flexUse: ps.flexUse,
    fuel: Object.fromEntries(Object.entries(ps.fuel).map(([k, f]) => [k, { price: f.price, eff: f.eff }])),
    bills: ps.bills.map(b => ({ ...b, ...(b.user ? { start: TODAY } : {}) })),
    wear: ps.wear, save: ps.save, spend: ps.spend, daysWeek: ps.daysWeek, revKmMode: ps.revKmMode, revKmManual: ps.revKmManual,
    recs, paid, sources: ps.sources, expCats: ps.expCats,
  });
}

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);
const KEYS = ['carFixed', 'life', 'planned', 'carShare', 'lifeShare', 'target', 'rem', 'need', 'dailyLucro', 'dailyGross', 'planDailyGross', 'proj', 'ckm', 'fuelKm'];
const AGG = ['g', 'rg', 'km', 'h', 'en', 'we', 'ex', 'car', 'lucro', 'life', 'sobra', 'n'];

function compare(name, ps) {
  const { s: ds, C: dc } = D(ps);
  const v2 = toV2(ps);
  const nc = calc(v2, TODAY);
  for (const k of KEYS) close(nc[k], dc[k], `${name}.${k}`);
  assert.equal(nc.ft, dc.ft, name + '.ft');
  assert.equal(nc.todayClosed, dc.todayClosed, name + '.todayClosed');
  close(nc.revKm, ds.revKm, name + '.revKm');
  close(nc.revLearned, ds.revLearned, name + '.revLearned');
  close(nc.perH, ds.perH, name + '.perH');
  assert.equal(nc.learnDays, ds.learnDays);
  for (const k of AGG) close(nc.month[k], dc.month[k], `${name}.month.${k}`);
  for (const d of [1, 9, 13, 14, 15, 20, 21, 22, 31]) {
    const a = dc.num(d), b = nc.num(iso(d));
    if (!a) { assert.equal(b, null, `${name}.num(${d})`); continue; }
    for (const k of ['g', 'rg', 'km', 'h', 'en', 'we', 'ex', 'car', 'lucro', 'life', 'sobra']) close(b[k], a[k], `${name}.num(${d}).${k}`);
    assert.equal(b.closed, a.closed);
    assert.equal(b.d, d);
  }
  for (const d of [1, 5, 15, 21, 22, 30, 31]) close(nc.targetFor(iso(d)), dc.targetFor(d), `${name}.targetFor(${d})`);
  // contas do mes
  const po = design.occ(ds), no = occ(v2, TODAY);
  assert.equal(no.length, po.length, name + ' occ.length');
  // (JSON: os arrays do sandbox vm tem outro prototipo)
  assert.equal(JSON.stringify(no.map(o => [o.id, o.d, o.paid])), JSON.stringify(po.map(o => [o.id, o.d, o.paid])));
  assert.equal(JSON.stringify(no.map(o => o.oid)), JSON.stringify(po.map(o => o.id + ':' + iso(o.d))));
  assert.equal(JSON.stringify(activeBills(v2).map(b => b.id)), JSON.stringify(design.activeBills(ds).map(b => b.id)));
  // separacao do dia
  const pa = design.sepAmounts(ds, dc), na = sepAmounts(nc, TODAY);
  for (const k of ['carro', 'casa', 'reserva', 'livre', 'en']) close(na[k], pa[k], `${name}.sep.${k}`);
}

test('paridade: cenario padrao (aluguel semanal, flex gasolina, 6 dias)', () => compare('padrao', baseProto()));

test('paridade: carro financiado', () => { const p = baseProto(); p.vehicle = 'financiado'; compare('financiado', p); });
test('paridade: carro proprio (seguro, sem parcela)', () => { const p = baseProto(); p.vehicle = 'dono'; compare('dono', p); });
test('paridade: eletrico', () => { const p = baseProto(); p.energy = 'eletrico'; compare('eletrico', p); });
test('paridade: flex com etanol, desgaste e plano diferentes', () => {
  const p = baseProto(); p.flexUse = 'etanol'; p.wear = 0.2; p.daysWeek = 5; p.save = 900; p.spend = 300; compare('etanol', p);
});
test('paridade: 4 e 7 dias de pista', () => {
  for (const n of [4, 7]) { const p = baseProto(); p.daysWeek = n; compare('dias' + n, p); }
});
test('paridade: ganho por km manual', () => {
  const p = baseProto(); p.revKmMode = 'manual'; p.revKmManual = 2.4; compare('manual', p);
});
test('paridade: hoje fechado com km e conta paga', () => {
  const p = baseProto();
  p.recs[21] = { p: { uber: 241.8, n99: 112.5, indrive: 64, extra: 20 }, km: 206, h: 9, exp: 24, closed: true };
  p.paid['luz:25'] = 1; p.paid['mei:20'] = 1;
  compare('hoje-fechado', p);
});
test('paridade: conta criada pelo usuario (1o vencimento so no proximo mes se ja passou)', () => {
  const p = baseProto();
  p.bills.push({ id: 'u1', name: 'Escola', icon: 'ph-graduation-cap', color: '#3DDC97', cat: 'pessoal', v: 300, rec: 'mensal', due: 10, on: true, user: true });
  p.bills.push({ id: 'u2', name: 'Plano', icon: 'ph-heartbeat', color: '#FF6B9A', cat: 'pessoal', v: 120, rec: 'mensal', due: 27, on: true, user: true });
  compare('conta-usuario', p);
});
test('paridade: contas desligadas e sem dias gravados', () => {
  const p = baseProto(); p.bills.forEach(b => { if (b.cat !== 'carro') b.on = false; }); p.recs = { 21: p.recs[21] }; compare('minimo', p);
});

// ---- comportamento novo (datas reais)
test('fim de mes: dias que faltam e ultimo dia fechado', () => {
  const s = defaultState();
  s.recs['2026-10-31'] = { p: { uber: 300 }, km: 130, h: 9, exp: 0, closed: true };
  assert.equal(calc(s, '2026-10-31').rem, 0);
  assert.equal(calc(s, '2026-10-31').dailyLucro, 0);
  assert.equal(calc(defaultState(), '2026-10-31').rem, 1); // 31/10/2026 e sabado: dia de pista ainda aberto
});
test('virada de mes ignora dias do mes anterior', () => {
  const s = defaultState();
  s.recs['2026-09-30'] = { p: { uber: 400 }, km: 180, h: 9, exp: 0, closed: true };
  s.recs['2026-10-01'] = { p: { uber: 300 }, km: 130, h: 8, exp: 0, closed: true };
  const c = calc(s, '2026-10-02');
  assert.equal(c.month.n, 1);
  assert.equal(c.month.g, 300);
  assert.equal(c.learnDays, 2); // o ritmo por km aprende de todos os dias fechados
  assert.equal(calc(s, '2026-09-30').month.g, 400);
});
test('fevereiro bissexto e comum', () => {
  assert.equal(calc(defaultState(), '2028-02-10').planned, calc(defaultState(), '2028-02-10').planned);
  const leap = calc({ ...defaultState(), daysWeek: 7 }, '2028-02-10').planned;
  const common = calc({ ...defaultState(), daysWeek: 7 }, '2027-02-10').planned;
  assert.equal(leap, 29); assert.equal(common, 28);
});
test('conta mensal dia 31 cai no ultimo dia de meses curtos', () => {
  const s = defaultState();
  s.bills.push({ id: 'x31', name: 'Dia 31', icon: 'ph-receipt', color: '#5B95FF', cat: 'casa', v: 10, rec: 'mensal', due: 31, on: true });
  assert.equal(occ(s, '2026-11-10').find(o => o.id === 'x31').date, '2026-11-30');
  assert.equal(occ(s, '2028-02-10').find(o => o.id === 'x31').date, '2028-02-29');
});
test('aluguel semanal: toda segunda do mes', () => {
  const s = defaultState();
  const r = occ(s, '2026-10-21').filter(o => o.id === 'aluguel-carro');
  assert.deepEqual(r.map(o => o.date), ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
});
test('aprendizado de receita por km usa so dias fechados e respeita o modo manual', () => {
  const s = defaultState();
  s.recs['2026-10-19'] = { p: { uber: 200, gorjeta: 50 }, km: 100, h: 10, exp: 0, closed: true };
  s.recs['2026-10-20'] = { p: { uber: 500 }, km: 100, h: 0, exp: 0, closed: false };
  const e = withEff(s);
  assert.equal(e.revLearned, 2); // gorjeta nao entra no R$/km
  assert.equal(e.revKm, 2);
  assert.equal(e.perH, 20);
  assert.equal(withEff({ ...s, revKmMode: 'manual', revKmManual: 3 }).revKm, 3);
  assert.equal(withEff(defaultState()).revKm, 2.2);
});
test('sequencia e nivel', () => {
  const s = defaultState(); // 6 dias/sem: domingo e folga
  for (const d of ['2026-10-23', '2026-10-24', '2026-10-26']) s.recs[d] = { p: { uber: 1 }, km: 1, h: 1, exp: 0, closed: true };
  assert.equal(streak(s, '2026-10-26'), 3); // atravessa o domingo de folga
  assert.equal(streak(s, '2026-10-27'), 3); // hoje ainda aberto nao quebra
  assert.equal(streak(s, '2026-10-28'), 0);
  s.recs['2026-09-30'] = { p: { uber: 1 }, km: 1, h: 1, exp: 0, closed: true };
  assert.equal(streak(s, '2026-10-01'), 1);
  assert.deepEqual(level(0), { level: 1, name: 'Primeira volta', next: 'Na pista', toNext: 300, pct: 0 });
  assert.equal(level(1240).level, 5);
  assert.equal(level(99999).next, '');
});
