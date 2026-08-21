(() => {
  const app = window.__vettaApp;
  const dashboard = document.getElementById('view-dashboard');
  if (!app || !dashboard || document.getElementById('faroHomeFoundation')) return;

  const marker = document.createElement('span');
  marker.id = 'faroHomeFoundation';
  marker.hidden = true;
  dashboard.prepend(marker);

  const registerButton = dashboard.querySelector('[data-view="day"]');
  const weekCard = document.getElementById('weekStatusTitle')?.closest('.card-vetta');
  const monthCard = document.getElementById('monthStatusTitle')?.closest('.card-vetta');
  const insightCard = document.getElementById('insightTitle')?.closest('.card-vetta');
  const legacyPlanningCta = dashboard.querySelector('[data-secondary-view="planning"]');
  legacyPlanningCta?.remove();

  registerButton?.classList.add('faro-action-card');
  if (registerButton) registerButton.dataset.faroTone = 'action';
  weekCard?.classList.add('faro-state-card');
  if (weekCard) weekCard.dataset.faroTone = 'action';
  monthCard?.classList.add('faro-action-card');
  if (monthCard) monthCard.dataset.faroTone = 'neutral';

  if (weekCard && monthCard && weekCard.parentElement === monthCard.parentElement) monthCard.parentElement.insertBefore(weekCard, monthCard);

  if (weekCard) {
    weekCard.dataset.faroRole = 'week';
    weekCard.setAttribute('aria-label', 'Resumo da semana');
  }
  if (monthCard) {
    monthCard.dataset.faroRole = 'month';
    monthCard.setAttribute('role', 'button');
    monthCard.tabIndex = 0;
    monthCard.setAttribute('aria-label', 'Ver ou ajustar meta do mês');
    const openPlanning = () => app.navigateToPrimary('planning');
    monthCard.addEventListener('click', openPlanning);
    monthCard.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPlanning();
    });
  }

  const attention = document.createElement('button');
  attention.id = 'faroHomeAttention';
  attention.type = 'button';
  attention.className = 'hidden w-full card-vetta p-5 text-left faro-home-attention faro-state-card';
  attention.dataset.faroTone = 'attention';
  attention.innerHTML = `
    <div class="flex items-center gap-3">
      <span id="faroAttentionIcon" class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 grid place-items-center shrink-0" aria-hidden="true"><i class="fas fa-calendar-day"></i></span>
      <span class="min-w-0 flex-1">
        <span id="faroAttentionLabel" class="label-micro !mb-1 !text-amber-700">Próximo compromisso</span>
        <strong id="faroAttentionTitle" class="block text-sm text-slate-800"></strong>
        <span id="faroAttentionText" class="block text-xs text-slate-500 mt-1"></span>
      </span>
      <i class="fas fa-chevron-right text-slate-300" aria-hidden="true"></i>
    </div>`;
  attention.addEventListener('click', () => app.openSecondary('planning-costs'));

  if (weekCard?.parentElement) weekCard.insertAdjacentElement('afterend', attention);
  else if (monthCard?.parentElement) monthCard.insertAdjacentElement('beforebegin', attention);

  if (!document.getElementById('faroHomeStyles')) {
    const style = document.createElement('style');
    style.id = 'faroHomeStyles';
    style.textContent = `
      #view-dashboard [data-faro-role="week"]{border-color:#dbeafe;background:linear-gradient(180deg,#fff,#f8fbff)}
      #view-dashboard [data-faro-role="month"]{box-shadow:var(--faro-shadow-card,0 12px 30px -18px rgba(15,23,42,.18));cursor:pointer;position:relative;padding-right:2.8rem}
      #view-dashboard [data-faro-role="month"]::after{content:'›';position:absolute;right:1.15rem;top:50%;transform:translateY(-50%);font-size:28px;color:#94a3b8;font-weight:500}
      #view-dashboard [data-faro-role="month"]:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}
      #faroHomeAttention{border-color:#fed7aa;background:linear-gradient(180deg,#fff,#fffaf5);transition:transform .12s ease,border-color .16s ease,background-color .16s ease}
      #faroHomeAttention[data-overdue="true"]{border-color:#fecaca;background:linear-gradient(180deg,#fff,#fff7f7)}
      #faroHomeAttention:active{transform:scale(.99)}
      #view-dashboard [data-view="day"]{position:relative;overflow:hidden}
      #view-dashboard [data-view="day"]::after{content:'';position:absolute;inset:auto -30px -45px auto;width:110px;height:110px;border-radius:999px;background:rgba(255,255,255,.08);pointer-events:none}
      @media(prefers-reduced-motion:reduce){#faroHomeAttention{transition:none}#faroHomeAttention:active{transform:none}}
    `;
    document.head.appendChild(style);
  }

  const startOfToday = () => { const date = new Date(); date.setHours(12,0,0,0); return date; };
  const daysBetween = (from,to) => Math.round((to.getTime() - from.getTime()) / 86400000);
  const nextMonthlyDue = (dueDay,today) => {
    const day = Number(dueDay); if (!Number.isFinite(day) || day < 1 || day > 31) return null;
    const build = (year,month) => new Date(year,month,Math.min(day,new Date(year,month+1,0,12).getDate()),12);
    let due = build(today.getFullYear(),today.getMonth()); if (due < today) due = build(today.getFullYear(),today.getMonth()+1); return due;
  };
  const nextWeeklyDue = (weekday,today) => {
    const target = Number(weekday); if (!Number.isInteger(target) || target < 0 || target > 6) return null;
    const due = new Date(today); due.setDate(today.getDate() + ((target - today.getDay() + 7) % 7)); return due;
  };
  const nextCommitment = () => {
    const tracked = window.FaroFinance?.nextPendingOccurrence?.(); if (tracked) return tracked;
    const today = startOfToday();
    return (app.state.costs || [])
      .filter(cost => cost?.active !== false && cost?.category === 'obligation')
      .map(cost => {
        const due = cost.kind === 'weekly' ? nextWeeklyDue(cost.dueWeekday,today) : cost.kind === 'monthly' ? nextMonthlyDue(cost.dueDay,today) : null;
        return due ? { cost,due,days:daysBetween(today,due) } : null;
      }).filter(Boolean).sort((a,b) => a.due - b.due || Number(b.cost.value || 0) - Number(a.cost.value || 0))[0] || null;
  };
  const setRegisterCopy = hasToday => {
    if (!registerButton) return;
    const small = registerButton.querySelector('span.block'); const strong = registerButton.querySelector('strong');
    if (small) small.textContent = hasToday ? 'Hoje já está registrado' : 'Próxima ação';
    if (strong) strong.textContent = hasToday ? 'Revisar meu dia' : 'Registrar meu dia';
    registerButton.setAttribute('aria-label', hasToday ? 'Revisar registro de hoje' : 'Registrar meu dia');
  };
  const updateAttention = () => {
    const item = nextCommitment(); if (!item || item.days > 3) return attention.classList.add('hidden');
    const overdue = item.days < 0;
    const when = overdue ? `venceu há ${Math.abs(item.days)} ${Math.abs(item.days)===1?'dia':'dias'}` : item.days===0?'vence hoje':item.days===1?'vence amanhã':`vence em ${item.days} dias`;
    const label = document.getElementById('faroAttentionLabel'); const icon = document.getElementById('faroAttentionIcon');
    attention.dataset.overdue = overdue ? 'true' : 'false';
    attention.dataset.faroTone = overdue ? 'risk' : 'attention';
    label.textContent = overdue ? 'Atenção financeira' : 'Próximo compromisso';
    label.className = `label-micro !mb-1 ${overdue?'!text-red-700':'!text-amber-700'}`;
    icon.className = `w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${overdue?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'}`;
    document.getElementById('faroAttentionTitle').textContent = `${item.cost.name} · ${app.money(Number(item.cost.value || 0),0)}`;
    document.getElementById('faroAttentionText').textContent = `${when}. Toque para ver contas e reservas.`;
    attention.classList.remove('hidden');
  };
  const updateWeek = calculation => {
    if (!weekCard) return;
    const week = app.weekContext(calculation);
    if (!Number.isFinite(week.targetGross)) { weekCard.style.visibility = 'hidden'; return; }
    weekCard.style.visibility = '';
    const targetNode = document.getElementById('weekTarget');
    const actualNode = document.getElementById('weekActual');
    const title = document.getElementById('weekStatusTitle');
    const text = document.getElementById('weekStatusText');
    const targetLabel = targetNode?.previousElementSibling;
    const actualLabel = actualNode?.previousElementSibling;
    if (targetLabel) targetLabel.textContent = 'Bruto necessário';
    if (actualLabel) actualLabel.textContent = 'Bruto realizado';
    if (targetNode) targetNode.textContent = app.money(week.targetGross, 0);
    if (actualNode) actualNode.textContent = app.money(week.actualGross, 0);
    if (title) title.textContent = week.remainingGross > 0 ? `${app.money(week.remainingGross,0)} bruto ainda nesta semana` : 'Semana no ritmo';
    if (text) text.textContent = `${app.money(week.targetGross,0)} bruto para buscar ${app.money(week.targetNet,0)} líquido. ${week.remainingDays > 0 ? `${week.remainingDays} ${week.remainingDays===1?'dia planejado restante':'dias planejados restantes'}.` : 'Nenhum dia planejado restante.'}`;
  };
  const updateHome = () => {
    const calculation = app.calculations(); const hasToday = (app.state.records || []).some(record => record.date === app.todayKey());
    setRegisterCopy(hasToday); updateWeek(calculation); updateAttention();
    if (insightCard) insightCard.dataset.faroGeneric = document.getElementById('insightTitle')?.textContent?.trim() === 'Sua meta está pronta' ? 'true' : 'false';
  };

  const baseRender = app.render;
  app.render = function(...args) { const result = baseRender.apply(this,args); updateHome(); return result; };
  const baseShowView = app.showView;
  app.showView = function(view,primaryView=view) { const result = baseShowView.call(this,view,primaryView); if (view === 'dashboard') updateHome(); return result; };

  let calendarKey = app.todayKey();
  const refreshCalendarIfNeeded = () => { const nextKey = app.todayKey(); if (nextKey === calendarKey) return false; calendarKey = nextKey; app.render(); return true; };
  const refreshAfterResume = () => { if (!refreshCalendarIfNeeded()) updateHome(); };
  document.addEventListener('visibilitychange',() => { if (document.visibilityState === 'visible') refreshAfterResume(); });
  window.addEventListener('pageshow',refreshAfterResume); window.setInterval(refreshCalendarIfNeeded,60*1000); window.addEventListener('load',updateHome,{once:true});
  updateHome();
  window.FaroHome = { refresh:updateHome,refreshCalendarIfNeeded,nextCommitment };
})();