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
  const commitmentState = next => {
    if (!next) return { state:'calm', pill:'Tudo em dia', summary:'nenhum vencimento próximo', accent:'5,150,105' };
    if (next.days < 0) return { state:'risk', pill:'Conta atrasada', summary:`${next.name} está atrasada`, accent:'185,28,28' };
    if (next.days === 0) return { state:'attention', pill:'Vence hoje', summary:`${next.name} vence hoje`, accent:'194,65,12' };
    if (next.days === 1) return { state:'attention', pill:'Vence amanhã', summary:`${next.name} vence amanhã`, accent:'194,65,12' };
    return { state:'upcoming', pill:`Em ${next.days} dias`, summary:`${next.name} vence em ${next.days} dias`, accent:'37,99,235' };
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
      #view-planning [data-tone="amber"] .faro-r3-icon,#view-planning [data-tone="emerald"] .faro-r3-icon{background:rgba(var(--r3b-accent),.1);color:rgb(var(--r3b-accent))}
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
      #view-planning .faro-r3-hero::before{content:"";position:absolute;z-index:-1;width:190px;height:190px;right:-82px;top:-96px;border-radius:999px;background:rgba(37,99,235,.45);filter:blur(44px);pointer-events:none;transition:transform .22s cubic-bezier(.16,1,.3,1)}
      #view-planning .faro-r3-hero::after{content:"";position:absolute;z-index:-1;width:145px;height:145px;left:-76px;bottom:-105px;border-radius:999px;background:rgba(16,185,129,.26);filter:blur(42px);pointer-events:none}
      #view-planning .faro-r3-hero:active{transform:scale(.986);box-shadow:0 16px 38px -28px rgba(11,17,33,.78)}
      #view-planning .faro-r3-hero:active::before{transform:translateX(-5px) scale(1.04)}
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
      #view-planning .faro-r3-hero-action{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(191,219,254,.14);border-radius:999px;background:rgba(255,255,255,.07);font-size:9.5px;font-weight:800;color:#DBEAFE;letter-spacing:.015em;transition:background .18s ease,transform .14s cubic-bezier(.16,1,.3,1)}
      #view-planning .faro-r3-hero:active .faro-r3-hero-action{background:rgba(255,255,255,.12);transform:translateX(2px)}
      .faro-r3b-updated{animation:faroR3BUpdated .42s cubic-bezier(.16,1,.3,1)}
      @keyframes faroR3BUpdated{0%{box-shadow:0 0 0 0 rgba(var(--r3b-accent,37,99,235),.22),0 18px 38px -30px rgba(11,17,33,.48)}45%{box-shadow:0 0 0 6px rgba(var(--r3b-accent,37,99,235),.08),0 22px 42px -28px rgba(11,17,33,.48)}100%{box-shadow:0 0 0 0 rgba(var(--r3b-accent,37,99,235),0),0 18px 38px -30px rgba(11,17,33,.48)}}
      .faro-r3b-live-change{animation:faroR3BLive .18s cubic-bezier(.16,1,.3,1)}
      @keyframes faroR3BLive{from{opacity:.58;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
      .faro-r3-editor,.faro-r3-editor *,.faro-dialog--focus,.faro-dialog--workspace{font-family:"Plus Jakarta Sans",sans-serif}
      .faro-r3-editor-label,.faro-plan-preview span,.faro-field label,.faro-money-tab,.faro-money-action,.faro-money-legacy>summary,.faro-plan-details>summary,.faro-detail-metric span{font-weight:800!important}
      .faro-plan-target-value{font-weight:800!important;letter-spacing:-.045em}
      .faro-plan-preview strong,.faro-field input,.faro-field select,.faro-week-day,.faro-r3-actions button,.faro-money-row strong,.faro-subview-title,.faro-detail-metric strong{font-weight:700!important}
      #faroMetaDialog .input-wrapper>span{z-index:1}
      #faroMetaDialog #faroTargetExact{padding-left:40px!important}
      .faro-r3-actions button{text-transform:none;font-size:11px;letter-spacing:0}
      .faro-r3-primary{box-shadow:0 12px 24px -16px rgba(37,99,235,.75)}
      .faro-r3b-dialog-lead{margin:0 0 16px;padding:12px 14px;border-left:3px solid rgba(var(--faro-dialog-accent,37,99,235),.45);border-radius:16px;background:linear-gradient(145deg,rgba(var(--faro-dialog-accent,37,99,235),.07),#F8FAFC 70%);color:#64748B;font-size:11px;line-height:1.5;font-weight:600}
      .faro-r3b-dialog-symbol{width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto;border-radius:16px;background:rgba(var(--faro-dialog-accent,37,99,235),.1);color:rgb(var(--faro-dialog-accent,37,99,235));font-size:16px;box-shadow:inset 0 0 0 1px rgba(var(--faro-dialog-accent,37,99,235),.1)}
      .faro-dialog--focus .faro-dialog-head,.faro-dialog--workspace .faro-dialog-head{align-items:center}
      .faro-dialog--focus .faro-dialog-kicker,.faro-dialog--workspace .faro-dialog-kicker{font-weight:800!important;color:rgb(var(--faro-dialog-accent,37,99,235))}
      .faro-dialog--focus .faro-dialog-title,.faro-dialog--workspace .faro-dialog-title{font-weight:800!important;letter-spacing:-.03em}
      .faro-dialog--focus .faro-context-note,.faro-dialog--workspace .faro-context-note{border:1px solid rgba(var(--faro-dialog-accent,37,99,235),.14);background:linear-gradient(145deg,rgba(var(--faro-dialog-accent,37,99,235),.075),#F8FBFF);font-weight:600}
      .faro-dialog--workspace .faro-money-tabs{top:0;border:1px solid #E2E8F0;background:#F8FAFC}
      .faro-r3b-money-summary{border-left:3px solid rgb(var(--faro-dialog-accent,37,99,235))!important}
      .faro-dialog--workspace .faro-money-row{position:relative;overflow:hidden;border-color:#E2E8F0;box-shadow:0 12px 28px -26px rgba(11,17,33,.45)}
      .faro-dialog--workspace .faro-money-row::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#CBD5E1}
      .faro-dialog--workspace .faro-money-row[data-r3b-state="paid"]{opacity:.72;background:#F8FAFC}
      .faro-dialog--workspace .faro-money-row[data-r3b-state="paid"]::before{background:#94A3B8}
      .faro-dialog--workspace .faro-money-row[data-r3b-state="risk"]::before{background:#B91C1C}
      .faro-dialog--workspace .faro-money-row[data-r3b-state="attention"]::before{background:#C2410C}
      .faro-dialog--workspace .faro-money-row[data-r3b-state="upcoming"]::before{background:#2563EB}
      .faro-r3b-money-state{display:inline-flex;margin:0 0 5px;padding:4px 7px;border-radius:999px;background:#F1F5F9;color:#64748B;font-size:8px;line-height:1;font-weight:800}
      .faro-money-row[data-r3b-state="risk"] .faro-r3b-money-state{background:#FEF2F2;color:#B91C1C}
      .faro-money-row[data-r3b-state="attention"] .faro-r3b-money-state{background:#FFF7ED;color:#C2410C}
      .faro-money-row[data-r3b-state="upcoming"] .faro-r3b-money-state{background:#EFF6FF;color:#1D4ED8}
      .faro-money-row[data-r3b-state="paid"] .faro-r3b-money-state{background:#F1F5F9;color:#64748B}
      .faro-dialog--workspace .faro-money-action{text-transform:none!important;font-size:9.5px}
      #view-planning-detail .faro-subview-title{font-weight:800!important}
      #view-planning-detail .faro-detail-summary{background:linear-gradient(145deg,#F8FBFF,#fff);box-shadow:0 18px 40px -32px rgba(11,17,33,.45)}
      #faroOpenPlanDetail{view-transition-name:faro-plan-card}
      #view-planning-detail .faro-detail-summary{view-transition-name:faro-plan-detail}
      @media(hover:hover) and (pointer:fine){#view-planning .faro-r3-tile:hover{transform:translateY(-2px);border-color:rgba(var(--r3b-accent),.22);box-shadow:0 22px 42px -28px rgba(11,17,33,.5),0 1px 2px rgba(11,17,33,.03)}#view-planning .faro-r3-tile:hover .faro-r3-arrow{transform:translateX(2px)}}
      @media(max-width:360px){#view-planning .faro-r3-hero{min-height:166px;padding:18px}#view-planning .faro-r3-tile{padding:13px;gap:6px}.faro-r3b-hero-mark{width:28px;height:28px}.faro-r3b-card-cta{font-size:9px}.faro-r3b-week-dot{width:13px;height:13px;font-size:6px}#view-planning .faro-r3-tile-value{font-size:18px}}
      @media(prefers-reduced-motion:reduce){#view-planning .faro-r3-tile,#view-planning .faro-r3-hero,#view-planning .faro-r3-icon,#view-planning .faro-r3-arrow,.faro-r3b-card-cta i,#view-planning .faro-r3-hero-action{transition:none}.faro-r3b-updated,.faro-r3b-live-change{animation:none!important}}
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

  const configureDialog = ({ id, variant, kicker, title, icon, lead, accent='37,99,235' }) => {
    const dialog = $(id);
    if (!dialog) return;
    dialog.classList.remove('faro-dialog--sheet','faro-dialog--page','faro-dialog--focus','faro-dialog--workspace');
    dialog.classList.add(`faro-dialog--${variant}`);
    dialog.style.setProperty('--faro-dialog-accent',accent);
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
    hero.setAttribute('aria-label','Entender seu plano do mês');
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
      ['faroOpenMeta','goal','Meta do mês','fa-bullseye','Ajustar'],
      ['faroOpenAgenda','days','Dias na pista','fa-calendar-days','Editar dias'],
      ['faroOpenOperation','cost','Custo para rodar','fa-gas-pump','Recalcular'],
      ['faroOpenMoney','commitments','Compromissos','fa-wallet','Ver compromissos']
    ];
    cards.forEach(([id,kind,label,icon,action]) => {
      const card = $(id);
      if (!card) return;
      card.dataset.r3bKind = kind;
      card.dataset.r3bInteractive = 'true';
      const labelNode = card.querySelector('.faro-r3-tile-label');
      setText(labelNode,label);
      const copy = labelNode?.parentElement;
      copy?.classList.add('faro-r3b-card-copy');
      const iconNode = card.querySelector('.faro-r3-icon i');
      if (iconNode) iconNode.className = `fas ${icon}`;
      const arrow = card.querySelector('.faro-r3-arrow i');
      if (arrow) arrow.className = 'fas fa-chevron-right';
      if (kind === 'days' && copy && !copy.querySelector('.faro-r3b-week-strip')) {
        const strip = document.createElement('span');
        strip.className = 'faro-r3b-week-strip';
        strip.setAttribute('aria-hidden','true');
        strip.innerHTML = WEEK.map(item => `<span class="faro-r3b-week-dot" data-r3b-weekday="${item.day}">${item.label}</span>`).join('');
        copy.appendChild(strip);
      }
      if (kind === 'commitments' && copy && !copy.querySelector('#faroR3BCommitmentStatus')) {
        const status = document.createElement('span');
        status.id = 'faroR3BCommitmentStatus';
        status.className = 'faro-r3b-status-pill';
        copy.insertBefore(status,copy.querySelector('.faro-r3-tile-meta'));
      }
      if (!card.querySelector('.faro-r3b-card-cta')) {
        const cta = document.createElement('span');
        cta.className = 'faro-r3b-card-cta';
        cta.innerHTML = `<span>${action}</span><i class="fas fa-chevron-right" aria-hidden="true"></i>`;
        card.appendChild(cta);
      }
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
    setText($('faroMoneyTabBills'),'Contas');
    setText($('faroMoneyTabReserves'),'Reservas');

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

  const renderWeekStrip = () => {
    document.querySelectorAll('[data-r3b-weekday]').forEach(dot => dot.dataset.active = String(app.state.workWeekdays.includes(Number(dot.dataset.r3bWeekday))));
  };

  const classifyMoneyRow = row => {
    const small = row.querySelector('small');
    if (!small || row.querySelector('.faro-r3b-money-state')) return;
    const raw = small.textContent.trim();
    const parts = raw.split(' · ');
    const when = parts[0] || '';
    const amount = parts.slice(1).join(' · ');
    const state = /pago/i.test(when) ? 'paid' : /venceu/i.test(when) ? 'risk' : /hoje|amanhã/i.test(when) ? 'attention' : 'upcoming';
    row.dataset.r3bState = state;
    const badge = document.createElement('span');
    badge.className = 'faro-r3b-money-state';
    badge.textContent = when.charAt(0).toUpperCase() + when.slice(1);
    small.parentElement?.insertBefore(badge,small);
    if (amount) setText(small,amount);
  };

  const enhanceMoneyWorkspace = info => {
    const dialog = $('faroMoneyDialog');
    if (!dialog) return;
    dialog.style.setProperty('--faro-dialog-accent',info.accent);
    const summary = $('faroMoneySummary');
    if (summary) {
      summary.classList.add('faro-r3b-money-summary');
      summary.dataset.r3bState = info.state;
      const monthly = app.money(app.calculations().costs.monthlyFixed,0);
      setText(summary,`${monthly} já comprometidos · ${info.summary}.`);
    }
    dialog.querySelectorAll('#faroMoneyBillList .faro-money-row').forEach(classifyMoneyRow);
    dialog.querySelectorAll('[data-r3-pay]').forEach(button => setText(button,'Marcar como paga'));
    dialog.querySelectorAll('[data-r3-undo]').forEach(button => setText(button,'Desfazer'));
    dialog.querySelectorAll('[data-r3-reserve-contribute]').forEach(button => setText(button,'Aportar'));
    dialog.querySelectorAll('[data-r3-reserve-goal]').forEach(button => setText(button,'Definir meta'));
    dialog.querySelectorAll('[data-r3-reserve-remove]').forEach(button => setText(button,'Remover'));
    dialog.querySelectorAll('#faroMoneyReserveList details>summary').forEach(summaryNode => setText(summaryNode,'Últimos aportes'));
  };

  const animateLive = node => {
    if (!node || interactions.reduceMotion()) return;
    node.classList.remove('faro-r3b-live-change');
    void node.offsetWidth;
    node.classList.add('faro-r3b-live-change');
    window.setTimeout(() => node.classList.remove('faro-r3b-live-change'),220);
  };

  const wireLiveMotion = () => {
    ['targetProfitDisplay','faroPreviewDays','faroPreviewDaily','faroPreviewKm','faroDaysConsequence','faroOperationConsequence'].forEach(id => {
      const node = $(id);
      if (!node || node.dataset.r3bMotionReady === 'true') return;
      node.dataset.r3bMotionReady = 'true';
      new MutationObserver(() => animateLive(node)).observe(node,{subtree:true,childList:true,characterData:true});
    });
  };

  const sync = () => {
    const c = app.calculations();
    const target = app.state.targetProfit;
    const actual = c.actualNet || 0;
    const pct = target > 0 ? Math.max(0,Math.min(100,actual/target*100)) : 0;
    const next = window.FaroFinance?.nextPendingOccurrence?.();
    const commitment = commitmentState(next);

    setText($('faroPlanningMonth'),monthTitle());
    setText($('faroR3BHeroLabel'),`Seu plano para ${monthName()}`);
    setText($('faroPlanHeroValue'),`Para sobrar ${app.money(target,0)}`);
    setText($('faroR3BHeroProgressCopy'),actual > 0 ? `${app.money(actual,0)} já construídos · ${Math.round(pct)}% do caminho` : 'O FARO transforma sua meta em ritmo de pista.');
    if ($('faroPlanProgress')) $('faroPlanProgress').style.width = `${pct}%`;
    setText($('faroPlanDaily'),`${app.money(c.dailyGross,0)}/dia`);
    setText($('faroPlanDays'),`${c.ctx.plannedDays} dias de pista`);
    setText($('faroPlanKm'),`≈ ${app.integer(c.dailyKm)} km/dia`);

    setText($('faroMetaCardValue'),app.money(target,0));
    setText($('faroMetaCardMeta'),`${app.money(c.dailyGross,0)}/dia para chegar lá`);
    $('faroOpenMeta')?.setAttribute('aria-label',`Meta do mês: ${app.money(target,0)}. Ajustar`);

    setText($('faroAgendaCardValue'),`${c.ctx.plannedDays} dias`);
    setText($('faroAgendaCardMeta'),`${app.state.extraDaysOff} folgas extras`);
    renderWeekStrip();
    $('faroOpenAgenda')?.setAttribute('aria-label',`Dias na pista: ${c.ctx.plannedDays} dias. Editar dias`);

    setText($('faroOperationCardValue'),`${app.money(c.fuelKm)}/km`);
    setText($('faroOperationCardMeta'),`${app.state.fuel.label || 'Energia'} · receita ${app.money(app.state.revenueKm)}/km`);
    const operationIcon = $('faroOpenOperation')?.querySelector('.faro-r3-icon i');
    if (operationIcon) operationIcon.className = `fas ${energyIcon(app.state.fuel.type)}`;
    $('faroOpenOperation')?.setAttribute('aria-label',`Custo para rodar: ${app.money(c.fuelKm)}/km. Recalcular`);

    const moneyCard = $('faroOpenMoney');
    if (moneyCard) moneyCard.dataset.r3bState = commitment.state;
    setText($('faroMoneyCardValue'),app.money(c.costs.monthlyFixed,0));
    setText($('faroR3BCommitmentStatus'),commitment.pill);
    setText($('faroMoneyCardMeta'),next ? `Contas + reservas · ${next.name}` : 'Contas + reservas organizadas');
    moneyCard?.setAttribute('aria-label',`Compromissos: ${app.money(c.costs.monthlyFixed,0)}. ${commitment.pill}. Ver compromissos`);
    enhanceMoneyWorkspace(commitment);

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
    title:'Quanto você quer que sobre no fim do mês?', icon:'fa-bullseye', accent:'37,99,235',
    lead:'Ajuste o objetivo. O FARO recalcula na hora quanto sua pista precisa entregar.'
  });
  configureDialog({
    id:'faroAgendaDialog', variant:'focus', kicker:'Dias na pista',
    title:'Quais dias você pretende rodar?', icon:'fa-calendar-days', accent:'30,64,175',
    lead:'Escolha uma rotina que você realmente consegue cumprir. O FARO redistribui o esforço do mês.'
  });
  configureDialog({
    id:'faroOperationDialog', variant:'focus', kicker:'Custo para rodar',
    title:'Quanto custa colocar o carro na pista?', icon:'fa-gas-pump', accent:'15,118,110',
    lead:'Use seus números reais. Eles definem quanto precisa faturar e quantos quilômetros precisa rodar.'
  });
  configureDialog({
    id:'faroMoneyDialog', variant:'workspace', kicker:'Compromissos do mês',
    title:'O que seu mês já tem comprometido', icon:'fa-wallet', accent:'5,150,105',
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

  wireLiveMotion();

  const moneyDialog = $('faroMoneyDialog');
  if (moneyDialog) {
    let moneyQueued = false;
    new MutationObserver(() => {
      if (moneyQueued) return;
      moneyQueued = true;
      requestAnimationFrame(() => {
        moneyQueued = false;
        enhanceMoneyWorkspace(commitmentState(window.FaroFinance?.nextPendingOccurrence?.()));
      });
    }).observe(moneyDialog,{subtree:true,childList:true,characterData:true});
  }

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
  window.FaroR3B = Object.freeze({ sync, pulse, mode:'premium-polish' });
})();