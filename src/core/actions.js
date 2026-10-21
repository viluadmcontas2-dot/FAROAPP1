// Transicoes PURAS do estado: reduce(state, {type, payload}, ctx) => novo estado.
// ctx = { today: 'AAAA-MM-DD', now: ms, id: string unico por acao }. Nunca muta `state`; devolve o MESMO objeto quando nada muda.
import { isISO, hhmm, todayISO, addDays } from './dates.js';
import { parseMoney, round2 } from './money.js';
import { calc, sepAmounts } from './calc.js';
import { normalizeState, num, str, LIMITS } from './state.js';
import { FUEL, ENERGIES, VEHICLES, BILL_CATS, SCREENS, REM_KEYS, THEMES, SRC_CAT, XP, FUEL_CAT } from './catalog.js';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const pick = (v, list, def) => (typeof v === 'string' && list.includes(v) ? v : def);
const oid = /^([A-Za-z0-9_-]{1,40}):(\d{4}-\d{2}-\d{2})$/;
const emptyRec = () => ({ p: {}, km: 0, h: 0, exp: 0, closed: false });
const money = v => parseMoney(typeof v === 'number' || typeof v === 'string' ? v : 0);
const iconOf = (v, fallback) => (typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v) ? v : fallback);
// Erro estruturado de uma acao: o estado nao muda e a tela decide (ex.: pedir confirmacao).
class ActionError extends Error { constructor(e) { super(e.error); this.e = e; } }
const fail = e => { throw new ActionError(e); };
export const LIMITS_DAY = { app: 5000, gross: 8000, km: 1500, kmHard: 3000, h: 24, backDays: 35 };
// Data do lancamento: sem `date` = dia de trabalho de hoje; com `date`, ISO, <= hoje e ate 35 dias atras.
const dateOf = (p, ctx) => {
  if (!isObj(p) || p.date === undefined || p.date === null || p.date === '') return ctx.today;
  if (!isISO(p.date) || p.date > ctx.today || p.date < addDays(ctx.today, -LIMITS_DAY.backDays)) fail({ error: 'data_invalida', campo: 'date' });
  return p.date;
};
const improbable = (campo, limite) => fail({ error: 'valor_improvavel', campo, limite });
const withRec = (s, date, fn) => ({ ...s, recs: { ...s.recs, [date]: fn({ ...emptyRec(), ...s.recs[date], p: { ...(s.recs[date] && s.recs[date].p) } }) } });
const addXp = (s, n) => ({ ...s, xp: s.xp + n });
const countsAsExpense = cat => cat !== FUEL_CAT;

// Dia da conta: semanal = dia da semana (0 dom .. 6 sab); mensal = dia do mes (1..31). Fora da faixa limita; lixo usa `def`.
const dueOf = (rec, v, def) => (rec === 'semanal' ? Math.round(num(v, 0, 6, def)) : Math.round(num(v, 1, 31, def)));

const H = {
  // Onboarding: aplica as escolhas de uma vez (o normalizeState final garante tipos e limites).
  'onboarding/complete'(s, p, ctx) {
    const n = { ...s, onboarded: true, onboardedAt: s.onboardedAt || ctx.today };
    n.vehicle = pick(p.vehicle, VEHICLES, s.vehicle);
    n.energy = pick(p.energy, ENERGIES, s.energy);
    n.flexUse = pick(p.flexUse, ['gasolina', 'etanol'], s.flexUse);
    if (isObj(p.fuel)) n.fuel = Object.fromEntries(Object.keys(FUEL).map(k => [k, { ...s.fuel[k], ...(isObj(p.fuel[k]) ? p.fuel[k] : {}) }]));
    for (const k of ['wear', 'save', 'spend', 'daysWeek', 'revKmMode', 'revKmManual']) if (has(p, k)) n[k] = p[k];
    if (Array.isArray(p.sources)) {
      const keep = s.sources.filter(x => !SRC_CAT.some(c => c[0] === x.k));
      const chosen = SRC_CAT.filter(c => p.sources.includes(c[0])).map(([k, name, icon]) => s.sources.find(x => x.k === k) || { k, name, icon });
      n.sources = [...chosen, ...keep];
    }
    if (Array.isArray(p.bills)) {
      n.bills = s.bills.map(b => {
        const u = p.bills.find(x => isObj(x) && x.id === b.id);
        return u ? { ...b, ...(has(u, 'on') ? { on: u.on === true } : {}), ...(has(u, 'v') ? { v: u.v } : {}) } : b;
      });
    }
    // Toda conta ativa passa a valer a partir do onboarding (a tela nao precisa filtrar por onboardedAt).
    n.bills = n.bills.map(b => (b.on && !b.start ? { ...b, start: ctx.today } : b));
    return n;
  },

  'day/close'(s, p, ctx) {
    const date = dateOf(p, ctx);
    const kmRaw = typeof p.km === 'string' && p.km.trim() !== '' ? Number(p.km) : p.km;
    if (typeof kmRaw !== 'number' || !Number.isFinite(kmRaw) || Math.round(kmRaw) < 1) fail({ error: 'km_invalido', campo: 'km' });
    const km = Math.round(kmRaw);
    if (km > LIMITS_DAY.kmHard) improbable('km', LIMITS_DAY.kmHard);
    const hRaw = typeof p.h === 'string' && p.h.trim() !== '' ? Number(p.h) : p.h;
    if (typeof hRaw === 'number' && hRaw > LIMITS_DAY.h) improbable('h', LIMITS_DAY.h);
    const src = isObj(p.p) ? p.p : {};
    const rec = {};
    for (const x of s.sources) rec[x.k] = has(src, x.k) ? money(src[x.k]) : 0;
    const gross = round2(Object.values(rec).reduce((a, b) => a + b, 0));
    if (gross < 1) fail({ error: 'dia_vazio' });
    if (p.confirmed !== true) {
      for (const k of Object.keys(rec)) if (rec[k] > LIMITS_DAY.app) improbable('p.' + k, LIMITS_DAY.app);
      if (gross > LIMITS_DAY.gross) improbable('bruto', LIMITS_DAY.gross);
      if (km > LIMITS_DAY.km) improbable('km', LIMITS_DAY.km);
    }
    const prev = s.recs[date];
    // Historico imutavel: os custos usados ficam gravados no dia; reeditar o dia mantem o snapshot original.
    let snap = prev && prev.snap;
    if (!snap) {
      const C = calc(s, date);
      snap = { en: C.fuelKm, we: s.wear, car: C.carShare, life: C.lifeShare, rev: C.revKm };
    }
    const next = { ...(prev || {}), p: rec, km, h: round2(num(p.h, 1, 24, 9)), exp: (prev && prev.exp) || 0, closed: true, snap };
    const n = { ...s, recs: { ...s.recs, [date]: next } };
    return prev && prev.closed ? n : addXp(n, XP.close);
  },

  // Separa do dia fechado para os cofres escolhidos. Uma vez por dia.
  'day/separate'(s, p, ctx) {
    const date = dateOf(p, ctx);
    const rec = s.recs[date];
    if (!rec || !rec.closed || rec.sep) return s;
    const sep = isObj(p.sep) ? p.sep : {};
    const a = sepAmounts(calc(s, date), date);
    const ids = ['carro', 'casa', 'reserva'].filter(k => sep[k] === true && s.pots.some(x => x.id === k));
    if (!ids.length) return s;
    const moves = ids.map(k => ({ t: 'Fechamento do dia', d: date, p: s.pots.find(x => x.id === k).name, v: round2(a[k]) }));
    const n = {
      ...s,
      pots: s.pots.map(x => (ids.includes(x.id) ? { ...x, v: round2(x.v + a[x.id]) } : x)),
      moves: [...moves, ...s.moves],
      recs: { ...s.recs, [date]: { ...rec, sep: true } },
    };
    return addXp(n, XP.separate);
  },

  'entry/add'(s, p, ctx) {
    const amt = money(p.amount);
    const date = dateOf(p, ctx);
    if (amt < 0.01) return s;
    if (p.kind === 'in') {
      if (typeof p.plat !== 'string' || !s.sources.some(x => x.k === p.plat)) return s;
      if (p.confirmed !== true) {
        const cur = (s.recs[date] && s.recs[date].p) || {};
        if (round2((cur[p.plat] || 0) + amt) > LIMITS_DAY.app) improbable('p.' + p.plat, LIMITS_DAY.app);
        const gross = Object.values(cur).reduce((a, b) => a + (b || 0), 0) + amt;
        if (round2(gross) > LIMITS_DAY.gross) improbable('bruto', LIMITS_DAY.gross);
      }
      return withRec(s, date, r => ({ ...r, p: { ...r.p, [p.plat]: round2((r.p[p.plat] || 0) + amt) } }));
    }
    if (p.kind !== 'out') return s;
    const cat = str(p.cat, 40, 'Outros');
    const ec = s.expCats.find(c => c.name === cat);
    const time = typeof p.time === 'string' && /^\d{2}:\d{2}$/.test(p.time) ? p.time : hhmm(new Date(num(ctx.now, 0, 8.64e15, Date.now())));
    const e = { id: 'e' + ctx.id, date, time, cat, icon: ec ? ec.icon : 'ph-duotone ph-receipt', v: amt };
    const n = { ...s, exps: [...s.exps, e] };
    return countsAsExpense(cat) ? withRec(n, date, r => ({ ...r, exp: round2(r.exp + amt) })) : n;
  },

  'entry/edit'(s, p, ctx) {
    dateOf(p, ctx);
    const old = s.exps.find(e => e.id === p.id);
    const amt = money(p.amount);
    if (!old || amt < 0.01) return s;
    const cat = str(p.cat, 40, old.cat);
    const ec = s.expCats.find(c => c.name === cat);
    const next = { ...old, v: amt, cat, icon: ec ? ec.icon : old.icon };
    const delta = (countsAsExpense(cat) ? amt : 0) - (countsAsExpense(old.cat) ? old.v : 0);
    const n = { ...s, exps: s.exps.map(e => (e === old ? next : e)) };
    return s.recs[old.date] ? withRec(n, old.date, r => ({ ...r, exp: Math.max(0, round2(r.exp + delta)) })) : n;
  },

  'entry/remove'(s, p, ctx) {
    dateOf(p, ctx);
    const old = s.exps.find(e => e.id === p.id);
    if (!old) return s;
    const n = { ...s, exps: s.exps.filter(e => e !== old) };
    return countsAsExpense(old.cat) && s.recs[old.date] ? withRec(n, old.date, r => ({ ...r, exp: Math.max(0, round2(r.exp - old.v)) })) : n;
  },

  'bill/pay'(s, p) {
    const m = typeof p.oid === 'string' ? oid.exec(p.oid) : null;
    if (!m || !isISO(m[2]) || !s.bills.some(b => b.id === m[1]) || s.paid[p.oid]) return s;
    // paid[oid] = 0 guarda que o XP desta ocorrencia ja foi dado: pagar de novo nao rende XP.
    const given = has(s.paid, p.oid);
    const n = { ...s, paid: { ...s.paid, [p.oid]: 1 } };
    return given ? n : addXp(n, XP.pay);
  },
  'bill/unpay'(s, p) {
    if (typeof p.oid !== 'string' || !s.paid[p.oid]) return s;
    return { ...s, paid: { ...s.paid, [p.oid]: 0 } };
  },

  // Conta nova vence a partir de hoje: um dia que ja passou neste mes so vale no mes seguinte.
  'bill/create'(s, p, ctx) {
    const name = str(p.name, LIMITS.name);
    const v = money(p.v);
    if (!name || v < 0.01 || s.bills.length >= LIMITS.bills) return s;
    const rec = pick(p.rec, ['mensal', 'semanal'], 'mensal');
    const bill = {
      id: 'u' + ctx.id, name, icon: iconOf(p.icon, 'ph-receipt'), color: p.color, cat: pick(p.cat, BILL_CATS, 'pessoal'),
      v, rec, due: dueOf(rec, p.due, 1), on: true, user: true, start: ctx.today,
    };
    return { ...s, bills: [...s.bills, bill] };
  },
  'bill/update'(s, p) {
    const b = s.bills.find(x => x.id === p.id);
    if (!b) return s;
    const u = { ...b };
    if (has(p, 'name')) u.name = str(p.name, LIMITS.name, b.name);
    if (has(p, 'v')) u.v = money(p.v) || b.v;
    if (has(p, 'due')) u.due = dueOf(b.rec, p.due, b.due);
    if (has(p, 'cat')) u.cat = pick(p.cat, BILL_CATS, b.cat);
    if (has(p, 'icon')) u.icon = iconOf(p.icon, b.icon);
    if (has(p, 'color')) u.color = p.color;
    if (has(p, 'on')) u.on = p.on === true;
    return { ...s, bills: s.bills.map(x => (x === b ? u : x)) };
  },
  'bill/deactivate'(s, p) {
    const b = s.bills.find(x => x.id === p.id);
    return b && b.on ? { ...s, bills: s.bills.map(x => (x === b ? { ...b, on: false } : x)) } : s;
  },

  'car/set'(s, p) {
    return {
      ...s, vehicle: pick(p.vehicle, VEHICLES, s.vehicle), energy: pick(p.energy, ENERGIES, s.energy),
      flexUse: pick(p.flexUse, ['gasolina', 'etanol'], s.flexUse), wear: has(p, 'wear') ? p.wear : s.wear,
    };
  },
  'fuel/set'(s, p) {
    if (typeof p.key !== 'string' || !has(FUEL, p.key)) return s;
    const f = s.fuel[p.key];
    return { ...s, fuel: { ...s.fuel, [p.key]: { price: has(p, 'price') ? p.price : f.price, eff: has(p, 'eff') ? p.eff : f.eff } } };
  },
  'plan/set'(s, p) {
    const n = { ...s };
    for (const k of ['save', 'spend', 'daysWeek', 'revKmMode', 'revKmManual']) if (has(p, k)) n[k] = p[k];
    return n;
  },

  'rem/set'(s, p) {
    return REM_KEYS.includes(p.key) ? { ...s, rem: { ...s.rem, [p.key]: p.on === true } } : s;
  },
  'theme/set': (s, p) => ({ ...s, theme: pick(p.theme, THEMES, s.theme) }),
  'guide/dismiss': s => ({ ...s, guide: false }),
  'seen/mark': (s, p) => (SCREENS.includes(p.screen) ? { ...s, seen: { ...s.seen, [p.screen]: 1 } } : s),
  'intro/seen': (s, p) => (SCREENS.includes(p.screen) ? { ...s, introSeen: { ...s.introSeen, [p.screen]: 1 } } : s),
  'xp/add': (s, p) => addXp(s, Math.round(num(p.amount, 0, 1000, 0))),

  'source/add'(s, p, ctx) {
    const name = str(p.name, 40);
    if (!name || s.sources.length >= LIMITS.sources) return s;
    return { ...s, sources: [...s.sources, { k: 'u' + ctx.id, name, icon: 'ph-duotone ' + iconOf(p.icon, 'ph-hand-coins') }] };
  },
  'expcat/add'(s, p) {
    const name = str(p.name, 40);
    if (!name || s.expCats.length >= LIMITS.expCats || s.expCats.some(c => c.name === name)) return s;
    return { ...s, expCats: [...s.expCats, { name, icon: 'ph-duotone ' + iconOf(p.icon, 'ph-receipt') }] };
  },

  'pot/move'(s, p, ctx) {
    const pot = s.pots.find(x => x.id === p.id);
    const amt = money(p.amount);
    if (!pot || amt < 0.01) return s;
    const v = p.dir === 'out' ? -amt : amt;
    if (pot.v + v < 0) return s;
    const move = { t: v > 0 ? 'Guardado por você' : 'Retirada do cofre', d: ctx.today, p: pot.name, v };
    return { ...s, pots: s.pots.map(x => (x === pot ? { ...x, v: round2(x.v + v) } : x)), moves: [move, ...s.moves] };
  },
};

export const ACTION_TYPES = Object.keys(H);

// reduceEx: como `reduce`, mas devolve { state, error }. Em erro o estado e o MESMO objeto e `error` = { error, campo?, limite? }.
export function reduceEx(state, action, ctx = {}) {
  try {
    return { state: reduceRaw(state, action, ctx), error: null };
  } catch (e) {
    if (e instanceof ActionError) return { state, error: e.e };
    throw e;
  }
}

export function reduce(state, action, ctx = {}) {
  return reduceEx(state, action, ctx).state;
}

function reduceRaw(state, action, ctx = {}) {
  if (!isObj(action) || typeof action.type !== 'string' || !has(H, action.type)) return state;
  const now = num(ctx.now, 0, 8.64e15, Date.now());
  const c = {
    now, id: typeof ctx.id === 'string' && /^[A-Za-z0-9_-]{1,30}$/.test(ctx.id) ? ctx.id : now.toString(36),
    today: isISO(ctx.today) ? ctx.today : todayISO(new Date(now)),
  };
  const next = H[action.type](state, isObj(action.payload) ? action.payload : {}, c);
  return next === state ? state : normalizeState(next);
}
