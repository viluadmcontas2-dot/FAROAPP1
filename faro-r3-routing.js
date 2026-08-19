(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroR3Routing) return;

  const $ = id => document.getElementById(id);
  const moneyDialog = $('faroMoneyDialog');
  const moneyBody = moneyDialog?.querySelector('[data-faro-dialog-body]');
  const moneyShell = moneyDialog?.querySelector('.faro-dialog-shell');

  const openMoneyFrom = opener => {
    app.navigateToPrimary('planning');
    window.setTimeout(() => window.FaroPlanning?.openMoney?.('bills', opener), 0);
  };

  $('faroHomeAttention')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openMoneyFrom($('faroHomeAttention'));
  }, true);

  $('faroManageCosts')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openMoneyFrom($('faroManageCosts'));
  }, true);

  const installStyles = () => {
    if ($('faroR3B3RoutingStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroR3B3RoutingStyles';
    style.textContent = `
      #faroMoneyDialog .faro-dialog-shell{position:relative;overflow:hidden}
      .faro-r3b3-flow{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;background:#F8FAFC;transform:translateX(0);animation:faroR3B3In .2s cubic-bezier(.16,1,.3,1)}
      .faro-r3b3-flow.hidden{display:none}
      @keyframes faroR3B3In{from{opacity:.55;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
      .faro-r3b3-head{display:flex;align-items:center;gap:12px;padding:16px 18px 12px;background:rgba(248,250,252,.96);border-bottom:1px solid #E2E8F0;backdrop-filter:blur(12px)}
      .faro-r3b3-back{width:42px;height:42px;min-height:42px;border-radius:15px;background:#fff;border:1px solid #E2E8F0;color:#0B1121;display:grid;place-items:center;box-shadow:0 8px 24px -20px rgba(11,17,33,.55)}
      .faro-r3b3-head-copy{min-width:0;flex:1}.faro-r3b3-kicker{display:block;font-size:8.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2563EB}.faro-r3b3-title{margin-top:2px;font-size:18px;line-height:1.15;font-weight:800;letter-spacing:-.03em;color:#0B1121}.faro-r3b3-subtitle{margin-top:3px;font-size:10px;line-height:1.4;font-weight:600;color:#64748B}
      .faro-r3b3-content{flex:1;overflow:auto;padding:16px 18px 24px;overscroll-behavior:contain}.faro-r3b3-card{padding:16px;border-radius:22px;background:#fff;border:1px solid #E2E8F0;box-shadow:0 18px 38px -32px rgba(11,17,33,.5)}
      .faro-r3b3-field{display:grid;gap:7px;margin-top:14px}.faro-r3b3-field:first-child{margin-top:0}.faro-r3b3-field label{font-size:9px;font-weight:800;letter-spacing:.055em;text-transform:uppercase;color:#64748B}.faro-r3b3-field input,.faro-r3b3-field select{width:100%;min-height:48px;border:1px solid #E2E8F0;border-radius:15px;padding:0 14px;background:#F8FAFC;color:#0B1121;font-size:13px;font-weight:700;outline:none}.faro-r3b3-field input:focus,.faro-r3b3-field select:focus{background:#fff;border-color:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,.09)}
      .faro-r3b3-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.faro-r3b3-note{margin-top:12px;padding:11px 12px;border-radius:15px;background:#EFF6FF;color:#475569;font-size:10px;line-height:1.5;font-weight:600}.faro-r3b3-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.faro-r3b3-chip{min-height:36px!important;padding:0 11px;border-radius:999px;background:#ECFDF5;color:#047857;font-size:9px;font-weight:800}
      .faro-r3b3-actions{display:grid;grid-template-columns:.78fr 1.22fr;gap:9px;margin-top:16px}.faro-r3b3-cancel,.faro-r3b3-save{min-height:48px;border-radius:16px;font-size:11px;font-weight:800}.faro-r3b3-cancel{background:#F1F5F9;color:#475569}.faro-r3b3-save{background:#2563EB;color:#fff;box-shadow:0 12px 26px -18px rgba(37,99,235,.75)}.faro-r3b3-save[data-tone="reserve"]{background:#059669;box-shadow:0 12px 26px -18px rgba(5,150,105,.75)}
      @media(max-width:360px){.faro-r3b3-head{padding:13px 14px 10px}.faro-r3b3-content{padding:13px 14px 20px}.faro-r3b3-grid{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){.faro-r3b3-flow{animation:none}}
    `;
    document.head.appendChild(style);
  };

  installStyles();

  const flow = document.createElement('section');
  flow.id = 'faroMoneyInlineFlow';
  flow.className = 'faro-r3b3-flow hidden';
  flow.setAttribute('aria-hidden','true');
  flow.innerHTML = `<header class="faro-r3b3-head"><button id="faroMoneyFlowBack" type="button" class="faro-r3b3-back" aria-label="Voltar para Compromissos"><i class="fas fa-arrow-left"></i></button><div class="faro-r3b3-head-copy"><span id="faroMoneyFlowKicker" class="faro-r3b3-kicker">Compromissos</span><h3 id="faroMoneyFlowTitle" class="faro-r3b3-title"></h3><p id="faroMoneyFlowSubtitle" class="faro-r3b3-subtitle"></p></div></header><div id="faroMoneyFlowContent" class="faro-r3b3-content"></div>`;
  moneyShell?.appendChild(flow);

  let flowState = null;
  let savedScroll = 0;
  const flowOpen = () => flow && !flow.classList.contains('hidden');
  const setValue = (id,value) => { const node = $(id); if (node) node.value = value ?? ''; };
  const val = id => $(id)?.value ?? '';
  const number = id => app.number(val(id));

  const closeFlow = ({restore=true}={}) => {
    if (!flowOpen()) return;
    flow.classList.add('hidden');
    flow.setAttribute('aria-hidden','true');
    flowState = null;
    if (restore && moneyBody) requestAnimationFrame(() => { moneyBody.scrollTop = savedScroll; $('faroMoneyFlowBack')?.blur(); });
    $('faroOpenMoney')?.focus?.({preventScroll:true});
  };

  const dueControls = (kind,cost={}) => {
    if (kind === 'weekly') return `<div class="faro-r3b3-field"><label for="faroFlowDueWeekday">Dia da semana</label><select id="faroFlowDueWeekday"><option value="">Sem dia definido</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option><option value="0">Domingo</option></select></div>`;
    if (kind === 'one_time') return `<div class="faro-r3b3-field"><label for="faroFlowMonth">Mês</label><input id="faroFlowMonth" type="month"></div>`;
    return `<div class="faro-r3b3-field"><label for="faroFlowDueDay">Dia do vencimento</label><input id="faroFlowDueDay" type="number" min="1" max="31" inputmode="numeric" placeholder="Ex.: 15"></div>`;
  };

  const renderBillFlow = cost => {
    const editing = Boolean(cost?.id);
    const kind = ['monthly','weekly','one_time'].includes(cost?.kind) ? cost.kind : 'monthly';
    $('faroMoneyFlowTitle').textContent = editing ? `Editar ${cost.name}` : 'Adicionar uma conta';
    $('faroMoneyFlowSubtitle').textContent = editing ? 'Ajuste sem sair do Radar. A recorrência continua ligada ao seu planejamento.' : 'O FARO passa a reservar esse dinheiro antes de calcular o que realmente sobra.';
    $('faroMoneyFlowContent').innerHTML = `<div class="faro-r3b3-card"><div class="faro-r3b3-field"><label for="faroFlowName">Nome da conta</label><input id="faroFlowName" maxlength="60" placeholder="Ex.: Aluguel, seguro, internet"></div><div class="faro-r3b3-grid"><div class="faro-r3b3-field"><label for="faroFlowValue">Valor</label><input id="faroFlowValue" type="number" min="0" step=".01" inputmode="decimal" placeholder="0,00"></div><div class="faro-r3b3-field"><label for="faroFlowKind">Frequência</label><select id="faroFlowKind"><option value="monthly">Todo mês</option><option value="weekly">Toda semana</option><option value="one_time">Só neste mês</option></select></div></div><div id="faroFlowDueHost">${dueControls(kind,cost)}</div><div class="faro-r3b3-note">Ao salvar, o valor entra no plano imediatamente. Marcar uma ocorrência como paga depois não apaga a recorrência.</div><div class="faro-r3b3-actions"><button type="button" class="faro-r3b3-cancel" data-r3b3-back>Voltar</button><button type="button" class="faro-r3b3-save" data-r3b3-save-bill>${editing ? 'Salvar alterações' : 'Adicionar ao plano'}</button></div></div>`;
    setValue('faroFlowName',cost?.name || ''); setValue('faroFlowValue',cost?.value || ''); setValue('faroFlowKind',kind);
    if (kind === 'monthly') setValue('faroFlowDueDay',cost?.dueDay || '');
    if (kind === 'weekly') setValue('faroFlowDueWeekday',cost?.dueWeekday ?? '');
    if (kind === 'one_time') setValue('faroFlowMonth',cost?.month || new Date().toISOString().slice(0,7));
    $('faroFlowKind')?.addEventListener('change', event => { $('faroFlowDueHost').innerHTML = dueControls(event.currentTarget.value,cost); });
  };

  const renderReserveCreateFlow = () => {
    $('faroMoneyFlowTitle').textContent = 'Criar uma reserva';
    $('faroMoneyFlowSubtitle').textContent = 'Defina como esse dinheiro entra no plano. O saldo protegido só cresce quando você registra um aporte real.';
    $('faroMoneyFlowContent').innerHTML = `<div class="faro-r3b3-card"><div class="faro-r3b3-field"><label for="faroFlowName">Nome da reserva</label><input id="faroFlowName" maxlength="60" placeholder="Ex.: Manutenção, pneus, emergência"></div><div class="faro-r3b3-grid"><div class="faro-r3b3-field"><label for="faroFlowValue">Quanto planejar</label><input id="faroFlowValue" type="number" min="0" step=".01" inputmode="decimal" placeholder="0,00"></div><div class="faro-r3b3-field"><label for="faroFlowKind">Como separar</label><select id="faroFlowKind"><option value="monthly">Por mês</option><option value="weekly">Por semana</option><option value="per_km">Por km rodado</option></select></div></div><div class="faro-r3b3-note">Planejamento e saldo são coisas diferentes: este valor entra na sua meta; o dinheiro protegido aparece somente após um aporte.</div><div class="faro-r3b3-actions"><button type="button" class="faro-r3b3-cancel" data-r3b3-back>Voltar</button><button type="button" class="faro-r3b3-save" data-tone="reserve" data-r3b3-save-reserve>Criar reserva</button></div></div>`;
  };

  const renderContributionFlow = reserve => {
    $('faroMoneyFlowTitle').textContent = `Aportar em ${reserve.name}`;
    $('faroMoneyFlowSubtitle').textContent = `Hoje há ${app.money(window.FaroReserves?.balanceFor?.(reserve.id) || 0,0)} realmente protegidos nesta reserva.`;
    $('faroMoneyFlowContent').innerHTML = `<div class="faro-r3b3-card"><div class="faro-r3b3-field"><label for="faroFlowContribution">Quanto você guardou de verdade?</label><input id="faroFlowContribution" type="number" min="0" step="10" inputmode="decimal" placeholder="200"></div><div class="faro-r3b3-chips"><button type="button" class="faro-r3b3-chip" data-r3b3-add="50">+ R$50</button><button type="button" class="faro-r3b3-chip" data-r3b3-add="100">+ R$100</button><button type="button" class="faro-r3b3-chip" data-r3b3-add="200">+ R$200</button></div><div class="faro-r3b3-field"><label for="faroFlowContributionDate">Data do aporte</label><input id="faroFlowContributionDate" type="date" value="${app.todayKey()}"></div><div class="faro-r3b3-note">Esse valor aumenta o dinheiro protegido. Ele não cria uma nova despesa no seu plano.</div><div class="faro-r3b3-actions"><button type="button" class="faro-r3b3-cancel" data-r3b3-back>Voltar</button><button type="button" class="faro-r3b3-save" data-tone="reserve" data-r3b3-save-contribution>Proteger este valor</button></div></div>`;
  };

  const renderGoalFlow = reserve => {
    const profile = app.state.reserveProfiles?.[reserve.id] || {};
    $('faroMoneyFlowTitle').textContent = `Objetivo de ${reserve.name}`;
    $('faroMoneyFlowSubtitle').textContent = 'O objetivo serve como referência de progresso; não altera o saldo que você realmente guardou.';
    $('faroMoneyFlowContent').innerHTML = `<div class="faro-r3b3-card"><div class="faro-r3b3-field"><label for="faroFlowGoal">Quanto quer proteger?</label><input id="faroFlowGoal" type="number" min="0" step="50" inputmode="decimal" placeholder="2000"></div><div class="faro-r3b3-field"><label for="faroFlowGoalDate">Até quando? <span style="text-transform:none;font-weight:600">(opcional)</span></label><input id="faroFlowGoalDate" type="date"></div><div class="faro-r3b3-actions"><button type="button" class="faro-r3b3-cancel" data-r3b3-back>Voltar</button><button type="button" class="faro-r3b3-save" data-tone="reserve" data-r3b3-save-goal>Salvar objetivo</button></div></div>`;
    setValue('faroFlowGoal',profile.goalAmount || ''); setValue('faroFlowGoalDate',profile.targetDate || '');
  };

  const openFlow = state => {
    if (!moneyDialog || !flow) return;
    savedScroll = moneyBody?.scrollTop || 0;
    flowState = state;
    $('faroMoneyFlowKicker').textContent = state.kind === 'bill' ? 'Contas' : 'Reservas';
    if (state.kind === 'bill') renderBillFlow(state.cost || null);
    if (state.kind === 'reserve-create') renderReserveCreateFlow();
    if (state.kind === 'contribution') renderContributionFlow(state.reserve);
    if (state.kind === 'goal') renderGoalFlow(state.reserve);
    flow.classList.remove('hidden'); flow.setAttribute('aria-hidden','false');
    requestAnimationFrame(() => flow.querySelector('input,select,button')?.focus({preventScroll:true}));
  };

  const saveCostThroughCanonicalWriter = ({category,id=''}) => {
    const name = val('faroFlowName').trim(); const value = number('faroFlowValue'); const kind = val('faroFlowKind');
    if (!name || value <= 0) return app.toast('Informe um nome e um valor maior que zero.');
    setValue('costId',id); setValue('costName',name); setValue('costCategory',category); setValue('costKind',kind); setValue('costValue',value);
    setValue('costDueDay',kind === 'monthly' ? val('faroFlowDueDay') : ''); setValue('costDueWeekday',kind === 'weekly' ? val('faroFlowDueWeekday') : ''); setValue('costMonth',kind === 'one_time' ? val('faroFlowMonth') : '');
    app.syncCostModal?.(); app.saveCost(); closeFlow({restore:false}); window.FaroPlanning?.refreshMoney?.(); window.FaroR3B?.renderMoneyWorkspace?.();
  };

  const saveContributionThroughCanonicalWriter = reserveId => {
    const amount = number('faroFlowContribution'); if (amount <= 0) return app.toast('Informe quanto você realmente separou.');
    setValue('faroReserveId',reserveId); setValue('faroContributionAmount',amount); setValue('faroContributionDate',val('faroFlowContributionDate') || app.todayKey());
    const save = $('faroReserveSave'); if (!save) return app.toast('Não foi possível acessar a reserva.'); save.dataset.mode = 'contribution'; save.click(); closeFlow({restore:false}); window.FaroPlanning?.refreshMoney?.(); window.FaroR3B?.renderMoneyWorkspace?.();
  };

  const saveGoalThroughCanonicalWriter = reserveId => {
    setValue('faroReserveId',reserveId); setValue('faroReserveGoalAmount',number('faroFlowGoal')); setValue('faroReserveGoalDate',val('faroFlowGoalDate'));
    const save = $('faroReserveSave'); if (!save) return app.toast('Não foi possível acessar a reserva.'); save.dataset.mode = 'goal'; save.click(); closeFlow({restore:false}); window.FaroPlanning?.refreshMoney?.(); window.FaroR3B?.renderMoneyWorkspace?.();
  };

  window.addEventListener('click', event => {
    if (!moneyDialog?.open) return;
    if (flowOpen()) {
      if (event.target.closest('#faroMoneyFlowBack,[data-r3b3-back],.faro-dialog-close')) { event.preventDefault(); event.stopImmediatePropagation(); return closeFlow(); }
      const chip = event.target.closest('[data-r3b3-add]'); if (chip) { event.preventDefault(); const input = $('faroFlowContribution'); if (input) input.value = String(app.number(input.value)+Number(chip.dataset.r3b3Add)); return; }
      if (event.target.closest('[data-r3b3-save-bill]')) { event.preventDefault(); event.stopImmediatePropagation(); return saveCostThroughCanonicalWriter({category:'obligation',id:flowState?.cost?.id || ''}); }
      if (event.target.closest('[data-r3b3-save-reserve]')) { event.preventDefault(); event.stopImmediatePropagation(); return saveCostThroughCanonicalWriter({category:'reserve'}); }
      if (event.target.closest('[data-r3b3-save-contribution]')) { event.preventDefault(); event.stopImmediatePropagation(); return saveContributionThroughCanonicalWriter(flowState?.reserve?.id || ''); }
      if (event.target.closest('[data-r3b3-save-goal]')) { event.preventDefault(); event.stopImmediatePropagation(); return saveGoalThroughCanonicalWriter(flowState?.reserve?.id || ''); }
      return;
    }

    const addBill = event.target.closest('#faroMoneyAddBill');
    const createReserve = event.target.closest('#faroMoneyCreateReserve');
    const edit = event.target.closest('[data-r3b2-edit-cost]');
    const contribute = event.target.closest('[data-r3-reserve-contribute]');
    const goal = event.target.closest('[data-r3-reserve-goal]');
    const undoRadar = event.target.closest('.faro-r3b2-undo-bar [data-r3-undo]');
    if (undoRadar) { event.preventDefault(); event.stopImmediatePropagation(); return window.FaroFinance?.undoPaid?.(undoRadar.dataset.r3Undo); }
    if (!addBill && !createReserve && !edit && !contribute && !goal) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (addBill) return openFlow({kind:'bill'});
    if (createReserve) return openFlow({kind:'reserve-create'});
    if (edit) { const cost = (app.state.costs || []).find(item => item.id === edit.dataset.r3b2EditCost); if (cost) return openFlow({kind:'bill',cost}); return; }
    const reserveId = contribute?.dataset.r3ReserveContribute || goal?.dataset.r3ReserveGoal;
    const reserve = (app.state.costs || []).find(item => item.id === reserveId && item.category === 'reserve');
    if (!reserve) return;
    if (contribute) return openFlow({kind:'contribution',reserve});
    if (goal) return openFlow({kind:'goal',reserve});
  }, true);

  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !flowOpen()) return;
    event.preventDefault(); event.stopImmediatePropagation(); closeFlow();
  }, true);

  window.FaroR3Routing = Object.freeze({ openMoneyFrom, openFlow, closeFlow, mode:'single-workspace-depth' });
})();
