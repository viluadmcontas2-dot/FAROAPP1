// Valores do template para contas, lembretes, carro, jornada e conta (a segunda camada de telas).
import { fmt, R } from '../core/money.js';
import { addDays, weekday, WD_SHORT, MONTHS, dayOfMonth } from '../core/dates.js';
import { FUEL } from '../core/catalog.js';
import { level } from '../core/calc.js';
import { BILL_CAT_LABELS, VEHICLE_LABELS, ENERGY_LABELS } from './kit.js';
import { energyWord, billRhythm } from './vals-forms.js';
import { billStatus } from './vals.js';
import { records as recordsOf, badges as badgesOf, reminders as remindersOf, bestStreak } from './derive.js';

const sumOf = list => list.reduce((a, o) => a + o.v, 0);

// ---------------------------------------------------------------- contas
export function billsVals(k) {
  const { t, ui, today, occ } = k, st = billStatus(today, t), filter = ui.billFilter;
  const inFilter = o => filter === 'todas' || o.cat === filter;
  const pending = occ.filter(o => !o.paid && inFilter(o)).sort((a, b) => a.date.localeCompare(b.date));
  const paid = occ.filter(o => o.paid && inFilter(o)).sort((a, b) => b.date.localeCompare(a.date));
  const total = sumOf(occ), paidTotal = sumOf(occ.filter(o => o.paid));
  return {
    total: R(total, 2), paid: R(paidTotal, 2), left: R(total - paidTotal, 2), w: (paidTotal / Math.max(1, total) * 100) + '%',
    filters: [['todas', 'Todas'], ...BILL_CAT_LABELS].map(([key, label]) => { const on = filter === key; return { label, v: R(sumOf(occ.filter(o => key === 'todas' || o.cat === key))), bg: on ? '#fff' : 'rgba(255,255,255,.08)', color: on ? '#0D1530' : '#fff', border: on ? '#fff' : 'rgba(255,255,255,.16)', onClick: () => k.set({ billFilter: key }) }; }),
    pending: pending.map(o => ({ name: o.name, icon: 'ph-fill ' + o.icon, color: o.color, value: R(o.v, 2), status: `${st.when(o)} · ${o.rec}`, sc: st.color(o), line: o.date < today ? t.negLine : t.line, onPay: () => k.payBill(o.oid) })),
    paidList: paid.map((o, i) => ({ name: o.name, icon: 'ph-fill ' + o.icon, color: o.color, value: R(o.v, 2), status: `pago · dia ${o.d}`, sep: i === paid.length - 1 ? 'transparent' : t.line, onUndo: () => k.payBill(o.oid, null, false) })),
  };
}

// ---------------------------------------------------------------- lembretes
export function remindVals(k) {
  const { app, C, t, today, occ } = k, M = C.month;
  const items = remindersOf(app, C, occ);
  const dayWord = date => (date === today ? 'Hoje' : date === addDays(today, 1) ? 'Amanhã' : WD_SHORT[weekday(date)]);
  const tone = x => t[x.tone] || x.tone;
  const first = items[0];
  const perDaySave = Math.max(0, M.sobra / Math.max(1, M.n) * 0.15), goal = C.life + C.carFixed;
  const months = perDaySave > 0 ? goal / (perDaySave * C.planned) : 0;
  const prefs = [['close', 'Fechar o dia', 'todo dia de pista às 22h', 'ph-duotone ph-flag-checkered'], ['bills', 'Contas', '2 dias antes do vencimento', 'ph-duotone ph-receipt'],
    ...(app.vehicle === 'dono' ? [] : [['rent', app.vehicle === 'alugado' ? 'Aluguel do carro' : 'Parcela do carro', 'na véspera, às 20h', 'ph-duotone ph-car-profile']]),
    ['week', 'Resumo da semana', 'domingo às 19h', 'ph-duotone ph-chart-bar']];
  return {
    count: items.length, badgeD: items.length ? 'flex' : 'none',
    next: first ? { icon: first.icon, title: first.title, sub: first.sub, when: `${dayWord(first.date).toLowerCase()}${first.time ? ' às ' + first.time : ''}` } : { icon: 'ph-fill ph-check', when: '—', title: 'Tudo em dia', sub: '' },
    items: items.map((x, i) => ({ ...x, color: tone(x), day: dayWord(x.date), dnum: dayOfMonth(x.date), dc: x.date === today ? t.gold : t.muted, sep: i === items.length - 1 ? 'transparent' : t.line })),
    resGoal: R(goal),
    resText: perDaySave > 0 ? `Guardando ${R(perDaySave)} por dia de pista (15% da sua sobra média), você junta um mês de contas em cerca de ${fmt(months, 0)} meses. O Faro sugere o valor em cada fechamento.` : 'Feche alguns dias de pista e o Faro sugere quanto guardar por dia para juntar um mês das suas contas.',
    prefs: prefs.map(([key, label, sub, icon], i, all) => ({ label, sub, icon, trk: app.rem[key] ? t.accent : t.line2, knob: app.rem[key] ? '21px' : '3px', sep: i === all.length - 1 ? 'transparent' : t.line, onToggle: () => k.act({ type: 'rem/set', payload: { key, on: !app.rem[key] } }) })),
  };
}

// ---------------------------------------------------------------- carro
export function carVals(k) {
  const { app, C, t } = k, M = C.month, F = C.F, word = energyWord(app);
  const bill = id => app.bills.find(b => b.id === id);
  // custo por km: dos km já rodados no mês; sem km ainda, do plano (km por dia que a meta pede)
  const carPerKm = M.km ? M.car / M.km : C.carShare / Math.max(1, C.planDailyGross / C.revKm);
  const perKm = [[word, C.fuelKm, t.accent], ['Desgaste', app.wear, t.cW], ['Carro fixo', carPerKm, t.cF]];
  const costKm = perKm.reduce((a, p) => a + p[1], 0);
  const compare = ['gasolina', 'etanol', 'gnv'].map(key => ({ key, ...FUEL[key], ...app.fuel[key], perKm: app.fuel[key].price / app.fuel[key].eff }));
  const maxCost = Math.max(...compare.map(c => c.perKm)), cheapest = [...compare].sort((a, b) => a.perKm - b.perKm)[0];
  const monthlyKm = C.planDailyGross / C.revKm * C.planned, current = compare.find(c => c.key === C.ft) || { perKm: C.fuelKm };
  const carRowLabel = app.vehicle === 'alugado' ? `Aluguel · ${R(bill('aluguel-carro').v)}/semana` : app.vehicle === 'financiado' ? `Parcela · ${R(bill('parcela-carro').v)}/mês` : 'Seguro';
  return {
    title: `Carro ${VEHICLE_LABELS[app.vehicle].toLowerCase()}`,
    rows: [
      { icon: 'ph-fill ph-gas-pump', label: app.energy === 'flex' ? `Flex · mais ${FUEL[app.flexUse].label.toLowerCase()} · ${R(F.price, 2)}/${F.unit}` : `${F.label} · ${R(F.price, 2)}/${F.unit}`, sub: `rende ${fmt(F.eff, 1)} km/${F.unit}`, value: R(C.fuelKm, 2) + '/km' },
      { icon: 'ph-fill ph-wrench', label: 'Desgaste', sub: 'pneus, óleo, freios, revisões', value: R(app.wear, 2) + '/km' },
      { icon: 'ph-fill ph-car-profile', label: carRowLabel, sub: 'dividido pelos km do mês · fica em Contas', value: R(carPerKm, 2) + '/km' },
    ],
    tags: [VEHICLE_LABELS[app.vehicle], ENERGY_LABELS[app.energy][0]], costKm: R(costKm, 2),
    parts: perKm.map(([label, v, color]) => ({ label, v: R(v, 2), w: (v / Math.max(0.01, costKm) * 100) + '%', color })),
    compare: compare.map(c => ({ label: c.label, icon: c.icon, price: `${R(c.price, 2)}/${c.unit}`, km: R(c.perKm, 2), w: (c.perKm / maxCost * 100) + '%', color: c.key === cheapest.key ? t.pos : c.key === C.ft ? t.accent : t.line2 })),
    tip: cheapest.key === C.ft ? 'Você já usa o combustível mais barato por km.' : `Com ${cheapest.label} você gastaria cerca de ${R((current.perKm - cheapest.perKm) * monthlyKm)} a menos por mês, no seu ritmo de ${fmt(monthlyKm, 0)} km.`,
  };
}

// ---------------------------------------------------------------- jornada
const PILLAR_VIEW = { const: ['ph-fill ph-calendar-check', 'gold'], km: ['ph-fill ph-path', 'accent'], bills: ['ph-fill ph-receipt', 'pos'], pace: ['ph-fill ph-trend-up', 'cL'] };

export function journeyVals(k) {
  const { app, C, t, occ, today } = k, lv = level(app.xp), idx = k.idx;
  const best = Math.max(k.streakNow, bestStreak(app, today));
  const { best: bestDay, bestKm } = recordsOf(C);
  const list = badgesOf(app, C, occ, k.streakNow);
  const go = (screen) => () => k.go(screen);
  return {
    game: { streak: k.streakNow, bestStreak: best, level: lv.level, levelName: lv.name, xp: app.xp, xpW: lv.pct + '%', nextLv: lv.next ? `${lv.toNext} XP para ${lv.next}` : '' },
    idx: { score: idx.score, label: idx.label, next: idx.next, pillars: idx.pillars.map(p => ({ icon: PILLAR_VIEW[p.key][0], color: t[PILLAR_VIEW[p.key][1]], label: p.label, score: p.score, hint: p.hint, w: p.score + '%' })) },
    records: [
      { icon: 'ph-fill ph-trophy', v: bestDay ? R(bestDay.lucro) : '—', l: bestDay ? `melhor dia · ${bestDay.d} ${MONTHS[Number(bestDay.date.slice(5, 7)) - 1].slice(0, 3)}` : 'melhor dia' },
      { icon: 'ph-fill ph-path', v: bestKm ? R(bestKm.lucro / bestKm.km, 2) : '—', l: 'melhor lucro/km' },
      { icon: 'ph-fill ph-fire', v: best + ' dias', l: 'maior sequência' },
    ],
    badges: list.map(b => ({ ...b, bg: b.got ? t.gold : t.surface2, color: b.got ? t.goldInk : t.muted, op: b.got ? '1' : '.55' })),
    badgeCount: `${list.filter(b => b.got).length} de ${list.length}`,
    shortcuts: [
      { icon: 'ph-duotone ph-target', label: 'Plano do mês', sub: `meta ${R(C.target)} · ${R(C.dailyGross)}/dia`, onClick: go('plan') },
      { icon: 'ph-duotone ph-car-profile', label: 'Meu carro', sub: `custo ${R(C.fuelKm + app.wear, 2)}/km · combustível e desgaste`, onClick: go('car') },
      // ponto de entrada da tela Conta (tarefa 6 completa esta tela com login, nuvem e assinatura)
      { icon: 'ph-duotone ph-identification-badge', label: 'Conta', sub: 'nuvem, backup e assinatura', onClick: go('conta') },
    ],
  };
}

// ---------------------------------------------------------------- conta
const CLOUD_TEXT = {
  idle: ['ph-duotone ph-info', 'Dados só neste aparelho', 'Entrar na conta guarda uma cópia na nuvem e leva seus dados para outros aparelhos.'],
  synced: ['ph-duotone ph-check-circle', 'Tudo salvo na nuvem', ''],
  pending: ['ph-duotone ph-clock', 'Aguardando envio', 'As últimas mudanças sobem em instantes.'],
  syncing: ['ph-duotone ph-clock', 'Enviando para a nuvem', ''],
  offline: ['ph-duotone ph-warning', 'Sem internet', 'Seus dados estão salvos aqui e sobem quando a conexão voltar.'],
  error: ['ph-duotone ph-warning', 'Não deu para sincronizar', 'O Faro tenta de novo sozinho. Seus dados continuam salvos neste aparelho.'],
  conflict: ['ph-duotone ph-warning', 'A nuvem tem dados diferentes', 'Escolha qual versão manter para continuar sincronizando.'],
};

export function contaVals(k) {
  const { t, ui, cloud } = k;
  const [icon, title, sub] = !cloud.configured ? ['ph-duotone ph-info', 'Nuvem indisponível', 'Neste aparelho os dados ficam salvos normalmente.']
    : cloud.user ? CLOUD_TEXT[cloud.status] || CLOUD_TEXT.idle : CLOUD_TEXT.idle;
  const msg = ui.contaMsg;
  return {
    intro: 'Seus dados, o backup e a conexão com a nuvem.',
    cloudIcon: icon, cloudTitle: title, cloudSub: [cloud.user && cloud.user.email, sub].filter(Boolean).join(' · '),
    exportBackup: k.exportBackup, onFile: e => k.importBackupFile(e.target),
    msg: msg ? msg.text : '', msgColor: msg && msg.ok ? t.pos : t.neg,
  };
}
