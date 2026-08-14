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

  if (weekCard && monthCard && weekCard.parentElement === monthCard.parentElement) {
    monthCard.parentElement.insertBefore(weekCard, monthCard);
  }

  if (weekCard) {
    weekCard.dataset.faroRole = 'week';
    weekCard.setAttribute('aria-label', 'Resumo da semana');
  }
  if (monthCard) {
    monthCard.dataset.faroRole = 'month';
    monthCard.setAttribute('aria-label', 'Resumo do mês');
  }

  const attention = document.createElement('button');
  attention.id = 'faroHomeAttention';
  attention.type = 'button';
  attention.className = 'hidden w-full card-vetta p-5 text-left faro-home-attention';
  attention.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 grid place-items-center shrink-0" aria-hidden="true"><i class="fas fa-calendar-day"></i></span>
      <span class="min-w-0 flex-1">
        <span class="label-micro !mb-1 !text-amber-700">Próximo compromisso</span>
        <strong id="faroAttentionTitle" class="block text-sm text-slate-800"></strong>
        <span id="faroAttentionText" class="block text-xs text-slate-500 mt-1"></span>
      </span>
      <i class="fas fa-chevron-right text-slate-300" aria-hidden="true"></i>
    </div>`;
  attention.addEventListener('click', () => app.openSecondary('settings'));

  if (weekCard?.parentElement) weekCard.insertAdjacentElement('afterend', attention);
  else if (monthCard?.parentElement) monthCard.insertAdjacentElement('beforebegin', attention);

  if (!document.getElementById('faroHomeStyles')) {
    const style = document.createElement('style');
    style.id = 'faroHomeStyles';
    style.textContent = `
      #view-dashboard [data-faro-role="week"]{border-color:#dbeafe;background:linear-gradient(180deg,#fff,#f8fbff)}
      #view-dashboard [data-faro-role="month"]{box-shadow:0 12px 30px -18px rgba(15,23,42,.18)}
      #faroHomeAttention{border-color:#fed7aa;background:linear-gradient(180deg,#fff,#fffaf5);transition:transform .12s ease,border-color .16s ease}
      #faroHomeAttention:active{transform:scale(.99)}
      #view-dashboard [data-view="day"]{position:relative;overflow:hidden}
      #view-dashboard [data-view="day"]::after{content:'';position:absolute;inset:auto -30px -45px auto;width:110px;height:110px;border-radius:999px;background:rgba(255,255,255,.08);pointer-events:none}
      @media(prefers-reduced-motion:reduce){#faroHomeAttention{transition:none}#faroHomeAttention:active{transform:none}}
    `;
    document.head.appendChild(style);
  }

  const startOfToday = () => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  };

  const daysBetween = (from, to) => Math.round((to.getTime() - from.getTime()) / 86400000);

  const nextMonthlyDue = (dueDay, today) => {
    const day = Number(dueDay);
    if (!Number.isFinite(day) || day < 1 || day > 31) return null;
    const build = (year, month) => {
      const last = new Date(year, month + 1, 0, 12).getDate();
      return new Date(year, month, Math.min(day, last), 12);
    };
    let due = build(today.getFullYear(), today.getMonth());
    if (due < today) due = build(today.getFullYear(), today.getMonth() + 1);
    return due;
  };

  const nextWeeklyDue = (weekday, today) => {
    const target = Number(weekday);
    if (!Number.isInteger(target) || target < 0 || target > 6) return null;
    const due = new Date(today);
    due.setDate(today.getDate() + ((target - today.getDay() + 7) % 7));
    return due;
  };

  const nextCommitment = () => {
    const today = startOfToday();
    const candidates = (app.state.costs || [])
      .filter(cost => cost?.active !== false && cost?.category === 'obligation')
      .map(cost => {
        const due = cost.kind === 'weekly'
          ? nextWeeklyDue(cost.dueWeekday, today)
          : cost.kind === 'monthly'
            ? nextMonthlyDue(cost.dueDay, today)
            : null;
        return due ? { cost, due, days: daysBetween(today, due) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.due - b.due || Number(b.cost.value || 0) - Number(a.cost.value || 0));
    return candidates[0] || null;
  };

  const plannedWeekRemaining = () => {
    const today = startOfToday();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const recordDates = new Set((app.state.records || []).map(record => record.date));
    let remaining = 0;
    for (const cursor = new Date(today); cursor <= sunday; cursor.setDate(cursor.getDate() + 1)) {
      if (!app.state.workWeekdays.includes(cursor.getDay())) continue;
      if (!recordDates.has(app.dateKey(cursor))) remaining += 1;
    }
    return remaining;
  };

  const setRegisterCopy = hasToday => {
    if (!registerButton) return;
    const small = registerButton.querySelector('span.block');
    const strong = registerButton.querySelector('strong');
    if (small) small.textContent = hasToday ? 'Hoje já está registrado' : 'Próxima ação';
    if (strong) strong.textContent = hasToday ? 'Revisar meu dia' : 'Registrar meu dia';
    registerButton.setAttribute('aria-label', hasToday ? 'Revisar registro de hoje' : 'Registrar meu dia');
  };

  const updateAttention = () => {
    const item = nextCommitment();
    if (!item || item.days > 3) {
      attention.classList.add('hidden');
      return;
    }
    const when = item.days === 0 ? 'vence hoje' : item.days === 1 ? 'vence amanhã' : `vence em ${item.days} dias`;
    document.getElementById('faroAttentionTitle').textContent = `${item.cost.name} · ${app.money(Number(item.cost.value || 0), 0)}`;
    document.getElementById('faroAttentionText').textContent = `${when}. Abra seus custos para conferir.`;
    attention.classList.remove('hidden');
  };

  const updateWeek = calculation => {
    if (!weekCard) return;
    const week = app.weekContext(calculation);
    const remaining = Math.max(0, week.target - week.actual);
    const remainingDays = plannedWeekRemaining();
    const title = document.getElementById('weekStatusTitle');
    const text = document.getElementById('weekStatusText');
    if (title) {
      title.textContent = week.actual >= week.target && week.target > 0
        ? 'Semana no ritmo'
        : remaining > 0
          ? `${app.money(remaining, 0)} para fechar a semana`
          : 'Seu ritmo desta semana';
    }
    if (text) {
      text.textContent = remainingDays > 0
        ? `${remainingDays} ${remainingDays === 1 ? 'dia planejado restante' : 'dias planejados restantes'}.`
        : 'Nenhum dia planejado restante nesta semana.';
    }
  };

  const updateHome = () => {
    const calculation = app.calculations();
    const hasToday = (app.state.records || []).some(record => record.date === app.todayKey());
    setRegisterCopy(hasToday);
    updateWeek(calculation);
    updateAttention();

    if (insightCard) {
      const insightTitle = document.getElementById('insightTitle')?.textContent?.trim();
      insightCard.dataset.faroGeneric = insightTitle === 'Sua meta está pronta' ? 'true' : 'false';
    }
  };

  const baseRender = app.render;
  app.render = function(...args) {
    const result = baseRender.apply(this, args);
    updateHome();
    return result;
  };

  const baseShowView = app.showView;
  app.showView = function(view, primaryView = view) {
    const result = baseShowView.call(this, view, primaryView);
    if (view === 'dashboard') updateHome();
    return result;
  };

  updateHome();
  window.FaroHome = { refresh: updateHome, nextCommitment };
})();
