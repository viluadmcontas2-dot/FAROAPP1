(() => {
  const app = window.__vettaApp;
  const planningApi = window.FaroPlanning;
  const interactions = window.FaroInteractions;
  const root = document.getElementById('faroPlanningRoot');
  if (!app || !planningApi || !interactions || !root || window.FaroR3B) return;

  const $ = id => document.getElementById(id);
  const WEEK = [{day:1,label:'S'},{day:2,label:'T'},{day:3,label:'Q'},{day:4,label:'Q'},{day:5,label:'S'},{day:6,label:'S'},{day:0,label:'D'}];
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
  const energyIcon = type => ({
    electric:'fa-bolt', gasoline:'fa-gas-pump', ethanol:'fa-gas-pump', diesel:'fa-gas-pump', gnv:'fa-gauge-high', custom:'fa-sliders'
  }[type] || 'fa-gas-pump');
  const monthlyEquivalent = cost => {
    const value = app.number(cost?.value);
    if (!cost || cost.active === false) return 0;
    if (cost.kind === 'monthly') return value;
    if (cost.kind === 'weekly') return value * 52 / 12;
    if (cost.kind === 'one_time') {
      const current = new Date().toISOString().slice(0,7);
      return cost.month === current ? value : 0;
    }
    return 0;
  };
  const occurrenceWhen = item => {
    if (item.status === 'paid') return 'Resolvida';
    if (item.days < 0) return `${Math.abs(item.days)} ${Math.abs(item.days) === 1 ? 'dia' : 'dias'} de atraso`;
    if (item.days === 0) return 'Vence hoje';
    if (item.days === 1) return 'Vence amanhã';
    return `Vence em ${item.days} dias`;
  };
  const dueDateLabel = item => {
    if (item.days < 0) return `ATRASADA · ${Math.abs(item.days)}D`;
    if (item.days === 0) return 'HOJE';
    if (item.days === 1) return 'AMANHÃ';
    return new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).format(item.due).replace('.', '').toUpperCase();
  };
  const reservePlannedText = reserve => reserve.kind === 'monthly' ? `${app.money(reserve.value,0)}/mês alimentam o plano` : reserve.kind === 'weekly' ? `${app.money(reserve.value,0)}/semana alimentam o plano` : reserve.kind === 'per_km' ? `${app.money(reserve.value)}/km alimentam esta reserva` : `${app.money(reserve.value,0)} planejados`;

  const moneyViewModel = () => {
    const finance = window.FaroFinance;
    const reservesApi = window.FaroReserves;
    const occurrences = finance?.occurrences?.({ daysBack:45, daysForward:60, includePaid:true }) || [];
    const pending = occurrences.filter(item => item.status === 'pending');
    const paid = occurrences.filter(item => item.status === 'paid').sort((a,b) => b.due - a.due);
    const overdue = pending.filter(item => item.days < 0);
    const dueSoon = pending.filter(item => item.days >= 0 && item.days <= 1);
    const next7 = pending.filter(item => item.days >= 0 && item.days <= 7);
    const later = pending.filter(item => item.days > 7);
    const obligations = (app.state.costs || []).filter(cost => cost?.active !== false && cost?.category === 'obligation');
    const reserveRules = (app.state.costs || []).filter(cost => cost?.active !== false && cost?.category === 'reserve');
    const reserveBalance = reserveRules.reduce((sum,reserve) => sum + app.number(reservesApi?.balanceFor?.(reserve.id)), 0);
    const reserveGoals = reserveRules.filter(reserve => app.number(app.state.reserveProfiles?.[reserve.id]?.goalAmount) > 0).length;
    const obligationMonthly = obligations.reduce((sum,cost) => sum + monthlyEquivalent(cost),0);
    const committed = app.number(app.calculations()?.costs?.monthlyFixed);
    const overdueAmount = overdue.reduce((sum,item) => sum + app.number(item.amount),0);
    const attentionAmount = dueSoon.reduce((sum,item) => sum + app.number(item.amount),0);
    const next7Amount = next7.reduce((sum,item) => sum + app.number(item.amount),0);
    const pendingAmount = pending.filter(item => item.days <= 31).reduce((sum,item) => sum + app.number(item.amount),0);
    let state = 'calm';
    if (overdue.length) state = 'risk';
    else if (dueSoon.length) state = 'attention';
    else if (next7.length) state = 'upcoming';
    const accents = { calm:'5,150,105', upcoming:'37,99,235', attention:'194,65,12', risk:'185,28,28' };
    const labels = { calm:'ROTA TRANQUILA', upcoming:'DE OLHO NA ROTA', attention:'PRECISA DE VOCÊ', risk:'FORA DA ROTA' };
    const icons = { calm:'fa-circle-check', upcoming:'fa-location-dot', attention:'fa-bell', risk:'fa-triangle-exclamation' };
    const next = pending[0] || null;
    return {
      occurrences,pending,paid,overdue,dueSoon,next7,later,obligations,reserveRules,reserveBalance,reserveGoals,
      obligationMonthly,committed,overdueAmount,attentionAmount,next7Amount,pendingAmount,state,
      accent:accents[state],label:labels[state],icon:icons[state],next
    };
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
      #view-planning .faro-r3-tile{--r3b-accent:37,99,235;isolation:isolate;aspect-ratio:1/1;position:relative;padding:15px;border-radius:24px;border:1px solid rgba(var(--r3b-accent),.12);background:linear-gradient(150deg,#fff 10%,rgba(var(--r3b-accent),.045) 100%);box-shadow:0 18px 38px -30px rgba(11,17,33,.48),0 1px 2px rgba(11,17,33,.03),inset 0 2px 0 rgba(var(--r3b-accent),.08);font-family:inherit;display:grid;grid-template-rows:auto 1fr auto;gap:8px;overflow:hidden;transition:transform .1s ease,box-shadow .2s ease,border-color .2s ease,background .22s ease}
      #view-planning .faro-r3-tile::before{content:"";position:absolute;z-index:-1;width:112px;height:112px;right:-46px;bottom:-52px;border-radius:999px;background:rgba(var(--r3b-accent),.11);filter:blur(2px);pointer-events:none;transition:transform .22s cubic-bezier(.16,1,.3,1),opacity .2s ease}
      #view-planning .faro-r3-tile[data-r3b-kind="goal"]{--r3b-accent:37,99,235;background:linear-gradient(150deg,#fff 8%,#F3F7FF 100%)}
      #view-planning .faro-r3-tile[data-r3b-kind="days"]{--r3b-accent:30,64,175;background:linear-gradient(150deg,#fff 8%,#F4F6FF 100%)}
      #view-planning .faro-r3-tile[data-r3b-kind="cost"]{--r3b-accent:15,118,110;background:linear-gradient(150deg,#fff 8%,#F1FAF8 100%)}
      #view-planning .faro-r3-tile[data-r3b-kind="commitments"][data-r3b-state="calm"]{--r3b-accent:5,150,105;background:linear-gradient(150deg,#fff 8%,#F0FBF6 100%)}
      #view-planning .faro-r3-tile[data-r3b-kind="commitments"][data-r3b-state="upcoming"]{--r3b-accent:37,99,235;background:linear-gradient(150deg,#fff 8%,#F3F7FF 100%)}
      #view-planning .faro-r3-tile[data-r3b-kind="commitments"][data-r3b-state="attention"]{--r3b-accent:194,65,12;background:linear-gradient(150deg,#fff 8%,#FFF7ED 100%)}
      #view-planning .faro-r3-tile[data-r3b-kind="commitments"][data-r3b-state="risk"]{--r3b-accent:185,28,28;background:linear-gradient(150deg,#fff 8%,#FEF2F2 100%)}
      #view-planning .faro-r3-tile:active{transform:scale(.982);box-shadow:0 9px 22px -20px rgba(11,17,33,.42),inset 0 2px 0 rgba(var(--r3b-accent),.11)}
      #view-planning .faro-r3-tile:active::before{transform:scale(1.12);opacity:.82}
      #view-planning .faro-r3-icon{width:43px;height:43px;border-radius:16px;background:rgba(var(--r3b-accent),.1);color:rgb(var(--r3b-accent));font-size:17px;box-shadow:inset 0 0 0 1px rgba(var(--r3b-accent),.07);transition:transform .14s cubic-bezier(.16,1,.3,1),background .18s ease}
      #view-planning .faro-r3-tile:active .faro-r3-icon{transform:scale(.93) rotate(-2deg);background:rgba(var(--r3b-accent),.15)}
      #view-planning .faro-r3-arrow{right:12px;top:12px;width:30px;height:30px;border:1px solid rgba(var(--r3b-accent),.09);border-radius:999px;background:rgba(255,255,255,.82);color:rgba(var(--r3b-accent),.74);font-size:9px;box-shadow:0 5px 15px -10px rgba(11,17,33,.35);transition:transform .14s cubic-bezier(.16,1,.3,1),background .18s ease}
      #view-planning .faro-r3-tile:active .faro-r3-arrow{transform:translateX(3px);background:#fff}
      .faro-r3b-card-copy{align-self:end;min-width:0}
      #view-planning .faro-r3-tile-label{font-size:9.5px;line-height:1.3;font-weight:800;letter-spacing:.055em;color:#64748B}
      #view-planning .faro-r3-tile-value{margin-top:4px;font-size:20px;line-height:1.08;font-weight:800;letter-spacing:-.032em;color:#0B1121;overflow-wrap:anywhere}
      #view-planning .faro-r3-tile-meta{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:6px;font-size:10px;line-height:1.35;font-weight:600;color:#64748B}
      .faro-r3b-card-cta{min-height:24px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding-top:6px;border-top:1px solid rgba(var(--r3b-accent),.1);font-size:9.5px;line-height:1.2;font-weight:800;color:rgb(var(--r3b-accent));letter-spacing:.01em}
      .faro-r3b-card-cta i{font-size:8px;transition:transform .14s cubic-bezier(.16,1,.3,1)}
      #view-planning .faro-r3-tile:active .faro-r3b-card-cta i{transform:translateX(4px)}
      .faro-r3b-week-strip{display:flex;align-items:center;gap:3px;margin-top:6px}
      .faro-r3b-week-dot{width:15px;height:15px;display:grid;place-items:center;border-radius:999px;background:rgba(30,64,175,.07);color:#94A3B8;font-size:6.5px;font-weight:800;line-height:1}
      .faro-r3b-week-dot[data-active="true"]{background:#1E40AF;color:#fff;box-shadow:0 4px 10px -6px rgba(30,64,175,.75)}
      .faro-r3b-status-pill{display:inline-flex;align-items:center;width:max-content;max-width:100%;margin-top:6px;padding:4px 7px;border-radius:999px;background:rgba(var(--r3b-accent),.09);color:rgb(var(--r3b-accent));font-size:8.5px;line-height:1;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #view-planning .faro-r3-hero{position:relative;isolation:isolate;overflow:hidden;min-height:176px;padding:21px;border:1px solid rgba(255,255,255,.08);border-radius:28px;background:linear-gradient(138deg,#0B1121 0%,#111E39 54%,#12325D 100%);box-shadow:0 24px 54px -30px rgba(11,17,33,.88);font-family:inherit;gap:13px;transition:transform .1s ease,box-shadow .2s ease}
      #view-planning .faro-r3-hero::before{content:"";position:absolute;z-index:-1;width:190px;height:190px;right:-82px;top:-96px;border-radius:999px;background:rgba(37,99,235,.45);filter:blur(44px);pointer-events:none}
      #view-planning .faro-r3-hero::after{content:"";position:absolute;z-index:-1;width:145px;height:145px;left:-76px;bottom:-105px;border-radius:999px;background:rgba(16,185,129,.26);filter:blur(42px);pointer-events:none}
      #view-planning .faro-r3-hero:active{transform:scale(.986)}
      .faro-r3b-hero-brand,.faro-r3b-hero-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .faro-r3b-hero-brand>span:first-child{font-size:10px;font-weight:800;letter-spacing:.075em;text-transform:uppercase;color:#BFDBFE}
      .faro-r3b-hero-mark{width:32px;height:32px;object-fit:contain;opacity:.88;filter:drop-shadow(0 7px 14px rgba(0,0,0,.16))}
      #view-planning .faro-r3-hero-value{display:block;margin-top:1px;font-size:24px;line-height:1.08;font-weight:800;letter-spacing:-.04em;color:#fff}
      .faro-r3b-hero-progress-copy{font-size:10px;font-weight:600;line-height:1.35;color:#CBD5E1}
      #view-planning .faro-r3-progress{height:7px;background:rgba(255,255,255,.12)}
      #view-planning .faro-r3-progress>span{background:linear-gradient(90deg,#60A5FA,#34D399)}
      #view-planning .faro-r3-hero-stats{gap:7px}
      #view-planning .faro-r3-hero-stats span{padding:7px 8px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.055);font-size:9.5px;font-weight:600;color:#E2E8F0;text-align:center}
      .faro-r3b-hero-footer small{font-size:10px;font-weight:600;color:#94A3B8}
      #view-planning .faro-r3-hero-action{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(191,219,254,.14);border-radius:999px;background:rgba(255,255,255,.07);font-size:9.5px;font-weight:800;color:#DBEAFE}
      .faro-r3b-updated{animation:faroR3BUpdated .42s cubic-bezier(.16,1,.3,1)}
      @keyframes faroR3BUpdated{0%{box-shadow:0 0 0 0 rgba(var(--r3b-accent,37,99,235),.22)}45%{box-shadow:0 0 0 6px rgba(var(--r3b-accent,37,99,235),.08)}100%{box-shadow:0 0 0 0 rgba(var(--r3b-accent,37,99,235),0)}}
      .faro-r3b-live-change{animation:faroR3BLive .18s cubic-bezier(.16,1,.3,1)}
      @keyframes faroR3BLive{from{opacity:.58;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
      .faro-r3-editor,.faro-r3-editor *,.faro-dialog--focus,.faro-dialog--workspace{font-family:"Plus Jakarta Sans",sans-serif}
      .faro-r3-editor-label,.faro-plan-preview span,.faro-field label,.faro-money-tab,.faro-plan-details>summary,.faro-detail-metric span{font-weight:800!important}
      .faro-plan-target-value{font-weight:800!important;letter-spacing:-.045em}
      .faro-plan-preview strong,.faro-field input,.faro-field select,.faro-week-day,.faro-r3-actions button,.faro-subview-title,.faro-detail-metric strong{font-weight:700!important}
      #faroMetaDialog .input-wrapper>span{z-index:1}
      #faroMetaDialog #faroTargetExact{padding-left:40px!important}
      .faro-r3-actions button{text-transform:none;font-size:11px;letter-spacing:0}
      .faro-r3-primary{box-shadow:0 12px 24px -16px rgba(37,99,235,.75)}
      .faro-r3b-dialog-lead{margin:0 0 16px;padding:12px 14px;border-left:3px solid rgba(var(--faro-dialog-accent,37,99,235),.45);border-radius:16px;background:linear-gradient(145deg,rgba(var(--faro-dialog-accent,37,99,235),.07),#F8FAFC 70%);color:#64748B;font-size:11px;line-height:1.5;font-weight:600}
      .faro-r3b-dialog-symbol{width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto;border-radius:16px;background:rgba(var(--faro-dialog-accent,37,99,235),.1);color:rgb(var(--faro-dialog-accent,37,99,235));font-size:16px;box-shadow:inset 0 0 0 1px rgba(var(--faro-dialog-accent,37,99,235),.1)}
      .faro-dialog--focus .faro-dialog-head,.faro-dialog--workspace .faro-dialog-head{align-items:center}
      .faro-dialog--focus .faro-dialog-kicker,.faro-dialog--workspace .faro-dialog-kicker{font-weight:800!important;color:rgb(var(--faro-dialog-accent,37,99,235))}
      .faro-dialog--focus .faro-dialog-title,.faro-dialog--workspace .faro-dialog-title{font-weight:800!important;letter-spacing:-.03em}
      #faroMoneyDialog .faro-dialog-shell{background:#F8FAFC}
      #faroMoneyDialog .faro-dialog-body{display:grid;gap:12px;padding-top:4px}
      #faroMoneyDialog .faro-r3b-dialog-lead{display:none}
      #faroMoneyDialog .faro-dialog-kicker{text-transform:capitalize}
      .faro-r3b2-status-hero{--radar-accent:5,150,105;position:relative;overflow:hidden;padding:18px;border:1px solid rgba(var(--radar-accent),.13);border-radius:23px;background:linear-gradient(145deg,#fff 0%,rgba(var(--radar-accent),.07) 100%);box-shadow:0 18px 40px -34px rgba(11,17,33,.5);transition:background .2s ease,border-color .2s ease}
      .faro-r3b2-status-hero::after{content:"";position:absolute;width:130px;height:130px;right:-60px;top:-72px;border-radius:999px;background:rgba(var(--radar-accent),.11);filter:blur(8px)}
      .faro-r3b2-status-top{position:relative;z-index:1;display:flex;align-items:center;gap:8px;color:rgb(var(--radar-accent));font-size:9px;font-weight:800;letter-spacing:.07em}
      .faro-r3b2-status-top i{width:24px;height:24px;display:grid;place-items:center;border-radius:9px;background:rgba(var(--radar-accent),.1)}
      .faro-r3b2-status-value{position:relative;z-index:1;display:block;margin-top:12px;color:#0B1121;font-size:30px;line-height:1;font-weight:800;letter-spacing:-.045em}
      .faro-r3b2-status-caption{position:relative;z-index:1;display:block;margin-top:4px;color:#64748B;font-size:10px;font-weight:600}
      .faro-r3b2-status-message{position:relative;z-index:1;margin-top:14px;padding-top:12px;border-top:1px solid rgba(var(--radar-accent),.1);color:#334155;font-size:11px;line-height:1.45;font-weight:700}
      .faro-r3b2-status-protected{position:relative;z-index:1;display:flex;align-items:center;gap:6px;margin-top:7px;color:#64748B;font-size:9.5px;font-weight:600}
      .faro-r3b2-status-protected i{color:#059669}
      #faroMoneyDialog .faro-money-tabs{position:relative;top:auto;display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:4px;border:1px solid #E2E8F0;border-radius:19px;background:#EEF2F7;overflow:hidden}
      #faroMoneyDialog .faro-money-tab{min-height:57px;padding:8px 10px;border-radius:15px;text-align:left;color:#64748B;background:transparent;box-shadow:none;transition:background .18s ease,box-shadow .18s ease,transform .18s ease}
      #faroMoneyDialog .faro-money-tab.active{background:#fff;color:#0B1121;box-shadow:0 8px 20px -16px rgba(11,17,33,.55)}
      .faro-r3b2-tab-label{display:block;font-size:8px;line-height:1.2;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
      .faro-r3b2-tab-value{display:block;margin-top:3px;font-size:11px;line-height:1.2;font-weight:800;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .faro-r3b2-tab-meta{display:block;margin-top:2px;font-size:8px;line-height:1.2;font-weight:600;color:#94A3B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .faro-r3b2-panel{animation:faroR3B2Panel .18s cubic-bezier(.16,1,.3,1)}
      @keyframes faroR3B2Panel{from{opacity:.35;transform:translateX(9px)}to{opacity:1;transform:translateX(0)}}
      .faro-r3b2-group{display:grid;gap:7px}
      .faro-r3b2-group+.faro-r3b2-group{margin-top:14px}
      .faro-r3b2-group-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px;color:#64748B;font-size:8.5px;line-height:1.2;font-weight:800;letter-spacing:.055em;text-transform:uppercase}
      .faro-r3b2-group-title strong{color:#334155;font-size:8px;font-weight:700;letter-spacing:0;text-transform:none}
      .faro-r3b2-bill{border:1px solid #E2E8F0;border-radius:17px;background:#fff;overflow:hidden;box-shadow:0 12px 28px -26px rgba(11,17,33,.42)}
      .faro-r3b2-bill>summary{list-style:none;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;min-height:62px;padding:11px 12px;cursor:pointer}
      .faro-r3b2-bill>summary::-webkit-details-marker{display:none}
      .faro-r3b2-bill[data-state="risk"]{border-color:#FECACA}.faro-r3b2-bill[data-state="attention"]{border-color:#FED7AA}
      .faro-r3b2-bill[data-state="paid"]{opacity:.72;background:#F8FAFC}
      .faro-r3b2-bill-date{display:block;color:#2563EB;font-size:7.5px;font-weight:800;letter-spacing:.055em}
      .faro-r3b2-bill[data-state="risk"] .faro-r3b2-bill-date{color:#B91C1C}.faro-r3b2-bill[data-state="attention"] .faro-r3b2-bill-date{color:#C2410C}.faro-r3b2-bill[data-state="paid"] .faro-r3b2-bill-date{color:#64748B}
      .faro-r3b2-bill-name{display:block;margin-top:3px;color:#0B1121;font-size:11.5px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .faro-r3b2-bill-when{display:block;margin-top:2px;color:#64748B;font-size:8.5px;font-weight:600}
      .faro-r3b2-bill-side{display:flex;align-items:center;gap:8px}.faro-r3b2-bill-amount{color:#0B1121;font-size:11px;font-weight:800;white-space:nowrap}.faro-r3b2-bill-chevron{color:#94A3B8;font-size:8px;transition:transform .16s ease}.faro-r3b2-bill[open] .faro-r3b2-bill-chevron{transform:rotate(90deg)}
      .faro-r3b2-peek{display:grid;gap:8px;padding:10px 12px 12px;border-top:1px solid #F1F5F9;background:#FBFDFF;animation:faroR3B2Peek .17s cubic-bezier(.16,1,.3,1)}
      @keyframes faroR3B2Peek{from{opacity:.35;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      .faro-r3b2-peek-context{color:#64748B;font-size:8.5px;line-height:1.4;font-weight:600}
      .faro-r3b2-peek-actions{display:grid;grid-template-columns:1.35fr 1fr;gap:7px}.faro-r3b2-peek-actions button{min-height:42px;border-radius:12px;font-size:9px;font-weight:800}
      .faro-r3b2-pay{background:#059669;color:#fff}.faro-r3b2-edit{background:#EFF6FF;color:#1D4ED8}.faro-r3b2-undo{background:#F1F5F9;color:#475569}
      .faro-r3b2-empty{display:grid;justify-items:center;text-align:center;padding:24px 16px 16px;border:1px dashed #DCE5EF;border-radius:20px;background:linear-gradient(145deg,#fff,#F8FAFC)}
      .faro-r3b2-empty-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:15px;background:#ECFDF5;color:#059669;font-size:16px}.faro-r3b2-empty strong{margin-top:10px;color:#0B1121;font-size:13px}.faro-r3b2-empty p{max-width:280px;margin-top:5px;color:#64748B;font-size:10px;line-height:1.45}.faro-r3b2-empty button{min-height:42px;margin-top:13px;padding:0 15px;border-radius:13px;background:#EFF6FF;color:#1D4ED8;font-size:9.5px;font-weight:800}
      #faroMoneyAddBill,#faroMoneyCreateReserve{min-height:42px!important;margin-top:10px!important;border:1px solid #DBEAFE!important;border-radius:14px!important;background:#fff!important;color:#2563EB!important;font-size:9.5px!important;font-weight:800!important;box-shadow:none!important}
      .faro-r3b2-reserve{padding:15px;border:1px solid #D1FAE5;border-radius:20px;background:linear-gradient(145deg,#fff,#F3FBF7);box-shadow:0 14px 30px -28px rgba(5,150,105,.4)}
      .faro-r3b2-reserve+.faro-r3b2-reserve{margin-top:10px}.faro-r3b2-reserve-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.faro-r3b2-reserve-title{min-width:0}.faro-r3b2-reserve-name{display:block;color:#0B1121;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.faro-r3b2-reserve-rule{display:block;margin-top:3px;color:#64748B;font-size:8.5px;line-height:1.35;font-weight:600}.faro-r3b2-reserve-balance{color:#047857;font-size:16px;line-height:1;font-weight:800;white-space:nowrap}
      .faro-r3b2-reserve-caption{display:block;margin-top:4px;color:#64748B;font-size:8px;font-weight:600}.faro-r3b2-progress-copy{display:flex;justify-content:space-between;gap:8px;margin-top:13px;color:#64748B;font-size:8.5px;font-weight:700}.faro-r3b2-progress{height:7px;margin-top:6px;border-radius:999px;background:#DDF5E8;overflow:hidden}.faro-r3b2-progress>span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#10B981,#34D399);transition:width .22s cubic-bezier(.16,1,.3,1)}
      .faro-r3b2-no-goal{margin-top:12px;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.8);color:#64748B;font-size:9px;line-height:1.4;font-weight:600}.faro-r3b2-reserve-actions{display:grid;grid-template-columns:1.2fr 1fr;gap:7px;margin-top:12px}.faro-r3b2-reserve-actions button{min-height:42px;border-radius:12px;font-size:9px;font-weight:800}.faro-r3b2-contribute{background:#059669;color:#fff}.faro-r3b2-goal{background:#fff;color:#047857;border:1px solid #A7F3D0}
      .faro-r3b2-reserve-details{margin-top:9px;border-top:1px solid rgba(5,150,105,.1);padding-top:8px}.faro-r3b2-reserve-details>summary{list-style:none;cursor:pointer;color:#047857;font-size:8.5px;font-weight:800}.faro-r3b2-reserve-details>summary::-webkit-details-marker{display:none}.faro-r3b2-contribution{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:7px;padding:8px 9px;border-radius:11px;background:#fff;color:#64748B;font-size:8.5px}.faro-r3b2-contribution button{min-height:34px;color:#B91C1C;font-size:8px;font-weight:800}
      .faro-r3b2-undo-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:14px;background:#0B1121;color:#E2E8F0;font-size:9px;font-weight:700;animation:faroR3B2Peek .17s ease}.faro-r3b2-undo-bar button{min-height:34px;padding:0 10px;border-radius:10px;background:#fff;color:#0B1121;font-size:8.5px;font-weight:800}
      #faroMoneyLegacyCosts{margin-top:10px;border:0!important;background:transparent!important}#faroMoneyLegacyCosts>summary{padding:11px 2px!important;color:#64748B!important;font-size:9px!important;font-weight:700!important}#faroMoneyLegacyCosts>summary::after{content:'›'!important;float:right;color:#2563EB;font-size:15px}
      #view-planning-detail .faro-subview-title{font-weight:800!important}
      #view-planning-detail .faro-detail-summary{background:linear-gradient(145deg,#F8FBFF,#fff);box-shadow:0 18px 40px -32px rgba(11,17,33,.45)}
      #faroOpenPlanDetail{view-transition-name:faro-plan-card}#view-planning-detail .faro-detail-summary{view-transition-name:faro-plan-detail}
      @media(hover:hover) and (pointer:fine){#view-planning .faro-r3-tile:hover{transform:translateY(-2px);border-color:rgba(var(--r3b-accent),.22)}}
      @media(max-width:360px){#view-planning .faro-r3-hero{min-height:166px;padding:18px}#view-planning .faro-r3-tile{padding:13px;gap:6px}.faro-r3b-hero-mark{width:28px;height:28px}.faro-r3b-card-cta{font-size:9px}.faro-r3b-week-dot{width:13px;height:13px;font-size:6px}#view-planning .faro-r3-tile-value{font-size:18px}.faro-r3b2-status-value{font-size:27px}.faro-r3b2-peek-actions{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){#view-planning .faro-r3-tile,#view-planning .faro-r3-hero,#view-planning .faro-r3-icon,#view-planning .faro-r3-arrow,.faro-r3b-card-cta i,#view-planning .faro-r3-hero-action,.faro-r3b2-progress>span{transition:none}.faro-r3b-updated,.faro-r3b-live-change,.faro-r3b2-panel,.faro-r3b2-peek,.faro-r3b2-undo-bar{animation:none!important}}
    `;
    document.head.appendChild(style);
  };

  const addDialogLead = (dialog, text) => {
    if (!text) return;
    const body = dialog?.querySelector('[data-faro-dialog-body]');
    if (!body || body.querySelector('.faro-r3b-dialog-lead')) return;
    const lead = document.createElement('p');
    lead.className = 'faro-r3b-dialog-lead';
    lead.textContent = text;
    body.prepend(lead);
  };
  const configureDialog = ({ id, variant, kicker, title, icon, lead, accent='37,99,235' }) => {
    const dialog = $(id);
    if (!dialog) return;
    dialog.classList.remove('faro-dialog--sheet','faro-dialog--page','faro-dialog--focus','faro-dialog--workspace');
    dialog.classList.add(`faro-dialog--${variant}`);
    dialog.style.setProperty('--faro-dialog-accent',accent);
    const head = dialog.querySelector('.faro-dialog-head');
    setText(dialog.querySelector('.faro-dialog-kicker'), kicker);
    setText(dialog.querySelector('.faro-dialog-title'), title);
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
    hero.setAttribute('aria-label','Entender seu plano do mês');
    hero.innerHTML = `<span class="faro-r3b-hero-brand"><span id="faroR3BHeroLabel"></span><img class="faro-r3b-hero-mark" src="./faro-mark.svg" alt="" aria-hidden="true"></span><strong id="faroPlanHeroValue" class="faro-r3-hero-value tabular"></strong><span id="faroR3BHeroProgressCopy" class="faro-r3b-hero-progress-copy"></span><span class="faro-r3-progress" aria-hidden="true"><span id="faroPlanProgress"></span></span><span class="faro-r3-hero-stats"><span id="faroPlanDaily"></span><span id="faroPlanDays"></span><span id="faroPlanKm"></span></span><span class="faro-r3b-hero-footer"><small>Seu mês em uma leitura.</small><span class="faro-r3-hero-action">Entender meu plano <i class="fas fa-arrow-right" aria-hidden="true"></i></span></span>`;
  };
  const configureCards = () => {
    const hero = $('faroOpenPlanDetail');
    const firstGrid = root.querySelector('.faro-r3-grid');
    if (hero && firstGrid && hero.nextElementSibling !== firstGrid) root.insertBefore(hero, firstGrid);
    const cards = [
      ['faroOpenMeta','goal','Meta do mês','fa-bullseye','Ajustar'],
      ['faroOpenAgenda','days','Dias na pista','fa-calendar-days','Editar dias'],
      ['faroOpenOperation','cost','Custo para rodar','fa-gas-pump','Recalcular'],
      ['faroOpenMoney','commitments','Compromissos','fa-wallet','Ver compromissos']
    ];
    cards.forEach(([id,kind,label,icon,action]) => {
      const card = $(id); if (!card) return;
      card.dataset.r3bKind = kind; card.dataset.r3bInteractive = 'true';
      const labelNode = card.querySelector('.faro-r3-tile-label'); setText(labelNode,label);
      const copy = labelNode?.parentElement; copy?.classList.add('faro-r3b-card-copy');
      const iconNode = card.querySelector('.faro-r3-icon i'); if (iconNode) iconNode.className = `fas ${icon}`;
      const arrow = card.querySelector('.faro-r3-arrow i'); if (arrow) arrow.className = 'fas fa-chevron-right';
      if (kind === 'days' && copy && !copy.querySelector('.faro-r3b-week-strip')) {
        const strip = document.createElement('span'); strip.className = 'faro-r3b-week-strip'; strip.setAttribute('aria-hidden','true');
        strip.innerHTML = WEEK.map(item => `<span class="faro-r3b-week-dot" data-r3b-weekday="${item.day}">${item.label}</span>`).join(''); copy.appendChild(strip);
      }
      if (kind === 'commitments' && copy && !copy.querySelector('#faroR3BCommitmentStatus')) {
        const status = document.createElement('span'); status.id = 'faroR3BCommitmentStatus'; status.className = 'faro-r3b-status-pill'; copy.insertBefore(status,copy.querySelector('.faro-r3-tile-meta'));
      }
      if (!card.querySelector('.faro-r3b-card-cta')) {
        const cta = document.createElement('span'); cta.className = 'faro-r3b-card-cta'; cta.innerHTML = `<span>${action}</span><i class="fas fa-chevron-right" aria-hidden="true"></i>`; card.appendChild(cta);
      }
    });
  };
  const configureCopy = () => {
    setText(root.querySelector('.faro-r3-subtitle'),'Seu mês começa pelo plano.');
    setText($('faroPlanningTargetCard')?.querySelector('.faro-r3-editor-label'),'Sua meta líquida');
    setText($('faroTargetCancel'),'Cancelar'); setText($('faroTargetApply'),'Aplicar no meu plano');
    setText($('faroDaysCancel'),'Cancelar'); setText($('faroDaysApply'),'Aplicar dias ao meu plano');
    setText($('faroOperationCancel'),'Cancelar'); setText($('faroOperationApply'),'Aplicar ao meu plano');
    setText($('view-planning-detail')?.querySelector('.faro-subview-title'),`Seu plano para ${monthName()}`);
    $('faroMoneyTabBills')?.closest('[role="tablist"]')?.setAttribute('aria-label','Compromissos do mês');
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
  const renderWeekStrip = () => document.querySelectorAll('[data-r3b-weekday]').forEach(dot => dot.dataset.active = String(app.state.workWeekdays.includes(Number(dot.dataset.r3bWeekday))));

  let moneyRendering = false;
  let moneyUndo = null;
  let moneyReturn = null;
  const groupLabel = (title,items) => `<div class="faro-r3b2-group-title"><span>${title}</span><strong>${items.length} ${items.length === 1 ? 'item' : 'itens'}</strong></div>`;
  const recurrenceText = item => {
    const cost = item.cost || {};
    if (cost.kind === 'weekly') return `Recorrência semanal${cost.dueWeekday !== undefined ? ` · dia ${['domingo','segunda','terça','quarta','quinta','sexta','sábado'][Number(cost.dueWeekday)]}` : ''}`;
    if (cost.kind === 'monthly') return `Recorrência mensal${cost.dueDay ? ` · dia ${cost.dueDay}` : ''}`;
    return 'Compromisso do plano';
  };
  const billMarkup = item => {
    const state = item.status === 'paid' ? 'paid' : item.days < 0 ? 'risk' : item.days <= 1 ? 'attention' : 'upcoming';
    const primary = item.status === 'paid'
      ? `<button type="button" class="faro-r3b2-undo" data-r3-undo="${item.id}">Desfazer pagamento</button>`
      : `<button type="button" class="faro-r3b2-pay" data-r3-pay="${item.id}">Marcar como paga</button>`;
    return `<details class="faro-r3b2-bill" data-state="${state}" data-r3b2-bill="${item.id}"><summary><span class="min-w-0"><span class="faro-r3b2-bill-date">${dueDateLabel(item)}</span><strong class="faro-r3b2-bill-name">${app.escape(item.name)}</strong><span class="faro-r3b2-bill-when">${occurrenceWhen(item)}</span></span><span class="faro-r3b2-bill-side"><strong class="faro-r3b2-bill-amount">${app.money(item.amount,0)}</strong><i class="fas fa-chevron-right faro-r3b2-bill-chevron" aria-hidden="true"></i></span></summary><div class="faro-r3b2-peek"><span class="faro-r3b2-peek-context">${recurrenceText(item)}. A ação aqui altera só o estado real da conta; o planejamento recorrente continua existindo.</span><div class="faro-r3b2-peek-actions">${primary}<button type="button" class="faro-r3b2-edit" data-r3b2-edit-cost="${item.costId}">Editar conta</button></div></div></details>`;
  };
  const billGroup = (title,items,{collapsed=false}={}) => {
    if (!items.length) return '';
    const rows = items.map(billMarkup).join('');
    if (collapsed) return `<details class="faro-r3b2-group"><summary class="faro-r3b2-group-title"><span>${title}</span><strong>${items.length} ${items.length === 1 ? 'item' : 'itens'} ›</strong></summary><div class="faro-r3b2-group" style="margin-top:7px">${rows}</div></details>`;
    return `<section class="faro-r3b2-group">${groupLabel(title,items)}${rows}</section>`;
  };
  const reserveMarkup = reserve => {
    const balance = app.number(window.FaroReserves?.balanceFor?.(reserve.id));
    const profile = app.state.reserveProfiles?.[reserve.id] || {};
    const goal = app.number(profile.goalAmount);
    const progress = goal > 0 ? Math.min(100,Math.max(0,balance/goal*100)) : null;
    const recent = window.FaroReserves?.contributionsFor?.(reserve.id)?.slice(0,4) || [];
    return `<article class="faro-r3b2-reserve" data-r3b2-reserve="${reserve.id}"><div class="faro-r3b2-reserve-head"><span class="faro-r3b2-reserve-title"><strong class="faro-r3b2-reserve-name">${app.escape(reserve.name)}</strong><span class="faro-r3b2-reserve-rule">${reservePlannedText(reserve)}</span></span><span><strong class="faro-r3b2-reserve-balance">${app.money(balance,0)}</strong><small class="faro-r3b2-reserve-caption">protegidos</small></span></div>${goal > 0 ? `<div class="faro-r3b2-progress-copy"><span>${app.money(balance,0)}</span><span>Meta ${app.money(goal,0)} · ${Math.round(progress)}%</span></div><div class="faro-r3b2-progress" aria-label="${Math.round(progress)}% da meta"><span style="width:${progress}%"></span></div>` : `<div class="faro-r3b2-no-goal">Você já começou a separar dinheiro. Defina um objetivo se quiser acompanhar até onde pretende chegar.</div>`}<div class="faro-r3b2-reserve-actions"><button type="button" class="faro-r3b2-contribute" data-r3-reserve-contribute="${reserve.id}">+ Aportar</button><button type="button" class="faro-r3b2-goal" data-r3-reserve-goal="${reserve.id}">${goal > 0 ? 'Editar objetivo' : 'Definir objetivo'}</button></div><details class="faro-r3b2-reserve-details"><summary>Detalhes e últimos aportes ›</summary><div>${recent.length ? recent.map(entry => `<div class="faro-r3b2-contribution"><span>${app.parseDate(entry.date).toLocaleDateString('pt-BR')} · ${app.money(entry.amount,0)}</span><button type="button" data-r3-reserve-remove="${entry.id}">Remover</button></div>`).join('') : '<div class="faro-r3b2-contribution"><span>Nenhum aporte registrado ainda.</span></div>'}</div></details></article>`;
  };
  const heroMessage = model => {
    if (model.state === 'risk') return `${app.money(model.overdueAmount,0)} estão atrasados${model.overdue[0] ? ` · ${model.overdue[0].name} precisa de ação` : ''}.`;
    if (model.state === 'attention') return `${app.money(model.attentionAmount,0)} vencem até amanhã · ${model.dueSoon.length} ${model.dueSoon.length === 1 ? 'compromisso precisa' : 'compromissos precisam'} de você.`;
    if (model.state === 'upcoming') return `${app.money(model.next7Amount,0)} vencem nos próximos 7 dias${model.next ? ` · próxima: ${model.next.name}` : ''}.`;
    return 'Nenhuma conta exige sua atenção agora.';
  };
  const renderMoneyWorkspace = () => {
    const dialog = $('faroMoneyDialog');
    const summary = $('faroMoneySummary');
    const billList = $('faroMoneyBillList');
    const reserveList = $('faroMoneyReserveList');
    if (!dialog || !summary || !billList || !reserveList || moneyRendering) return;
    moneyRendering = true;
    const body = dialog.querySelector('[data-faro-dialog-body]');
    const scrollTop = body?.scrollTop || 0;
    const model = moneyViewModel();
    dialog.style.setProperty('--faro-dialog-accent',model.accent);
    setText(dialog.querySelector('.faro-dialog-kicker'),monthTitle());
    setText(dialog.querySelector('.faro-dialog-title'),'Compromissos');
    const symbol = dialog.querySelector('.faro-r3b-dialog-symbol i'); if (symbol) symbol.className = `fas ${model.icon}`;
    summary.className = 'faro-r3b2-status-hero';
    summary.style.setProperty('--radar-accent',model.accent);
    summary.dataset.r3b2State = model.state;
    summary.setAttribute('role','status');
    summary.setAttribute('aria-live','polite');
    summary.innerHTML = `<span class="faro-r3b2-status-top"><i class="fas ${model.icon}" aria-hidden="true"></i>${model.label}</span><strong class="faro-r3b2-status-value">${app.money(model.committed,0)}</strong><span class="faro-r3b2-status-caption">já comprometidos no seu plano mensal</span><p class="faro-r3b2-status-message">${app.escape(heroMessage(model))}</p><span class="faro-r3b2-status-protected"><i class="fas fa-shield-heart" aria-hidden="true"></i>${app.money(model.reserveBalance,0)} já estão protegidos em ${model.reserveRules.length} ${model.reserveRules.length === 1 ? 'reserva' : 'reservas'}.</span>`;

    const billsTab = $('faroMoneyTabBills');
    const reservesTab = $('faroMoneyTabReserves');
    if (billsTab) billsTab.innerHTML = `<span class="faro-r3b2-tab-label">Contas</span><strong class="faro-r3b2-tab-value">${model.pending.length} ${model.pending.length === 1 ? 'pendente' : 'pendentes'}</strong><small class="faro-r3b2-tab-meta">${app.money(model.obligationMonthly,0)} no plano</small>`;
    if (reservesTab) reservesTab.innerHTML = `<span class="faro-r3b2-tab-label">Reservas</span><strong class="faro-r3b2-tab-value">${app.money(model.reserveBalance,0)} protegidos</strong><small class="faro-r3b2-tab-meta">${model.reserveRules.length} ${model.reserveRules.length === 1 ? 'objetivo' : 'objetivos'}</small>`;

    const urgent = model.pending.filter(item => item.days <= 1);
    const next = model.pending.filter(item => item.days >= 2 && item.days <= 7);
    const later = model.pending.filter(item => item.days > 7).slice(0,8);
    const resolved = model.paid.slice(0,6);
    const hasObligations = model.obligations.length > 0;
    billList.className = 'faro-r3b2-panel';
    if (!urgent.length && !next.length && !later.length && !resolved.length) {
      billList.innerHTML = `<div class="faro-r3b2-empty"><span class="faro-r3b2-empty-icon"><i class="fas fa-route" aria-hidden="true"></i></span><strong>${hasObligations ? 'Pista livre por aqui' : 'Seu plano ainda não conhece suas contas'}</strong><p>${hasObligations ? 'Nenhuma conta pede atenção nos próximos dias.' : 'Adicione as contas recorrentes para o FARO proteger esse dinheiro antes de chamá-lo de lucro.'}</p></div>`;
    } else {
      billList.innerHTML = `${billGroup('Precisa de você',urgent)}${billGroup('Próximos dias',next)}${billGroup('Mais adiante',later,{collapsed:later.length > 3})}${billGroup('Resolvidas',resolved,{collapsed:true})}`;
    }
    setText($('faroMoneyAddBill'),'+ Adicionar conta');
    const legacySummary = $('faroMoneyLegacyCosts')?.querySelector('summary');
    setText(legacySummary,'Todas as contas e recorrências');

    reserveList.className = 'faro-r3b2-panel';
    reserveList.innerHTML = model.reserveRules.length ? model.reserveRules.map(reserveMarkup).join('') : `<div class="faro-r3b2-empty"><span class="faro-r3b2-empty-icon"><i class="fas fa-shield-heart" aria-hidden="true"></i></span><strong>Nenhum dinheiro protegido ainda</strong><p>Crie uma reserva para manutenção, pneus, emergência ou qualquer valor que você queira blindar do gasto do mês.</p></div>`;
    setText($('faroMoneyCreateReserve'),'+ Criar uma reserva');

    const undoHost = dialog.querySelector('.faro-r3b2-undo-bar');
    undoHost?.remove();
    if (moneyUndo && Date.now() < moneyUndo.expires && $('faroMoneyBills') && !$('faroMoneyBills').classList.contains('hidden')) {
      const bar = document.createElement('div');
      bar.className = 'faro-r3b2-undo-bar';
      bar.innerHTML = `<span>${app.escape(moneyUndo.name)} saiu das pendências.</span><button type="button" data-r3-undo="${moneyUndo.id}">Desfazer</button>`;
      $('faroMoneyBills').prepend(bar);
    }
    if (body) requestAnimationFrame(() => { body.scrollTop = scrollTop; moneyRendering = false; });
    else moneyRendering = false;
  };

  const returnAfterLegacy = ({ modalId, tab, focusSelector }) => {
    const modal = $(modalId); if (!modal) return;
    let becameVisible = !modal.classList.contains('hidden');
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('hidden')) { becameVisible = true; return; }
      if (!becameVisible) return;
      observer.disconnect();
      window.setTimeout(() => {
        planningApi.openMoney(tab,$('faroOpenMoney'));
        window.setTimeout(() => document.querySelector(focusSelector)?.scrollIntoView({block:'center',behavior:interactions.reduceMotion()?'auto':'smooth'}),90);
      },80);
    });
    observer.observe(modal,{attributes:true,attributeFilter:['class']});
  };
  const afterWorkspaceClose = callback => {
    const dialog = $('faroMoneyDialog');
    interactions.close(dialog,'handoff');
    window.setTimeout(callback,interactions.reduceMotion()?0:190);
  };
  const wireMoneyActions = () => {
    const dialog = $('faroMoneyDialog'); if (!dialog || dialog.dataset.r3b2Wired === 'true') return;
    dialog.dataset.r3b2Wired = 'true';
    dialog.addEventListener('click', event => {
      const pay = event.target.closest('[data-r3-pay]');
      const undo = event.target.closest('[data-r3-undo]');
      const edit = event.target.closest('[data-r3b2-edit-cost]');
      const contribute = event.target.closest('[data-r3-reserve-contribute]');
      const goal = event.target.closest('[data-r3-reserve-goal]');
      if (pay) {
        const item = moneyViewModel().occurrences.find(entry => entry.id === pay.dataset.r3Pay);
        if (item) {
          moneyUndo = { id:item.id, name:item.name, expires:Date.now()+6000 };
          window.setTimeout(() => { if (moneyUndo?.id === item.id) { moneyUndo = null; renderMoneyWorkspace(); } },6100);
        }
      }
      if (undo) moneyUndo = null;
      if (edit) {
        event.preventDefault(); event.stopImmediatePropagation();
        const cost = (app.state.costs || []).find(item => item.id === edit.dataset.r3b2EditCost);
        if (!cost) return;
        returnAfterLegacy({modalId:'costModal',tab:'bills',focusSelector:`[data-r3b2-bill]`});
        afterWorkspaceClose(() => app.openCostModal(cost));
      }
      if (contribute || goal) {
        const reserveId = contributionId(contribute,goal);
        moneyReturn = {tab:'reserves',reserveId};
        returnAfterLegacy({modalId:'faroReserveModal',tab:'reserves',focusSelector:`[data-r3b2-reserve="${reserveId}"]`});
      }
    },true);
    ['faroMoneyTabBills','faroMoneyTabReserves'].forEach(id => $(id)?.addEventListener('click', () => requestAnimationFrame(() => {
      const panel = id === 'faroMoneyTabBills' ? $('faroMoneyBills') : $('faroMoneyReserves');
      panel?.classList.add('faro-r3b2-panel');
      window.setTimeout(() => panel?.classList.remove('faro-r3b2-panel'),220);
    })));
  };
  const contributionId = (contribute,goal) => contribute?.dataset.r3ReserveContribute || goal?.dataset.r3ReserveGoal || '';

  const animateLive = node => {
    if (!node || interactions.reduceMotion()) return;
    node.classList.remove('faro-r3b-live-change'); void node.offsetWidth; node.classList.add('faro-r3b-live-change');
    window.setTimeout(() => node.classList.remove('faro-r3b-live-change'),220);
  };
  const wireLiveMotion = () => {
    ['targetProfitDisplay','faroPreviewDays','faroPreviewDaily','faroPreviewKm','faroDaysConsequence','faroOperationConsequence'].forEach(id => {
      const node = $(id); if (!node || node.dataset.r3bMotionReady === 'true') return;
      node.dataset.r3bMotionReady = 'true'; new MutationObserver(() => animateLive(node)).observe(node,{subtree:true,childList:true,characterData:true});
    });
  };
  const sync = () => {
    const c = app.calculations(); const target = app.state.targetProfit; const actual = c.actualNet || 0; const pct = target > 0 ? Math.max(0,Math.min(100,actual/target*100)) : 0;
    const model = moneyViewModel();
    setText($('faroPlanningMonth'),monthTitle()); setText($('faroR3BHeroLabel'),`Seu plano para ${monthName()}`); setText($('faroPlanHeroValue'),`Para sobrar ${app.money(target,0)}`);
    setText($('faroR3BHeroProgressCopy'),actual > 0 ? `${app.money(actual,0)} já construídos · ${Math.round(pct)}% do caminho` : 'O FARO transforma sua meta em ritmo de pista.');
    if ($('faroPlanProgress')) $('faroPlanProgress').style.width = `${pct}%`;
    setText($('faroPlanDaily'),`${app.money(c.dailyGross,0)}/dia`); setText($('faroPlanDays'),`${c.ctx.plannedDays} dias de pista`); setText($('faroPlanKm'),`≈ ${app.integer(c.dailyKm)} km/dia`);
    setText($('faroMetaCardValue'),app.money(target,0)); setText($('faroMetaCardMeta'),`${app.money(c.dailyGross,0)}/dia para chegar lá`); $('faroOpenMeta')?.setAttribute('aria-label',`Meta do mês: ${app.money(target,0)}. Ajustar`);
    setText($('faroAgendaCardValue'),`${c.ctx.plannedDays} dias`); setText($('faroAgendaCardMeta'),`${app.state.extraDaysOff} folgas extras`); renderWeekStrip();
    const operationIcon = $('faroOpenOperation')?.querySelector('.faro-r3-icon i'); if (operationIcon) operationIcon.className = `fas ${energyIcon(app.state.fuel.type)}`;
    setText($('faroOperationCardValue'),`${app.money(c.fuelKm)}/km`); setText($('faroOperationCardMeta'),`${app.state.fuel.label || 'Energia'} · receita ${app.money(app.state.revenueKm)}/km`);
    const moneyCard = $('faroOpenMoney'); if (moneyCard) moneyCard.dataset.r3bState = model.state;
    setText($('faroMoneyCardValue'),app.money(model.committed,0)); setText($('faroR3BCommitmentStatus'),model.label.toLowerCase().replace(/^./,c => c.toUpperCase()));
    setText($('faroMoneyCardMeta'),model.state === 'calm' ? `${app.money(model.reserveBalance,0)} protegidos · tudo em dia` : heroMessage(model));
    moneyCard?.setAttribute('aria-label',`Compromissos: ${app.money(model.committed,0)}. ${model.label}. Ver compromissos`);
    renderMoneyWorkspace(); normalizeConsequenceCopy();
  };
  const pulse = id => {
    const node = $(id); if (!node || interactions.reduceMotion()) return;
    node.classList.remove('faro-r3b-updated'); void node.offsetWidth; node.classList.add('faro-r3b-updated'); window.setTimeout(() => node.classList.remove('faro-r3b-updated'),460);
  };

  injectStyles(); reshapeHero(); configureCards(); configureCopy();
  configureDialog({id:'faroMetaDialog',variant:'focus',kicker:'Meta do mês',title:'Quanto você quer que sobre no fim do mês?',icon:'fa-bullseye',accent:'37,99,235',lead:'Ajuste o objetivo. O FARO recalcula na hora quanto sua pista precisa entregar.'});
  configureDialog({id:'faroAgendaDialog',variant:'focus',kicker:'Dias na pista',title:'Quais dias você pretende rodar?',icon:'fa-calendar-days',accent:'30,64,175',lead:'Escolha uma rotina que você realmente consegue cumprir. O FARO redistribui o esforço do mês.'});
  configureDialog({id:'faroOperationDialog',variant:'focus',kicker:'Custo para rodar',title:'Quanto custa colocar o carro na pista?',icon:'fa-gas-pump',accent:'15,118,110',lead:'Use seus números reais. Eles definem quanto precisa faturar e quantos quilômetros precisa rodar.'});
  configureDialog({id:'faroMoneyDialog',variant:'workspace',kicker:monthTitle(),title:'Compromissos',icon:'fa-wallet',accent:'5,150,105',lead:''});
  wireMoneyActions(); wireLiveMotion();

  [['faroMetaDialog','faroOpenMeta'],['faroAgendaDialog','faroOpenAgenda'],['faroOperationDialog','faroOpenOperation']].forEach(([dialogId,cardId]) => $(dialogId)?.addEventListener('close', event => { if (event.currentTarget.returnValue === 'applied') requestAnimationFrame(() => pulse(cardId)); }));
  const hero = $('faroOpenPlanDetail');
  hero?.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); const open = () => planningApi.openDetail(); if (!interactions.reduceMotion() && typeof document.startViewTransition === 'function') document.startViewTransition(open); else open(); },true);

  const moneyDialog = $('faroMoneyDialog');
  if (moneyDialog) new MutationObserver(() => { if (moneyRendering) return; requestAnimationFrame(renderMoneyWorkspace); }).observe(moneyDialog,{subtree:true,childList:true,characterData:true});
  const baseRender = app.render;
  app.render = function(...args) { const result = baseRender.apply(this,args); sync(); return result; };
  const baseShowView = app.showView;
  app.showView = function(view,primaryView=view) { const result = baseShowView.call(this,view,primaryView); if (view === 'planning' || view === 'planning-detail') sync(); return result; };
  let queued = false;
  const observer = new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; sync(); }); });
  observer.observe(root,{subtree:true,childList:true,characterData:true});

  sync();
  window.FaroR3B = Object.freeze({ sync, pulse, renderMoneyWorkspace, moneyViewModel, mode:'financial-radar' });
})();