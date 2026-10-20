(() => {
  const app = window.__vettaApp;
  const dashboard = document.getElementById('view-dashboard');
  if (!app || !dashboard || document.getElementById('faroHomeFoundation')) return;

  // F4 — Início com 1 número herói e 1 ação. Este módulo só APRESENTA: a matemática é do núcleo
  // (app.recordNumbers, app.calculations, app.weekContext) e ele nunca escreve no estado.
  const marker = document.createElement('span');
  marker.id = 'faroHomeFoundation';
  marker.hidden = true;

  const registerButton = dashboard.querySelector('[data-view="day"]');
  const legacyHero = document.getElementById('kpiGrossDaily')?.closest('#view-dashboard > *');
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
  const openPlanning = () => app.navigateToPrimary('planning');
  if (monthCard) {
    monthCard.dataset.faroRole = 'month';
    monthCard.setAttribute('role', 'button');
    monthCard.tabIndex = 0;
    monthCard.setAttribute('aria-label', 'Ver ou ajustar meta do mês');
    monthCard.addEventListener('click', openPlanning);
    monthCard.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPlanning();
    });
  }

  // ---- Herói: 1 número (lucro real de hoje) ou o convite para registrar ----
  const hero = document.createElement('section');
  hero.id = 'faroHomeHero';
  hero.dataset.faroHero = 'true';
  hero.dataset.faroTour = 'today';
  hero.setAttribute('aria-labelledby', 'faroHomeEyebrow');
  hero.innerHTML = `
    <header class="faro-home-hello"><h2 id="faroHomeGreeting"></h2><span id="faroHomeDate"></span></header>
    <div class="faro-home-beam" aria-hidden="true"></div>
    <span id="faroHomeEyebrow" class="faro-home-eyebrow"></span>
    <strong id="faroHomeValue" class="faro-home-big" data-faro-hero-value aria-live="polite"></strong>
    <strong id="faroHomeInvite" class="faro-home-invite" hidden></strong>
    <p id="faroHomeSub" class="faro-home-sub"></p>`;

  // ---- Meta do mês com marcador de ritmo (abre direto "Ajustar meta") ----
  const goal = document.createElement('button');
  goal.id = 'faroHomeGoal';
  goal.type = 'button';
  goal.dataset.faroRole = 'goal';
  goal.innerHTML = `
    <span class="faro-home-goal-top"><span id="faroGoalTitle" class="faro-home-eyebrow"></span><span class="faro-home-goal-num"><span id="faroGoalActual"></span><span id="faroGoalTarget" class="faro-home-goal-of"></span></span></span>
    <span id="faroGoalTrack" class="faro-home-track" role="img"><span class="faro-home-fill" data-faro-fill></span><span class="faro-home-pace" data-faro-pace><span>ritmo</span></span></span>
    <span id="faroGoalPill" class="faro-home-pill"></span>
    <span id="faroGoalText" class="faro-home-goal-text"></span>`;
  const openGoal = () => { openPlanning(); window.FaroPlanning?.openMeta?.(goal); };
  goal.addEventListener('click', openGoal);

  // ---- Sequência de dias registrados (derivada do histórico; nada novo é salvo) ----
  const streakCard = document.createElement('section');
  streakCard.id = 'faroHomeStreak';
  streakCard.hidden = true;
  streakCard.setAttribute('aria-label', 'Sequência de dias registrados');
  streakCard.innerHTML = `
    <span class="faro-home-flame" aria-hidden="true"><i class="fas fa-fire"></i></span>
    <span class="faro-home-streak-copy"><b id="faroStreakDays"></b><small id="faroStreakRest"></small></span>
    <span id="faroStreakBars" class="faro-home-bars" aria-hidden="true"></span>`;

  // ---- Atenção financeira (só aparece quando uma conta vence em até 3 dias) ----
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

  // ---- 1 ação primária: o botão de registro que já existe (mantém o hook data-view="day") ----
  if (registerButton) {
    registerButton.classList.remove('rounded-[1.45rem]', 'p-5', 'bg-blue-600', 'text-white', 'shadow-float', 'flex', 'justify-between', 'items-center');
    registerButton.classList.add('faro-home-cta');
    registerButton.dataset.faroPrimary = 'true';
    registerButton.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i><strong>Registrar dia</strong>';
  }

  // ---- "Detalhes": tudo que saiu do Início continua a um toque ----
  const details = document.createElement('details');
  details.id = 'faroHomeDetails';
  details.innerHTML = '<summary><span>Detalhes</span><small>Semana, mês e faturamento</small></summary><div class="faro-home-details-body"></div>';
  const detailsBody = details.querySelector('.faro-home-details-body');
  [legacyHero, weekCard, monthCard, insightCard].filter(Boolean).forEach(node => detailsBody.appendChild(node));
  const historyLink = document.createElement('button');
  historyLink.type = 'button';
  historyLink.className = 'faro-home-link';
  historyLink.textContent = 'Ver histórico';
  historyLink.addEventListener('click', () => app.navigateToPrimary('history'));
  detailsBody.appendChild(historyLink);

  [hero, goal, streakCard, attention, registerButton, details, marker].filter(Boolean).forEach(node => dashboard.appendChild(node));

  if (!document.getElementById('faroHomeStyles')) {
    const style = document.createElement('style');
    style.id = 'faroHomeStyles';
    style.textContent = `
      :root{
        /* Cores da marca moram em faro-theme.css (fonte única); aqui só os apelidos do Início. */
        --faro-home-bg:var(--faro-paper);--faro-home-surface:var(--faro-surface);--faro-home-surface-2:var(--faro-surface-2);
        --faro-home-ink:var(--faro-ink);--faro-home-muted:var(--faro-muted);--faro-home-line:var(--faro-line);
        --faro-home-amber:var(--faro-amber);--faro-home-on-amber:var(--faro-on-amber);--faro-home-amber-soft:var(--faro-amber-soft);--faro-home-amber-text:var(--faro-amber-text);
        --faro-home-profit:var(--faro-profit);--faro-home-profit-soft:var(--faro-profit-soft);--faro-home-loss:var(--faro-loss);--faro-home-loss-soft:var(--faro-loss-soft);
        --faro-home-ring:var(--faro-focus);
        --faro-home-display:"Bahnschrift","DIN Alternate","Avenir Next Condensed","Roboto Condensed","Arial Narrow","Helvetica Neue",sans-serif;
      }
      @media (prefers-color-scheme:dark){:root{
        --faro-home-bg:var(--faro-night);--faro-home-surface:var(--faro-night-surface);--faro-home-surface-2:#22252B;
        --faro-home-ink:#F5F1E6;--faro-home-muted:#ABABA2;--faro-home-line:#2E3138;
        --faro-home-amber:var(--faro-amber-night);--faro-home-on-amber:var(--faro-black);--faro-home-amber-soft:#2B2410;--faro-home-amber-text:var(--faro-amber-night);
        --faro-home-profit:var(--faro-profit-night);--faro-home-profit-soft:#103324;--faro-home-loss:#FF8A80;--faro-home-loss-soft:#3A1816;
        --faro-home-ring:#7AA2FF;
      }}
      body:has(#view-dashboard:not(.hidden)){background:var(--faro-home-bg)}
      #view-dashboard{color:var(--faro-home-ink);background:var(--faro-home-bg)}
      #view-dashboard [hidden]{display:none!important}
      #view-dashboard :is(button,summary,a,[role="button"]):focus-visible{outline:3px solid var(--faro-home-ring);outline-offset:3px}
      #view-dashboard .faro-home-eyebrow{display:block;font:800 13px/1.2 var(--faro-home-display);letter-spacing:.08em;text-transform:uppercase;color:var(--faro-home-muted)}
      #faroHomeHero{position:relative;padding:4px 2px 0}
      #faroHomeHero .faro-home-hello{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:22px}
      #faroHomeHero .faro-home-hello h2{font:800 22px/1.1 var(--faro-home-display);letter-spacing:.03em;text-transform:uppercase;color:var(--faro-home-ink)}
      #faroHomeHero .faro-home-hello span{font-size:14px;font-weight:600;color:var(--faro-home-muted)}
      #faroHomeHero .faro-home-beam{position:absolute;right:-20px;left:30%;top:24px;height:170px;opacity:.55;pointer-events:none;clip-path:polygon(100% 40%,0 0,0 100%,100% 60%);background:linear-gradient(260deg,color-mix(in srgb,var(--faro-home-amber) 50%,transparent),transparent 80%)}
      #faroHomeHero .faro-home-big{position:relative;display:block;margin-top:6px;font:800 76px/.95 var(--faro-home-display);letter-spacing:-.01em;color:var(--faro-home-profit);font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}
      #faroHomeHero .faro-home-big small{font-size:32px;font-weight:700;margin-right:6px}
      #faroHomeHero[data-state="loss"] .faro-home-big{color:var(--faro-home-loss)}
      #faroHomeHero .faro-home-invite{position:relative;display:block;margin-top:8px;font:800 40px/1 var(--faro-home-display);letter-spacing:-.01em;color:var(--faro-home-ink)}
      #faroHomeHero .faro-home-sub{position:relative;margin-top:12px;font-size:16px;line-height:1.4;color:var(--faro-home-muted)}
      #faroHomeHero .faro-home-sub b{color:var(--faro-home-ink);font-weight:800;font-variant-numeric:tabular-nums}
      #faroHomeGoal{display:block;width:100%;text-align:left;margin-top:8px;padding:20px 2px 4px;border-top:2px solid var(--faro-home-line);border-radius:0;background:none;color:var(--faro-home-ink);min-height:48px;cursor:pointer}
      #faroHomeGoal .faro-home-goal-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
      #faroHomeGoal .faro-home-goal-num{font:800 30px/1 var(--faro-home-display);font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}
      #faroHomeGoal .faro-home-goal-of{color:var(--faro-home-muted);font-size:20px}
      #faroHomeGoal .faro-home-track{position:relative;display:block;height:16px;border-radius:8px;background:var(--faro-home-surface-2);margin:34px 0 12px}
      #faroHomeGoal .faro-home-fill{position:absolute;inset:0 auto 0 0;border-radius:8px;background:var(--faro-home-profit);transition:width .4s cubic-bezier(.16,1,.3,1)}
      #faroHomeGoal .faro-home-pace{position:absolute;top:-8px;bottom:-8px;width:4px;margin-left:-2px;border-radius:2px;background:var(--faro-home-ink)}
      #faroHomeGoal .faro-home-pace span{position:absolute;top:-21px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;color:var(--faro-home-muted)}
      #faroHomeGoal .faro-home-pill{display:inline-block;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:800;background:var(--faro-home-profit-soft);color:var(--faro-home-profit);font-variant-numeric:tabular-nums}
      #faroHomeGoal[data-pace="behind"] .faro-home-pill{background:var(--faro-home-loss-soft);color:var(--faro-home-loss)}
      #faroHomeGoal .faro-home-goal-text{display:block;margin-top:10px;font-size:16px;line-height:1.4;color:var(--faro-home-ink)}
      #faroHomeGoal .faro-home-goal-text b{font-weight:800;font-variant-numeric:tabular-nums}
      #faroHomeStreak:not([hidden]){display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:18px;background:var(--faro-home-amber-soft);color:var(--faro-home-ink)}
      #faroHomeStreak .faro-home-flame{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--faro-home-amber);color:var(--faro-home-on-amber);font-size:22px}
      #faroHomeStreak b{display:block;font:800 24px/1 var(--faro-home-display);font-variant-numeric:tabular-nums}
      #faroHomeStreak small{display:block;margin-top:3px;font-size:14px;color:var(--faro-home-muted)}
      #faroHomeStreak .faro-home-bars{margin-left:auto;display:flex;gap:4px}
      #faroHomeStreak .faro-home-bars i{width:10px;height:26px;border-radius:5px;background:var(--faro-home-surface-2)}
      #faroHomeStreak .faro-home-bars i[data-day="on"]{background:var(--faro-home-amber)}
      #faroHomeStreak .faro-home-bars i[data-day="off"]{background:transparent;box-shadow:inset 0 0 0 2px var(--faro-home-amber)}
      #view-dashboard [data-view="day"][data-faro-primary="true"].faro-action-card{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:56px;padding:0 20px;border:0!important;border-radius:16px;background:var(--faro-home-amber)!important;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)!important;font-size:18px;font-weight:800;transition:transform .12s ease}
      #view-dashboard [data-view="day"][data-faro-primary="true"].faro-action-card *{color:var(--faro-home-on-amber)!important}
      #view-dashboard [data-view="day"][data-faro-primary="true"].faro-action-card:active{transform:scale(.985)}
      #faroHomeDetails{border-top:2px solid var(--faro-home-line);padding-top:2px}
      #faroHomeDetails>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:8px 2px;cursor:pointer;color:var(--faro-home-ink)}
      #faroHomeDetails .overflow-hidden{overflow:clip;contain:paint}
      #faroHomeDetails>summary::-webkit-details-marker{display:none}
      #faroHomeDetails>summary span{font-size:16px;font-weight:800}
      #faroHomeDetails>summary small{font-size:13px;color:var(--faro-home-muted);text-align:right}
      #faroHomeDetails>summary::after{content:'+';flex:none;width:28px;height:28px;border-radius:999px;display:grid;place-items:center;background:var(--faro-home-surface-2);font-size:18px;font-weight:700}
      #faroHomeDetails[open]>summary::after{content:'−'}
      #faroHomeDetails .faro-home-details-body{display:grid;gap:16px;padding:8px 0 4px}
      #faroHomeDetails .faro-home-link{min-height:48px;padding:0 4px;font-size:15px;font-weight:800;color:var(--faro-home-ink);text-decoration:underline;text-underline-offset:3px;justify-self:start}
      #view-dashboard [data-faro-role="week"]{border-color:var(--faro-line);background:var(--faro-surface)}
      #view-dashboard [data-faro-role="month"]{box-shadow:var(--faro-shadow-card,0 12px 30px -18px rgba(15,23,42,.18));cursor:pointer;position:relative;padding-right:2.8rem}
      #view-dashboard [data-faro-role="month"]::after{content:'›';position:absolute;right:1.15rem;top:50%;transform:translateY(-50%);font-size:28px;color:#94a3b8;font-weight:500}
      #faroHomeAttention{border-color:#fed7aa;background:linear-gradient(180deg,#fff,#fffaf5);transition:transform .12s ease,border-color .16s ease,background-color .16s ease}
      #faroHomeAttention[data-overdue="true"]{border-color:#fecaca;background:linear-gradient(180deg,#fff,#fff7f7)}
      #faroHomeAttention:active{transform:scale(.99)}
      @media(prefers-reduced-motion:reduce){#faroHomeAttention,#faroHomeGoal .faro-home-fill,#view-dashboard [data-faro-primary="true"]{transition:none}#faroHomeAttention:active,#view-dashboard [data-faro-primary="true"]:active{transform:none!important}}
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

  // Sequência: dias seguidos com registro, contando para trás a partir de hoje (hoje ainda sem
  // registro não quebra). Cada semana (segunda a domingo) tem 1 folga livre: um dia sem registro
  // não quebra a sequência; o segundo dia sem registro na mesma semana quebra.
  const weekKeyOf = date => { const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return app.dateKey(monday); };
  const streak = (dateKeys, todayKey = app.todayKey()) => {
    const registered = new Set(dateKeys);
    const today = app.parseDate(todayKey);
    const oldest = [...registered].sort()[0];
    const restWeeks = new Set();
    const cursor = new Date(today);
    if (!registered.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
    let days = 0;
    for (let guard = 0; oldest && guard < 1200; guard += 1) {
      const key = app.dateKey(cursor);
      if (key < oldest) break;
      if (registered.has(key)) days += 1;
      else { const week = weekKeyOf(cursor); if (restWeeks.has(week)) break; restWeeks.add(week); }
      cursor.setDate(cursor.getDate() - 1);
    }
    const thisWeek = weekKeyOf(today);
    const restUsedThisWeek = days > 0 && restWeeks.has(thisWeek);
    const last7 = Array.from({ length:7 }, (_, index) => {
      const date = new Date(today); date.setDate(today.getDate() - (6 - index));
      const key = app.dateKey(date);
      return { key, state: registered.has(key) ? 'on' : key === todayKey ? 'today' : 'off' };
    });
    return { days, restUsedThisWeek, last7 };
  };

  const moneyParts = value => {
    const text = app.money(value);
    const number = text.replace(/^-?\s*R\$\s*/, '');
    return { text, number };
  };
  const integer = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits:0 }).format(Math.round(Number(value) || 0));
  const strongMoney = (value, digits = 2) => { const b = document.createElement('b'); b.textContent = app.money(value, digits); return b; };
  const fill = (node, parts) => { node.replaceChildren(...parts.map(part => typeof part === 'string' ? document.createTextNode(part) : part)); };
  const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'; };

  const setRegisterCopy = hasToday => {
    if (!registerButton) return;
    const strong = registerButton.querySelector('strong');
    if (strong) strong.textContent = hasToday ? 'Editar dia' : 'Registrar dia';
    registerButton.setAttribute('aria-label', hasToday ? 'Editar dia de hoje' : 'Registrar dia');
  };

  const updateHero = calculation => {
    const records = app.state.records || [];
    const todayRecord = records.find(record => record.date === app.todayKey());
    const value = document.getElementById('faroHomeValue');
    const invite = document.getElementById('faroHomeInvite');
    const eyebrow = document.getElementById('faroHomeEyebrow');
    const sub = document.getElementById('faroHomeSub');
    document.getElementById('faroHomeGreeting').textContent = greeting();
    document.getElementById('faroHomeDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
    if (todayRecord) {
      const numbers = app.recordNumbers(todayRecord, app.monthContext(app.parseDate(todayRecord.date)));
      const loss = numbers.net < 0;
      hero.dataset.state = loss ? 'loss' : 'profit';
      eyebrow.textContent = loss ? 'Prejuízo real de hoje' : 'Lucro real de hoje';
      const small = document.createElement('small'); small.textContent = 'R$';
      fill(value, [small, moneyParts(Math.abs(numbers.net)).number]);
      value.hidden = false; invite.hidden = true;
      fill(sub, ['Entrou ', strongMoney(numbers.gross), ' · saiu ', strongMoney(numbers.gross - numbers.net), ' com combustível, taxas e reservas.']);
      return;
    }
    hero.dataset.state = 'empty';
    eyebrow.textContent = 'Hoje';
    value.hidden = true; value.textContent = ''; invite.hidden = false;
    if (!records.length) {
      invite.textContent = 'Registre seu primeiro dia';
      sub.textContent = 'Leva menos de um minuto. Aqui aparece quanto sobrou de verdade.';
    } else {
      invite.textContent = 'Registre o dia de hoje';
      if (calculation.dailyNet > 0) fill(sub, ['Para ficar no ritmo, hoje precisa sobrar ', strongMoney(calculation.dailyNet, 0), '.']);
      else sub.textContent = 'Sua meta do mês já foi batida. O que entrar hoje é extra.';
    }
  };

  const updateGoal = calculation => {
    const target = Number(app.state.targetProfit) || 0;
    const actual = calculation.actualNet;
    const month = new Date().toLocaleDateString('pt-BR', { month:'long' });
    const ratio = value => target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
    document.getElementById('faroGoalTitle').textContent = `Meta de ${month}`;
    document.getElementById('faroGoalActual').textContent = integer(actual);
    document.getElementById('faroGoalTarget').textContent = ` / ${integer(target)}`;
    goal.querySelector('[data-faro-fill]').style.width = `${(ratio(actual) * 100).toFixed(1)}%`;
    goal.querySelector('[data-faro-pace]').style.left = `${(ratio(calculation.expectedNetToDate) * 100).toFixed(1)}%`;
    const delta = calculation.paceDelta;
    const ahead = delta >= 0.5, behind = delta <= -0.5;
    goal.dataset.pace = ahead ? 'ahead' : behind ? 'behind' : 'on';
    const pill = ahead ? `${app.money(delta, 0)} à frente` : behind ? `${app.money(Math.abs(delta), 0)} atrás do ritmo` : 'No ritmo';
    const pillNode = document.getElementById('faroGoalPill');
    pillNode.textContent = pill;
    // Sem nenhum dia registrado no mês ainda não há ritmo para julgar: o marcador fica, o veredito não.
    pillNode.hidden = !calculation.records.length;
    document.getElementById('faroGoalTrack').setAttribute('aria-label', `${Math.round(ratio(actual) * 100)}% da meta${calculation.records.length ? `; ${pill}` : ''}`);
    const remaining = target - actual;
    const text = document.getElementById('faroGoalText');
    if (remaining <= 0) text.textContent = 'Meta batida. Tudo que entrar agora é extra.';
    else if (calculation.remainingDays > 0) {
      const days = calculation.remainingDays;
      fill(text, ['Faltam ', strongMoney(remaining, 0), '. Sobrando ', strongMoney(calculation.dailyNet, 0), ` por dia nos ${days} ${days === 1 ? 'dia que resta' : 'dias que restam'}, você fecha.`]);
    } else fill(text, ['Faltam ', strongMoney(remaining, 0), '. Não restam dias planejados: ajuste a meta ou a agenda.']);
    goal.setAttribute('aria-label', `Meta de ${month}: ${app.money(actual, 0)} de ${app.money(target, 0)}${calculation.records.length ? `, ${pill}` : ''}. Ajustar meta`);
  };

  const updateStreak = () => {
    const result = streak((app.state.records || []).map(record => record.date));
    streakCard.hidden = result.days < 1;
    if (streakCard.hidden) return;
    document.getElementById('faroStreakDays').textContent = `${result.days} ${result.days === 1 ? 'dia' : 'dias'}`;
    document.getElementById('faroStreakRest').textContent = `${result.days === 1 ? 'registrado' : 'seguidos'} · ${result.restUsedThisWeek ? 'folga da semana usada' : '1 folga livre'}`;
    document.getElementById('faroStreakBars').replaceChildren(...result.last7.map(day => { const bar = document.createElement('i'); bar.dataset.day = day.state; return bar; }));
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
  // Detalhes: a semana continua em bruto (é uma projeção operacional), só que recolhida.
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
    setRegisterCopy(hasToday); updateHero(calculation); updateGoal(calculation); updateStreak(); updateWeek(calculation); updateAttention();
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
  window.FaroHome = { refresh:updateHome,refreshCalendarIfNeeded,nextCommitment,streak,openGoal };
})();
