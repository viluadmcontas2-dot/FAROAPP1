(() => {
  const app = window.__vettaApp;
  const planning = document.getElementById('view-planning');
  const settings = document.getElementById('view-settings');
  const dashboard = document.getElementById('view-dashboard');
  if (!app || !planning || !settings || !dashboard || window.FaroPlanning) return;

  const $ = id => document.getElementById(id);
  const monthLabel = () => new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const clampTarget = value => Math.max(500, Math.min(50000, Math.round(app.number(value) / 100) * 100));
  const energyPresets = {
    gnv: { label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 },
    gasoline: { label: 'Gasolina', unit: 'L', price: 6.19, efficiency: 10.5 },
    ethanol: { label: 'Etanol', unit: 'L', price: 4.29, efficiency: 7.4 },
    diesel: { label: 'Diesel', unit: 'L', price: 6.09, efficiency: 11.5 },
    electric: { label: 'Elétrico', unit: 'kWh', price: 0, efficiency: 0 },
    custom: { label: 'Personalizado', unit: 'un.', price: 5, efficiency: 10 }
  };

  const injectStyles = () => {
    if ($('faroPlanningStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroPlanningStyles';
    style.textContent = `
      #view-planning{gap:18px!important}
      .faro-plan-top{padding:2px 2px 0}
      .faro-plan-month{text-transform:capitalize;color:#64748b;font-size:12px;font-weight:800}
      .faro-plan-title{font-size:28px;line-height:1.05;font-weight:900;letter-spacing:-.035em;color:#0f172a}
      .faro-plan-target{border:1px solid #dbeafe;background:linear-gradient(180deg,#fff,#f8fbff);border-radius:24px;padding:20px}
      .faro-plan-target-value{font-size:36px;line-height:1;font-weight:900;letter-spacing:-.045em;color:#0f172a}
      .faro-plan-slider{width:100%;min-height:44px;accent-color:#2563eb}
      .faro-plan-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .faro-plan-preview>div{background:#f8fafc;border-radius:14px;padding:11px 9px;min-width:0}
      .faro-plan-preview span{display:block;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8}
      .faro-plan-preview strong{display:block;margin-top:3px;font-size:12px;color:#334155;overflow:hidden;text-overflow:ellipsis}
      .faro-plan-actions{display:grid;grid-template-columns:1fr 1.25fr;gap:10px}
      .faro-plan-actions button{min-height:48px;border-radius:16px;font-size:12px;font-weight:900}
      .faro-plan-entry{display:flex;width:100%;min-height:72px;align-items:center;gap:12px;padding:14px 15px;border-radius:18px;border:1px solid #e2e8f0;background:#fff;text-align:left}
      .faro-plan-entry>span:first-child{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#eff6ff;color:#2563eb;flex:0 0 auto}
      .faro-plan-entry .grow{min-width:0;flex:1}
      .faro-plan-entry strong{display:block;font-size:14px;color:#0f172a}
      .faro-plan-entry small{display:block;margin-top:3px;color:#64748b;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .faro-plan-details{border:1px solid #e2e8f0;border-radius:20px;background:#fff;overflow:hidden}
      .faro-plan-details>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:14px 16px;cursor:pointer;font-size:13px;font-weight:900;color:#334155}
      .faro-plan-details>summary::-webkit-details-marker{display:none}
      .faro-plan-details>summary::after{content:'+';width:30px;height:30px;border-radius:12px;background:#f1f5f9;display:grid;place-items:center;color:#2563eb;font-size:18px}
      .faro-plan-details[open]>summary::after{content:'−'}
      .faro-plan-details .card-vetta{box-shadow:none;border:0;border-top:1px solid #f1f5f9;border-radius:0;margin:0}
      .faro-subview-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
      .faro-subview-back{width:46px;height:46px;border-radius:16px;background:#f1f5f9;color:#334155;display:grid;place-items:center;flex:0 0 auto}
      .faro-subview-title{font-size:23px;font-weight:900;letter-spacing:-.03em;color:#0f172a}
      .faro-week-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
      .faro-week-day{min-height:44px;border-radius:12px;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:900}
      .faro-week-day.active{background:#2563eb;color:#fff}
      .faro-field{display:grid;gap:6px}.faro-field label{font-size:10px;font-weight:900;text-transform:uppercase;color:#64748b;letter-spacing:.04em}
      .faro-field input,.faro-field select{width:100%;min-height:48px;border:1px solid #e2e8f0;border-radius:14px;padding:0 13px;background:#fff;color:#0f172a;font-weight:700}
      .faro-context-note{border-radius:16px;background:#eff6ff;color:#1d4ed8;padding:13px 14px;font-size:12px;line-height:1.45}
      .faro-context-actions{display:grid;grid-template-columns:1fr 1.35fr;gap:10px;margin-top:18px}.faro-context-actions button{min-height:50px;border-radius:16px;font-size:12px;font-weight:900}
      #view-settings{display:none!important}
      @media(max-width:380px){.faro-plan-preview{grid-template-columns:1fr 1fr}.faro-plan-preview>div:last-child{grid-column:1/-1}.faro-week-grid{gap:3px}.faro-week-day{font-size:9px}}
      @media(prefers-reduced-motion:reduce){#view-planning *,[id^="view-planning-"] *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  };
  injectStyles();

  const navPlanning = [...document.querySelectorAll('.nav-item[data-view]')].find(item => item.dataset.view === 'settings' || item.dataset.view === 'planning');
  if (navPlanning) {
    navPlanning.dataset.view = 'planning';
    navPlanning.dataset.faroTour = 'planning';
    navPlanning.setAttribute('aria-label', 'Planejar');
    const label = navPlanning.querySelector('span');
    if (label) label.textContent = 'Planejar';
  }

  const dashboardHero = dashboard.firstElementChild;
  if (dashboardHero) dashboardHero.dataset.faroTour = 'today';
  const navRegister = document.querySelector('.nav-item[data-view="day"]');
  const navHistory = document.querySelector('.nav-item[data-view="history"]');
  const navCentral = document.querySelector('.nav-item[data-view="more"]');
  if (navRegister) navRegister.dataset.faroTour = 'register';
  if (navHistory) navHistory.dataset.faroTour = 'history';
  if (navCentral) navCentral.dataset.faroTour = 'central';

  const targetCard = $('targetProfitDisplay')?.closest('.card-vetta');
  const dreCard = $('dreGross')?.closest('.card-vetta');
  if (!targetCard || !dreCard) return;

  const oldSlider = targetCard.querySelector('input[data-model="targetProfit"][type="range"]');
  const slider = oldSlider?.cloneNode(true);
  if (oldSlider && slider) oldSlider.replaceWith(slider);
  const oldDaysGroup = targetCard.querySelector('[data-days]')?.parentElement;
  if (oldDaysGroup) oldDaysGroup.remove();

  targetCard.id = 'faroPlanningTargetCard';
  targetCard.className = 'faro-plan-target';
  targetCard.dataset.faroTour = 'planning-target';
  const targetHeading = $('targetProfitDisplay')?.parentElement;
  if (targetHeading) {
    targetHeading.querySelector('.label-micro')?.replaceChildren(document.createTextNode('Quero que sobre'));
    $('targetProfitDisplay').className = 'faro-plan-target-value tabular';
  }
  $('extraDaysOffBadge')?.parentElement?.remove();

  const exactWrap = document.createElement('div');
  exactWrap.className = 'grid grid-cols-[1fr_auto] gap-2 items-end mt-4';
  exactWrap.innerHTML = `<div class="faro-field"><label for="faroTargetExact">Valor exato</label><div class="input-wrapper"><span>R$</span><input id="faroTargetExact" type="number" min="500" max="50000" step="100" inputmode="numeric" class="input-vetta faro-money"></div></div><button id="faroTargetResetDraft" type="button" class="min-h-[48px] px-3 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-extrabold">DESFAZER</button>`;
  slider?.insertAdjacentElement('afterend', exactWrap);
  if (slider) {
    slider.id = 'faroTargetSlider';
    slider.className = 'faro-plan-slider';
    slider.removeAttribute('data-model');
  }

  const preview = document.createElement('div');
  preview.id = 'faroTargetPreview';
  preview.className = 'faro-plan-preview mt-4';
  preview.innerHTML = `<div><span>Dias planejados</span><strong id="faroPreviewDays">—</strong></div><div><span>Precisa por dia</span><strong id="faroPreviewDaily">—</strong></div><div><span>Km por dia</span><strong id="faroPreviewKm">—</strong></div>`;
  exactWrap.insertAdjacentElement('afterend', preview);

  const targetActions = document.createElement('div');
  targetActions.id = 'faroTargetActions';
  targetActions.className = 'faro-plan-actions mt-4 hidden';
  targetActions.innerHTML = `<button id="faroTargetCancel" type="button" class="bg-slate-100 text-slate-600">CANCELAR</button><button id="faroTargetApply" type="button" class="bg-blue-600 text-white">APLICAR MUDANÇA</button>`;
  preview.insertAdjacentElement('afterend', targetActions);

  const root = document.createElement('div');
  root.id = 'faroPlanningRoot';
  root.className = 'space-y-4';
  root.innerHTML = `
    <div class="faro-plan-top" data-faro-tour="planning-head">
      <span class="faro-plan-month" id="faroPlanningMonth"></span>
      <h2 class="faro-plan-title mt-1">Planejar</h2>
      <p class="text-xs text-slate-500 mt-2">Ajuste o que muda sua rota. O resto fica fora do caminho.</p>
    </div>`;
  root.appendChild(targetCard);

  const entries = document.createElement('section');
  entries.className = 'space-y-2';
  entries.innerHTML = `
    <div class="px-1 pt-1"><span class="label-micro !text-vetta-900">Organize seu plano</span></div>
    <button id="faroOpenDays" type="button" class="faro-plan-entry"><span><i class="fas fa-calendar-days"></i></span><span class="grow"><strong>Dias e folgas</strong><small id="faroDaysSummary"></small></span><i class="fas fa-chevron-right text-slate-300"></i></button>
    <button id="faroOpenOperation" type="button" class="faro-plan-entry"><span><i class="fas fa-gas-pump"></i></span><span class="grow"><strong>Operação</strong><small id="faroOperationSummary"></small></span><i class="fas fa-chevron-right text-slate-300"></i></button>
    <button id="faroOpenCosts" type="button" class="faro-plan-entry"><span><i class="fas fa-wallet"></i></span><span class="grow"><strong>Contas e reservas</strong><small id="faroCostsSummary"></small></span><i class="fas fa-chevron-right text-slate-300"></i></button>`;
  root.appendChild(entries);

  const dreDetails = document.createElement('details');
  dreDetails.id = 'faroDreDetails';
  dreDetails.className = 'faro-plan-details';
  dreDetails.innerHTML = '<summary>Como o FARO chegou nesse valor?</summary>';
  dreDetails.appendChild(dreCard);
  root.appendChild(dreDetails);

  planning.replaceChildren(root);

  const main = planning.parentElement;
  const createSubview = (id, title, subtitle) => {
    let view = $(`view-${id}`);
    if (view) return view;
    view = document.createElement('section');
    view.id = `view-${id}`;
    view.className = 'view-section hidden space-y-4 animate-enter';
    view.innerHTML = `<div class="faro-subview-head"><button type="button" class="faro-subview-back" data-faro-back aria-label="Voltar"><i class="fas fa-arrow-left"></i></button><div><span class="label-micro !text-blue-600">Planejar</span><h2 class="faro-subview-title">${title}</h2><p class="text-xs text-slate-500 mt-1">${subtitle}</p></div></div>`;
    main.insertBefore(view, planning.nextSibling);
    view.querySelector('[data-faro-back]').addEventListener('click', () => app.navigateBack());
    return view;
  };

  const daysView = createSubview('planning-days', 'Dias e folgas', 'Defina quando pretende rodar e veja o efeito no mês.');
  daysView.insertAdjacentHTML('beforeend', `<section class="card-vetta p-5"><div class="faro-week-grid" id="faroDraftWeekdays"></div><div class="faro-field mt-5"><label for="faroDraftDaysOff">Folgas extras neste mês</label><input id="faroDraftDaysOff" type="number" min="0" max="20" inputmode="numeric"></div><div id="faroDaysConsequence" class="faro-context-note mt-4"></div><div class="faro-context-actions"><button id="faroDaysCancel" type="button" class="bg-slate-100 text-slate-600">CANCELAR</button><button id="faroDaysApply" type="button" class="bg-blue-600 text-white">APLICAR</button></div></section>`);

  const operationView = createSubview('planning-operation', 'Operação', 'Combustível, custo de energia e sua receita média por km.');
  operationView.insertAdjacentHTML('beforeend', `<section class="card-vetta p-5 space-y-4"><div class="faro-field"><label for="faroDraftFuelType">Energia</label><select id="faroDraftFuelType"><option value="gnv">GNV</option><option value="gasoline">Gasolina</option><option value="ethanol">Etanol</option><option value="diesel">Diesel</option><option value="electric">Elétrico</option><option value="custom">Personalizado</option></select></div><div class="grid grid-cols-2 gap-3"><div class="faro-field"><label for="faroDraftFuelPrice">Preço por unidade</label><input id="faroDraftFuelPrice" type="number" min="0" step=".01" inputmode="decimal"></div><div class="faro-field"><label for="faroDraftFuelEfficiency">Rendimento km/un.</label><input id="faroDraftFuelEfficiency" type="number" min="0" step=".1" inputmode="decimal"></div></div><div class="faro-field"><label for="faroDraftRevenueKm">Receita média por km</label><input id="faroDraftRevenueKm" type="number" min="0" step=".01" inputmode="decimal"></div><div id="faroOperationConsequence" class="faro-context-note"></div><div class="faro-context-actions"><button id="faroOperationCancel" type="button" class="bg-slate-100 text-slate-600">CANCELAR</button><button id="faroOperationApply" type="button" class="bg-blue-600 text-white">APLICAR</button></div></section>`);

  const costsView = createSubview('planning-costs', 'Contas e reservas', 'O que precisa sair do mês e o que você quer separar.');
  const costsIntro = document.createElement('div');
  costsIntro.id = 'faroCostsContext';
  costsIntro.className = 'faro-context-note';
  costsView.appendChild(costsIntro);
  const costCard = $('costList')?.closest('.card-vetta');
  const paymentCenter = $('faroPaymentCenter');
  const reserveCenter = $('faroReserveCenter');
  [paymentCenter, reserveCenter, costCard].filter(Boolean).forEach(node => costsView.appendChild(node));

  const legacyLearning = $('learningCard');
  if (legacyLearning) legacyLearning.classList.add('hidden');

  let targetDraft = app.state.targetProfit;
  let dayDraft = { weekdays: [...app.state.workWeekdays], extraDaysOff: app.state.extraDaysOff };
  let operationDraft = { fuel: { ...app.state.fuel }, revenueKm: app.state.revenueKm };

  const calculationsWith = overrides => {
    const saved = {
      targetProfit: app.state.targetProfit,
      workWeekdays: app.state.workWeekdays,
      extraDaysOff: app.state.extraDaysOff,
      revenueKm: app.state.revenueKm,
      fuel: app.state.fuel
    };
    try {
      if ('targetProfit' in overrides) app.state.targetProfit = overrides.targetProfit;
      if ('workWeekdays' in overrides) app.state.workWeekdays = overrides.workWeekdays;
      if ('extraDaysOff' in overrides) app.state.extraDaysOff = overrides.extraDaysOff;
      if ('revenueKm' in overrides) app.state.revenueKm = overrides.revenueKm;
      if ('fuel' in overrides) app.state.fuel = overrides.fuel;
      return app.calculations();
    } finally {
      app.state.targetProfit = saved.targetProfit;
      app.state.workWeekdays = saved.workWeekdays;
      app.state.extraDaysOff = saved.extraDaysOff;
      app.state.revenueKm = saved.revenueKm;
      app.state.fuel = saved.fuel;
    }
  };

  const renderTargetDraft = () => {
    const saved = app.state.targetProfit;
    const dirty = targetDraft !== saved;
    if (slider) slider.value = String(Math.min(20000, Math.max(500, targetDraft)));
    $('faroTargetExact').value = String(targetDraft);
    $('targetProfitDisplay').textContent = app.money(targetDraft, 0);
    const c = calculationsWith({ targetProfit: targetDraft });
    $('faroPreviewDays').textContent = `${c.ctx.plannedDays} dias`;
    $('faroPreviewDaily').textContent = `${app.money(c.dailyGross, 0)}/dia`;
    $('faroPreviewKm').textContent = `~${app.integer(c.dailyKm)} km`;
    targetActions.classList.toggle('hidden', !dirty);
  };

  const resetTargetDraft = () => { targetDraft = app.state.targetProfit; renderTargetDraft(); };
  slider?.addEventListener('input', event => { targetDraft = clampTarget(event.currentTarget.value); renderTargetDraft(); });
  $('faroTargetExact').addEventListener('input', event => { targetDraft = clampTarget(event.currentTarget.value); renderTargetDraft(); });
  $('faroTargetResetDraft').addEventListener('click', resetTargetDraft);
  $('faroTargetCancel').addEventListener('click', resetTargetDraft);
  $('faroTargetApply').addEventListener('click', () => {
    if (targetDraft === app.state.targetProfit) return;
    app.state.targetProfit = targetDraft;
    app.save();
    app.syncInputs();
    app.render();
    app.toast('Plano atualizado.');
    renderPlanning();
  });

  const WEEK = [{day:1,label:'SEG'},{day:2,label:'TER'},{day:3,label:'QUA'},{day:4,label:'QUI'},{day:5,label:'SEX'},{day:6,label:'SÁB'},{day:0,label:'DOM'}];
  $('faroDraftWeekdays').innerHTML = WEEK.map(item => `<button type="button" class="faro-week-day" data-r2-weekday="${item.day}">${item.label}</button>`).join('');

  const renderDaysDraft = () => {
    $('faroDraftDaysOff').value = String(dayDraft.extraDaysOff);
    document.querySelectorAll('[data-r2-weekday]').forEach(button => button.classList.toggle('active', dayDraft.weekdays.includes(Number(button.dataset.r2Weekday))));
    const c = calculationsWith({ workWeekdays: dayDraft.weekdays, extraDaysOff: dayDraft.extraDaysOff });
    $('faroDaysConsequence').textContent = `Com esse calendário: ${c.ctx.plannedDays} dias planejados no mês e cerca de ${app.money(c.dailyGross, 0)} de faturamento por dia.`;
  };
  $('faroDraftWeekdays').addEventListener('click', event => {
    const button = event.target.closest('[data-r2-weekday]');
    if (!button) return;
    const day = Number(button.dataset.r2Weekday);
    const selected = new Set(dayDraft.weekdays);
    if (selected.has(day)) {
      if (selected.size === 1) return app.toast('Escolha pelo menos um dia de trabalho.');
      selected.delete(day);
    } else selected.add(day);
    dayDraft.weekdays = [...selected].sort((a,b) => a-b);
    renderDaysDraft();
  });
  $('faroDraftDaysOff').addEventListener('input', event => { dayDraft.extraDaysOff = Math.max(0, Math.min(20, Math.round(app.number(event.currentTarget.value)))); renderDaysDraft(); });
  $('faroDaysCancel').addEventListener('click', () => { dayDraft = { weekdays:[...app.state.workWeekdays], extraDaysOff:app.state.extraDaysOff }; app.navigateBack(); });
  $('faroDaysApply').addEventListener('click', () => {
    if (!dayDraft.weekdays.length) return app.toast('Escolha pelo menos um dia de trabalho.');
    app.state.workWeekdays = [...dayDraft.weekdays];
    app.state.extraDaysOff = dayDraft.extraDaysOff;
    app.save(); app.syncInputs(); app.render(); app.toast('Calendário do plano atualizado.'); app.navigateBack();
  });

  const renderOperationDraft = () => {
    $('faroDraftFuelType').value = operationDraft.fuel.type || 'custom';
    $('faroDraftFuelPrice').value = String(operationDraft.fuel.price ?? '');
    $('faroDraftFuelEfficiency').value = String(operationDraft.fuel.efficiency ?? '');
    $('faroDraftRevenueKm').value = String(operationDraft.revenueKm ?? '');
    const c = calculationsWith({ fuel:operationDraft.fuel, revenueKm:operationDraft.revenueKm });
    $('faroOperationConsequence').textContent = operationDraft.fuel.price > 0 && operationDraft.fuel.efficiency > 0 && operationDraft.revenueKm > 0
      ? `Estimativa atual: ${app.money(c.fuelKm)}/km de energia, cerca de ${app.integer(c.dailyKm)} km e ${app.money(c.dailyGross, 0)} de faturamento por dia.`
      : 'Preencha preço, rendimento e receita/km para manter a projeção útil.';
  };
  $('faroDraftFuelType').addEventListener('change', event => {
    const type = event.currentTarget.value;
    const preset = energyPresets[type] || energyPresets.custom;
    operationDraft.fuel = { type, ...preset };
    renderOperationDraft();
  });
  $('faroDraftFuelPrice').addEventListener('input', event => { operationDraft.fuel.price = app.number(event.currentTarget.value); renderOperationDraft(); });
  $('faroDraftFuelEfficiency').addEventListener('input', event => { operationDraft.fuel.efficiency = app.number(event.currentTarget.value); renderOperationDraft(); });
  $('faroDraftRevenueKm').addEventListener('input', event => { operationDraft.revenueKm = app.number(event.currentTarget.value); renderOperationDraft(); });
  $('faroOperationCancel').addEventListener('click', () => { operationDraft = { fuel:{...app.state.fuel}, revenueKm:app.state.revenueKm }; app.navigateBack(); });
  $('faroOperationApply').addEventListener('click', () => {
    if (operationDraft.fuel.price <= 0 || operationDraft.fuel.efficiency <= 0 || operationDraft.revenueKm <= 0) return app.toast('Informe preço, rendimento e receita por km maiores que zero.');
    app.state.fuel = { ...operationDraft.fuel };
    app.state.revenueKm = operationDraft.revenueKm;
    app.save(); app.syncInputs(); app.render(); app.toast('Operação do plano atualizada.'); app.navigateBack();
  });

  const openSubview = view => app.openSecondary(view);
  $('faroOpenDays').addEventListener('click', () => openSubview('planning-days'));
  $('faroOpenOperation').addEventListener('click', () => openSubview('planning-operation'));
  $('faroOpenCosts').addEventListener('click', () => openSubview('planning-costs'));

  const manageCosts = $('faroManageCosts');
  manageCosts?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openSubview('planning-costs');
  }, true);

  const renderSummaries = () => {
    const c = app.calculations();
    $('faroPlanningMonth').textContent = `Plano de ${monthLabel()}`;
    $('faroDaysSummary').textContent = `${app.state.workWeekdays.length} dias/semana · ${app.state.extraDaysOff} folgas extras · ${c.ctx.plannedDays} dias no mês`;
    $('faroOperationSummary').textContent = `${app.state.fuel.label || 'Energia'} · ${app.money(c.fuelKm)}/km · ${app.money(app.state.revenueKm)}/km de receita`;
    const next = window.FaroFinance?.nextPendingOccurrence?.();
    $('faroCostsSummary').textContent = `${app.money(c.costs.monthlyFixed, 0)}/mês${next ? ` · ${next.days === 0 ? 'vence hoje' : next.days === 1 ? 'próxima amanhã' : next.days > 1 ? `próxima em ${next.days} dias` : 'há vencimento atrasado'}` : ''}`;
    $('faroCostsContext').textContent = `Comprometido no plano: ${app.money(c.costs.monthlyFixed, 0)}/mês. Contas pagas continuam recorrentes quando a regra do custo continua ativa; aportes reais de reserva são separados do valor planejado.`;
  };

  const renderPlanning = () => {
    targetDraft = app.state.targetProfit;
    dayDraft = { weekdays:[...app.state.workWeekdays], extraDaysOff:app.state.extraDaysOff };
    operationDraft = { fuel:{...app.state.fuel}, revenueKm:app.state.revenueKm };
    renderTargetDraft();
    renderDaysDraft();
    renderOperationDraft();
    renderSummaries();
    app.renderCosts?.();
    window.FaroFinance?.render?.();
    window.FaroReserves?.render?.();
  };

  app.renderPlanning = renderPlanning;
  const baseShowView = app.showView;
  app.showView = function(view, primaryView = view) {
    const result = baseShowView.call(this, view, primaryView);
    if (view === 'planning') renderPlanning();
    if (view === 'planning-days') { dayDraft = { weekdays:[...this.state.workWeekdays], extraDaysOff:this.state.extraDaysOff }; renderDaysDraft(); }
    if (view === 'planning-operation') { operationDraft = { fuel:{...this.state.fuel}, revenueKm:this.state.revenueKm }; renderOperationDraft(); }
    if (view === 'planning-costs') { this.renderCosts?.(); window.FaroFinance?.render?.(); window.FaroReserves?.render?.(); renderSummaries(); }
    return result;
  };

  renderPlanning();
  window.FaroPlanning = Object.freeze({
    render: renderPlanning,
    openDays: () => openSubview('planning-days'),
    openOperation: () => openSubview('planning-operation'),
    openCosts: () => openSubview('planning-costs'),
    resetTargetDraft
  });
})();
