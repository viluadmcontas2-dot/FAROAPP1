(() => {
  const app = window.__vettaApp;
  const planning = document.getElementById('view-planning');
  const settings = document.getElementById('view-settings');
  const dashboard = document.getElementById('view-dashboard');
  const interactions = window.FaroInteractions;
  if (!app || !planning || !settings || !dashboard || !interactions || window.FaroPlanning) return;

  const $ = id => document.getElementById(id);
  const clampTarget = value => Math.max(500, Math.min(50000, Math.round(app.number(value) / 100) * 100));
  const monthLabel = () => new Date().toLocaleDateString('pt-BR', { month:'long' });
  const monthLongLabel = () => new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  const energyPresets = {
    gnv: { label:'GNV', unit:'m³', price:4.79, efficiency:13.2 },
    gasoline: { label:'Gasolina', unit:'L', price:6.19, efficiency:10.5 },
    ethanol: { label:'Etanol', unit:'L', price:4.29, efficiency:7.4 },
    diesel: { label:'Diesel', unit:'L', price:6.09, efficiency:11.5 },
    electric: { label:'Elétrico', unit:'kWh', price:0, efficiency:0 },
    custom: { label:'Personalizado', unit:'un.', price:5, efficiency:10 }
  };

  const injectStyles = () => {
    if ($('faroPlanningStyles')) $('faroPlanningStyles').remove();
    const style = document.createElement('style');
    style.id = 'faroPlanningStyles';
    style.textContent = `
      #view-planning{gap:0!important;padding-bottom:max(24px,env(safe-area-inset-bottom))}
      #view-settings{display:none!important}
      .faro-r3-root{display:grid;gap:12px}
      .faro-r3-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:2px 2px 6px}
      .faro-r3-title{font-size:26px;line-height:1;font-weight:900;letter-spacing:-.04em;color:#0f172a}
      .faro-r3-subtitle{margin-top:6px;color:#64748b;font-size:12px;font-weight:600}
      .faro-r3-month{flex:0 0 auto;padding:8px 11px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:900;text-transform:capitalize;letter-spacing:.04em}
      .faro-r3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .faro-r3-tile{aspect-ratio:1/1;width:100%;border:1px solid #e2e8f0;border-radius:24px;background:#fff;padding:16px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-shadow:0 10px 28px -24px rgba(15,23,42,.3)}
      .faro-r3-tile[data-tone="blue"]{background:linear-gradient(145deg,#fff,#f3f8ff);border-color:#dbeafe}
      .faro-r3-tile[data-tone="emerald"]{background:linear-gradient(145deg,#fff,#f2fbf7);border-color:#d1fae5}
      .faro-r3-tile[data-tone="amber"]{background:linear-gradient(145deg,#fff,#fff9ed);border-color:#fde7bd}
      .faro-r3-icon{width:42px;height:42px;border-radius:15px;display:grid;place-items:center;background:#eff6ff;color:#2563eb;font-size:17px}
      [data-tone="emerald"] .faro-r3-icon{background:#ecfdf5;color:#059669}
      [data-tone="amber"] .faro-r3-icon{background:#fffbeb;color:#d97706}
      .faro-r3-tile-label{display:block;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      .faro-r3-tile-value{display:block;margin-top:3px;color:#0f172a;font-size:20px;line-height:1.05;font-weight:900;letter-spacing:-.035em}
      .faro-r3-tile-meta{display:block;margin-top:6px;color:#64748b;font-size:11px;line-height:1.3;font-weight:650}
      .faro-r3-arrow{position:absolute;right:14px;top:14px;width:30px;height:30px;border-radius:12px;background:rgba(255,255,255,.72);display:grid;place-items:center;color:#94a3b8;font-size:11px}
      .faro-r3-hero{width:100%;min-height:148px;border:0;border-radius:26px;background:linear-gradient(135deg,#0b1121,#16213b);padding:18px;color:#fff;text-align:left;display:grid;gap:12px;box-shadow:0 18px 45px -28px rgba(15,23,42,.8)}
      .faro-r3-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .faro-r3-hero-label{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd}
      .faro-r3-hero-value{display:block;margin-top:4px;font-size:21px;line-height:1.05;font-weight:900;letter-spacing:-.035em}
      .faro-r3-hero-action{font-size:10px;font-weight:900;color:#bfdbfe;white-space:nowrap}
      .faro-r3-progress{height:7px;border-radius:999px;background:rgba(255,255,255,.13);overflow:hidden}
      .faro-r3-progress>span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#60a5fa,#34d399);transition:width .2s ease}
      .faro-r3-hero-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .faro-r3-hero-stats span{font-size:10px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .faro-r3-editor{border:0;background:#fff;padding:0;margin:0}
      .faro-r3-editor-head{padding:4px 0 10px}
      .faro-r3-editor-label{display:block;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      .faro-plan-target-value{display:block;margin-top:4px;font-size:38px;line-height:1;font-weight:900;letter-spacing:-.05em;color:#0f172a}
      .faro-plan-slider{width:100%;min-height:48px;accent-color:#2563eb;margin-top:8px}
      .faro-field{display:grid;gap:6px}.faro-field label{font-size:10px;font-weight:900;text-transform:uppercase;color:#64748b;letter-spacing:.04em}
      .faro-field input,.faro-field select{width:100%;min-height:50px;border:1px solid #e2e8f0;border-radius:15px;padding:0 13px;background:#fff;color:#0f172a;font-weight:750}
      .faro-plan-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
      .faro-plan-preview>div{background:#f8fafc;border-radius:15px;padding:11px 9px;min-width:0}
      .faro-plan-preview span{display:block;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8}
      .faro-plan-preview strong{display:block;margin-top:3px;font-size:12px;color:#334155;overflow:hidden;text-overflow:ellipsis}
      .faro-r3-actions{display:grid;grid-template-columns:1fr 1.3fr;gap:10px;margin-top:18px;position:sticky;bottom:0;padding:10px 0 max(4px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(255,255,255,0),#fff 24%)}
      .faro-r3-actions button{min-height:50px;border-radius:16px;font-size:11px;font-weight:900}
      .faro-r3-secondary{background:#f1f5f9;color:#475569}.faro-r3-primary{background:#2563eb;color:#fff}.faro-r3-primary:disabled{opacity:.45}
      .faro-week-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
      .faro-week-day{min-height:46px;border:0;border-radius:13px;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:900}
      .faro-week-day.active{background:#2563eb;color:#fff}
      .faro-context-note{border-radius:17px;background:#eff6ff;color:#1d4ed8;padding:13px 14px;font-size:12px;line-height:1.45}
      .faro-money-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f1f5f9;padding:4px;border-radius:16px;position:sticky;top:0;z-index:1}
      .faro-money-tab{min-height:42px;border-radius:13px;color:#64748b;font-size:11px;font-weight:900}.faro-money-tab.active{background:#fff;color:#0f172a;box-shadow:0 3px 12px rgba(15,23,42,.08)}
      .faro-money-row{border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:#fff}
      .faro-money-row-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .faro-money-row strong{font-size:13px;color:#0f172a}.faro-money-row small{display:block;margin-top:3px;color:#64748b;font-size:10px}
      .faro-money-action{min-height:40px;padding:0 12px;border-radius:12px;font-size:9px;font-weight:900}
      .faro-money-empty{padding:18px;border-radius:18px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.45}
      .faro-money-legacy{margin-top:12px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;background:#fff}.faro-money-legacy>summary{list-style:none;cursor:pointer;padding:14px 16px;font-size:11px;font-weight:900;color:#475569}.faro-money-legacy>summary::-webkit-details-marker{display:none}.faro-money-legacy>summary::after{content:'+';float:right;color:#2563eb;font-size:16px}.faro-money-legacy[open]>summary::after{content:'−'}.faro-money-legacy .card-vetta{border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important}
      .faro-plan-details{border:1px solid #e2e8f0;border-radius:20px;background:#fff;overflow:hidden}.faro-plan-details>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:14px 16px;cursor:pointer;font-size:12px;font-weight:900;color:#334155}.faro-plan-details>summary::-webkit-details-marker{display:none}.faro-plan-details>summary::after{content:'+';width:30px;height:30px;border-radius:12px;background:#f1f5f9;display:grid;place-items:center;color:#2563eb;font-size:18px}.faro-plan-details[open]>summary::after{content:'−'}.faro-plan-details .card-vetta{box-shadow:none;border:0;border-top:1px solid #f1f5f9;border-radius:0;margin:0}
      .faro-subview-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}.faro-subview-back{width:46px;height:46px;border-radius:16px;background:#f1f5f9;color:#334155;display:grid;place-items:center;flex:0 0 auto}.faro-subview-title{font-size:23px;font-weight:900;letter-spacing:-.03em;color:#0f172a}
      .faro-detail-summary{border-radius:24px;background:linear-gradient(145deg,#f8fbff,#fff);border:1px solid #dbeafe;padding:18px}.faro-detail-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:14px}.faro-detail-metric{border-radius:16px;background:#fff;padding:12px}.faro-detail-metric span{display:block;font-size:9px;font-weight:900;text-transform:uppercase;color:#94a3b8}.faro-detail-metric strong{display:block;margin-top:3px;font-size:13px;color:#0f172a}
      @media(max-width:360px){.faro-r3-tile{padding:13px;border-radius:21px}.faro-r3-tile-value{font-size:18px}.faro-r3-tile-meta{font-size:10px}.faro-r3-hero{padding:16px}.faro-plan-preview{grid-template-columns:1fr 1fr}.faro-plan-preview>div:last-child{grid-column:1/-1}.faro-week-grid{gap:3px}.faro-week-day{font-size:9px}}
      @media(prefers-reduced-motion:reduce){.faro-r3-progress>span{transition:none}}
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
  const targetValue = $('targetProfitDisplay');
  const dreCard = $('dreGross')?.closest('.card-vetta');
  if (!targetCard || !targetValue || !dreCard) return;

  const oldSlider = targetCard.querySelector('input[data-model="targetProfit"][type="range"]');
  const slider = oldSlider?.cloneNode(true);
  if (!slider) return;
  slider.id = 'faroTargetSlider';
  slider.className = 'faro-plan-slider';
  slider.removeAttribute('data-model');

  targetCard.id = 'faroPlanningTargetCard';
  targetCard.className = 'faro-r3-editor';
  targetCard.dataset.faroTour = 'planning-target';
  targetValue.className = 'faro-plan-target-value tabular';

  const targetHead = document.createElement('div');
  targetHead.className = 'faro-r3-editor-head';
  targetHead.innerHTML = '<span class="faro-r3-editor-label">Quero que sobre</span>';
  targetHead.appendChild(targetValue);

  const exactWrap = document.createElement('div');
  exactWrap.className = 'faro-field mt-3';
  exactWrap.innerHTML = '<label for="faroTargetExact">Valor exato</label><div class="input-wrapper"><span>R$</span><input id="faroTargetExact" type="number" min="500" max="50000" step="100" inputmode="numeric" class="input-vetta faro-money"></div>';

  const preview = document.createElement('div');
  preview.id = 'faroTargetPreview';
  preview.className = 'faro-plan-preview';
  preview.innerHTML = '<div><span>Dias planejados</span><strong id="faroPreviewDays">—</strong></div><div><span>Precisa por dia</span><strong id="faroPreviewDaily">—</strong></div><div><span>Km por dia</span><strong id="faroPreviewKm">—</strong></div>';

  const targetActions = document.createElement('div');
  targetActions.id = 'faroTargetActions';
  targetActions.className = 'faro-r3-actions';
  targetActions.innerHTML = '<button id="faroTargetCancel" type="button" class="faro-r3-secondary">CANCELAR</button><button id="faroTargetApply" type="button" class="faro-r3-primary">APLICAR MUDANÇA</button>';
  targetCard.replaceChildren(targetHead, slider, exactWrap, preview, targetActions);

  const createDialog = (id, kicker, title, variant = 'sheet') => {
    const existing = $(id);
    if (existing) return existing;
    const dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = `faro-dialog faro-dialog--${variant}`;
    dialog.setAttribute('aria-labelledby', `${id}Title`);
    dialog.innerHTML = `<div class="faro-dialog-shell"><div class="faro-dialog-handle" aria-hidden="true"></div><header class="faro-dialog-head"><div><span class="faro-dialog-kicker">${kicker}</span><h2 id="${id}Title" class="faro-dialog-title">${title}</h2></div><button type="button" class="faro-dialog-close" data-faro-dialog-close aria-label="Fechar"><i class="fas fa-xmark"></i></button></header><div class="faro-dialog-body" data-faro-dialog-body></div></div>`;
    document.body.appendChild(dialog);
    interactions.register(dialog);
    return dialog;
  };

  const metaDialog = createDialog('faroMetaDialog', 'Planejar', 'Ajustar meta');
  metaDialog.querySelector('[data-faro-dialog-body]').appendChild(targetCard);

  const agendaDialog = createDialog('faroAgendaDialog', 'Planejar', 'Agenda do mês');
  agendaDialog.querySelector('[data-faro-dialog-body]').innerHTML = `<div class="faro-week-grid" id="faroDraftWeekdays"></div><div class="faro-field mt-5"><label for="faroDraftDaysOff">Folgas extras neste mês</label><input id="faroDraftDaysOff" type="number" min="0" max="20" inputmode="numeric"></div><div id="faroDaysConsequence" class="faro-context-note mt-4"></div><div class="faro-r3-actions"><button id="faroDaysCancel" type="button" class="faro-r3-secondary">CANCELAR</button><button id="faroDaysApply" type="button" class="faro-r3-primary">APLICAR</button></div>`;

  const operationDialog = createDialog('faroOperationDialog', 'Planejar', 'Sua operação');
  operationDialog.querySelector('[data-faro-dialog-body]').innerHTML = `<div class="space-y-4"><div class="faro-field"><label for="faroDraftFuelType">Energia</label><select id="faroDraftFuelType"><option value="gnv">GNV</option><option value="gasoline">Gasolina</option><option value="ethanol">Etanol</option><option value="diesel">Diesel</option><option value="electric">Elétrico</option><option value="custom">Personalizado</option></select></div><div class="grid grid-cols-2 gap-3"><div class="faro-field"><label for="faroDraftFuelPrice">Preço por unidade</label><input id="faroDraftFuelPrice" type="number" min="0" step=".01" inputmode="decimal"></div><div class="faro-field"><label for="faroDraftFuelEfficiency">Rendimento km/un.</label><input id="faroDraftFuelEfficiency" type="number" min="0" step=".1" inputmode="decimal"></div></div><div class="faro-field"><label for="faroDraftRevenueKm">Receita média por km</label><input id="faroDraftRevenueKm" type="number" min="0" step=".01" inputmode="decimal"></div><div id="faroOperationConsequence" class="faro-context-note"></div></div><div class="faro-r3-actions"><button id="faroOperationCancel" type="button" class="faro-r3-secondary">CANCELAR</button><button id="faroOperationApply" type="button" class="faro-r3-primary">APLICAR</button></div>`;

  const moneyDialog = createDialog('faroMoneyDialog', 'Planejar', 'Dinheiro do mês', 'page');
  const moneyBody = moneyDialog.querySelector('[data-faro-dialog-body]');
  moneyBody.innerHTML = `<div id="faroMoneySummary" class="faro-context-note mb-3"></div><div class="faro-money-tabs" role="tablist" aria-label="Dinheiro do mês"><button id="faroMoneyTabBills" type="button" class="faro-money-tab active" role="tab" aria-selected="true">CONTAS</button><button id="faroMoneyTabReserves" type="button" class="faro-money-tab" role="tab" aria-selected="false">RESERVAS</button></div><section id="faroMoneyBills" class="space-y-3 mt-3" role="tabpanel"><div id="faroMoneyBillList" class="space-y-3"></div><button id="faroMoneyAddBill" type="button" class="w-full min-h-[48px] rounded-2xl bg-blue-600 text-white text-[11px] font-extrabold">+ ADICIONAR CONTA</button></section><section id="faroMoneyReserves" class="space-y-3 mt-3 hidden" role="tabpanel"><div id="faroMoneyReserveList" class="space-y-3"></div><button id="faroMoneyCreateReserve" type="button" class="w-full min-h-[48px] rounded-2xl bg-emerald-600 text-white text-[11px] font-extrabold">+ CRIAR RESERVA</button></section>`;

  const legacyPlanNow = $('faroPlanNow');
  legacyPlanNow?.remove();
  const paymentCenter = $('faroPaymentCenter');
  const reserveCenter = $('faroReserveCenter');
  if (paymentCenter) { paymentCenter.classList.add('hidden'); paymentCenter.setAttribute('aria-hidden','true'); }
  if (reserveCenter) { reserveCenter.classList.add('hidden'); reserveCenter.setAttribute('aria-hidden','true'); }

  const costCard = $('costList')?.closest('.card-vetta');
  if (costCard) {
    const legacyCosts = document.createElement('details');
    legacyCosts.id = 'faroMoneyLegacyCosts';
    legacyCosts.className = 'faro-money-legacy';
    legacyCosts.innerHTML = '<summary>Gerenciar contas cadastradas</summary>';
    legacyCosts.appendChild(costCard);
    $('faroMoneyBills').appendChild(legacyCosts);
  }

  const dreDetails = document.createElement('details');
  dreDetails.id = 'faroDreDetails';
  dreDetails.className = 'faro-plan-details';
  dreDetails.innerHTML = '<summary>Como o FARO chegou nesses números?</summary>';
  dreDetails.appendChild(dreCard);

  const root = document.createElement('div');
  root.id = 'faroPlanningRoot';
  root.className = 'faro-r3-root';
  root.innerHTML = `<header class="faro-r3-head" data-faro-tour="planning-head"><div><h2 class="faro-r3-title">Planejar</h2><p class="faro-r3-subtitle">Organize seu mês.</p></div><span id="faroPlanningMonth" class="faro-r3-month"></span></header><div class="faro-r3-grid"><button id="faroOpenMeta" type="button" class="faro-r3-tile faro-action-card" data-tone="blue"><span class="faro-r3-arrow"><i class="fas fa-arrow-up-right-from-square"></i></span><span class="faro-r3-icon"><i class="fas fa-bullseye"></i></span><span><span class="faro-r3-tile-label">Meta</span><strong id="faroMetaCardValue" class="faro-r3-tile-value"></strong><small id="faroMetaCardMeta" class="faro-r3-tile-meta"></small></span></button><button id="faroOpenAgenda" type="button" class="faro-r3-tile faro-action-card" data-tone="blue"><span class="faro-r3-arrow"><i class="fas fa-arrow-up-right-from-square"></i></span><span class="faro-r3-icon"><i class="fas fa-calendar-days"></i></span><span><span class="faro-r3-tile-label">Agenda</span><strong id="faroAgendaCardValue" class="faro-r3-tile-value"></strong><small id="faroAgendaCardMeta" class="faro-r3-tile-meta"></small></span></button></div><button id="faroOpenPlanDetail" type="button" class="faro-r3-hero faro-action-card" data-faro-tour="planning-target"><span class="faro-r3-hero-top"><span><span class="faro-r3-hero-label">Meu planejamento</span><strong id="faroPlanHeroValue" class="faro-r3-hero-value"></strong></span><span class="faro-r3-hero-action">VER PLANO&nbsp; →</span></span><span class="faro-r3-progress" aria-hidden="true"><span id="faroPlanProgress"></span></span><span class="faro-r3-hero-stats"><span id="faroPlanDaily"></span><span id="faroPlanHeroDays"></span><span id="faroPlanHeroKm"></span></span></button><div class="faro-r3-grid"><button id="faroOpenOperation" type="button" class="faro-r3-tile faro-action-card" data-tone="amber"><span class="faro-r3-arrow"><i class="fas fa-arrow-up-right-from-square"></i></span><span class="faro-r3-icon"><i class="fas fa-gas-pump"></i></span><span><span class="faro-r3-tile-label">Operação</span><strong id="faroOperationCardValue" class="faro-r3-tile-value"></strong><small id="faroOperationCardMeta" class="faro-r3-tile-meta"></small></span></button><button id="faroOpenMoney" type="button" class="faro-r3-tile faro-action-card" data-tone="emerald"><span class="faro-r3-arrow"><i class="fas fa-arrow-up-right-from-square"></i></span><span class="faro-r3-icon"><i class="fas fa-wallet"></i></span><span><span class="faro-r3-tile-label">Dinheiro</span><strong id="faroMoneyCardValue" class="faro-r3-tile-value"></strong><small id="faroMoneyCardMeta" class="faro-r3-tile-meta"></small></span></button></div>`;
  planning.replaceChildren(root);

  const main = planning.parentElement;
  const detailView = document.createElement('section');
  detailView.id = 'view-planning-detail';
  detailView.className = 'view-section hidden space-y-4 animate-enter';
  detailView.innerHTML = `<div class="faro-subview-head"><button type="button" class="faro-subview-back" data-faro-back aria-label="Voltar para Planejar"><i class="fas fa-arrow-left"></i></button><div><span class="label-micro !text-blue-600">Planejar</span><h2 class="faro-subview-title">Meu planejamento</h2><p id="faroDetailMonth" class="text-xs text-slate-500 mt-1"></p></div></div><section class="faro-detail-summary"><span class="label-micro !text-blue-600">Objetivo líquido</span><strong id="faroDetailTarget" class="text-2xl font-extrabold block mt-1"></strong><p id="faroDetailPace" class="text-xs text-slate-500 mt-2"></p><div class="faro-detail-metrics"><div class="faro-detail-metric"><span>Faturamento/dia</span><strong id="faroDetailDaily"></strong></div><div class="faro-detail-metric"><span>Dias planejados</span><strong id="faroDetailDays"></strong></div><div class="faro-detail-metric"><span>Km/dia</span><strong id="faroDetailKm"></strong></div><div class="faro-detail-metric"><span>Energia/km</span><strong id="faroDetailEnergy"></strong></div><div class="faro-detail-metric"><span>Contas + reservas</span><strong id="faroDetailFixed"></strong></div><div class="faro-detail-metric"><span>Receita/km</span><strong id="faroDetailRevenueKm"></strong></div></div></section>`;
  detailView.appendChild(dreDetails);
  main.insertBefore(detailView, planning.nextSibling);
  detailView.querySelector('[data-faro-back]').addEventListener('click', () => app.navigateBack());

  let targetDraft = app.state.targetProfit;
  let dayDraft = { weekdays:[...app.state.workWeekdays], extraDaysOff:app.state.extraDaysOff };
  let operationDraft = { fuel:{...app.state.fuel}, revenueKm:app.state.revenueKm };
  let moneyTab = 'bills';

  const calculationsWith = overrides => {
    const saved = { targetProfit:app.state.targetProfit, workWeekdays:app.state.workWeekdays, extraDaysOff:app.state.extraDaysOff, revenueKm:app.state.revenueKm, fuel:app.state.fuel };
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

  const currentMonthActual = () => {
    const now = new Date();
    const ctx = app.monthContext(now);
    return (app.state.records || []).reduce((sum, record) => {
      const date = app.parseDate(record.date);
      if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return sum;
      return sum + app.number(app.recordNumbers(record, ctx)?.net);
    }, 0);
  };

  const renderTargetDraft = () => {
    const dirty = targetDraft !== app.state.targetProfit;
    slider.max = String(Math.max(20000, targetDraft));
    slider.value = String(targetDraft);
    $('faroTargetExact').value = String(targetDraft);
    targetValue.textContent = app.money(targetDraft, 0);
    const c = calculationsWith({ targetProfit:targetDraft });
    $('faroPreviewDays').textContent = `${c.ctx.plannedDays} dias`;
    $('faroPreviewDaily').textContent = `${app.money(c.dailyGross,0)}/dia`;
    $('faroPreviewKm').textContent = `~${app.integer(c.dailyKm)} km`;
    $('faroTargetApply').disabled = !dirty;
  };
  const resetTargetDraft = () => { targetDraft = app.state.targetProfit; renderTargetDraft(); };
  slider.addEventListener('input', event => { targetDraft = clampTarget(event.currentTarget.value); renderTargetDraft(); });
  $('faroTargetExact').addEventListener('input', event => { const raw = String(event.currentTarget.value || '').trim(); if (raw) { targetDraft = clampTarget(raw); renderTargetDraft(); } });
  $('faroTargetCancel').addEventListener('click', () => interactions.close(metaDialog, 'cancel'));
  $('faroTargetApply').addEventListener('click', () => {
    if (targetDraft === app.state.targetProfit) return;
    app.state.targetProfit = targetDraft;
    app.save(); app.syncInputs(); app.render(); app.toast('Meta atualizada.');
    interactions.close(metaDialog, 'applied');
  });
  metaDialog.addEventListener('close', resetTargetDraft);

  const WEEK = [{day:1,label:'SEG'},{day:2,label:'TER'},{day:3,label:'QUA'},{day:4,label:'QUI'},{day:5,label:'SEX'},{day:6,label:'SÁB'},{day:0,label:'DOM'}];
  $('faroDraftWeekdays').innerHTML = WEEK.map(item => `<button type="button" class="faro-week-day" data-r3-weekday="${item.day}">${item.label}</button>`).join('');
  const renderDaysDraft = () => {
    $('faroDraftDaysOff').value = String(dayDraft.extraDaysOff);
    document.querySelectorAll('[data-r3-weekday]').forEach(button => button.classList.toggle('active', dayDraft.weekdays.includes(Number(button.dataset.r3Weekday))));
    const c = calculationsWith({ workWeekdays:dayDraft.weekdays, extraDaysOff:dayDraft.extraDaysOff });
    $('faroDaysConsequence').textContent = `Com essa agenda: ${c.ctx.plannedDays} dias no mês e cerca de ${app.money(c.dailyGross,0)} de faturamento por dia.`;
  };
  $('faroDraftWeekdays').addEventListener('click', event => {
    const button = event.target.closest('[data-r3-weekday]'); if (!button) return;
    const day = Number(button.dataset.r3Weekday); const selected = new Set(dayDraft.weekdays);
    if (selected.has(day)) { if (selected.size === 1) return app.toast('Escolha pelo menos um dia de trabalho.'); selected.delete(day); }
    else selected.add(day);
    dayDraft.weekdays = [...selected].sort((a,b) => a-b); renderDaysDraft();
  });
  $('faroDraftDaysOff').addEventListener('input', event => { dayDraft.extraDaysOff = Math.max(0,Math.min(20,Math.round(app.number(event.currentTarget.value)))); renderDaysDraft(); });
  $('faroDaysCancel').addEventListener('click', () => interactions.close(agendaDialog,'cancel'));
  $('faroDaysApply').addEventListener('click', () => {
    if (!dayDraft.weekdays.length) return app.toast('Escolha pelo menos um dia de trabalho.');
    app.state.workWeekdays = [...dayDraft.weekdays]; app.state.extraDaysOff = dayDraft.extraDaysOff;
    app.save(); app.syncInputs(); app.render(); app.toast('Agenda atualizada.'); interactions.close(agendaDialog,'applied');
  });
  agendaDialog.addEventListener('close', () => { dayDraft = { weekdays:[...app.state.workWeekdays], extraDaysOff:app.state.extraDaysOff }; renderDaysDraft(); });

  const renderOperationDraft = () => {
    $('faroDraftFuelType').value = operationDraft.fuel.type || 'custom';
    $('faroDraftFuelPrice').value = String(operationDraft.fuel.price ?? '');
    $('faroDraftFuelEfficiency').value = String(operationDraft.fuel.efficiency ?? '');
    $('faroDraftRevenueKm').value = String(operationDraft.revenueKm ?? '');
    const c = calculationsWith({ fuel:operationDraft.fuel, revenueKm:operationDraft.revenueKm });
    $('faroOperationConsequence').textContent = operationDraft.fuel.price > 0 && operationDraft.fuel.efficiency > 0 && operationDraft.revenueKm > 0 ? `Estimativa: ${app.money(c.fuelKm)}/km de energia, ~${app.integer(c.dailyKm)} km/dia e ${app.money(c.dailyGross,0)}/dia de faturamento.` : 'Preencha preço, rendimento e receita/km para ver a estimativa.';
  };
  $('faroDraftFuelType').addEventListener('change', event => { const type = event.currentTarget.value; operationDraft.fuel = { type, ...(energyPresets[type] || energyPresets.custom) }; renderOperationDraft(); });
  $('faroDraftFuelPrice').addEventListener('input', event => { operationDraft.fuel.price = app.number(event.currentTarget.value); renderOperationDraft(); });
  $('faroDraftFuelEfficiency').addEventListener('input', event => { operationDraft.fuel.efficiency = app.number(event.currentTarget.value); renderOperationDraft(); });
  $('faroDraftRevenueKm').addEventListener('input', event => { operationDraft.revenueKm = app.number(event.currentTarget.value); renderOperationDraft(); });
  $('faroOperationCancel').addEventListener('click', () => interactions.close(operationDialog,'cancel'));
  $('faroOperationApply').addEventListener('click', () => {
    if (operationDraft.fuel.price <= 0 || operationDraft.fuel.efficiency <= 0 || operationDraft.revenueKm <= 0) return app.toast('Informe preço, rendimento e receita por km maiores que zero.');
    app.state.fuel = { ...operationDraft.fuel }; app.state.revenueKm = operationDraft.revenueKm;
    app.save(); app.syncInputs(); app.render(); app.toast('Operação atualizada.'); interactions.close(operationDialog,'applied');
  });
  operationDialog.addEventListener('close', () => { operationDraft = { fuel:{...app.state.fuel}, revenueKm:app.state.revenueKm }; renderOperationDraft(); });

  const setMoneyTab = tab => {
    moneyTab = tab === 'reserves' ? 'reserves' : 'bills';
    const bills = moneyTab === 'bills';
    $('faroMoneyTabBills').classList.toggle('active', bills); $('faroMoneyTabBills').setAttribute('aria-selected', String(bills));
    $('faroMoneyTabReserves').classList.toggle('active', !bills); $('faroMoneyTabReserves').setAttribute('aria-selected', String(!bills));
    $('faroMoneyBills').classList.toggle('hidden', !bills); $('faroMoneyReserves').classList.toggle('hidden', bills);
  };
  $('faroMoneyTabBills').addEventListener('click', () => setMoneyTab('bills'));
  $('faroMoneyTabReserves').addEventListener('click', () => setMoneyTab('reserves'));

  const occurrenceWhen = item => {
    if (item.status === 'paid') return 'pago';
    if (item.days < 0) return `venceu há ${Math.abs(item.days)} ${Math.abs(item.days) === 1 ? 'dia' : 'dias'}`;
    if (item.days === 0) return 'vence hoje';
    if (item.days === 1) return 'vence amanhã';
    return `vence em ${item.days} dias`;
  };
  const reservePlannedText = reserve => reserve.kind === 'monthly' ? `${app.money(reserve.value,0)}/mês planejados` : reserve.kind === 'weekly' ? `${app.money(reserve.value,0)}/semana planejados` : reserve.kind === 'per_km' ? `${app.money(reserve.value)}/km planejados` : `${app.money(reserve.value,0)} planejados`;
  const clickHiddenReserveAction = (attribute, value) => {
    const button = [...document.querySelectorAll(`[${attribute}]`)].find(item => item.getAttribute(attribute) === value && item.closest('#faroReserveCenter'));
    button?.click();
  };

  const renderMoney = () => {
    const c = app.calculations();
    const next = window.FaroFinance?.nextPendingOccurrence?.();
    $('faroMoneySummary').textContent = next ? `${app.money(c.costs.monthlyFixed,0)} comprometidos no plano · ${next.name} ${occurrenceWhen(next)}.` : `${app.money(c.costs.monthlyFixed,0)} comprometidos no plano · nenhum vencimento próximo.`;
    const occurrences = window.FaroFinance?.occurrences?.({ daysBack:14, daysForward:45, includePaid:true }) || [];
    const pending = occurrences.filter(item => item.status === 'pending').slice(0,7);
    const paid = occurrences.filter(item => item.status === 'paid').sort((a,b) => b.due - a.due).slice(0,3);
    const rows = [...pending,...paid];
    $('faroMoneyBillList').innerHTML = rows.length ? rows.map(item => `<article class="faro-money-row"><div class="faro-money-row-head"><span class="min-w-0"><strong class="block truncate">${app.escape(item.name)}</strong><small>${occurrenceWhen(item)} · ${app.money(item.amount,0)}</small></span><button type="button" class="faro-money-action ${item.status === 'paid' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-600 text-white'}" ${item.status === 'paid' ? `data-r3-undo="${item.id}"` : `data-r3-pay="${item.id}"`}>${item.status === 'paid' ? 'DESFAZER' : 'MARCAR PAGO'}</button></div></article>`).join('') : '<div class="faro-money-empty"><strong class="block text-slate-700">Nenhuma conta próxima</strong><span class="block mt-1">Tudo tranquilo por enquanto. Você pode adicionar uma conta quando precisar.</span></div>';

    const reserves = (app.state.costs || []).filter(cost => cost?.active !== false && cost?.category === 'reserve');
    $('faroMoneyReserveList').innerHTML = reserves.length ? reserves.map(reserve => {
      const balance = window.FaroReserves?.balanceFor?.(reserve.id) || 0;
      const profile = app.state.reserveProfiles?.[reserve.id] || {};
      const goal = app.number(profile.goalAmount);
      const progress = goal > 0 ? Math.min(100,Math.max(0,balance/goal*100)) : null;
      const recent = window.FaroReserves?.contributionsFor?.(reserve.id)?.slice(0,3) || [];
      return `<article class="faro-money-row"><div class="faro-money-row-head"><span class="min-w-0"><strong class="block truncate">${app.escape(reserve.name)}</strong><small>${reservePlannedText(reserve)}</small></span><strong class="text-emerald-700">${app.money(balance,0)}</strong></div>${goal > 0 ? `<div class="mt-3"><div class="flex justify-between text-[9px] font-bold text-slate-500"><span>Meta ${app.money(goal,0)}</span><span>${Math.round(progress)}%</span></div><div class="progress-track mt-2"><div class="progress-fill" style="width:${progress}%"></div></div></div>` : ''}<div class="grid grid-cols-2 gap-2 mt-3"><button type="button" data-r3-reserve-contribute="${reserve.id}" class="faro-money-action bg-emerald-600 text-white">+ APORTAR</button><button type="button" data-r3-reserve-goal="${reserve.id}" class="faro-money-action bg-emerald-50 text-emerald-700">META</button></div>${recent.length ? `<details class="mt-3"><summary class="text-[9px] font-extrabold text-slate-500 cursor-pointer">ÚLTIMOS APORTES</summary><div class="space-y-2 mt-2">${recent.map(entry => `<div class="flex items-center justify-between gap-2 text-[10px] bg-slate-50 rounded-xl px-3 py-2"><span>${app.parseDate(entry.date).toLocaleDateString('pt-BR')} · ${app.money(entry.amount,0)}</span><button type="button" data-r3-reserve-remove="${entry.id}" class="text-red-500 font-extrabold">REMOVER</button></div>`).join('')}</div></details>` : ''}</article>`;
    }).join('') : '<div class="faro-money-empty"><strong class="block text-slate-700">Nenhuma reserva criada</strong><span class="block mt-1">Crie uma reserva para manutenção, pneus, emergência ou outro objetivo.</span></div>';
  };

  $('faroMoneyBillList').addEventListener('click', event => {
    const pay = event.target.closest('[data-r3-pay]'); const undo = event.target.closest('[data-r3-undo]');
    if (pay) { const item = window.FaroFinance?.occurrences?.({daysBack:14,daysForward:45,includePaid:true})?.find(entry => entry.id === pay.dataset.r3Pay); if (item) window.FaroFinance?.markPaid?.(item); }
    if (undo) window.FaroFinance?.undoPaid?.(undo.dataset.r3Undo);
  });
  $('faroMoneyReserveList').addEventListener('click', event => {
    const contribution = event.target.closest('[data-r3-reserve-contribute]'); const goal = event.target.closest('[data-r3-reserve-goal]'); const remove = event.target.closest('[data-r3-reserve-remove]');
    if (contribution) clickHiddenReserveAction('data-reserve-contribute', contribution.dataset.r3ReserveContribute);
    if (goal) clickHiddenReserveAction('data-reserve-goal', goal.dataset.r3ReserveGoal);
    if (remove) clickHiddenReserveAction('data-reserve-remove-entry', remove.dataset.r3ReserveRemove);
  });
  $('faroMoneyAddBill').addEventListener('click', () => app.openCostModal());
  $('faroMoneyCreateReserve').addEventListener('click', () => {
    const legacy = $('faroCreateReserve');
    if (legacy) return legacy.click();
    app.openCostModal(); app.applyCostTemplate?.('reserve');
  });

  const renderCards = () => {
    const c = app.calculations();
    const actual = currentMonthActual();
    const target = app.state.targetProfit;
    const pct = target > 0 ? Math.max(0,Math.min(100,actual/target*100)) : 0;
    $('faroPlanningMonth').textContent = monthLabel();
    $('faroMetaCardValue').textContent = app.money(target,0);
    $('faroMetaCardMeta').textContent = `${app.money(c.dailyGross,0)}/dia`;
    $('faroAgendaCardValue').textContent = `${c.ctx.plannedDays} dias`;
    $('faroAgendaCardMeta').textContent = `${app.state.workWeekdays.length} dias/semana · ${app.state.extraDaysOff} folgas`;
    $('faroPlanHeroValue').textContent = `${app.money(actual,0)} de ${app.money(target,0)}`;
    $('faroPlanProgress').style.width = `${pct}%`;
    $('faroPlanDaily').textContent = `${app.money(c.dailyGross,0)}/dia`;
    $('faroPlanHeroDays').textContent = `${c.ctx.plannedDays} dias`;
    $('faroPlanHeroKm').textContent = `~${app.integer(c.dailyKm)} km/dia`;
    $('faroOperationCardValue').textContent = app.state.fuel.label || 'Energia';
    $('faroOperationCardMeta').textContent = `${app.money(c.fuelKm)}/km · ${app.money(app.state.revenueKm)}/km receita`;
    const next = window.FaroFinance?.nextPendingOccurrence?.();
    $('faroMoneyCardValue').textContent = app.money(c.costs.monthlyFixed,0);
    $('faroMoneyCardMeta').textContent = next ? `${next.days < 0 ? 'Atrasada' : next.days === 0 ? 'Vence hoje' : next.days === 1 ? 'Vence amanhã' : `Próxima em ${next.days} dias`}` : 'Tudo em dia';
  };

  const renderDetail = () => {
    const c = app.calculations(); const actual = currentMonthActual(); const target = app.state.targetProfit; const pct = target > 0 ? Math.round(actual/target*100) : 0;
    $('faroDetailMonth').textContent = `Plano de ${monthLongLabel()}`;
    $('faroDetailTarget').textContent = app.money(target,0);
    $('faroDetailPace').textContent = `${app.money(actual,0)} realizados · ${Math.max(0,pct)}% do objetivo líquido.`;
    $('faroDetailDaily').textContent = app.money(c.dailyGross,0);
    $('faroDetailDays').textContent = `${c.ctx.plannedDays} dias`;
    $('faroDetailKm').textContent = `~${app.integer(c.dailyKm)} km`;
    $('faroDetailEnergy').textContent = `${app.money(c.fuelKm)}/km`;
    $('faroDetailFixed').textContent = app.money(c.costs.monthlyFixed,0);
    $('faroDetailRevenueKm').textContent = `${app.money(app.state.revenueKm)}/km`;
  };

  const renderPlanning = () => {
    targetDraft = app.state.targetProfit;
    dayDraft = { weekdays:[...app.state.workWeekdays], extraDaysOff:app.state.extraDaysOff };
    operationDraft = { fuel:{...app.state.fuel}, revenueKm:app.state.revenueKm };
    renderTargetDraft(); renderDaysDraft(); renderOperationDraft(); renderCards(); renderMoney(); renderDetail();
    app.renderCosts?.(); window.FaroFinance?.refresh?.(); window.FaroReserves?.render?.();
  };

  const openMeta = opener => { resetTargetDraft(); interactions.open(metaDialog, opener || $('faroOpenMeta')); };
  const openAgenda = opener => { dayDraft = { weekdays:[...app.state.workWeekdays], extraDaysOff:app.state.extraDaysOff }; renderDaysDraft(); interactions.open(agendaDialog, opener || $('faroOpenAgenda')); };
  const openOperation = opener => { operationDraft = { fuel:{...app.state.fuel}, revenueKm:app.state.revenueKm }; renderOperationDraft(); interactions.open(operationDialog, opener || $('faroOpenOperation')); };
  const openMoney = (tab = 'bills', opener) => { renderMoney(); setMoneyTab(tab); interactions.open(moneyDialog, opener || $('faroOpenMoney')); };
  const openDetail = () => app.openSecondary('planning-detail');

  $('faroOpenMeta').addEventListener('click', event => openMeta(event.currentTarget));
  $('faroOpenAgenda').addEventListener('click', event => openAgenda(event.currentTarget));
  $('faroOpenPlanDetail').addEventListener('click', openDetail);
  $('faroOpenOperation').addEventListener('click', event => openOperation(event.currentTarget));
  $('faroOpenMoney').addEventListener('click', event => openMoney('bills',event.currentTarget));

  const reserveObserverTarget = $('faroReserveList');
  if (reserveObserverTarget) new MutationObserver(() => { renderCards(); renderMoney(); }).observe(reserveObserverTarget, { childList:true, subtree:true, characterData:true });

  app.renderPlanning = renderPlanning;
  const baseRender = app.render;
  app.render = function(...args) { const result = baseRender.apply(this,args); renderCards(); renderMoney(); if (this.currentView === 'planning-detail') renderDetail(); return result; };
  const baseShowView = app.showView;
  app.showView = function(view, primaryView = view) {
    const result = baseShowView.call(this, view, primaryView);
    if (view === 'planning') { renderCards(); renderMoney(); }
    if (view === 'planning-detail') renderDetail();
    return result;
  };

  renderPlanning();
  window.FaroPlanning = Object.freeze({
    render:renderPlanning,
    refreshMoney:renderMoney,
    openMeta,
    openAgenda,
    openOperation,
    openMoney,
    openDetail,
    resetTargetDraft
  });
})();
