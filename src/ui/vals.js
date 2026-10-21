// Valores do template para as telas de leitura: início, plano, contas, lembretes, carro, jornada e conta.
// Tudo vem do estado real (k.app) e do calc (k.C); botões só despacham ações do núcleo por k.act.
import React from 'react';
import { fmt, R, splitMoney } from '../core/money.js';
import { diffDays, dayOfMonth, monthName } from '../core/dates.js';
import { weekDates, WD_SHORT } from '../core/dates.js';
import { sourceColor } from './theme.js';
import { logoStyle, segOpt, DAYS_WEEK_OPTIONS } from './kit.js';
import { energyWord } from './vals-forms.js';
import { calendarCells, records as recordsOf, tip as tipOf, isWorkDay } from './derive.js';
import CountUp from './count-up.js';

// Status de uma conta a pagar, na linguagem do motorista (usado no início e em Contas).
export const billStatus = (today, t) => ({
  when: o => { const dd = diffDays(today, o.date); return o.paid ? `paga · dia ${o.d}` : dd < 0 ? `venceu há ${-dd} dia${-dd > 1 ? 's' : ''}` : dd === 0 ? 'vence hoje' : dd === 1 ? 'vence amanhã' : `vence em ${dd} dias · dia ${o.d}`; },
  color: o => { const dd = diffDays(today, o.date); return o.paid ? t.muted : dd < 0 ? t.neg : dd <= 5 ? t.gold : t.muted; },
});

// ---------------------------------------------------------------- início
export function homeVals(k) {
  const { app, C, t, ui, today, occ } = k;
  const P = ui.period, M = C.month, word = energyWord(app);
  const week = weekDates(today);
  const weekNums = week.map(C.num);
  const weekClosed = C.agg(weekNums.filter(x => x && x.closed));
  const todayNum = C.num(today);
  const view = P === 'dia' ? C.agg([todayNum])
    : P === 'semana' ? C.agg(weekNums.filter(x => x && (x.closed || x.date === today)))
    : C.agg([...C.closedDays.map(C.num), ...(C.todayClosed ? [] : [todayNum])]);
  const [hi, hc] = splitMoney(view.lucro);
  const carCost = view.en + view.we + view.car + view.ex;
  const badge = {
    dia: C.todayClosed ? ['Lucro líquido de hoje', 'ph-bold ph-check', `Dia fechado · ${view.km} km`] : ['Lucro líquido estimado', 'ph-bold ph-clock', 'Feche o dia para o valor real'],
    semana: ['Lucro líquido da semana', 'ph-bold ph-calendar', `${view.n} de ${app.daysWeek} dias · seg ${dayOfMonth(week[0])} a dom ${dayOfMonth(week[6])}`],
    mes: [`Lucro líquido de ${monthName(today)}`, 'ph-bold ph-trend-up', `${view.n} dias rodados · ${C.rem} pela frente`],
  }[P];
  const h = { num: React.createElement(CountUp, { value: +view.lucro.toFixed(2) }), label: badge[0], int: hi, cents: hc, badgeIcon: badge[1], badge: badge[2], chips: [{ icon: 'ph-bold ph-arrow-down-left', color: '#5EE6A8', label: 'Bruto', value: R(view.g) }, { icon: 'ph-bold ph-arrow-up-right', color: '#FF9A9A', label: 'Carro', value: R(carCost) }, { icon: 'ph-fill ph-wallet', color: t.gold, label: 'Sobra', value: R(view.sobra) }] };
  const periods = [['dia', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês']].map(([key, label]) => ({ label, bg: P === key ? '#fff' : 'transparent', color: P === key ? '#0D1530' : '#fff', onClick: () => k.set({ period: key }) }));
  const glass = 'rgba(255,255,255,.12)';
  const action = (label, icon, onClick, color) => ({ label, icon, onClick, bg: glass, border: 'transparent', color });
  const actions = [action('Ganho', 'ph-bold ph-arrow-down-left', () => k.openSheet('in'), '#5EE6A8'), action('Gasto', 'ph-bold ph-arrow-up-right', () => k.openSheet('out'), '#FF9A9A'),
    C.todayClosed ? action('Resumo', 'ph-fill ph-check-circle', k.openSummary, t.gold) : action('Fechar dia', 'ph-fill ph-flag-checkered', k.openClose, t.gold)];

  const dayLucro = C.targetFor(today), goalG = (dayLucro + C.carShare) / C.ckm * C.revKm, kmG = goalG / C.revKm;
  const tg = todayNum ? todayNum.g : 0, gp = Math.min(100, Math.round(tg / Math.max(1, goalG) * 100));
  const dg = {
    sub: C.todayClosed ? 'dia fechado · amanhã ela se ajusta' : `fature isso pra lucrar ${R(dayLucro)} limpos`,
    explain: `São ≈ ${Math.round(kmG)} km. A meta já cobre ${R(kmG * C.fuelKm)} de ${word.toLowerCase()}, o desgaste${app.vehicle === 'alugado' ? ' e a parte do aluguel' : ''}. Passou disso, é lucro.`,
    pct: gp, w: gp + '%', done: R(tg), goal: R(goalG), left: tg >= goalG ? 'Meta batida' : `Faltam ${R(goalG - tg)}`,
    chips: [{ label: 'Rodar', value: `≈ ${Math.round(kmG)} km` }, { label: word, value: `≈ ${R(kmG * C.fuelKm)}` }, { label: 'Lucro limpo', value: R(dayLucro) }],
  };

  const overdue = k.pend.filter(o => o.date < today);
  const status = billStatus(today, t);
  const late = overdue[0], lateDays = late ? diffDays(late.date, today) : 0;
  const alert = { show: !!late, title: late ? `${late.name} venceu ${lateDays === 1 ? 'ontem' : 'há ' + lateDays + ' dias'}` : '', sub: late ? `${R(late.v, 2)} · toque se já pagou` : '', onClick: late ? () => k.payBill(late.oid) : null };
  const nextBills = k.pend.filter(o => o.date >= today).slice(0, 3).map(o => ({ name: o.name, icon: 'ph-fill ' + o.icon, color: o.color, value: R(o.v, 2), status: status.when(o), sc: status.color(o), onPay: () => k.payBill(o.oid) }));

  const rentB = app.bills.find(b => b.id === 'aluguel-carro');
  const rentCovered = weekClosed.lucro + weekClosed.car; // o que sobrou do bruto antes do rateio do carro
  const rentLeft = app.vehicle === 'alugado' ? Math.max(0, rentB.v - rentCovered) : null;
  const range = `seg ${dayOfMonth(week[0])} a dom ${dayOfMonth(week[6])}`;
  let wk;
  if (app.vehicle === 'alugado') {
    const pc = Math.max(0, Math.min(100, Math.round(rentCovered / rentB.v * 100)));
    wk = { icon: 'ph-duotone ph-car-profile', title: 'Aluguel da semana', sub: `${R(rentB.v)} · vence segunda`, pct: pc, w: pc + '%', note: pc >= 100 ? 'Aluguel já coberto. O resto da semana é seu.' : `Faltam ${R(rentB.v - rentCovered)} para cobrir o aluguel.` };
  } else {
    const weekTarget = C.target / C.planned * app.daysWeek, pc = Math.max(0, Math.min(100, Math.round(weekClosed.lucro / weekTarget * 100)));
    wk = { icon: 'ph-duotone ph-target', title: 'Meta da semana', sub: R(weekTarget) + ' de lucro', pct: pc, w: pc + '%', note: `${R(weekClosed.lucro)} de lucro até agora.` };
  }
  wk.range = range;
  const wmax = Math.max(250, ...weekNums.filter(Boolean).map(r => r.lucro));
  const dailyGoal = C.target / C.planned;
  const weekBars = week.map((date, i) => {
    const r = weekNums[i], off = !isWorkDay(app, date), isT = date === today, day = WD_SHORT[(i + 1) % 7];
    if (r && r.closed) return { day, val: fmt(r.lucro, 0), h: Math.max(8, r.lucro / wmax * 100) + 'px', bg: r.lucro >= dailyGoal ? t.pos : t.gold, border: 'none', lc: t.ink, fw: '800' };
    return { day, val: off ? 'folga' : isT ? 'hoje' : '', h: off ? '8px' : '40px', bg: isT ? t.goldSoft : 'transparent', border: off ? 'none' : `1.5px dashed ${isT ? t.gold : t.line2}`, lc: isT ? t.gold : t.muted, fw: isT ? '800' : '600' };
  });

  const ring = 2 * Math.PI * 34, mp = C.target > 0 ? Math.max(0, Math.min(100, Math.round(M.lucro / C.target * 100))) : 0, ahead = C.proj >= C.target;
  const mg = Math.max(1, M.g);
  const mo = {
    title: `Meta de ${monthName(today)}`, pct: mp, dash: `${ring * mp / 100} ${ring}`, of: `${R(M.lucro)} de ${R(C.target)}`,
    pace: M.n ? (ahead ? `No ritmo · projeção ${R(C.proj)}` : `Atrás · projeção ${R(C.proj)}`) : 'Feche um dia para ver o ritmo', paceColor: ahead || !M.n ? t.pos : t.gold, gross: R(M.g),
    split: [[word, M.en, t.accent], ['Carro e desgaste', M.car + M.we, t.cW], ['Gastos na rua', M.ex, t.cF], ['Lucro líquido', Math.max(0, M.lucro), t.pos]].map(([label, v, color]) => ({ label, v: R(v), w: (v / mg * 100) + '%', color })),
  };

  const base = Math.max(1, view.g), costT = view.en + view.we + view.car + view.ex, profitT = Math.max(0, view.lucro);
  const todayExps = app.exps.filter(e => e.date === today);
  const partial = P === 'dia' && !C.todayClosed;
  const carFixLabel = app.vehicle === 'alugado' ? 'Aluguel do carro · parte do dia' : app.vehicle === 'financiado' ? 'Parcela e seguro · parte do dia' : 'Seguro · parte do dia';
  const wf = {
    title: partial ? 'Do bruto ao lucro (estimativa)' : 'Do bruto ao lucro',
    exps: todayExps.map(x => ({ cat: x.cat, icon: x.icon, time: x.time, value: '− ' + R(x.v, 2), note: x.cat === 'Combustível' ? 'só mede o consumo, não desconta' : '', noteD: x.cat === 'Combustível' ? 'block' : 'none', vc: x.cat === 'Combustível' ? t.muted : t.ink, onEdit: () => k.openSheet('out', { digits: String(Math.round(x.v * 100)), cat: x.cat, editId: x.id }), onDel: () => k.removeEntry(x.id) })),
    hasExps: P === 'dia' && todayExps.length > 0, noExps: P === 'dia' && !todayExps.length, addExp: () => k.openSheet('out'),
    you: view.g > 0 ? `você fica com ${Math.max(0, Math.round(view.lucro / base * 100))}% do bruto` : '',
    open: !!ui.wfOpen, toggle: () => k.set({ wfOpen: !ui.wfOpen }), toggleLabel: ui.wfOpen ? 'Esconder detalhes' : (P === 'dia' ? 'Ver detalhes do dia' : 'Ver a conta'), toggleIcon: ui.wfOpen ? 'ph-bold ph-caret-up' : 'ph-bold ph-caret-down',
    bar: [[costT, t.neg], [profitT, t.pos]].map(([v, color]) => ({ w: (v / base * 100) + '%', color })),
    keys: [{ label: 'Bruto', value: R(view.g), color: t.line2, vc: t.ink }, { label: 'Custos', value: R(costT), color: t.neg, vc: t.ink }, { label: partial ? 'Lucro estimado' : 'Lucro líquido', value: R(view.lucro), color: t.pos, vc: view.lucro >= 0 ? t.pos : t.neg }],
    rows: [{ label: 'Bruto dos apps', icon: 'ph-fill ph-arrow-circle-down', color: t.ink, value: R(view.g, 2), vc: t.ink, fw: '700' }, { label: `${word} · ${R(C.fuelKm, 2)}/km`, icon: 'ph-fill ph-gas-pump', color: t.accent, value: '− ' + R(view.en, 2), vc: t.ink, fw: '600' }, { label: `Desgaste · ${R(app.wear, 2)}/km`, icon: 'ph-fill ph-wrench', color: t.cW, value: '− ' + R(view.we, 2), vc: t.ink, fw: '600' }, { label: carFixLabel, icon: 'ph-fill ph-car-profile', color: t.cF, value: '− ' + R(view.car, 2), vc: t.ink, fw: '600' }, { label: P === 'dia' ? 'Gastos lançados hoje' : 'Gastos lançados', icon: 'ph-fill ph-receipt', color: t.cF, value: '− ' + R(view.ex, 2), vc: t.ink, fw: '600' }, { label: 'Lucro líquido', icon: 'ph-fill ph-check-circle', color: t.pos, value: R(view.lucro, 2), vc: view.lucro >= 0 ? t.pos : t.neg, fw: '800' }],
  };
  const lifeCard = { lucro: R(M.lucro), contas: '− ' + R(M.life), livre: R(M.sobra), livreColor: M.sobra >= 0 ? t.pos : t.neg, note: M.sobra >= 0 ? 'É isso que fica pra guardar e pra viver. O Faro sugere quanto separar em cada fechamento.' : 'As contas do mês ainda passam do lucro. Os dias que faltam vão cobrir a diferença.' };

  const km = Math.max(1, view.km), hr = Math.max(1, view.h), lkm = view.lucro / km;
  const metrics = [
    { icon: 'ph-duotone ph-path', label: 'Lucro/km', value: R(lkm, 2), hint: view.km ? (lkm >= 1 ? 'acima de R$ 1,00 · ótimo' : 'abaixo de R$ 1,00') : 'feche um dia para medir', hc: view.km && lkm >= 1 ? t.pos : t.muted },
    { icon: 'ph-duotone ph-coins', label: 'Custo/km', value: R((view.en + view.we + view.car) / km, 2), hint: 'energia + desgaste + carro', hc: t.muted },
    { icon: 'ph-duotone ph-timer', label: 'Lucro/hora', value: R(view.lucro / hr, 2), hint: `${fmt(view.h, 1)} h · ${fmt(view.km, 0)} km`, hc: t.muted },
  ];
  const plats = app.sources.map(x => { const v = view.p[x.k] || 0; return { name: x.name, value: R(v, 2), pct: Math.round(v / base * 100) + '%', w: (v / base * 100) + '%', color: sourceColor(x.k, t, app.theme), logo: '', hasLogo: false, ...logoStyle(x.k) }; });

  const { bestKm } = recordsOf(C);
  const tip = tipOf(P, { rentLeft, hasOverdue: overdue.length > 0, closedCount: C.closedDays.length, bestKmRec: bestKm, avgLucroKm: M.km ? M.lucro / M.km : 0 });

  const seen = app.seen;
  const guideSteps = [['Feche seu primeiro dia', '30 segundos: apps, km e pronto', C.todayClosed, () => (C.todayClosed ? null : k.openClose())], ['Confira suas contas', 'marque o que já pagou', !!seen.bills, () => k.go('bills')], ['Veja seu plano do mês', 'quanto faturar por dia', !!seen.plan, () => k.go('plan')], ['Conheça sua Jornada', 'sequência, nível e Índice Faro', !!seen.journey, () => k.go('journey')]];
  const doneSteps = guideSteps.filter(x => x[2]).length;
  const guide = { show: app.guide && doneSteps < 4 && P === 'dia', count: `${doneSteps} de 4 feitos`, dismiss: () => k.act({ type: 'guide/dismiss' }), steps: guideSteps.map(([title, sub, ok, fn], i) => ({ title, sub, onClick: fn, n: ok ? '' : String(i + 1), icon: ok ? 'ph-bold ph-check' : '', bg: ok ? t.pos : t.accent, color: ok ? t.posInk : '#fff', op: ok ? '.6' : '1' })) };

  return { periods, h, actions, isDia: P === 'dia', notDia: P !== 'dia', isSemana: P === 'semana', isMes: P === 'mes', dg, alert, nextBills, wk, weekBars, mo, wf, metrics, plats, platTotal: R(view.g, 2), showPlats: P !== 'dia', tip, lifeCard, guide };
}

// ---------------------------------------------------------------- plano
const calendarStyle = t => ({
  blank: { bg: 'transparent', color: 'transparent', border: 'none', op: '1' },
  hit: { bg: t.pos, color: t.posInk, border: 'none', op: '1' }, miss: { bg: t.gold, color: t.goldInk, border: 'none', op: '1' },
  today: { bg: 'transparent', color: t.ink, border: `2px solid ${t.gold}`, op: '1' }, off: { bg: 'transparent', color: t.muted, border: 'none', op: '.45' },
  late: { bg: 'transparent', color: t.neg, border: `1.5px solid ${t.neg}`, op: '1' }, future: { bg: t.surface2, color: t.muted, border: 'none', op: '1' },
});

export function planVals(k) {
  const { app, C, t, today } = k;
  const M = C.month, ring = 2 * Math.PI * 84;
  const mp = C.target > 0 ? Math.max(0, Math.min(100, Math.round(M.lucro / C.target * 100))) : 0, ahead = C.proj >= C.target;
  const lifeCount = app.bills.filter(b => b.on && b.cat !== 'carro' && (!b.veh || b.veh === app.vehicle)).length;
  const style = calendarStyle(t);
  const cells = calendarCells(app, C).map(c => ({ n: c.n, ...style[c.kind] }));
  const edit = () => k.openSheet('plan');
  return {
    title: `Plano de ${monthName(today)}`, edit,
    stack: [
      { icon: 'ph-fill ph-house-line', color: t.cL, label: 'Contas da casa e pessoais', sub: `${lifeCount} contas · toque para ver`, value: R(C.life), onClick: () => k.set({ screen: 'bills', billFilter: 'todas', prev: 'plan' }), caret: 'ph-bold ph-caret-right' },
      { icon: 'ph-fill ph-vault', color: t.pos, label: 'Guardar', sub: 'você escolhe', value: R(app.save), onClick: edit, caret: 'ph-bold ph-pencil-simple' },
      { icon: 'ph-fill ph-smiley', color: t.gold, label: 'Pra gastar com você', sub: 'você escolhe', value: R(app.spend), onClick: edit, caret: 'ph-bold ph-pencil-simple' },
    ],
    rhythm: [
      { icon: 'ph-fill ph-path', label: 'Ganho médio por km', sub: app.revKmMode === 'manual' ? 'definido por você' : C.learnDays ? `aprendido de ${C.learnDays} dias` : 'estimativa inicial · aprende ao fechar dias', value: R(C.revKm, 2), onClick: edit },
      { icon: 'ph-fill ph-coins', label: 'Custo por km do carro', sub: 'combustível, desgaste e carro fixo · em Carro', value: R(C.fuelKm + app.wear + C.carShare / Math.max(1, C.planDailyGross / C.revKm), 2), onClick: () => k.go('car') },
      { icon: 'ph-fill ph-calendar', label: 'Dias de pista', sub: `${C.rem} dias até o fim do mês`, value: `${app.daysWeek}/sem`, onClick: edit },
    ],
    dash: `${ring * mp / 100} ${ring}`, paceBg: ahead ? 'rgba(61,220,151,.2)' : 'rgba(233,176,75,.2)', paceInk: ahead ? '#7FF0BE' : '#FFD77A', paceIcon: ahead ? 'ph-bold ph-check' : 'ph-bold ph-warning',
    steppers: [
      { label: 'Guardar por mês', value: R(app.save), minus: () => k.act({ type: 'plan/set', payload: { save: Math.max(0, app.save - 100) } }), plus: () => k.act({ type: 'plan/set', payload: { save: app.save + 100 } }) },
      { label: 'Pra gastar com você', value: R(app.spend), minus: () => k.act({ type: 'plan/set', payload: { spend: Math.max(0, app.spend - 100) } }), plus: () => k.act({ type: 'plan/set', payload: { spend: app.spend + 100 } }) },
    ],
    need: [{ icon: 'ph-bold ph-arrow-down-left', label: 'Faturar por dia', value: R(C.dailyGross) }, { icon: 'ph-bold ph-path', label: 'Rodar por dia', value: `${Math.round(C.dailyGross / C.revKm)} km` }, { icon: 'ph-bold ph-calendar', label: 'Dias restantes', value: String(C.rem) }, { icon: 'ph-bold ph-steering-wheel', label: 'Lucro por dia', value: R(C.dailyLucro) }],
    explain: C.rem ? `Faltam ${R(C.need)} de lucro líquido. Dividindo pelos ${C.rem} dias de pista que sobram, cada dia precisa render ${R(C.dailyLucro)} depois do carro. Fechou um dia, o número se ajusta.` : 'Não há mais dias de pista neste mês. A meta do próximo mês começa no dia 1.',
    dayTabs: DAYS_WEEK_OPTIONS.map(n => segOpt(t, n + '×/sem', app.daysWeek === n, () => k.act({ type: 'plan/set', payload: { daysWeek: n } }))),
    wd: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'], cal: cells,
  };
}
