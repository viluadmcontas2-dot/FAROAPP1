// Valores do template para contas, lembretes, carro, jornada e conta (a segunda camada de telas).
import { fmt, R } from '../core/money.js';
import { addDays, weekday, WD_SHORT, MONTHS, dayOfMonth, monthName } from '../core/dates.js';
import { FUEL } from '../core/catalog.js';
import { level, calc } from '../core/calc.js';
import { daysLeft, blockedIntro } from '../data/access.js';
import { BILL_CAT_LABELS, VEHICLE_LABELS, ENERGY_LABELS, plural, PRICE, carFixName, UNIT_WORD } from './kit.js';
import { energyWord } from './vals-forms.js';
import { billStatus } from './vals.js';
import { records as recordsOf, badges as badgesOf, reminders as remindersOf, bestStreak, carFixedPerKm } from './derive.js';

const sumOf = list => list.reduce((a, o) => a + o.v, 0);

// ---------------------------------------------------------------- contas
export function billsVals(k) {
  const { t, ui, today, occ } = k, st = billStatus(today, t), filter = ui.billFilter;
  const inFilter = o => filter === 'todas' || o.cat === filter;
  const pending = occ.filter(o => !o.paid && inFilter(o)).sort((a, b) => a.date.localeCompare(b.date));
  const paid = occ.filter(o => o.paid && inFilter(o)).sort((a, b) => b.date.localeCompare(a.date));
  const total = sumOf(occ), paidTotal = sumOf(occ.filter(o => o.paid));
  return {
    title: `${monthName(today).replace(/^./, c => c.toUpperCase())} · carro e vida`, total: R(total, 2), paid: R(paidTotal, 2), left: R(total - paidTotal, 2), w: (paidTotal / Math.max(1, total) * 100) + '%',
    filters: [['todas', 'Todas'], ...BILL_CAT_LABELS].map(([key, label]) => { const on = filter === key; return { label, v: R(sumOf(occ.filter(o => key === 'todas' || o.cat === key))), bg: on ? '#fff' : 'rgba(255,255,255,.08)', color: on ? '#0D1530' : '#fff', border: on ? '#fff' : 'rgba(255,255,255,.16)', onClick: () => k.set({ billFilter: key }) }; }),
    hasPending: pending.length > 0, hasPaid: paid.length > 0, allPaid: pending.length === 0 && paid.length > 0, empty: pending.length === 0 && paid.length === 0,
    emptyTitle: filter === 'todas' ? 'Nenhuma conta ainda' : `Nenhuma conta em ${(BILL_CAT_LABELS.find(([key]) => key === filter) || [filter, filter])[1]}`,
    pending: pending.map(o => ({ name: o.name, icon: 'ph-fill ' + o.icon, color: o.color, value: R(o.v, 2), status: `${st.when(o)} · ${o.rec}`, sc: st.color(o), line: o.date < today ? t.negLine : t.line, onPay: () => k.payBill(o.oid) })),
    paidList: paid.map((o, i) => ({ undoAria: `Desfazer pagamento: ${o.name}`, name: o.name, icon: 'ph-fill ' + o.icon, color: o.color, value: R(o.v, 2), status: `pago · dia ${o.d}`, sep: i === paid.length - 1 ? 'transparent' : t.line, onUndo: () => k.unpayBill(o.oid) })),
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
  const prefs = [['close', 'Fechar o dia', 'dia de pista ainda aberto', 'ph-duotone ph-flag-checkered'], ['bills', 'Contas', 'contas a vencer e atrasadas', 'ph-duotone ph-receipt'],
    ...(app.vehicle === 'dono' ? [] : [['rent', app.vehicle === 'alugado' ? 'Aluguel do carro' : 'Parcela do carro', 'perto do vencimento', 'ph-duotone ph-car-profile']]),
    ['week', 'Resumo da semana', 'no fim da semana', 'ph-duotone ph-chart-bar']];
  return {
    count: items.length, summary: `${plural(items.length, 'item', 'itens')} nos próximos 7 dias`, badgeD: items.length ? 'flex' : 'none',
    next: first ? { icon: first.icon, title: first.title, sub: first.sub, when: `${dayWord(first.date).toLowerCase()}` } : { icon: 'ph-fill ph-check', when: '—', title: 'Tudo em dia', sub: '' },
    items: items.map((x, i) => ({ ...x, color: tone(x), day: dayWord(x.date), dnum: dayOfMonth(x.date), dc: x.date === today ? t.goldText : t.muted, sep: i === items.length - 1 ? 'transparent' : t.line })),
    resGoal: R(goal),
    resText: perDaySave > 0 ? `Guardando ${R(perDaySave)} por dia de pista (15% da sua sobra média), você junta um mês de contas em cerca de ${fmt(months, 0)} meses. O Faro sugere o valor em cada fechamento.` : 'Feche alguns dias de pista e o Faro sugere quanto guardar por dia para juntar um mês das suas contas.',
    prefs: prefs.map(([key, label, sub, icon], i, all) => ({ label, sub, icon, trk: app.rem[key] ? t.accent : t.line2, knob: app.rem[key] ? '21px' : '3px', sep: i === all.length - 1 ? 'transparent' : t.line, onToggle: () => k.act({ type: 'rem/set', payload: { key, on: !app.rem[key] } }) })),
  };
}

// ---------------------------------------------------------------- carro
export function carVals(k) {
  const { app, C, t } = k, F = C.F, word = energyWord(app);
  const bill = id => app.bills.find(b => b.id === id);
  const carPerKm = carFixedPerKm(C);
  const perKm = [[word, C.fuelKm, t.accent], ['Desgaste', app.wear, t.cW], [`${carFixName(app.vehicle)} por km`, carPerKm, t.cF]];
  const costKm = perKm.reduce((a, p) => a + p[1], 0);
  const compare = ['gasolina', 'etanol', 'gnv'].map(key => ({ key, ...FUEL[key], ...app.fuel[key], perKm: app.fuel[key].price / app.fuel[key].eff }));
  const maxCost = Math.max(...compare.map(c => c.perKm)), cheapest = [...compare].sort((a, b) => a.perKm - b.perKm)[0];
  const monthlyKm = C.planDailyGross / C.revKm * C.planned, current = compare.find(c => c.key === C.ft) || { perKm: C.fuelKm };
  const carRowLabel = app.vehicle === 'alugado' ? `Aluguel · ${R(bill('aluguel-carro').v)}/semana` : app.vehicle === 'financiado' ? `Parcela · ${R(bill('parcela-carro').v)}/mês` : 'Seguro';
  return {
    title: `Carro ${VEHICLE_LABELS[app.vehicle].toLowerCase()}`,
    rows: [
      { icon: 'ph-fill ph-gas-pump', label: app.energy === 'flex' ? `Flex · mais ${FUEL[app.flexUse].label.toLowerCase()} · ${R(F.price, 2)}/${F.unit}` : `${F.label} · ${R(F.price, 2)}/${F.unit}`, sub: `faz ${fmt(F.eff, 1)} km por ${UNIT_WORD[F.unit] || F.unit}`, value: R(C.fuelKm, 2) + '/km' },
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
  return {
    game: { empty: !Object.values(app.recs || {}).some(r => r && r.closed), onFirst: () => k.openClose(), streakLabel: plural(k.streakNow, 'dia', 'dias'), streakRun: k.streakNow === 1 ? '1 dia seguido' : `${k.streakNow} dias seguidos`, streak: k.streakNow, bestStreak: best, level: lv.level, levelName: lv.name, xp: app.xp, xpW: lv.pct + '%', nextLv: lv.next ? `${lv.toNext} pontos para ${lv.next}` : '' },
    idx: { score: idx.score, label: idx.label, next: idx.next, pillars: idx.pillars.map(p => ({ icon: PILLAR_VIEW[p.key][0], color: t[PILLAR_VIEW[p.key][1]], label: p.label, score: p.score, hint: p.hint, w: p.score + '%' })) },
    records: [
      { icon: 'ph-fill ph-trophy', v: bestDay ? R(bestDay.lucro) : '—', l: bestDay ? `melhor dia · ${bestDay.d} ${MONTHS[Number(bestDay.date.slice(5, 7)) - 1].slice(0, 3)}` : 'melhor dia' },
      { icon: 'ph-fill ph-path', v: bestKm ? R(bestKm.lucro / bestKm.km, 2) : '—', l: 'melhor lucro/km' },
      { icon: 'ph-fill ph-fire', v: plural(best, 'dia', 'dias'), l: 'maior sequência' },
    ],
    badges: list.map(b => ({ ...b, bg: b.got ? t.gold : t.surface2, color: b.got ? t.goldInk : t.muted, op: b.got ? '1' : '.55' })),
    badgeCount: `${list.filter(b => b.got).length} de ${list.length}`,
  };
}

// ---------------------------------------------------------------- conta
const CLOUD_TEXT = {
  idle: ['ph-fill ph-info', 'Entre para guardar na nuvem', 'Uma cópia na nuvem leva seus dados para outros aparelhos.'],
  synced: ['ph-fill ph-check-circle', 'Tudo salvo na nuvem', ''],
  pending: ['ph-fill ph-clock', 'Aguardando envio', 'As últimas mudanças sobem em instantes.'],
  syncing: ['ph-fill ph-clock', 'Enviando para a nuvem', ''],
  offline: ['ph-fill ph-warning', 'Sem internet', 'Seus dados estão salvos aqui e sobem quando a conexão voltar.'],
  error: ['ph-fill ph-warning', 'Não deu para sincronizar', 'O Faro tenta de novo sozinho. Seus dados continuam salvos neste aparelho.'],
  conflict: ['ph-fill ph-warning', 'A nuvem tem dados diferentes', ''],
};

// Tela Conta: entrar/criar conta/sair, estado da nuvem, conflito, assinatura, backup, nova versão e versão do app.
// Ações em conta-actions.js (k.conta); o cartão de cada seção só aparece quando faz sentido (flags `show*`).
const brDate = iso => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

// resumo de lucro de um estado (o que será mantido): "Lucro do mês R$ 1.234 · 12 dias fechados"
export function snapshotSummary(state, today) {
  try {
    const C = calc(state, today), n = C.month.n;
    if (n > 0) return `Lucro do mês ${R(C.month.lucro)} · ${plural(n, 'dia fechado', 'dias fechados')}`;
    const closed = Object.values((state && state.recs) || {}).filter(r => r && r.closed).length;
    return closed ? `${plural(closed, 'dia fechado', 'dias fechados')}, nenhum neste mês` : 'Ainda sem dias fechados';
  } catch { return 'Resumo indisponível'; }
}

const SUB_VIEW = (sub, now) => {
  const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  if (sub.error) return { title: 'Não deu para conferir sua assinatura', sub: 'Conecte-se à internet e tente de novo.', action: 'retry', label: 'Tentar de novo' };
  switch (sub.status) {
    case 'trialing': { const d = daysLeft(sub, now); return { title: 'Teste grátis', sub: d === null ? 'Seu teste grátis está ativo.' : d === 0 ? 'Seu teste termina hoje.' : `Faltam ${plural(d, 'dia', 'dias')} do teste grátis.`, action: 'portal', label: 'Gerenciar assinatura' }; }
    case 'active': return { title: 'Assinatura ativa', sub: end ? (sub.cancelAtPeriodEnd ? `Termina em ${end}.` : `Renova em ${end}.`) : 'Tudo certo com a sua assinatura.', action: 'portal', label: 'Gerenciar assinatura' };
    case 'past_due': case 'unpaid': return { title: 'Pagamento pendente', sub: 'Atualize o pagamento para continuar usando o Faro.', action: 'portal', label: 'Atualizar pagamento' };
    case 'canceled': case 'paused': return { title: 'Assinatura cancelada', sub: `Assine de novo para voltar a usar o Faro: ${PRICE}, cobrado já no começo. O teste grátis vale uma vez por pessoa.`, action: 'checkout', label: 'Assinar de novo' };
    default: return { title: 'Sem assinatura', sub: `Teste o Faro por 7 dias sem pagar, depois ${PRICE}. Cancele quando quiser.`, action: 'checkout', label: 'Começar 7 dias grátis' };
  }
};

export function contaVals(k) {
  const { t, ui, cloud, conta, today } = k, ct = ui.ct, au = ct.auth, access = ui.access || { billing: false, blocked: false, checking: false, decision: {} };
  const api = k.cloudApi, configured = cloud.configured, user = cloud.user, now = Date.now();
  const [icon, title, sub] = !configured ? ['ph-fill ph-info', 'Nuvem indisponível', 'Neste aparelho os dados ficam salvos normalmente.']
    : user ? CLOUD_TEXT[cloud.status] || CLOUD_TEXT.idle : CLOUD_TEXT.idle;
  const msg = ui.contaMsg;
  const isConflict = !!user && cloud.status === 'conflict', status = isConflict && api ? api.sync.getStatus() : null;

  // entrar / criar conta
  const create = au.mode === 'criar', showAuth = configured && !user && !access.checking;
  const auth = {
    show: showAuth, title: create ? 'Criar sua conta' : 'Entrar na conta',
    sub: create ? 'Com a conta, seus dados ficam guardados na nuvem e seguem com você.' : 'Use o e-mail e a senha da sua conta Faro.',
    email: au.email, password: au.password, pwType: au.show ? 'text' : 'password', pwToggle: au.show ? 'Ocultar' : 'Mostrar',
    pwHint: create ? 'Mínimo de 8 caracteres' : '', autoPw: create ? 'new-password' : 'current-password',
    submit: au.busy ? (create ? 'Criando conta…' : 'Entrando…') : create ? 'Criar conta' : 'Entrar',
    other: create ? 'Já tenho conta' : 'Criar conta', forgot: !create,
    msg: au.msg ? au.msg.text : '', msgColor: au.msg && au.msg.ok ? t.pos : t.neg,
    onEmail: conta.setField('email'), onPassword: conta.setField('password'), onToggle: conta.toggleShow, onSubmit: e => conta.submit(e), onOther: conta.switchMode, onForgot: conta.forgot,
  };

  // conflito: duas escolhas explícitas, sem padrão
  const remote = status && status.remote, local = status && status.local;
  const when = remote && brDate(remote.serverUpdatedAt);
  const ask = ct.confirm;
  const conflict = {
    show: isConflict && !!remote,
    cloudLine: remote ? [snapshotSummary(remote.state, today), when && `salvo em ${when}`].filter(Boolean).join(' · ') : '',
    localLine: local ? snapshotSummary(local, today) : '',
    onCloud: () => conta.askResolve('cloud'), onLocal: () => conta.askResolve('local'),
    asking: !!ask,
    askTitle: ask === 'cloud' ? 'Manter os dados da nuvem?' : 'Usar os dados deste aparelho?',
    askText: ask === 'cloud' ? `Os dados deste aparelho serão substituídos pelos da nuvem (${remote ? snapshotSummary(remote.state, today).toLowerCase() : ''}). Não dá para desfazer.`
      : `Os dados da nuvem serão substituídos pelos deste aparelho (${local ? snapshotSummary(local, today).toLowerCase() : ''}). Não dá para desfazer.`,
    onConfirm: conta.doResolve, onBack: conta.cancelResolve,
  };

  // assinatura
  const billing = access.billing;
  let subView;
  if (!billing) subView = { title: 'Assinatura abre em breve', sub: `Por enquanto o Faro está liberado para você usar sem pagar. Quando abrir: grátis por 7 dias, depois ${PRICE}.`, action: '', label: '' };
  else if (!user) subView = { title: 'Teste grátis por 7 dias', sub: 'Entre ou crie sua conta para começar o teste.', action: '', label: '' };
  else if (ct.sub === undefined) subView = { title: 'Conferindo sua assinatura…', sub: '', action: '', label: '' };
  else subView = SUB_VIEW(ct.sub, now);
  const onSub = { checkout: conta.checkout, portal: conta.portal, retry: conta.retrySub }[subView.action];
  const subscription = { show: configured && !access.checking, icon: billing ? 'ph-fill ph-star-four' : 'ph-fill ph-clock', title: subView.title, sub: subView.sub, label: subView.label, hasAction: !!onSub, onAction: onSub || (() => {}) };

  const blockedText = access.blocked && !access.checking ? blockedIntro(access.decision) : '';
  return {
    intro: access.checking ? 'Conferindo sua conta…' : blockedText || 'Seus dados, o backup e a conexão com a nuvem.',
    canBack: !access.blocked, checking: access.checking, full: !access.checking,
    cloudIcon: icon, cloudTitle: title, cloudSub: [user && user.email, sub].filter(Boolean).join(' · '),
    signedIn: !!user, signOut: conta.signOut,
    del: {
      showAsk: !!user && !ct.del, show: !!user && ct.del > 0, step1: ct.del === 1, step2: ct.del === 2,
      title: ct.del === 2 ? 'Excluir tudo agora?' : 'Excluir minha conta?',
      text: ct.del === 2 ? 'Não dá para desfazer. Sua conta, os dados da nuvem e os dados deste aparelho serão apagados agora.'
        : 'Vamos apagar sua conta e os dados da nuvem. Os dados deste aparelho também serão apagados. Se você tem assinatura ativa, ela será cancelada. Quer guardar uma cópia? Salve um backup antes.',
      msg: ct.delMsg || '', confirmLabel: ct.delBusy ? 'Excluindo…' : 'Excluir tudo',
      onAsk: conta.askDelete, onNext: conta.nextDelete, onBack: conta.cancelDelete, onConfirm: conta.doDelete,
    },
    auth, conflict, subscription,
    update: { show: !!ct.swApply, apply: conta.applyUpdate },
    version: k.version ? `Faro ${k.version}` : '',
    localNote: user ? 'Seus dados também ficam salvos neste aparelho. Guarde um backup de vez em quando.' : 'Sem conta, seus dados ficam só neste aparelho. Guarde um backup de vez em quando.',
    exportBackup: k.exportBackup, onFile: e => k.importBackupFile(e.target),
    msg: msg ? msg.text : '', msgColor: msg && msg.ok ? t.pos : t.neg,
  };
}
