(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroReserves) return;
  const $ = id => document.getElementById(id);

  let changed = false;
  if (!Array.isArray(app.state.reserveContributions)) { app.state.reserveContributions = []; changed = true; }
  if (!app.state.reserveProfiles || typeof app.state.reserveProfiles !== 'object' || Array.isArray(app.state.reserveProfiles)) { app.state.reserveProfiles = {}; changed = true; }
  if (changed) app.save();

  const reserveRules = () => (app.state.costs || []).filter(cost => cost?.active !== false && cost?.category === 'reserve');
  const contributionsFor = reserveId => app.state.reserveContributions.filter(item => item.reserveId === reserveId).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const balanceFor = reserveId => contributionsFor(reserveId).reduce((sum,item) => sum + app.number(item.amount),0);
  const profileFor = reserveId => app.state.reserveProfiles[reserveId] || {};

  const settings = $('view-settings');
  if (!settings) return;

  if (!$('faroReserveCenter')) {
    const center = document.createElement('section');
    center.id = 'faroReserveCenter';
    center.className = 'card-vetta p-6';
    center.innerHTML = `
      <div class="flex justify-between items-start gap-3"><div><span class="label-micro !text-emerald-700">Reservas</span><h3 class="text-lg font-extrabold">Dinheiro que você realmente separou</h3><p class="text-xs text-slate-500 mt-1">Planejar uma reserva entra na meta. O saldo abaixo só aumenta quando você registra um aporte real.</p></div><i class="fas fa-piggy-bank text-emerald-600 text-xl" aria-hidden="true"></i></div>
      <div id="faroReserveList" class="space-y-3 mt-5"></div>
      <button id="faroCreateReserve" type="button" class="w-full mt-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-extrabold">+ CRIAR UMA RESERVA</button>`;
    const payment = $('faroPaymentCenter');
    if (payment) payment.insertAdjacentElement('afterend', center);
    else settings.insertBefore(center, settings.children[1] || null);
  }

  if (!$('faroReserveModal')) {
    const modal = document.createElement('div');
    modal.id = 'faroReserveModal';
    modal.className = 'modal-backdrop hidden';
    modal.innerHTML = `
      <div class="modal-sheet">
        <div class="flex justify-between items-start gap-3"><div><span class="label-micro !text-emerald-700">Reserva</span><h3 id="faroReserveModalTitle" class="text-xl font-extrabold">Registrar aporte</h3></div><button id="faroReserveClose" type="button" class="w-11 h-11 rounded-full bg-slate-100" aria-label="Fechar"><i class="fas fa-xmark"></i></button></div>
        <input id="faroReserveId" type="hidden">
        <div id="faroContributionFields" class="space-y-4 mt-5">
          <div><label class="label-micro">Quanto você guardou de verdade?</label><div class="input-wrapper"><span>R$</span><input id="faroContributionAmount" type="number" min="0" step="10" inputmode="decimal" class="input-vetta faro-money" placeholder="200"></div><div class="faro-chips grid grid-cols-3 gap-2 mt-2"><button type="button" data-reserve-add="50" class="faro-chip">+ R$50</button><button type="button" data-reserve-add="100" class="faro-chip">+ R$100</button><button type="button" data-reserve-add="200" class="faro-chip">+ R$200</button></div></div>
          <div><label class="label-micro">Data do aporte</label><input id="faroContributionDate" type="date" class="input-vetta no-mask"></div>
        </div>
        <div id="faroGoalFields" class="hidden space-y-4 mt-5">
          <div><label class="label-micro">Quanto quer juntar? (opcional)</label><div class="input-wrapper"><span>R$</span><input id="faroReserveGoalAmount" type="number" min="0" step="50" inputmode="decimal" class="input-vetta faro-money" placeholder="2000"></div></div>
          <div><label class="label-micro">Até quando? (opcional)</label><input id="faroReserveGoalDate" type="date" class="input-vetta no-mask"></div>
        </div>
        <button id="faroReserveSave" type="button" class="w-full mt-5 py-4 rounded-2xl bg-emerald-600 text-white font-extrabold">SALVAR APORTE</button>
      </div>`;
    document.body.appendChild(modal);
  }

  const closeModal = () => $('faroReserveModal').classList.add('hidden');
  const openContribution = reserveId => {
    const reserve = reserveRules().find(item => item.id === reserveId);
    if (!reserve) return;
    $('faroReserveId').value = reserveId;
    $('faroReserveModalTitle').textContent = `Aporte em ${reserve.name}`;
    $('faroContributionFields').classList.remove('hidden');
    $('faroGoalFields').classList.add('hidden');
    $('faroContributionAmount').value = '';
    $('faroContributionDate').value = app.todayKey();
    $('faroReserveSave').textContent = 'SALVAR APORTE';
    $('faroReserveSave').dataset.mode = 'contribution';
    $('faroReserveModal').classList.remove('hidden');
  };

  const openGoal = reserveId => {
    const reserve = reserveRules().find(item => item.id === reserveId);
    if (!reserve) return;
    const profile = profileFor(reserveId);
    $('faroReserveId').value = reserveId;
    $('faroReserveModalTitle').textContent = `Objetivo de ${reserve.name}`;
    $('faroContributionFields').classList.add('hidden');
    $('faroGoalFields').classList.remove('hidden');
    $('faroReserveGoalAmount').value = profile.goalAmount || '';
    $('faroReserveGoalDate').value = profile.targetDate || '';
    $('faroReserveSave').textContent = 'SALVAR OBJETIVO';
    $('faroReserveSave').dataset.mode = 'goal';
    $('faroReserveModal').classList.remove('hidden');
  };

  const saveContribution = reserveId => {
    const amount = app.number($('faroContributionAmount').value);
    const date = $('faroContributionDate').value || app.todayKey();
    if (amount <= 0) return app.toast('Informe quanto você realmente separou.');
    app.state.reserveContributions.push({ id:app.uid('reserve-entry'), reserveId, date, amount, createdAt:new Date().toISOString() });
    app.save(); closeModal(); renderReserves(); app.toast('Aporte registrado na sua reserva.');
  };

  const saveGoal = reserveId => {
    const goalAmount = app.number($('faroReserveGoalAmount').value);
    const targetDate = $('faroReserveGoalDate').value || '';
    app.state.reserveProfiles[reserveId] = { goalAmount:goalAmount > 0 ? goalAmount : null, targetDate:targetDate || null, updatedAt:new Date().toISOString() };
    app.save(); closeModal(); renderReserves(); app.toast('Objetivo da reserva atualizado.');
  };

  const removeContribution = entryId => {
    const entry = app.state.reserveContributions.find(item => item.id === entryId);
    if (!entry) return;
    app.state.reserveContributions = app.state.reserveContributions.filter(item => item.id !== entryId);
    app.save(); renderReserves(); app.toast('Aporte removido. O planejamento da reserva continua igual.');
  };

  const plannedText = reserve => {
    if (reserve.kind === 'monthly') return `${app.money(reserve.value,0)}/mês planejados`;
    if (reserve.kind === 'weekly') return `${app.money(reserve.value,0)}/semana planejados`;
    if (reserve.kind === 'per_km') return `${app.money(reserve.value)}/km planejados`;
    return `${app.money(reserve.value,0)} planejados`;
  };

  const renderReserves = () => {
    const list = $('faroReserveList');
    if (!list) return;
    const reserves = reserveRules();
    if (!reserves.length) {
      list.innerHTML = '<div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500"><strong class="block text-slate-700">Nenhuma reserva criada ainda</strong><span class="text-xs block mt-1">Você pode começar por manutenção, pneus, IPVA, emergência ou outro objetivo seu.</span></div>';
      return;
    }
    list.innerHTML = reserves.map(reserve => {
      const balance = balanceFor(reserve.id);
      const profile = profileFor(reserve.id);
      const goal = app.number(profile.goalAmount);
      const progress = goal > 0 ? Math.min(100, Math.max(0, balance / goal * 100)) : null;
      const recent = contributionsFor(reserve.id).slice(0,3);
      return `<article class="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
        <div class="flex justify-between gap-3"><div class="min-w-0"><strong class="block text-sm truncate">${app.escape(reserve.name)}</strong><span class="text-xs text-slate-500">${plannedText(reserve)}</span></div><strong class="text-emerald-700">${app.money(balance,0)}</strong></div>
        ${goal > 0 ? `<div class="mt-3"><div class="flex justify-between text-[10px] font-bold text-slate-500"><span>Meta ${app.money(goal,0)}</span><span>${Math.round(progress)}%</span></div><div class="progress-track mt-2"><div class="progress-fill" style="width:${progress}%"></div></div>${profile.targetDate ? `<span class="text-[10px] text-slate-500 block mt-2">Data-alvo: ${app.parseDate(profile.targetDate).toLocaleDateString('pt-BR')}</span>` : ''}</div>` : '<p class="text-[10px] text-slate-500 mt-2">Sem meta total definida. O saldo continua sendo acompanhado normalmente.</p>'}
        <div class="grid grid-cols-2 gap-2 mt-3"><button type="button" data-reserve-contribute="${reserve.id}" class="rounded-xl bg-emerald-600 text-white text-[10px] font-extrabold">+ REGISTRAR APORTE</button><button type="button" data-reserve-goal="${reserve.id}" class="rounded-xl bg-white text-emerald-700 border border-emerald-100 text-[10px] font-extrabold">DEFINIR META</button></div>
        ${recent.length ? `<details class="mt-3"><summary class="text-[10px] font-extrabold text-slate-500 cursor-pointer">ÚLTIMOS APORTES</summary><div class="mt-2 space-y-2">${recent.map(entry => `<div class="flex justify-between items-center gap-2 text-xs bg-white rounded-xl px-3 py-2"><span>${app.parseDate(entry.date).toLocaleDateString('pt-BR')} · ${app.money(entry.amount,0)}</span><button type="button" data-reserve-remove-entry="${entry.id}" class="min-h-[36px] px-2 text-red-500 text-[10px] font-extrabold">REMOVER</button></div>`).join('')}</div></details>` : ''}
      </article>`;
    }).join('');
  };

  $('faroCreateReserve').addEventListener('click', () => {
    app.openCostModal();
    app.applyCostTemplate?.('reserve');
    if ($('costTemplate')) $('costTemplate').value = 'reserve';
    if ($('costName')) $('costName').placeholder = 'Ex.: Pneus, IPVA ou emergência';
  });
  $('faroReserveClose').addEventListener('click', closeModal);
  $('faroReserveSave').addEventListener('click', () => {
    const reserveId = $('faroReserveId').value;
    if ($('faroReserveSave').dataset.mode === 'goal') saveGoal(reserveId);
    else saveContribution(reserveId);
  });
  document.querySelectorAll('[data-reserve-add]').forEach(button => button.addEventListener('click', () => {
    $('faroContributionAmount').value = String(app.number($('faroContributionAmount').value) + Number(button.dataset.reserveAdd));
  }));
  $('faroReserveCenter').addEventListener('click', event => {
    const contribution = event.target.closest('[data-reserve-contribute]');
    const goal = event.target.closest('[data-reserve-goal]');
    const remove = event.target.closest('[data-reserve-remove-entry]');
    if (contribution) openContribution(contribution.dataset.reserveContribute);
    if (goal) openGoal(goal.dataset.reserveGoal);
    if (remove) removeContribution(remove.dataset.reserveRemoveEntry);
  });

  const baseRender = app.render;
  app.render = function(...args) {
    const result = baseRender.apply(this,args);
    renderReserves();
    return result;
  };

  renderReserves();
  window.FaroReserves = { balanceFor, contributionsFor, render:renderReserves };
})();
