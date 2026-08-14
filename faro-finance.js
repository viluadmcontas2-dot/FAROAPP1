(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroFinance) return;

  const $ = id => document.getElementById(id);
  const WEEKDAYS = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  const today = () => { const d = new Date(); d.setHours(12,0,0,0); return d; };
  const parseKey = key => app.parseDate(key);
  const key = date => app.dateKey(date);
  const addDays = (date, amount) => { const d = new Date(date); d.setDate(d.getDate() + amount); d.setHours(12,0,0,0); return d; };
  const diffDays = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);

  const ensureState = () => {
    let changed = false;
    if (!Array.isArray(app.state.paymentOccurrences)) { app.state.paymentOccurrences = []; changed = true; }
    if (!app.state.paymentTrackingStartedAt) { app.state.paymentTrackingStartedAt = app.todayKey(); changed = true; }
    if (changed) app.save();
  };
  ensureState();

  const occurrenceId = (costId, dueDate) => `${costId}:${dueDate}`;
  const paymentFor = id => app.state.paymentOccurrences.find(item => item.id === id && item.status === 'paid') || null;

  const monthlyDate = (year, month, dueDay) => {
    const last = new Date(year, month + 1, 0, 12).getDate();
    return new Date(year, month, Math.min(Math.max(1, Number(dueDay)), last), 12);
  };

  const datesForCost = (cost, fromDate, toDate) => {
    const dates = [];
    if (cost.kind === 'weekly' && Number.isInteger(Number(cost.dueWeekday)) && Number(cost.dueWeekday) >= 0 && Number(cost.dueWeekday) <= 6) {
      let cursor = new Date(fromDate);
      cursor.setDate(cursor.getDate() + ((Number(cost.dueWeekday) - cursor.getDay() + 7) % 7));
      cursor.setHours(12,0,0,0);
      for (; cursor <= toDate; cursor = addDays(cursor, 7)) dates.push(new Date(cursor));
    }
    if (cost.kind === 'monthly' && Number(cost.dueDay) >= 1 && Number(cost.dueDay) <= 31) {
      let year = fromDate.getFullYear();
      let month = fromDate.getMonth();
      for (let i = 0; i < 4; i += 1) {
        const due = monthlyDate(year, month, cost.dueDay);
        if (due >= fromDate && due <= toDate) dates.push(due);
        month += 1;
        if (month > 11) { month = 0; year += 1; }
      }
    }
    return dates;
  };

  const occurrenceFrom = (cost, due) => {
    const dueDate = key(due);
    const id = occurrenceId(cost.id, dueDate);
    const payment = paymentFor(id);
    const now = today();
    return {
      id,
      costId: cost.id,
      cost,
      due,
      dueDate,
      days: diffDays(now, due),
      status: payment ? 'paid' : 'pending',
      payment,
      amount: payment?.amount ?? Number(cost.value || 0),
      name: payment?.costName ?? cost.name
    };
  };

  const occurrences = ({ daysBack = 0, daysForward = 45, includePaid = true } = {}) => {
    const now = today();
    const tracking = parseKey(app.state.paymentTrackingStartedAt || app.todayKey());
    const from = addDays(now, -daysBack);
    const effectiveFrom = from < tracking ? tracking : from;
    const to = addDays(now, daysForward);
    const derived = (app.state.costs || [])
      .filter(cost => cost?.active !== false && cost?.category === 'obligation' && (cost.kind === 'weekly' || cost.kind === 'monthly'))
      .flatMap(cost => datesForCost(cost, effectiveFrom, to).map(due => occurrenceFrom(cost, due)));

    const paidHistory = includePaid
      ? app.state.paymentOccurrences
          .filter(item => item.status === 'paid')
          .map(item => {
            const cost = (app.state.costs || []).find(candidate => candidate.id === item.costId) || { id:item.costId, name:item.costName, value:item.amount, kind:item.kindSnapshot, active:false };
            return { id:item.id, costId:item.costId, cost, due:parseKey(item.dueDate), dueDate:item.dueDate, days:diffDays(now, parseKey(item.dueDate)), status:'paid', payment:item, amount:item.amount, name:item.costName };
          })
      : [];

    const byId = new Map();
    [...derived, ...paidHistory].forEach(item => byId.set(item.id, item));
    return [...byId.values()].sort((a,b) => a.due - b.due || a.name.localeCompare(b.name));
  };

  const nextPendingOccurrence = () => occurrences({ daysForward:60, includePaid:false }).find(item => item.status === 'pending') || null;

  const markPaid = occurrence => {
    if (!occurrence || occurrence.status === 'paid') return;
    const item = {
      id: occurrence.id,
      costId: occurrence.cost.id,
      dueDate: occurrence.dueDate,
      status: 'paid',
      paidAt: new Date().toISOString(),
      amount: Number(occurrence.cost.value || 0),
      costName: occurrence.cost.name,
      kindSnapshot: occurrence.cost.kind
    };
    const index = app.state.paymentOccurrences.findIndex(entry => entry.id === item.id);
    if (index >= 0) app.state.paymentOccurrences[index] = item;
    else app.state.paymentOccurrences.push(item);
    app.save();
    app.render();
    app.toast(`${item.costName} marcado como pago.`);
    renderFinance();
    window.FaroHome?.refresh?.();
  };

  const undoPaid = id => {
    const item = app.state.paymentOccurrences.find(entry => entry.id === id && entry.status === 'paid');
    if (!item) return;
    app.state.paymentOccurrences = app.state.paymentOccurrences.filter(entry => entry.id !== id);
    app.save();
    app.render();
    app.toast('Pagamento desfeito. O vencimento voltou a ficar pendente.');
    renderFinance();
    window.FaroHome?.refresh?.();
  };

  const injectWeeklyDue = () => {
    const monthlyWrap = $('costDueDayWrap');
    if (!monthlyWrap || $('costDueWeekdayWrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'costDueWeekdayWrap';
    wrap.className = 'hidden';
    wrap.innerHTML = `<label class="label-micro">Dia do vencimento semanal (opcional)</label><select id="costDueWeekday" class="input-vetta"><option value="">Sem dia definido</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option><option value="0">Domingo</option></select>`;
    monthlyWrap.insertAdjacentElement('afterend', wrap);
    $('costDueWeekday').addEventListener('change', () => app.updateCostImpactPreview?.());
    const valueInput = $('costValue');
    if (valueInput) { valueInput.step = '10'; valueInput.classList.add('faro-money'); }
  };
  injectWeeklyDue();

  const baseSyncCostModal = app.syncCostModal;
  app.syncCostModal = function() {
    const result = baseSyncCostModal.call(this);
    const kind = this.$('costKind').value;
    this.$('costDueDayWrap').classList.toggle('hidden', kind !== 'monthly');
    this.$('costDueWeekdayWrap')?.classList.toggle('hidden', kind !== 'weekly');
    return result;
  };

  const baseOpenCostModal = app.openCostModal;
  app.openCostModal = function(cost = null) {
    const result = baseOpenCostModal.call(this, cost);
    if (this.$('costDueWeekday')) this.$('costDueWeekday').value = cost?.dueWeekday ?? '';
    this.syncCostModal();
    return result;
  };

  app.draftCostFromModal = function() {
    const kind = this.$('costKind').value;
    return {
      id:this.$('costId').value || 'preview',
      name:this.$('costName').value.trim() || 'Novo custo',
      category:this.$('costCategory').value,
      kind,
      value:this.number(this.$('costValue').value),
      active:true,
      dueDay:kind === 'monthly' ? this.number(this.$('costDueDay').value) || undefined : undefined,
      dueWeekday:kind === 'weekly' && this.$('costDueWeekday')?.value !== '' ? Number(this.$('costDueWeekday').value) : undefined,
      month:kind === 'one_time' ? this.$('costMonth').value : undefined
    };
  };

  app.saveCost = function() {
    const id = this.$('costId').value || this.uid('cost');
    const name = this.$('costName').value.trim();
    const value = this.number(this.$('costValue').value);
    const kind = this.$('costKind').value;
    if (!name || value <= 0) return this.toast('Informe um nome claro e um valor maior que zero.');
    const existing = this.state.costs.find(cost => cost.id === id);
    const weeklyValue = this.$('costDueWeekday')?.value;
    const cost = {
      id, name, category:this.$('costCategory').value, kind, value,
      active:existing?.active ?? true,
      legacySource:false,
      createdAt:existing?.createdAt || new Date().toISOString(),
      dueDay:kind === 'monthly' ? this.clamp(Math.round(this.number(this.$('costDueDay').value)),0,31) || undefined : undefined,
      dueWeekday:kind === 'weekly' && weeklyValue !== '' ? Number(weeklyValue) : undefined,
      month:kind === 'one_time' ? this.$('costMonth').value : undefined
    };
    const index = this.state.costs.findIndex(item => item.id === id);
    if (index >= 0) this.state.costs[index] = cost;
    else this.state.costs.push(cost);
    this.save();
    this.closeModal('costModal');
    this.render();
    this.toast(index >= 0 ? 'Custo atualizado e meta recalculada.' : 'Custo adicionado e meta recalculada.');
    renderFinance();
  };

  const baseCostValueText = app.costValueText;
  app.costValueText = function(cost) {
    if (cost.kind === 'weekly') {
      const due = cost.dueWeekday !== undefined && cost.dueWeekday !== null ? ` · vence ${WEEKDAYS[Number(cost.dueWeekday)]}` : '';
      return `${this.money(cost.value)}/semana${due}`;
    }
    return baseCostValueText.call(this, cost);
  };

  const planning = $('view-planning');
  if (planning && !$('faroPlanNow')) {
    const hero = planning.firstElementChild;
    const card = document.createElement('section');
    card.id = 'faroPlanNow';
    card.className = 'card-vetta p-6';
    card.innerHTML = `
      <div class="flex justify-between items-start gap-3"><div><span class="label-micro !text-blue-600">Seu plano agora</span><h3 class="text-xl font-extrabold">O que a pista precisa entregar</h3></div><i class="fas fa-route text-blue-500" aria-hidden="true"></i></div>
      <div class="grid grid-cols-2 gap-3 mt-5">
        <div class="bg-slate-50 rounded-2xl p-4"><span class="label-micro">Faturamento/dia</span><strong id="faroPlanningDailyGross" class="text-lg"></strong></div>
        <div class="bg-slate-50 rounded-2xl p-4"><span class="label-micro">Km/dia</span><strong id="faroPlanDailyKm" class="text-lg"></strong></div>
        <div class="bg-slate-50 rounded-2xl p-4"><span class="label-micro">Energia/km</span><strong id="faroPlanningEnergyKm" class="text-lg"></strong></div>
        <div class="bg-slate-50 rounded-2xl p-4"><span class="label-micro">Contas + reservas</span><strong id="faroPlanFixed" class="text-lg"></strong></div>
      </div>
      <button id="faroManageCosts" type="button" class="w-full mt-4 rounded-2xl bg-blue-50 text-blue-700 font-extrabold text-xs">GERENCIAR CUSTOS E VENCIMENTOS</button>`;
    hero?.insertAdjacentElement('afterend', card);
    $('faroManageCosts').addEventListener('click', () => app.openSecondary('settings'));
  }

  const settings = $('view-settings');
  if (settings && !$('faroPaymentCenter')) {
    const center = document.createElement('section');
    center.id = 'faroPaymentCenter';
    center.className = 'card-vetta p-6';
    center.innerHTML = `<div class="flex justify-between items-start gap-3"><div><span class="label-micro !text-blue-600">Vencimentos</span><h3 class="text-lg font-extrabold">O que precisa sair da pista</h3><p class="text-xs text-slate-500 mt-1">Marcar pago não remove o custo dos próximos períodos.</p></div><i class="fas fa-receipt text-blue-500" aria-hidden="true"></i></div><div id="faroPaymentList" class="space-y-3 mt-5"></div>`;
    settings.insertBefore(center, settings.children[1] || null);
    center.addEventListener('click', event => {
      const pay = event.target.closest('[data-pay-occurrence]');
      const undo = event.target.closest('[data-undo-occurrence]');
      if (pay) markPaid(occurrences({ daysBack:14, daysForward:45 }).find(item => item.id === pay.dataset.payOccurrence));
      if (undo) undoPaid(undo.dataset.undoOccurrence);
    });
  }

  const occurrenceLabel = occurrence => {
    if (occurrence.status === 'paid') return `Pago em ${new Date(occurrence.payment.paidAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`;
    if (occurrence.days < 0) return `venceu há ${Math.abs(occurrence.days)} ${Math.abs(occurrence.days) === 1 ? 'dia' : 'dias'}`;
    if (occurrence.days === 0) return 'vence hoje';
    if (occurrence.days === 1) return 'vence amanhã';
    return `vence em ${occurrence.days} dias`;
  };

  const renderPayments = () => {
    const list = $('faroPaymentList');
    if (!list) return;
    const pending = occurrences({ daysBack:14, daysForward:45, includePaid:false }).filter(item => item.status === 'pending').slice(0,6);
    const paid = occurrences({ daysBack:35, daysForward:0, includePaid:true }).filter(item => item.status === 'paid').sort((a,b) => b.due - a.due).slice(0,3);
    const rows = [...pending, ...paid];
    if (!rows.length) {
      list.innerHTML = '<div class="text-sm text-slate-400 py-3">Adicione vencimento a uma conta mensal ou semanal para acompanhar aqui.</div>';
      return;
    }
    list.innerHTML = rows.map(item => `
      <article class="rounded-2xl border ${item.status === 'paid' ? 'border-emerald-100 bg-emerald-50/50' : item.days < 0 ? 'border-red-100 bg-red-50/50' : 'border-slate-100 bg-white'} p-4">
        <div class="flex justify-between gap-3"><div class="min-w-0"><strong class="block text-sm truncate">${app.escape(item.name)}</strong><span class="text-xs ${item.status === 'paid' ? 'text-emerald-700' : item.days < 0 ? 'text-red-600' : 'text-slate-500'}">${occurrenceLabel(item)} · ${app.money(item.amount,0)}</span></div><span class="cost-kind">${item.cost.kind === 'weekly' ? 'semanal' : 'mensal'}</span></div>
        <div class="mt-3 flex justify-end">${item.status === 'paid' ? `<button type="button" data-undo-occurrence="${item.id}" class="px-3 py-2 rounded-xl bg-white text-slate-600 text-[10px] font-extrabold">DESFAZER</button>` : `<button type="button" data-pay-occurrence="${item.id}" class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-extrabold">MARCAR PAGO</button>`}</div>
      </article>`).join('');
  };

  const renderPlan = () => {
    if (!$('faroPlanNow')) return;
    const c = app.calculations();
    $('faroPlanningDailyGross').textContent = app.money(c.dailyGross,0);
    $('faroPlanDailyKm').textContent = `${app.integer(c.dailyKm)} km`;
    $('faroPlanningEnergyKm').textContent = `${app.money(c.fuelKm)}/km`;
    $('faroPlanFixed').textContent = app.money(c.costs.monthlyFixed,0);
  };

  const renderFinance = () => { renderPayments(); renderPlan(); };

  const baseRender = app.render;
  app.render = function(...args) {
    const result = baseRender.apply(this,args);
    renderFinance();
    return result;
  };

  app.renderUpcomingCosts = function() {
    const container = this.$('upcomingCosts');
    if (!container) return;
    const next = nextPendingOccurrence();
    container.innerHTML = next
      ? `<div class="pt-4 border-t border-slate-100"><span class="label-micro !text-vetta-900">Próximo vencimento</span><div class="flex justify-between text-xs py-2"><span>${this.escape(next.name)}</span><strong>${occurrenceLabel(next)}</strong></div></div>`
      : '<p class="text-[10px] text-slate-400">Adicione o vencimento de uma conta para o FARO acompanhar.</p>';
  };

  renderFinance();
  window.FaroFinance = { occurrences, nextPendingOccurrence, markPaid, undoPaid, refresh:renderFinance };
})();