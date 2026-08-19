(() => {
  const app = window.__vettaApp;
  const planningApi = window.FaroPlanning;
  const interactions = window.FaroInteractions;
  const root = document.getElementById('faroPlanningRoot');
  if (!app || !planningApi || !interactions || !root || window.FaroR3B) return;

  const $ = id => document.getElementById(id);
  const setText = (node, value) => {
    if (!node) return;
    const next = String(value ?? '');
    if (node.textContent !== next) node.textContent = next;
  };
  const monthName = () => new Intl.DateTimeFormat('pt-BR', { month:'long' }).format(new Date());
  const monthTitle = () => {
    const value = monthName();
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  };

  const injectStyles = () => {
    if ($('faroR3BStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroR3BStyles';
    style.textContent = `
      #view-planning .faro-r3-root{font-family:"Plus Jakarta Sans",sans-serif;gap:14px}
      #view-planning .faro-r3-head{padding:3px 2px 4px;align-items:center}
      #view-planning .faro-r3-title{font-size:25px;line-height:1.05;font-weight:800;letter-spacing:-.035em;color:#0B1121}
      #view-planning .faro-r3-subtitle{margin-top:5px;font-size:12px;line-height:1.45;font-weight:600;color:#64748B}
      #view-planning .faro-r3-month{padding:8px 12px;border:1px solid #DBEAFE;border-radius:999px;background:#EFF6FF;color:#1D4ED8;font-size:10px;font-weight:800;letter-spacing:.025em;text-transform:capitalize}
      #view-planning .faro-r3-grid{gap:12px}
      #view-planning .faro-r3-tile{--r3b-accent:37,99,235;isolation:isolate;aspect-ratio:1/1;position:relative;padding:17px;border-radius:24px;border:1px solid rgba(226,232,240,.9);background:linear-gradient(150deg,#fff 16%,#F8FAFC 100%);box-shadow:0 18px 38px -30px rgba(11,17,33,.48),0 1px 2px rgba(11,17,33,.03);font-family:inherit;transition:transform .1s ease,box-shadow .2s ease,border-color .2s ease}
      #view-planning .faro-r3-tile::before{content:"";position:absolute;z-index:-1;width:96px;height:96px;right:-40px;bottom:-44px;border-radius:999px;background:rgba(var(--r3b-accent),.08);filter:blur(1px);pointer-events:none}
      #view-planning .faro-r3-tile[data-r3b-kind="days"]{--r3b-accent:30,64,175}
      #view-planning .faro-r3-tile[data-r3b-kind="cost"]{--r3b-accent:15,118,110}
      #view-planning .faro-r3-tile[data-r3b-kind="commitments"]{--r3b-accent:5,150,105}
      #view-planning .faro-r3-tile:active{transform:scale(.985);box-shadow:0 10px 24px -22px rgba(11,17,33,.4)}
      #view-planning .faro-r3-icon{width:43px;height:43px;border-radius:16px;background:rgba(var(--r3b-accent),.09);color:rgb(var(--r3b-accent));font-size:17px;box-shadow:inset 0 0 0 1px rgba(var(--r3b-accent),.05)}
      #view-planning [data-tone="amber"] .faro-r3-icon,#view-planning [data-tone="emerald"] .faro-r3-icon{background:rgba(var(--r3b-accent),.09);color:rgb(var(--r3b-accent))}
      #view-planning .faro-r3-arrow{right:13px;top:13px;width:31px;height:31px;border:1px solid #F1F5F9;border-radius:999px;background:rgba(255,255,255,.86);color:#94A3B8;font-size:10px;box-shadow:0 5px 15px -10px rgba(11,17,33,.35)}
      #view-planning .faro-r3-tile-label{font-size:10px;line-height:1.3;font-weight:800;letter-spacing:.055em;color:#64748B}
      #view-planning .faro-r3-tile-value{margin-top:4px;font-size:20px;line-height:1.08;font-weight:800;letter-spacing:-.032em;color:#0B1121}
      #view-planning .faro-r3-tile-meta{margin-top:7px;font-size:10.5px;line-height:1.38;font-weight:600;color:#64748B}
      #view-planning .faro-r3-hero{position:relative;isolation:isolate;overflow:hidden;min-height:176px;padding:21px;border:1px solid rgba(255,255,255,.08);border-radius:28px;background:linear-gradient(138deg,#0B1121 0%,#111E39 54%,#12325D 100%);box-shadow:0 24px 54px -30px rgba(11,17,33,.88);font-family:inherit;gap:13px;transition:transform .1s ease,box-shadow .2s ease}
      #view-planning .faro-r3-hero::before{content:"";position:absolute;z-index:-1;width:190px;height:190px;right:-82px;top:-96px;border-radius:999px;background:rgba(37,99,235,.45);filter:blur(44px);pointer-events:none}
      #view-planning .faro-r3-hero::after{content:"";position:absolute;z-index:-1;width:145px;height:145px;left:-76px;bottom:-105px;border-radius:999px;background:rgba(16,185,129,.26);filter:blur(42px);pointer-events:none}
      #view-planning .faro-r3-hero:active{transform:scale(.988);box-shadow:0 16px 38px -28px rgba(11,17,33,.78)}
      .faro-r3b-hero-brand{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .faro-r3b-hero-brand>span:first-child{font-size:10px;font-weight:800;letter-spacing:.075em;text-transform:uppercase;color:#BFDBFE}
      .faro-r3b-hero-mark{width:32px;height:32px;object-fit:contain;opacity:.88;filter:drop-shadow(0 7px 14px rgba(0,0,0,.16))}
      #view-planning .faro-r3-hero-value{display:block;margin-top:1px;font-size:24px;line-height:1.08;font-weight:800;letter-spacing:-.04em;color:#fff}
      .faro-r3b-hero-progress-copy{font-size:10px;font-weight:600;line-height:1.35;color:#CBD5E1}
      #view-planning .faro-r3-progress{height:7px;background:rgba(255,255,255,.12)}
      #view-planning .faro-r3-progress>span{background:linear-gradient(90deg,#60A5FA,#34D399)}
      #view-planning .faro-r3-hero-stats{gap:7px}
      #view-planning .faro-r3-hero-stats span{padding:7px 8px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.055);font-size:9.5px;font-weight:600;color:#E2E8F0;text-align:center}
      .faro-r3b-hero-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:1px}
      .faro-r3b-hero-footer small{font-size:10px;font-weight:600;color:#94A3B8}
      #view-planning .faro-r3-hero-action{display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:800;color:#DBEAFE;letter-spacing:.015em}
      .faro-r3b-updated{animation:faroR3BUpdated .42s cubic-bezier(.16,1,.3,1)}
      @keyframes faroR3BUpdated{0%{box-shadow:0 0 0 0 rgba(37,99,235,.22),0 18px 38px -30px rgba(11,17,33,.48)}45%{box-shadow:0 0 0 6px rgba(37,99,235,.08),0 22px 42px -28px rgba(11,17,33,.48)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0),0 18px 38px -30px rgba(11,17,33,.48)}}
      .faro-r3-editor,.faro-r3-editor *,.faro-dialog--focus,.faro-dialog--workspace{font-family:"Plus Jakarta Sans",sans-serif}
      .faro-r3-editor-label,.faro-plan-preview span,.faro-field label,.faro-money-tab,.faro-money-action,.faro-money-legacy>summary,.faro-plan-details>summary,.faro-detail-metric span{font-weight:800!important}
      .faro-plan-target-value{font-weight:800!important;letter-spacing:-.045em}
      .faro-plan-preview strong,.faro-field input,.faro-field select,.faro-week-day,.faro-r3-actions button,.faro-money-row strong,.faro-subview-title,.faro-detail-metric strong{font-weight:700!important}
      .faro-r3-actions button{text-transform:none;font-size:11px;letter-spacing:0}
      .faro-r3-primary{box-shadow:0 12px 24px -16px rgba(37,99,235,.75)}
      .faro-r3b-dialog-lead{margin:0 0 16px;padding:12px 14px;border-radius:16px;background:#F8FAFC;color:#64748B;font-size:11px;line-height:1.5;font-weight:600}
      .faro-r3b-dialog-symbol{width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto;border-radius:16px;background:#EFF6FF;color:#2563EB;font-size:16px;box-shadow:inset 0 0 0 1px #DBEAFE}
      .faro-dialog--workspace .faro-r3b-dialog-symbol{background:#ECFDF5;color:#047857;box-shadow:inset 0 0 0 1px #D1FAE5}
      .faro-dialog--focus .faro-dialog-head,.faro-dialog--workspace .faro-dialog-head{align-items:center}
      .faro-dialog--focus .faro-dialog-kicker,.faro-dialog--workspace .faro-dialog-kicker{font-weight:800!important}
      .faro-dialog--focus .faro-dialog-title,.faro-dialog--workspace .faro-dialog-title{font-weight:800!important;letter-spacing:-.03em}
      .faro-dialog--focus .faro-context-note,.faro-dialog--workspace .faro-context-note{border:1px solid #DBEAFE;background:linear-gradient(145deg,#EFF6FF,#F8FBFF);font-weight:600}
      .faro-dialog--workspace .faro-money-tabs{top:0;border:1px solid #E2E8F0;background:#F8FAFC}
      .faro-dialog--workspace .faro-money-row{box-shadow:0 12px 28px -26px rgba(11,17,33,.45)}
      #view-planning-detail .faro-subview-title{font-weight:800!important}
      #view-planning-detail .faro-detail-summary{background:linear-gradient(145deg,#F8FBFF,#fff);box-shadow:0 18px 40px -32px rgba(11,17,33,.45)}
      #faroOpenPlanDetail{view-transition-name:faro-plan-card}
      #view-planning-detail .faro-detail-summary{view-transition-name:faro-plan-detail}
      @media(max-width:360px){#view-planning .faro-r3-hero{min-height:166px;padding:18px}#view-planning .faro-r3-tile{padding:14px}.faro-r3b-hero-mark{width:28px;height:28px}}
      @media(prefers-reduced-motion:reduce){#view-planning .faro-r3-tile,#view-planning .faro-r3-hero{transition:none}.faro-r3b-updated{animation:none!important}}
    `;
    document.head.appendChild(style);
  };

  const addDialogLead = (dialog, text) => {
    const body = dialog?.querySelector('[data-faro-dialog-body]');
    if (!body || body.querySelector('.faro-r3b-dialog-lead')) return;
    const lead = document.createElement('p');
    lead.className = 'faro-r3b-dialog-lead';
    lead.textContent = text;
    body.prepend(lead);
  };

  const configureDialog = ({ id, variant, kicker, title, icon, lead }) => {
    const dialog = $(id);
    if (!dialog) return;
    dialog.classList.remove('faro-dialog--sheet','faro-dialog--page','faro-dialog--focus','faro-dialog--workspace');
    dialog.classList.add(`faro-dialog--${variant}`);
    const head = dialog.querySelector('.faro-dialog-head');
    const kickerNode = dialog.querySelector('.faro-dialog-kicker');
    const titleNode = dialog.querySelector('.faro-dialog-title');
    setText(kickerNode, kicker);
    setText(titleNode, title);
    if (head && !head.querySelector('.faro-r3b-dialog-symbol')) {
      const symbol = document.createElement('span');
      symbol.className = 'faro-r3b-dialog-symbol';
      symbol.setAttribute('aria-hidden','true');
      symbol.innerHTML = `<i class="fas ${icon}"></i>`;
      head.prepend(symbol);
    }
    addDialogLead(dialog, lead);
  };

  const reshapeHero = () => {
    const hero = $('faroOpenPlanDetail');
    if (!hero || hero.dataset.r3bReshaped === 'true') return;
    hero.dataset.r3bReshaped = 'true';
    hero.innerHTML = `
      <span class="faro-r3b-hero-brand">
        <span id="faroR3BHeroLabel"></span>
        <img class="faro-r3b-hero-mark" src="./faro-mark.svg" alt="" aria-hidden="true">
      </span>
      <strong id="faroPlanHeroValue" class="faro-r3-hero-value tabular"></strong>
      <span id="faroR3BHeroProgressCopy" class="faro-r3b-hero-progress-copy"></span>
      <span class="faro-r3-progress" aria-hidden="true"><span id="faroPlanProgress"></span></span>
      <span class="faro-r3-hero-stats"><span id="faroPlanDaily"></span><span id="faroPlanDays"></span><span id="faroPlanKm"></span></span>
      <span class="faro-r3b-hero-footer"><small>Seu mês em uma leitura.</small><span class="faro-r3-hero-action">Entender meu plano <i class="fas fa-arrow-right" aria-hidden="true"></i></span></span>`;
  };

  const configureCards = () => {
    const hero = $('faroOpenPlanDetail');
    const firstGrid = root.querySelector('.faro-r3-grid');
    if (hero && firstGrid && hero.nextElementSibling !== firstGrid) root.insertBefore(hero, firstGrid);

    const cards = [
      ['faroOpenMeta','goal','Meta do mês','fa-bullseye'],
      ['faroOpenAgenda','days','Dias na pista','fa-calendar-days'],
      ['faroOpenOperation','cost','Custo para rodar','fa-gas-pump'],
      ['faroOpenMoney','commitments','Compromissos','fa-wallet']
    ];
    cards.forEach(([id,kind,label,icon]) => {
      const card = $(id);
      if (!card) return;
      card.dataset.r3bKind = kind;
      const labelNode = card.querySelector('.faro-r3-tile-label');
      setText(labelNode,label);
      const iconNode = card.querySelector('.faro-r3-icon i');
      if (iconNode) iconNode.className = `fas ${icon}`;
      const arrow = card.querySelector('.faro-r3-arrow i');
      if (arrow) arrow.className = 'fas fa-chevron-right';
    });
  };

  const configureCopy = () => {
    setText(root.querySelector('.faro-r3-subtitle'),'Seu mês começa pelo plano.');
    const targetLabel = $('faroPlanningTargetCard')?.querySelector('.faro-r3-editor-label');
    setText(targetLabel,'Sua meta líquida');
    setText($('faroTargetCancel'),'Cancelar');
    setText($('faroTargetApply'),'Aplicar no meu plano');
    setText($('faroDaysCancel'),'Cancelar');
    setText($('faroDaysApply'),'Aplicar dias ao meu plano');
    setText($('faroOperationCancel'),'Cancelar');
    setText($('faroOperationApply'),'Aplicar ao meu plano');

    const detailTitle = $('view-planning-detail')?.querySelector('.faro-subview-title');
    setText(detailTitle,`Seu plano para ${monthName()}`);

    const moneyTabs = $('faroMoneyTabBills')?.closest('[role="tablist"]');
    moneyTabs?.setAttribute('aria-label','Compromissos do mês');
  };

  const normalizeConsequenceCopy = () => {
    const days = $('faroDaysConsequence');
    if (days) {
      const match = days.textContent.match(/Com essa agenda:\s*(\d+) dias no mês e cerca de (.+?) de faturamento por dia\./);
      if (match) setText(days,`Com esses dias, você terá ${match[1]} dias de pista e precisa buscar cerca de ${match[2]} por dia.`);
    }
    const operation = $('faroOperationConsequence');
    if (operation) {
      const match = operation.textContent.match(/Estimativa:\s*(.+?)\/km de energia,\s*~(.+?) km\/dia e (.+?)\/dia de faturamento\./);
      if (match) setText(operation,`Com esses números, o FARO estima ${match[1]}/km de energia, ~${match[2]} km/dia e ${match[3]} de faturamento por dia.`);
    }
  };

  const sync = () => {
    const c = app.calculations();
    const target = app.state.targetProfit;
    const actual = c.actualNet || 0;
    const pct = target > 0 ? Math.max(0,Math.min(100,actual/target*100)) : 0;
    const next = window.FaroFinance?.nextPendingOccurrence?.();

    setText($('faroPlanningMonth'),monthTitle());
    setText($('faroR3BHeroLabel'),`Seu plano para ${monthName()}`);
    setText($('faroPlanHeroValue'),`Para sobrar ${app.money(target,0)}`);
    setText($('faroR3BHeroProgressCopy'),actual > 0 ? `${app.money(actual,0)} já construídos · ${Math.round(pct)}% do caminho` : 'O FARO transforma sua meta em ritmo de pista.');
    if ($('faroPlanProgress')) $('faroPlanProgress').style.width = `${pct}%`;
    setText($('faroPlanDaily'),`${app.money(c.dailyGross,0)}/dia`);
    setText($('faroPlanDays'),`${c.ctx.plannedDays} dias de pista`);
    setText($('faroPlanKm'),`≈ ${app.integer(c.dailyKm)} km/dia`);

    setText($('faroMetaCardValue'),app.money(target,0));
    setText($('faroMetaCardMeta'),`Sua pista: ${app.money(c.dailyGross,0)}/dia`);
    setText($('faroAgendaCardValue'),`${c.ctx.plannedDays} dias`);
    setText($('faroAgendaCardMeta'),`${app.state.workWeekdays.length} dias/semana · ${app.state.extraDaysOff} folgas extras`);
    setText($('faroOperationCardValue'),`${app.state.fuel.label || 'Energia'} · ${app.money(c.fuelKm)}/km`);
    setText($('faroOperationCardMeta'),`Receita média ${app.money(app.state.revenueKm)}/km`);
    setText($('faroMoneyCardValue'),app.money(c.costs.monthlyFixed,0));
    const moneyStatus = next ? (next.days < 0 ? 'Conta atrasada' : next.days === 0 ? 'Conta vence hoje' : next.days === 1 ? 'Próxima conta amanhã' : `Próxima conta em ${next.days} dias`) : 'Tudo em dia';
    setText($('faroMoneyCardMeta'),`Contas + reservas · ${moneyStatus}`);

    normalizeConsequenceCopy();
  };

  const pulse = id => {
    const node = $(id);
    if (!node || interactions.reduceMotion()) return;
    node.classList.remove('faro-r3b-updated');
    void node.offsetWidth;
    node.classList.add('faro-r3b-updated');
    window.setTimeout(() => node.classList.remove('faro-r3b-updated'),460);
  };

  injectStyles();
  reshapeHero();
  configureCards();
  configureCopy();

  configureDialog({
    id:'faroMetaDialog', variant:'focus', kicker:'Meta do mês',
    title:'Quanto você quer que sobre no fim do mês?', icon:'fa-bullseye',
    lead:'Ajuste o objetivo. O FARO recalcula na hora quanto sua pista precisa entregar.'
  });
  configureDialog({
    id:'faroAgendaDialog', variant:'focus', kicker:'Dias na pista',
    title:'Quais dias você pretende rodar?', icon:'fa-calendar-days',
    lead:'Escolha uma rotina que você realmente consegue cumprir. O FARO redistribui o esforço do mês.'
  });
  configureDialog({
    id:'faroOperationDialog', variant:'focus', kicker:'Custo para rodar',
    title:'Quanto custa colocar o carro na pista?', icon:'fa-gas-pump',
    lead:'Use seus números reais. Eles definem quanto precisa faturar e quantos quilômetros precisa rodar.'
  });
  configureDialog({
    id:'faroMoneyDialog', variant:'workspace', kicker:'Compromissos do mês',
    title:'O que seu mês já tem comprometido', icon:'fa-wallet',
    lead:'Contas e reservas disputam espaço com sua meta. Aqui você enxerga e organiza isso sem misturar tudo na tela principal.'
  });

  const closePulse = [
    ['faroMetaDialog','faroOpenMeta'],
    ['faroAgendaDialog','faroOpenAgenda'],
    ['faroOperationDialog','faroOpenOperation']
  ];
  closePulse.forEach(([dialogId,cardId]) => $(dialogId)?.addEventListener('close', event => {
    if (event.currentTarget.returnValue === 'applied') requestAnimationFrame(() => pulse(cardId));
  }));

  const hero = $('faroOpenPlanDetail');
  hero?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const open = () => planningApi.openDetail();
    if (!interactions.reduceMotion() && typeof document.startViewTransition === 'function') document.startViewTransition(open);
    else open();
  }, true);

  const baseRender = app.render;
  app.render = function(...args) {
    const result = baseRender.apply(this,args);
    sync();
    return result;
  };
  const baseShowView = app.showView;
  app.showView = function(view,primaryView=view) {
    const result = baseShowView.call(this,view,primaryView);
    if (view === 'planning' || view === 'planning-detail') sync();
    return result;
  };

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  });
  observer.observe(root,{subtree:true,childList:true,characterData:true});

  sync();
  window.FaroR3B = Object.freeze({ sync, pulse, mode:'identity-interaction-pass' });
})();