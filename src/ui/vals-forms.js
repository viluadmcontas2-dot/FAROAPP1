// Valores do template para as telas de entrada de dados: onboarding, fechar o dia e as folhas (lançar/ajustar).
// Cada função lê o estado real (k.app, k.C = calc) e despacha ações do núcleo (k.act); nada é calculado aqui.
import { reduce, LIMITS_DAY } from '../core/actions.js';
import { sepAmounts } from '../core/calc.js';
import { fmt, R, parseMoney } from '../core/money.js';
import { monthName, WD_LONG, MONTHS, parseISO, weekday, addDays } from '../core/dates.js';
import { FUEL, SRC_CAT, XP, ENERGIES, RIDE_KEYS, FUEL_CAT } from '../core/catalog.js';
import { LOGO } from './theme.js';
import { plural, PRICE_LINE, carFixName, ICON_IN, ICON_OUT, BILL_ICONS, BILL_COLORS, COLOR_NAME, iconAria, BILL_PRESETS, BILL_CAT_LABELS, ENERGY_LABELS, VEHICLE_LABELS, DAYS_WEEK_OPTIONS, MAX_CHOICES, logoStyle, sel, segOpt, stepper } from './kit.js';

export const energyWord = app => (app.energy === 'eletrico' ? 'Recarga' : 'Combustível');
const KM_MAX_DIGITS = 4, MONEY_MAX_DIGITS = 7;

// ---------------------------------------------------------------- onboarding
export const newOnboardingDraft = app => ({
  sources: app.sources.map(x => x.k), vehicle: app.vehicle, energy: app.energy, flexUse: app.flexUse,
  fuel: {}, bills: {}, save: app.save, spend: app.spend, daysWeek: app.daysWeek,
});

// Escolhas do rascunho no formato que a ação `onboarding/complete` espera.
export const onboardingPayload = ob => ({
  vehicle: ob.vehicle, energy: ob.energy, flexUse: ob.flexUse, fuel: ob.fuel, save: ob.save, spend: ob.spend, daysWeek: ob.daysWeek,
  sources: ob.sources, bills: Object.entries(ob.bills).map(([id, u]) => ({ id, ...u })),
});

// `k.app` aqui já é a prévia (estado + rascunho), então todo número vem do calc da prévia.
export function onboardingVals(k) {
  const { app, C, t, ui } = k, ob = ui.ob, os = ui.onbStep, F = C.F, ft = C.ft;
  const patchOb = o => k.patch('ob', o);
  const word = energyWord(app);
  const bill = id => app.bills.find(b => b.id === id);
  const setFuel = (field, dv) => () => patchOb({ fuel: { ...ob.fuel, [ft]: { ...ob.fuel[ft], [field]: Math.max(field === 'price' ? 0.1 : 1, +(F[field] + dv).toFixed(2)) } } });
  const setBill = (id, dv) => () => patchOb({ bills: { ...ob.bills, [id]: { ...ob.bills[id], v: Math.max(50, bill(id).v + dv) } } });
  const setMoney = (field, dv) => () => patchOb({ [field]: Math.max(0, ob[field] + dv) });
  const etR = app.fuel.etanol.price / app.fuel.gasolina.price;

  const texts = [null, ['Seus apps', 'Onde você roda?', 'Marque só o que você usa. O fechamento do dia mostra apenas essas fontes.'],
    ['Seu carro', 'Como é o seu carro?', 'Isso define as contas do carro que entram no cálculo.'],
    [word, 'O que vai no tanque?', 'Com preço e consumo, o Faro calcula quanto custa cada km.'],
    ['Sua vida', 'Quais contas são suas?', 'O Faro organiza a casa também. Desligue o que não for seu.'],
    ['Meta', 'Quanto você quer guardar e gastar?', 'A meta nasce das suas contas. Você só escolhe o resto.'],
    ['Pronto', `Seu Faro para ${monthName(C.today)}`, `Com ${app.daysWeek} dias de pista por semana, são ${C.planned} dias no mês.`]];

  let steppers = [];
  if (os === 2 && app.vehicle === 'alugado') steppers = [stepper('Aluguel por semana · vence segunda', R(bill('aluguel-carro').v), setBill('aluguel-carro', -25), setBill('aluguel-carro', 25))];
  if (os === 2 && app.vehicle === 'financiado') steppers = [stepper('Parcela por mês · dia 15', R(bill('parcela-carro').v), setBill('parcela-carro', -50), setBill('parcela-carro', 50))];
  if (os === 3) steppers = [stepper(`Preço por ${F.unit}`, R(F.price, 2), setFuel('price', -0.1), setFuel('price', 0.1)), stepper(`Rendimento (km/${F.unit})`, `${fmt(F.eff, 1)} km/${F.unit}`, setFuel('eff', -0.5), setFuel('eff', 0.5))];
  if (os === 5) steppers = [stepper('Guardar por mês', R(app.save), setMoney('save', -100), setMoney('save', 100)), stepper('Pra gastar com você', R(app.spend), setMoney('spend', -100), setMoney('spend', 100))];

  const toggleSource = key => () => {
    const has = ob.sources.includes(key);
    if ((has && ob.sources.length === 1) || (!has && ob.sources.length >= MAX_CHOICES)) return;
    patchOb({ sources: has ? ob.sources.filter(x => x !== key) : [...ob.sources, key] });
  };
  const apps = SRC_CAT.map(([key, label, icon]) => {
    const on = ob.sources.includes(key);
    return { label, icon, ...logoStyle(key), border: on ? t.accent : t.line, bg: on ? t.accentSoft : t.surface, check: on ? 'ph-fill ph-check-circle' : 'ph ph-circle', onClick: toggleSource(key) };
  });

  const vehicles = [['dono', 'Quitado, sem parcela', 'ph-duotone ph-key'], ['financiado', 'Parcela todo mês', 'ph-duotone ph-bank'], ['alugado', 'Aluguel semanal para locadora', 'ph-duotone ph-car-profile']].map(([key, sub, icon]) => {
    const on = ob.vehicle === key;
    return { label: VEHICLE_LABELS[key], sub, icon, border: on ? t.accent : t.line, bg: on ? t.accentSoft : t.surface, iconBg: on ? t.accent : t.surface2, iconColor: on ? t.accentInk : t.accent, check: on ? 'ph-fill ph-check-circle' : 'ph ph-circle', onClick: () => patchOb({ vehicle: key }) };
  });

  const pdg = Math.max(1, C.planDailyGross), pkm = pdg / C.revKm;
  const per = [[word, C.fuelKm / C.revKm * 100, t.accent], ['Desgaste', app.wear / C.revKm * 100, t.cW], [carFixName(app.vehicle), C.carShare / pdg * 100, t.cF], ['Contas da vida', C.lifeShare / pdg * 100, t.cL]];
  const left = Math.max(0, 100 - per.reduce((a, p) => a + p[1], 0));
  const lifeBills = app.bills.filter(b => b.cat !== 'carro');
  const cta = os === 6;

  return {
    apps, appsNote: `${ob.sources.length} de ${MAX_CHOICES} fontes. Vende algo no carro? Crie a fonte "Vendas no carro" no fechamento do dia.`,
    s0: os === 0, inner: os > 0, sApps: os === 1, s1: os === 2, s2: os === 3, s3: os === 4, s4: os === 5, s5: os === 6, count: `${os}/6`,
    kicker: texts[os] && texts[os][0], title: texts[os] && texts[os][1], sub: texts[os] && texts[os][2],
    pitch: [{ icon: 'ph-duotone ph-scales', text: 'Quanto entrou e lucro de verdade, cada um no seu lugar' }, { icon: 'ph-duotone ph-house-line', text: 'Contas do carro e da casa no mesmo lugar' }, { icon: 'ph-duotone ph-bell-ringing', text: 'Lembretes de contas e manutenção na hora certa' }],
    dots: [1, 2, 3, 4, 5, 6].map(i => ({ bg: i <= os ? t.accent : t.line2 })),
    next: () => (os < 6 ? k.set({ onbStep: os + 1 }) : k.finishOnboarding()), back: () => k.set({ onbStep: Math.max(0, os - 1) }),
    cta: cta ? 'Entrar no Faro' : 'Continuar', priceLine: ui.access && ui.access.billing ? `${PRICE_LINE} · cancele quando quiser` : PRICE_LINE, ctaBg: cta ? t.gold : t.accent, ctaInk: cta ? t.goldInk : t.accentInk,
    vehicles,
    energies: ENERGIES.map(key => ({ label: ENERGY_LABELS[key][0], icon: ENERGY_LABELS[key][1], ...sel(t, ob.energy === key), onClick: () => patchOb({ energy: key }) })),
    isFlex: ob.energy === 'flex',
    flexTabs: ['gasolina', 'etanol'].map(key => ({ label: FUEL[key].label, bg: ob.flexUse === key ? t.surface : 'transparent', color: ob.flexUse === key ? t.ink : t.muted, onClick: () => patchOb({ flexUse: key }) })),
    energyTip: ob.energy === 'flex' ? `Etanol está a ${Math.round(etR * 100)}% da gasolina. ${etR <= 0.7 ? 'Abaixo de 70%: etanol compensa.' : 'Acima de 70%: gasolina compensa.'}` : `Cada km rodado gasta em ${word.toLowerCase()}`,
    energyKm: R(C.fuelKm, 2) + '/km',
    bills: lifeBills.map(b => ({ name: b.name, icon: 'ph-fill ' + b.icon, color: b.color, sub: billRhythm(b), value: R(b.v, b.v % 1 ? 2 : 0), op: b.on ? '1' : '.5', trk: b.on ? t.accent : t.line2, knob: b.on ? '21px' : '3px', onToggle: () => patchOb({ bills: { ...ob.bills, [b.id]: { ...ob.bills[b.id], on: !b.on } } }) })),
    steppers,
    dayTabs: DAYS_WEEK_OPTIONS.map(n => ({ label: n + ' dias', bg: ob.daysWeek === n ? t.accent : 'transparent', color: ob.daysWeek === n ? t.accentInk : t.muted, onClick: () => patchOb({ daysWeek: n }) })),
    dailyGross: fmt(pdg, 0), planChips: [{ label: 'Rodar', value: `≈ ${Math.round(pkm)} km` }, { label: 'Online', value: `≈ ${fmt(pkm / 23, 0)} h` }, { label: 'Dias no mês', value: String(C.planned) }],
    split: [...per.map(([label, v, color]) => ({ label, v: fmt(v, 0), w: v + '%', color })), { label: 'Sobra pra você', v: fmt(left, 0), w: left + '%', color: t.pos }],
  };
}

export const billRhythm = b => (b.rec === 'semanal' ? `toda ${WD_LONG[b.due]}` : `mensal · dia ${b.due}`);

// ---------------------------------------------------------------- fechar o dia
// `date` = o dia que está sendo fechado (hoje, ontem ou anteontem). Vai SEMPRE no `day/close`.
export const newCloseDraft = (app, date) => {
  const rec = app.recs[date], f = { km: '' };
  for (const x of app.sources) { const v = rec && rec.p[x.k]; f[x.k] = v ? v.toFixed(2).replace('.', ',') : ''; }
  return { step: 0, date, f, h: 9, adding: false, newName: '', newIcon: '', kmEst: false, hEst: false, hTouched: false, err: null };
};

const dateLabel = date => {
  const { m, d } = parseISO(date), wd = WD_LONG[weekday(date)];
  return `${wd[0].toUpperCase()}${wd.slice(1)}, ${d} de ${MONTHS[m - 1]}`;
};
export const dayWord = (today, date) => (date === today ? 'hoje' : date === addDays(today, -1) ? 'ontem' : 'nesse dia');
// os 3 últimos dias para escolher (mais o dia da tela, se a virada das 04:00 passou com ela aberta)
export const dayOptions = (today, current) => {
  const list = [[today, 'Hoje'], [addDays(today, -1), 'Ontem'], [addDays(today, -2), 'Anteontem']];
  return list.some(([d]) => d === current) || !current ? list : [...list, [current, dateLabel(current)]];
};
// so as fontes de corrida entram no R$/km (gorjeta e venda ficam de fora)
const rideOf = amounts => RIDE_KEYS.reduce((a, key) => a + (amounts[key] || 0), 0);

export function closeVals(k) {
  const { app, C, t, ui, today } = k, cs = ui.cl, cf = cs.f, date = cs.date || today;
  const setCl = o => k.patch('cl', o);
  const amounts = Object.fromEntries(app.sources.map(x => [x.k, parseMoney(cf[x.k])]));
  const gross = Object.values(amounts).reduce((a, b) => a + b, 0);
  const km = parseInt(cf.km || '0', 10) || 0;
  // prévia do lucro: aplica o fechamento a um estado de rascunho e lê o calc, sem gravar nada
  const prev = km > 0 ? k.calcOf(reduce(app, { type: 'day/close', payload: { date, p: amounts, km, h: cs.h, confirmed: true } }, { today })).num(date) : null;
  const done = C.num(date) && C.num(date).closed ? C.num(date) : null;
  const sep = sepAmounts(C, date);
  const goal = C.targetFor(date);
  const rideGross = rideOf(amounts), estKm = Math.min(LIMITS_DAY.km, Math.round(rideGross / C.revKm));
  const iconNew = cs.newIcon || ICON_IN[0];
  const when = dayWord(today, date);

  // a conta do dia, com os mesmos números do calc: o que entrou menos cada custo = lucro de verdade
  const row = (label, value, o = {}) => ({ label, value, lc: o.lc || t.muted, vc: o.vc || t.ink, fw: o.fw || '600' });
  const conta = done ? [
    row('Quanto entrou', R(done.g, 2), { lc: t.ink, fw: '800' }),
    row(energyWord(app), '− ' + R(done.en, 2)), row('Desgaste do carro', '− ' + R(done.we, 2)),
    row(`${carFixName(app.vehicle)} (parte do dia)`, '− ' + R(done.car, 2)), row('Gastos na rua', '− ' + R(done.ex, 2)),
    row('Lucro de verdade', R(done.lucro, 2), { lc: t.ink, vc: done.lucro >= 0 ? t.pos : t.neg, fw: '800' }),
  ] : [];
  // a sugestão divide o lucro de verdade: contas da casa, reserva e livre somam o lucro (nunca mais que ele)
  const casa = done ? Math.min(done.life, Math.max(0, done.lucro)) : 0;
  const sepRows = [['Contas da casa', 'sua parte do dia', 'ph-fill ph-house-line', t.cW, casa], ['Reserva', '15% do que sobra · seu fôlego', 'ph-fill ph-lifebuoy', t.pos, sep.reserva], ['Livre pra você', 'pode gastar sem culpa', 'ph-fill ph-smiley', t.gold, sep.livre]].map(([label, sub, icon, color, v]) => ({ label, sub, icon, color, value: R(v, 2) }));
  const short = done && done.lucro < done.life ? done.life - Math.max(0, done.lucro) : 0;
  const err = cs.err || null;

  const goNext = () => {
    if (cs.step === 0) {
      if (gross <= 0) { k.showError({ error: 'dia_vazio' }); return; }
      setCl({ err: null, step: 1, kmEst: !cf.km, f: { ...cf, km: cf.km || String(estKm) }, h: cs.hTouched ? cs.h : Math.max(6, Math.min(12, Math.round(rideGross / C.perH))), hEst: !cs.hTouched });
    } else k.closeDay({ date, p: amounts, km, h: cs.h });
  };

  return {
    dateLabel: dateLabel(date),
    dayChips: dayOptions(today, date).map(([d, label]) => ({ label, pressed: d === date ? 'true' : 'false', border: d === date ? t.gold : t.line2, bg: d === date ? t.goldSoft : 'transparent', color: d === date ? t.gold : t.ink, onClick: () => setCl(newCloseDraft(app, d)) })),
    askTitle: `Quanto entrou ${when}?`, kmLabel: `Km rodados ${when}`,
    s0: cs.step === 0, s1: cs.step === 1, s2: false, s3: cs.step === 2, keypad: cs.step < 2,
    exit: () => (cs.step === 1 ? setCl({ step: 0, err: null }) : k.set({ screen: 'home' })), exitIcon: cs.step === 1 ? 'ph-bold ph-caret-left' : 'ph-bold ph-x', exitAria: cs.step === 1 ? 'Voltar' : 'Fechar',
    dots: [0, 1, 2].map(i => ({ w: i === cs.step ? '22px' : '7px', bg: i <= cs.step ? t.gold : t.line2 })),
    plats: app.sources.map(x => ({
      name: x.name, id: 'faro-p-' + x.k, ...logoStyle(x.k), icon: x.icon || 'ph-duotone ph-hand-coins', sub: RIDE_KEYS.includes(x.k) ? '' : 'fora do R$/km', subD: RIDE_KEYS.includes(x.k) ? 'none' : 'block', val: cf[x.k] || '',
      onChange: e => { const v = e.target.value.replace(/[^\d.,]/g, '').slice(0, 9); setCl({ err: null, f: { ...cf, [x.k]: v } }); },
    })),
    err0: err && err.where === 'p' ? err.text : '',
    add: {
      title: 'Nova fonte de renda', ph: 'Ex.: Vendas no carro', name: cs.newName || '', icon: 'ph-duotone ' + iconNew, onName: e => setCl({ newName: e.target.value }),
      iconOpts: ICON_IN.map(ic => ({ icon: 'ph-duotone ' + ic, aria: iconAria(ic), on: iconNew === ic, border: iconNew === ic ? t.accent : t.line, bg: iconNew === ic ? t.accentSoft : 'transparent', onClick: () => setCl({ newIcon: ic }) })),
      cancel: () => setCl({ adding: false }), op: (cs.newName || '').trim() ? '1' : '.4', off: !(cs.newName || '').trim(),
      confirm: () => k.addSource((cs.newName || '').trim(), iconNew, () => setCl({ adding: false })),
    },
    adding: !!cs.adding, canAdd: !cs.adding && app.sources.length < MAX_CHOICES, startAdd: () => setCl({ adding: true, newName: '', newIcon: ICON_IN[0] }),
    kmVal: cf.km || '', onKm: e => setCl({ kmEst: false, err: null, f: { ...cf, km: e.target.value.replace(/\D/g, '').slice(0, KM_MAX_DIGITS) } }),
    kmErr: err && err.where === 'km' ? err.text : '', kmBad: err && err.where === 'km' ? 'true' : 'false',
    kmNote: cs.kmEst ? `Estimado pelo seu ganho médio de ${R(C.revKm, 2)}/km nos apps. Sabe o número exato? É só trocar.` : km > 0 ? `${when === 'hoje' ? 'Hoje' : 'Nesse dia'} você ganhou ${R(rideGross / km, 2)} por km nos apps.` : 'Gorjetas e vendas não entram no cálculo por km.', kmTag: cs.kmEst ? 'estimado' : '',
    estimate: () => { if (rideGross > 0) setCl({ f: { ...cf, km: String(estKm) } }); }, estLabel: rideGross > 0 ? `Não sei o km · usar ≈ ${estKm} km` : 'Não sei o km',
    gross: R(gross, 2), km: km + ' km',
    hours: [6, 7, 8, 9, 10, 11, 12].map(n => ({ label: n + 'h', ...sel(t, cs.h === n), onClick: () => setCl({ h: n, hTouched: true, hEst: false }) })),
    hoursNote: cs.hEst ? `estimado pelo seu ritmo de ${R(C.perH, 0)}/h nos apps` : '',
    preview: prev ? R(prev.lucro, 2) : '—', prevColor: prev ? (prev.lucro >= 0 ? t.pos : t.neg) : t.muted, prevSub: prev ? `${R(prev.lucro / km, 2)}/km · ${R(prev.lucro / cs.h, 2)}/h` : 'digite os km',
    cta: cs.step === 0 ? 'Informar km e horas' : 'Fechar o dia', op: '1', next: goNext,
    conta, sep: sepRows,
    sepSub: short > 0 ? `Sua parte das contas da casa é ${R(done.life, 2)}; faltaram ${R(short, 2)} neste dia.` : 'Do lucro de verdade, é assim que ele se divide. Não precisa anotar nada.',
    net: done ? R(done.lucro, 2) : '', badge: done ? (done.lucro >= goal ? 'Meta do dia batida' : `${R(Math.max(0, goal - done.lucro))} abaixo da meta de ${R(goal)}`) : '',
    stats: done ? [{ label: 'Lucro por km', value: R(done.lucro / done.km, 2) }, { label: 'Lucro por hora', value: R(done.lucro / done.h, 2) }, { label: 'Rodou', value: done.km + ' km' }] : [],
    rewards: [{ icon: 'ph-fill ph-star-four', v: `+${XP.close} pontos`, l: 'dia fechado' }, { icon: 'ph-fill ph-fire', v: plural(k.streakNow, 'dia', 'dias'), l: 'sequência' }, { icon: 'ph-fill ph-gauge', v: String(k.idx.score), l: 'sua nota' }],
    toMonth: () => k.set({ screen: 'home', period: 'mes' }), done: () => k.set({ screen: 'home', period: 'dia' }),
  };
}

// ---------------------------------------------------------------- teclado numérico das folhas (valor em centavos)
export function keypadVals(k) {
  const press = key => k.patch('sh', { digits: nextDigits(k.ui.sh.digits, key) });
  return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map(key => ({ label: key === 'del' ? '' : key, icon: key === 'del' ? 'ph-bold ph-backspace' : '', aria: key === 'del' ? 'Apagar' : null, onClick: () => press(key) }));
}
const nextDigits = (cur, key) => (key === 'del' ? String(cur).slice(0, -1) : (String(cur) + key).replace(/^0+/, '').slice(0, MONEY_MAX_DIGITS));

// ---------------------------------------------------------------- folhas: lançar ganho/gasto, nova conta, plano, carro
export function sheetVals(k) {
  const { app, C, t, ui, today } = k, ss = ui.sh, nbS = ui.nb;
  const setSh = o => k.patch('sh', o);
  const setNb = o => k.patch('nb', o);
  const digits = (ss.digits || '').replace(/\D/g, ''), amt = parseInt(digits || '0', 10) / 100, amtF = fmt(amt);
  let amtDim = amtF, amtLit = '';
  if (digits.length) {
    let n = digits.length, i = amtF.length;
    while (i > 0 && n > 0) { i--; if (/\d/.test(amtF[i])) n--; }
    amtDim = amtF.slice(0, i); amtLit = amtF.slice(i);
  }
  const plat = app.sources.some(x => x.k === ss.plat) ? ss.plat : app.sources[0].k;
  const cat = app.expCats.some(c => c.name === ss.cat) ? ss.cat : app.expCats[0].name;
  const adding = !!ss.adding, iconSet = ss.type === 'in' ? ICON_IN : ICON_OUT, curIc = ss.newIcon || iconSet[0];
  const date = ss.date || today, when = dayWord(today, date);
  const dayExps = app.exps.filter(e => e.date === date);
  const tile = (label, on, onClick, icon, logoKey, dashed) => ({
    label, ...(logoKey && LOGO[logoKey] ? { logoUrl: `url("${LOGO[logoKey]}")`, imgD: 'block', icoD: 'none' } : { logoUrl: 'none', imgD: 'none', icoD: 'block' }), icon: icon || '',
    ic: on ? t.accent : (dashed ? t.muted : t.ink), bg: on ? t.accentSoft : 'transparent', border: on ? t.accent : t.line2, bs: dashed ? 'dashed' : 'solid', color: on ? t.accent : (dashed ? t.muted : t.ink), onClick,
  });

  let chips = [], title = '', hint = '', tabs = [], saveLabel = '';
  const isMoney = ss.type === 'in' || ss.type === 'out';
  if (isMoney) {
    title = ss.editId ? 'Corrigir gasto' : ss.type === 'in' ? 'O que entrou?' : 'O que saiu?';
    tabs = [['in', 'Ganho', 'ph-bold ph-arrow-down-left'], ['out', 'Gasto', 'ph-bold ph-arrow-up-right']].map(([key, label, icon]) => ({ label, icon, bg: ss.type === key ? t.surface : 'transparent', color: ss.type === key ? t.ink : t.muted, onClick: () => setSh({ type: key, adding: false }) }));
    const newTile = tile('Nova', false, () => setSh({ adding: true, newName: '', newIcon: iconSet[0] }), 'ph-bold ph-plus', null, true);
    if (ss.type === 'in') { chips = app.sources.map(x => tile(x.name, plat === x.k, () => setSh({ plat: x.k }), x.icon || 'ph-duotone ph-hand-coins', x.k)); if (app.sources.length < MAX_CHOICES) chips.push(newTile); }
    else { chips = app.expCats.map(c => tile(c.name, cat === c.name, () => setSh({ cat: c.name }), c.icon)); if (app.expCats.length < MAX_CHOICES) chips.push(newTile); }
    const src = app.sources.find(x => x.k === plat);
    hint = ss.type === 'in' ? `Soma no que entrou ${when}${src ? ' em ' + src.name : ''}. No fechamento é só conferir.` : cat === FUEL_CAT ? 'O combustível já é descontado pelos km. Anotar só mede seu consumo.' : `Sai do lucro de ${when} como gasto na rua.`;
    saveLabel = ss.editId ? 'Salvar alteração' : ss.type === 'in' ? 'Anotar ganho' : 'Anotar gasto';
  } else if (ss.type === 'bill') { title = 'Nova conta'; saveLabel = 'Criar conta'; }

  const add = {
    title: ss.type === 'in' ? 'Nova fonte de renda' : 'Nova categoria de gasto', ph: ss.type === 'in' ? 'Ex.: Vendas no carro' : 'Ex.: Celular, multa…', name: ss.newName || '', icon: 'ph-duotone ' + curIc, onName: e => setSh({ newName: e.target.value }),
    iconOpts: iconSet.map(ic => ({ icon: 'ph-duotone ' + ic, aria: iconAria(ic), on: curIc === ic, border: curIc === ic ? t.accent : t.line, bg: curIc === ic ? t.accentSoft : 'transparent', onClick: () => setSh({ newIcon: ic }) })),
    cancel: () => setSh({ adding: false }), op: (ss.newName || '').trim() ? '1' : '.4', off: !(ss.newName || '').trim(),
    confirm: () => {
      const name = (ss.newName || '').trim();
      if (ss.type === 'in') k.addSource(name, curIc, key => setSh({ adding: false, plat: key }));
      else k.addExpenseCategory(name, curIc, () => setSh({ adding: false, cat: name }));
    },
  };

  const nb = {
    name: nbS.name, icon: 'ph-fill ' + nbS.icon, color: nbS.color, amount: R(amt, 2), amtColor: amt > 0 ? t.ink : t.muted, onName: e => setNb({ name: e.target.value }),
    presets: BILL_PRESETS.map(([name, icon, color, catKey]) => ({ name, icon: 'ph-fill ' + icon, onClick: () => setNb({ name, icon, color, cat: catKey }) })),
    icons: BILL_ICONS.map(ic => ({ icon: 'ph-fill ' + ic, aria: iconAria(ic), on: nbS.icon === ic, border: nbS.icon === ic ? t.accent : t.line, bg: nbS.icon === ic ? t.accentSoft : 'transparent', onClick: () => setNb({ icon: ic }) })),
    colors: BILL_COLORS.map(c => ({ c, aria: `Cor ${COLOR_NAME[c] || c}`, on: nbS.color === c, border: nbS.color === c ? `3px solid ${t.ink}` : '3px solid transparent', onClick: () => setNb({ color: c }) })),
    cats: BILL_CAT_LABELS.map(([key, label]) => ({ label, bg: nbS.cat === key ? t.surface : 'transparent', color: nbS.cat === key ? t.ink : t.muted, onClick: () => setNb({ cat: key }) })),
    due: nbS.due, dMinus: () => setNb({ due: Math.max(1, nbS.due - 1) }), dPlus: () => setNb({ due: Math.min(31, nbS.due + 1) }),
  };

  const save = () => {
    if (amt <= 0) return;
    if (ss.type === 'bill') { if (nbS.name.trim()) k.createBill({ name: nbS.name.trim(), v: amt, icon: nbS.icon, color: nbS.color, cat: nbS.cat, due: nbS.due }); return; }
    k.saveEntry(ss.editId ? { type: 'entry/edit', payload: { id: ss.editId, amount: amt, cat } } : { type: 'entry/add', payload: ss.type === 'in' ? { kind: 'in', plat, amount: amt, date } : { kind: 'out', cat, amount: amt, date } }, ss.editId ? 'Gasto atualizado' : `${ss.type === 'in' ? 'Ganho' : 'Gasto'} de ${R(amt, 2)} anotado${date === today ? '' : ' · ' + when}`, { what: ss.type === 'in' ? (app.sources.find(x => x.k === plat) || {}).name : null, amt });
  };

  // folhas de ajuste (plano e carro): cada toque já grava e o resumo "ao vivo" recalcula
  const blocks = [], B = {
    seg: (label, opts) => blocks.push({ isSeg: true, label, opts }), step: (label, sub, value, minus, plus) => blocks.push({ isStep: true, label, sub, value, minus, plus, minusAria: `Diminuir: ${label}`, plusAria: `Aumentar: ${label}` }),
    chips: (label, opts) => blocks.push({ isChips: true, label, opts }), note: text => blocks.push({ isNote: true, text }),
  };
  const money = (field, dv) => () => k.act({ type: 'plan/set', payload: { [field]: Math.max(0, app[field] + dv) } });
  const bill = id => app.bills.find(b => b.id === id);
  const setBill = (id, dv) => () => k.act({ type: 'bill/update', payload: { id, v: Math.max(50, bill(id).v + dv) } });
  const setFuel = (key, field, dv) => () => k.act({ type: 'fuel/set', payload: { key, [field]: Math.max(field === 'price' ? 0.1 : 1, +(app.fuel[key][field] + dv).toFixed(2)) } });
  const etR = app.fuel.etanol.price / app.fuel.gasolina.price;
  if (ss.type === 'plan') {
    title = 'Editar plano';
    B.step('Guardar por mês', 'reserva, sonho, imprevisto', R(app.save), money('save', -100), money('save', 100));
    B.step('Pra gastar com você', 'lazer, família, o que é seu', R(app.spend), money('spend', -100), money('spend', 100));
    B.seg('Dias de pista por semana', DAYS_WEEK_OPTIONS.map(n => segOpt(t, n + ' dias', app.daysWeek === n, () => k.act({ type: 'plan/set', payload: { daysWeek: n } }))));
    B.seg('Ganho médio por km nos apps', [['auto', 'Automático'], ['manual', 'Eu defino']].map(([key, label]) => segOpt(t, label, app.revKmMode === key, () => k.act({ type: 'plan/set', payload: { revKmMode: key, revKmManual: +C.revLearned.toFixed(2) } }))));
    if (app.revKmMode === 'manual') B.step('Ganho por km', 'use o que os apps te pagam em média', R(app.revKmManual, 2) + '/km', () => k.act({ type: 'plan/set', payload: { revKmManual: Math.max(1, +(app.revKmManual - 0.05).toFixed(2)) } }), () => k.act({ type: 'plan/set', payload: { revKmManual: +(app.revKmManual + 0.05).toFixed(2) } }));
    else B.note(C.learnDays ? `Automático: ${R(C.revLearned, 2)}/km, aprendido dos seus ${C.learnDays} dias fechados. Ele se ajusta sozinho a cada fechamento.` : `Automático: começa em ${R(C.revLearned, 2)}/km e passa a aprender com os seus dias fechados.`);
    B.note(`As contas da casa (${R(C.life)}) vêm da aba Contas. Mudou uma conta lá, o plano muda aqui.`);
  }
  if (ss.type === 'car') {
    title = 'Ajustar carro';
    B.seg('O carro é', Object.entries(VEHICLE_LABELS).map(([key, label]) => segOpt(t, label, app.vehicle === key, () => k.act({ type: 'car/set', payload: { vehicle: key } }))));
    if (app.vehicle === 'alugado') B.step('Aluguel por semana', 'vence toda segunda · aparece em Contas', R(bill('aluguel-carro').v), setBill('aluguel-carro', -25), setBill('aluguel-carro', 25));
    if (app.vehicle === 'financiado') B.step('Parcela por mês', 'todo dia 15 · aparece em Contas', R(bill('parcela-carro').v), setBill('parcela-carro', -50), setBill('parcela-carro', 50));
    B.chips('Combustível', ENERGIES.map(key => ({ label: ENERGY_LABELS[key][0], icon: ENERGY_LABELS[key][1], ...sel(t, app.energy === key), onClick: () => k.act({ type: 'car/set', payload: { energy: key } }) })));
    for (const key of app.energy === 'flex' ? ['gasolina', 'etanol'] : [C.ft]) {
      const f = FUEL[key], cur = app.fuel[key];
      B.step(`${f.label} · preço por ${f.unit}`, '', R(cur.price, 2), setFuel(key, 'price', -0.1), setFuel(key, 'price', 0.1));
      B.step(`${f.label} · rende`, 'média real do seu carro', `${fmt(cur.eff, 1)} km/${f.unit}`, setFuel(key, 'eff', -0.5), setFuel(key, 'eff', 0.5));
    }
    if (app.energy === 'flex') {
      B.seg('Abastece mais com', ['gasolina', 'etanol'].map(key => segOpt(t, FUEL[key].label, app.flexUse === key, () => k.act({ type: 'car/set', payload: { flexUse: key } }))));
      B.note(`Etanol está a ${Math.round(etR * 100)}% do preço da gasolina. ${etR <= 0.7 ? 'Abaixo de 70%, ele compensa.' : 'Acima de 70%, a gasolina compensa.'}`);
    }
    B.step('Desgaste por km', 'pneus, óleo, freios e revisões', R(app.wear, 2) + '/km', () => k.act({ type: 'car/set', payload: { wear: Math.max(0.02, +(app.wear - 0.01).toFixed(2)) } }), () => k.act({ type: 'car/set', payload: { wear: +(app.wear + 0.01).toFixed(2) } }));
  }
  const isSet = ss.type === 'plan' || ss.type === 'car';
  const monthGross = C.planDailyGross * C.planned;
  const live = ss.type === 'plan'
    ? [{ label: 'Quanto precisa ganhar no mês', value: R(monthGross), color: '#fff' }, { label: 'Quanto ganhar por dia', value: R(C.dailyGross), color: t.gold }, { label: 'Lucro de verdade', value: R(C.target), color: '#5EE6A8' }]
    : [{ label: 'Custo por km', value: R(C.fuelKm + app.wear, 2), color: '#fff' }, { label: 'Quanto ganhar por dia', value: R(C.dailyGross), color: t.gold }, { label: 'Quanto precisa ganhar no mês', value: R(monthGross), color: '#fff' }];

  const strip = ss.type === 'out' && !ss.editId && !adding ? [
    ...dayExps.map(x => ({ label: `${x.cat} · ${R(x.v, x.v % 1 ? 2 : 0)}`, icon: x.icon, iconBg: t.surface2, iconColor: t.ink, bg: 'transparent', border: t.line2, tag: 'editar', tagIcon: 'ph-bold ph-pencil-simple', tagBg: t.surface2, tagColor: t.ink, onClick: () => setSh({ digits: String(Math.round(x.v * 100)), cat: x.cat, editId: x.id }) })),
  ] : [];

  const sh = {
    open: ss.open, isSet, live, liveTitle: 'ATUALIZA ENQUANTO VOCÊ AJUSTA', blocks, isBill: ss.type === 'bill', isMoney, adding, notAdding: !adding, showPad: !adding && !isSet, add,
    strip, hasStrip: strip.length > 0, stripLabel: `Já anotados ${when} · toque para corrigir`,
    editing: !!ss.editId && ss.type === 'out', del: () => k.removeEntry(ss.editId),
    dayChips: ss.editId ? [] : [[today, 'Hoje'], [addDays(today, -1), 'Ontem']].map(([d, label]) => ({ label, pressed: d === date ? 'true' : 'false', border: d === date ? t.gold : t.line2, bg: d === date ? t.goldSoft : 'transparent', color: d === date ? t.gold : t.ink, onClick: () => setSh({ date: d }) })),
    title, tabs, chips, hint, saveLabel, int: '', cents: '', centsOp: '1', centsPh: '', amtDim, amtLit, amtColor: amt > 0 ? t.ink : t.muted, op: amt > 0 ? '1' : '.4', off: !(amt > 0),
    close: () => setSh({ open: false, adding: false }), save,
  };
  return { sh, nb };
}
