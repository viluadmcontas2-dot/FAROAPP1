// Calculo financeiro. Porte fiel de design/logic.dc.js (calc/occ/eff/sepAmounts), trocando
// "dia do mes fixo" por datas ISO reais: o mes e sempre o mes de `today`.
import { monthDates, mondayIndex, weekday, dayOfMonth, addDays } from './dates.js';
import { FUEL, RIDE_KEYS, LEVELS } from './catalog.js';

const sum = (o, keys) => keys.reduce((a, k) => a + ((o && o[k]) || 0), 0);
const rideSum = p => sum(p, RIDE_KEYS);
const total = p => Object.values(p || {}).reduce((a, b) => a + b, 0);

export function activeBills(s) {
  return s.bills.filter(b => b.on && (!b.veh || (b.veh === 'dono' ? s.vehicle !== 'alugado' : b.veh === s.vehicle)));
}

// Ocorrencias de contas no mes de `today`. oid = "idDaConta:AAAA-MM-DD" (mesma chave de state.paid).
export function occ(s, today) {
  const dates = monthDates(today);
  const L = [];
  for (const b of activeBills(s)) {
    const push = date => { if (!b.start || date >= b.start) L.push({ ...b, d: dayOfMonth(date), date, oid: `${b.id}:${date}` }); };
    if (b.rec === 'semanal') dates.filter(date => weekday(date) === b.due).forEach(push);
    else push(dates[Math.min(b.due, dates.length) - 1]);
  }
  return L.map(o => ({ ...o, paid: !!s.paid[o.oid] }));
}

const LEARN_DAYS = 60; // aprende dos ultimos 60 dias fechados (o historico antigo nao pesa)

// Ganho por km aprendido dos dias fechados (so fontes de corrida contam) + modo manual.
export function withEff(s) {
  const days = Object.keys(s.recs).filter(d => s.recs[d].closed).sort().slice(-LEARN_DAYS);
  let rg = 0, km = 0, hh = 0;
  for (const d of days) { const r = s.recs[d]; rg += rideSum(r.p); km += r.km || 0; hh += r.h || 0; }
  const learned = km ? rg / km : 2.2, perH = hh ? rg / hh : 25;
  const revKm = s.revKmMode === 'manual' ? s.revKmManual : Math.max(0.5, +learned.toFixed(2));
  return { ...s, revKm, revLearned: learned, perH, learnDays: days.length };
}

export function calc(state, today) {
  const s = withEff(state);
  const dates = monthDates(today);
  const work = date => mondayIndex(date) < s.daysWeek;
  const ft = s.energy === 'flex' ? s.flexUse : s.energy;
  const F = { ...FUEL[ft], ...s.fuel[ft] };
  const fuelKm = F.price / F.eff;
  const mon = b => (b.rec === 'semanal' ? (b.v * 52) / 12 : b.v);
  const act = activeBills(s);
  const carFixed = act.filter(b => b.cat === 'carro').reduce((a, b) => a + mon(b), 0);
  const life = act.filter(b => b.cat !== 'carro').reduce((a, b) => a + mon(b), 0);
  const planned = Math.max(1, dates.filter(work).length);
  const carShare = carFixed / planned, lifeShare = life / planned;
  const target = life + s.save + s.spend;

  const num = date => {
    const r = s.recs[date];
    if (!r) return null;
    const g = total(r.p), rg = rideSum(r.p);
    const km = r.closed ? r.km : Math.round(rg / s.revKm);
    const en = km * fuelKm, we = km * s.wear, ex = r.exp || 0;
    const lucro = g - en - we - ex - carShare;
    return { date, d: dayOfMonth(date), g, rg, km, h: r.h || Math.max(1, km / 23), en, we, ex, car: carShare, lucro, life: lifeShare, sobra: lucro - lifeShare, closed: r.closed, p: r.p };
  };
  const agg = list => {
    const o = { g: 0, rg: 0, km: 0, h: 0, en: 0, we: 0, ex: 0, car: 0, lucro: 0, life: 0, sobra: 0, n: 0, p: {} };
    for (const r of list.filter(Boolean)) {
      for (const k of ['g', 'rg', 'km', 'h', 'en', 'we', 'ex', 'car', 'lucro', 'life', 'sobra']) o[k] += r[k];
      o.n++;
      for (const k of Object.keys(r.p)) o.p[k] = (o.p[k] || 0) + (r.p[k] || 0);
    }
    return o;
  };

  const closedDays = dates.filter(d => s.recs[d] && s.recs[d].closed);
  const month = agg(closedDays.map(num));
  const todayClosed = !!(s.recs[today] && s.recs[today].closed);
  const workFrom = from => dates.filter(d => d >= from && work(d)).length;
  const rem = todayClosed ? workFrom(addDays(today, 1)) : workFrom(today);
  const need = Math.max(0, target - month.lucro);
  const dailyLucro = rem ? need / rem : 0;
  const ckm = Math.max(0.05, s.revKm - fuelKm - s.wear);
  const dailyGross = rem ? ((dailyLucro + carShare) / ckm) * s.revKm : 0;
  const targetFor = date => {
    let before = 0;
    for (const x of closedDays) if (x < date) before += num(x).lucro;
    const r = workFrom(date);
    return r ? Math.max(0, target - before) / r : 0;
  };
  const planDailyGross = (((target + carFixed) / planned) / ckm) * s.revKm;
  const avg = month.n ? month.lucro / month.n : 0;
  const proj = month.lucro + avg * rem;
  return {
    today, dates, ft, F, fuelKm, carFixed, life, planned, carShare, lifeShare, target, num, agg, month, todayClosed, rem, need,
    dailyLucro, dailyGross, targetFor, planDailyGross, proj, ckm,
    revKm: s.revKm, revLearned: s.revLearned, perH: s.perH, learnDays: s.learnDays, closedDays,
  };
}

// Quanto separar de um dia fechado: carro (rateio + desgaste), casa (rateio) e 15% da sobra para a reserva.
export function sepAmounts(C, date) {
  const r = C.num(date);
  if (!r) return { carro: 0, casa: 0, reserva: 0, livre: 0, en: 0 };
  const sob = Math.max(0, r.sobra);
  const reserva = Math.round(sob * 0.15 * 100) / 100;
  return { carro: r.car + r.we, casa: r.life, reserva, livre: Math.max(0, sob - reserva), en: r.en };
}

// Dias de pista seguidos ate hoje (hoje so conta se ja fechado; dias de folga nao quebram).
export function streak(s, today) {
  let n = 0, d = s.recs[today] && s.recs[today].closed ? today : addDays(today, -1);
  for (let i = 0; i < 400; i++, d = addDays(d, -1)) {
    if (mondayIndex(d) >= s.daysWeek) continue;
    if (s.recs[d] && s.recs[d].closed) n++;
    else break;
  }
  return n;
}

export function level(xp) {
  let i = 0;
  LEVELS.forEach((l, k) => { if (xp >= l[0]) i = k; });
  const nx = LEVELS[i + 1];
  return {
    level: i + 1, name: LEVELS[i][1], next: nx ? nx[1] : '', toNext: nx ? nx[0] - xp : 0,
    pct: nx ? Math.min(100, ((xp - LEVELS[i][0]) / (nx[0] - LEVELS[i][0])) * 100) : 100,
  };
}
