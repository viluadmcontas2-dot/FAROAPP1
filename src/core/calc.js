// Calculo financeiro. Porte fiel de design/logic.dc.js (calc/occ/eff/sepAmounts), trocando
// "dia do mes fixo" por datas ISO reais: o mes e sempre o mes de `today`.
import { monthDates, mondayIndex, weekday, dayOfMonth, addDays, parseISO, toISO } from './dates.js';
import { FUEL, RIDE_KEYS, LEVELS } from './catalog.js';

const sum = (o, keys) => keys.reduce((a, k) => a + ((o && o[k]) || 0), 0);
const rideSum = p => sum(p, RIDE_KEYS);
const total = p => Object.values(p || {}).reduce((a, b) => a + b, 0);

export function activeBills(s) {
  return s.bills.filter(b => b.on && (!b.veh || (b.veh === 'dono' ? s.vehicle !== 'alugado' : b.veh === s.vehicle)));
}

// Ocorrencias de contas no mes de `today`. oid = "idDaConta:AAAA-MM-DD" (mesma chave de state.paid).
// Contas NAO pagas dos ultimos 31 dias (mes anterior incluso) continuam aparecendo, como atrasadas.
export const OVERDUE_DAYS = 31;
export function occ(s, today) {
  const dates = monthDates(today);
  const { y, m } = parseISO(today);
  const prev = monthDates(toISO(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1, 1));
  const floor = addDays(today, -OVERDUE_DAYS);
  const L = [];
  for (const b of activeBills(s)) {
    const add = (list, only) => {
      const push = date => {
        if (b.start && date < b.start) return;
        if (only && (date < floor || s.paid[`${b.id}:${date}`])) return;
        L.push({ ...b, d: dayOfMonth(date), date, oid: `${b.id}:${date}` });
      };
      if (b.rec === 'semanal') list.filter(date => weekday(date) === b.due).forEach(push);
      else push(list[Math.min(b.due, list.length) - 1]);
    };
    add(prev, true);
    add(dates, false);
  }
  return L.map(o => ({ ...o, paid: !!s.paid[o.oid] }));
}

const LEARN_DAYS = 60; // aprende dos ultimos 60 dias fechados (o historico antigo nao pesa)
const median = a => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y), h = b.length >> 1; return b.length % 2 ? b[h] : (b[h - 1] + b[h]) / 2; };

// Ganho por km aprendido dos dias fechados (so fontes de corrida contam) + modo manual.
// MEDIANA dos dias (robusta a um dia digitado errado), nao media.
export function withEff(s) {
  const days = Object.keys(s.recs).filter(d => s.recs[d].closed).sort().slice(-LEARN_DAYS);
  const perKm = [], perHr = [];
  for (const d of days) { const r = s.recs[d]; if (r.km > 0) perKm.push(rideSum(r.p) / r.km); if (r.h > 0) perHr.push(rideSum(r.p) / r.h); }
  const learned = median(perKm) ?? 2.2, perH = median(perHr) ?? 25;
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
    const sn = r.closed && r.snap ? r.snap : null; // dia fechado usa os custos congelados no fechamento
    const km = r.closed ? r.km : Math.round(rg / s.revKm);
    const en = km * (sn ? sn.en : fuelKm), we = km * (sn ? sn.we : s.wear), ex = r.exp || 0;
    const car = sn ? sn.car : carShare, lf = sn ? sn.life : lifeShare;
    const lucro = g - en - we - ex - car;
    return { date, d: dayOfMonth(date), g, rg, km, h: r.h || Math.max(1, km / 23), en, we, ex, car, lucro, life: lf, sobra: lucro - lf, closed: r.closed, p: r.p };
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
