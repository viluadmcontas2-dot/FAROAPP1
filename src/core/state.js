// Estado persistente v2. Tudo que vem de fora (nuvem, backup importado) e NAO confiavel:
// normalizeState reconstroi o objeto campo a campo, com tipos, limites e tamanhos fixos, e nunca lanca.
import { isISO } from './dates.js';
import { round2 } from './money.js';
import {
  FUEL, ENERGIES, VEHICLES, BILL_CATS, POT_KINDS, POT_COLORS, SCREENS, REM_KEYS, THEMES,
  SRC_CAT, EXP_CATS, DEFAULT_BILLS, DEFAULT_POTS,
} from './catalog.js';

export const SCHEMA_VERSION = 2;
export const LIMITS = {
  maxMoney: 1e9, maxKm: 3000, name: 60, icon: 60, bills: 60, pots: 12, sources: 7, expCats: 12,
  recs: 800, paid: 4000, maxXp: 1e5, exps: 3000, moves: 200, srcKeys: 12,
};

const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const oneOf = (v, list, def) => (typeof v === 'string' && list.includes(v) ? v : def);
const bool = (v, def) => (typeof v === 'boolean' ? v : def);

export function num(v, min, max, def) {
  if (typeof v === 'string' && v.trim() !== '' && v.length < 40) v = Number(v);
  if (typeof v !== 'number' || !Number.isFinite(v)) return def;
  return Math.min(max, Math.max(min, v));
}
const money = (v, def = 0, min = 0) => round2(num(v, min, LIMITS.maxMoney, def));
const int = (v, min, max, def) => Math.round(num(v, min, max, def));

export function str(v, max, def = '') {
  if (typeof v !== 'string') return def;
  const s = v.slice(0, max * 4).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return s || def;
}
// Ids/chaves viram propriedade de objeto: so [a-z0-9_-] e nunca nomes que mexem no prototipo.
const key = (v, re = /^[A-Za-z0-9_-]{1,40}$/) => (typeof v === 'string' && re.test(v) && !DANGEROUS.has(v) ? v : '');
const SRC_KEY = /^[a-z0-9_]{1,24}$/;
// Icone: so classes Phosphor reais (ph, ph-fill, ph-bold, ph-duotone, ph-<nome-kebab>), cada token validado, separados por 1 espaco.
const PH_TOKEN = /^ph(-[a-z0-9]+)*$/;
const icon = (v, def = '') => {
  if (typeof v !== 'string') return def;
  const s = v.trim();
  if (!s || s.length > LIMITS.icon) return def;
  return s.split(' ').every(t => PH_TOKEN.test(t)) ? s : def;
};
const color = (v, def) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : def);
const list = (v, max, fromEnd = false) => (Array.isArray(v) ? (fromEnd ? v.slice(-max) : v.slice(0, max)) : []);
const entries = (v, max = 20000) => (isObj(v) ? Object.keys(v).slice(0, max) : []);

const PAID_KEY = /^([A-Za-z0-9_-]{1,40}):(\d{4}-\d{2}-\d{2})$/;

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    onboarded: false, onboardedAt: '',
    vehicle: 'alugado', energy: 'flex', flexUse: 'gasolina',
    fuel: Object.fromEntries(Object.entries(FUEL).map(([k, f]) => [k, { price: f.price, eff: f.eff }])),
    wear: 0.14, save: 400, spend: 1200, daysWeek: 6, revKmMode: 'auto', revKmManual: 2.2,
    bills: DEFAULT_BILLS.map(b => ({ ...b })),
    paid: {},
    recs: {},
    exps: [],
    pots: DEFAULT_POTS.map(p => ({ ...p })),
    moves: [],
    sources: SRC_CAT.slice(0, 5).map(([k, name, ic]) => ({ k, name, icon: ic })),
    expCats: EXP_CATS.map(([name, ic]) => ({ name, icon: ic })),
    xp: 0,
    rem: { close: true, bills: true, rent: true, maint: true, week: true },
    guide: true, seen: {}, introSeen: {}, theme: 'noturno',
  };
}

function normBill(b) {
  if (!isObj(b)) return null;
  const id = key(b.id);
  const name = str(b.name, LIMITS.name);
  if (!id || !name) return null;
  const rec = oneOf(b.rec, ['mensal', 'semanal'], 'mensal');
  const out = {
    id, name, icon: icon(b.icon, 'ph-receipt'), color: color(b.color, '#5B95FF'),
    cat: oneOf(b.cat, BILL_CATS, 'pessoal'), v: money(b.v, 0, 0.01), rec,
    due: rec === 'semanal' ? int(b.due, 0, 6, 1) : int(b.due, 1, 31, 1), on: bool(b.on, true),
  };
  const veh = oneOf(b.veh, VEHICLES, '');
  if (veh) out.veh = veh;
  if (b.user === true) out.user = true;
  if (isISO(b.start)) out.start = b.start;
  return out;
}

function normRec(r) {
  const p = {};
  for (const k of entries(r.p, 50)) {
    if (Object.keys(p).length >= LIMITS.srcKeys) break;
    if (key(k, SRC_KEY)) p[k] = money(r.p[k]);
  }
  const o = { p, km: int(r.km, 0, LIMITS.maxKm, 0), h: round2(num(r.h, 0, 24, 0)), exp: money(r.exp), closed: r.closed === true };
  if (r.sep === true) o.sep = true;
  // Snapshot dos custos usados no fechamento (historico imutavel): por km e por dia.
  if (isObj(r.snap)) {
    const q = (v, max) => Math.round(num(v, 0, max, 0) * 1e6) / 1e6;
    o.snap = { en: q(r.snap.en, 1000), we: q(r.snap.we, 1000), car: q(r.snap.car, 1e7), life: q(r.snap.life, 1e7), rev: q(r.snap.rev, 1000) };
  }
  return o;
}

export function normalizeState(input) {
  try {
    return normalize(input);
  } catch {
    return defaultState();
  }
}

function normalize(input) {
  if (typeof input === 'string' && input.length <= 5e6) { try { input = JSON.parse(input); } catch { return defaultState(); } }
  const d = defaultState();
  if (!isObj(input)) return d;
  if (typeof input.schemaVersion === 'number' && input.schemaVersion !== SCHEMA_VERSION) return d;
  const s = input;
  const out = { schemaVersion: SCHEMA_VERSION };
  out.onboarded = bool(s.onboarded, false);
  out.onboardedAt = isISO(s.onboardedAt) ? s.onboardedAt : '';
  out.vehicle = oneOf(s.vehicle, VEHICLES, d.vehicle);
  out.energy = oneOf(s.energy, ENERGIES, d.energy);
  out.flexUse = oneOf(s.flexUse, ['gasolina', 'etanol'], d.flexUse);
  out.fuel = {};
  for (const k of Object.keys(FUEL)) {
    const f = isObj(s.fuel) && isObj(s.fuel[k]) ? s.fuel[k] : {};
    out.fuel[k] = { price: round2(num(f.price, 0.1, 100, d.fuel[k].price)), eff: round2(num(f.eff, 1, 100, d.fuel[k].eff)) };
  }
  out.wear = round2(num(s.wear, 0.02, 10, d.wear));
  out.save = money(s.save, d.save);
  out.spend = money(s.spend, d.spend);
  out.daysWeek = int(s.daysWeek, 1, 7, d.daysWeek);
  out.revKmMode = oneOf(s.revKmMode, ['auto', 'manual'], 'auto');
  out.revKmManual = round2(num(s.revKmManual, 0.5, 50, d.revKmManual));

  // contas: ids unicos; as duas contas-base do carro sempre existem (a tela de carro mexe nelas)
  const seen = new Set();
  out.bills = [];
  for (const b of list(s.bills, LIMITS.bills)) {
    const nb = normBill(b);
    if (nb && !seen.has(nb.id)) { seen.add(nb.id); out.bills.push(nb); }
  }
  for (const b of DEFAULT_BILLS.slice(0, 2)) if (!seen.has(b.id)) out.bills.push({ ...b });
  out.bills = out.bills.slice(0, LIMITS.bills);

  const paid = [];
  for (const k of entries(s.paid)) {
    const m = PAID_KEY.exec(k);
    if (m && key(m[1]) && (s.paid[k] === 0 || s.paid[k]) && isISO(m[2])) paid.push(k);
  }
  paid.sort((a, b) => b.split(':')[1].localeCompare(a.split(':')[1]));
  out.paid = {};
  for (const k of paid.slice(0, LIMITS.paid)) out.paid[k] = s.paid[k] ? 1 : 0; // 0 = desfeito (o XP ja foi dado)

  const days = entries(s.recs).filter(k => isISO(k) && isObj(s.recs[k])).sort().slice(-LIMITS.recs);
  out.recs = {};
  for (const k of days) out.recs[k] = normRec(s.recs[k]);

  const ids = new Set();
  out.exps = [];
  for (const e of list(s.exps, LIMITS.exps, true)) {
    if (!isObj(e) || !isISO(e.date)) continue;
    const id = key(e.id);
    if (!id || ids.has(id)) continue;
    ids.add(id);
    out.exps.push({
      id, date: e.date, time: typeof e.time === 'string' && /^\d{2}:\d{2}$/.test(e.time) ? e.time : '',
      cat: str(e.cat, 40, 'Outros'), icon: icon(e.icon, 'ph-duotone ph-receipt'), v: money(e.v, 0, 0.01),
    });
  }

  out.pots = [];
  const pid = new Set();
  for (const p of list(s.pots, LIMITS.pots)) {
    if (!isObj(p)) continue;
    const id = key(p.id);
    const name = str(p.name, LIMITS.name);
    if (!id || !name || pid.has(id)) continue;
    pid.add(id);
    out.pots.push({ id, name, icon: icon(p.icon, 'ph-fill ph-vault'), c: oneOf(p.c, POT_COLORS, 'accent'), v: money(p.v), goal: money(p.goal), kind: oneOf(p.kind, POT_KINDS, 'sonho') });
  }
  for (const p of DEFAULT_POTS) if (!pid.has(p.id)) out.pots.push({ ...p });
  out.pots = out.pots.slice(0, LIMITS.pots);

  out.moves = [];
  for (const m of list(s.moves, LIMITS.moves)) {
    if (!isObj(m)) continue;
    out.moves.push({ t: str(m.t, 80, 'Movimento'), p: str(m.p, LIMITS.name, 'Cofre'), v: money(m.v, 0, -LIMITS.maxMoney), d: isISO(m.d) ? m.d : '' });
  }

  out.sources = [];
  const sk = new Set();
  for (const x of list(s.sources, LIMITS.sources)) {
    if (!isObj(x)) continue;
    const k = key(x.k, SRC_KEY);
    if (!k || sk.has(k)) continue;
    sk.add(k);
    const cat = SRC_CAT.find(c => c[0] === k);
    out.sources.push({ k, name: str(x.name, 40, cat ? cat[1] : k), icon: icon(x.icon, cat ? cat[2] : '') });
  }
  if (!out.sources.length) out.sources = d.sources;

  out.expCats = [];
  const en = new Set();
  for (const x of list(s.expCats, LIMITS.expCats)) {
    if (!isObj(x)) continue;
    const name = str(x.name, 40);
    if (!name || en.has(name)) continue;
    en.add(name);
    out.expCats.push({ name, icon: icon(x.icon, 'ph-duotone ph-receipt') });
  }
  if (!out.expCats.length) out.expCats = d.expCats;

  out.xp = int(s.xp, 0, LIMITS.maxXp, 0);
  out.rem = {};
  for (const k of REM_KEYS) out.rem[k] = bool(isObj(s.rem) ? s.rem[k] : undefined, true);
  out.guide = bool(s.guide, true);
  for (const f of ['seen', 'introSeen']) {
    out[f] = {};
    for (const k of SCREENS) if (isObj(s[f]) && Object.prototype.hasOwnProperty.call(s[f], k) && s[f][k]) out[f][k] = 1;
  }
  out.theme = oneOf(s.theme, THEMES, 'noturno');
  return out;
}
