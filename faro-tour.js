(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroTour) return;

  const STORAGE_KEY = 'faro-ui-tour-v1';
  const steps = [
    { target:'[data-faro-tour="today"]', title:'Hoje', text:'Aqui você vê o que precisa fazer agora.', view:'dashboard' },
    { target:'[data-faro-tour="register"]', title:'Registrar', text:'No fim do dia, registre faturamento e km. O FARO faz o resto.' },
    { target:'[data-faro-tour="planning"]', title:'Planejar', text:'Aqui você muda meta, dias, combustível, contas e reservas.' },
    { target:'[data-faro-tour="history"]', title:'Histórico', text:'Aqui fica o que realmente aconteceu, dia por dia.' },
    { target:'[data-faro-tour="central"]', title:'Central', text:'Backup, relatório, instalação, ajuda e ferramentas ficam aqui.' }
  ];

  const readState = () => {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!state || !['active','done','skipped'].includes(state.status)) return { status:'idle', step:0 };
      return { status:state.status, step:Math.max(0, Math.min(steps.length - 1, Number(state.step) || 0)) };
    } catch { return { status:'idle', step:0 }; }
  };
  const writeState = state => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version:1, updatedAt:new Date().toISOString() })); } catch {}
  };

  let state = readState();
  let layer = null;
  let resizeFrame = null;

  const ensureLayer = () => {
    if (layer) return layer;
    const style = document.createElement('style');
    style.id = 'faroTourStyles';
    style.textContent = `
      #faroTourLayer{position:fixed;inset:0;z-index:90;pointer-events:none}
      #faroTourSpotlight{position:fixed;border:3px solid #60a5fa;border-radius:18px;box-shadow:0 0 0 9999px rgba(15,23,42,.68),0 0 0 5px rgba(96,165,250,.22);transition:top .18s ease,left .18s ease,width .18s ease,height .18s ease;pointer-events:none}
      #faroTourTip{position:fixed;width:min(330px,calc(100vw - 24px));border-radius:22px;background:#fff;padding:16px;box-shadow:0 24px 70px rgba(15,23,42,.32);pointer-events:auto}
      #faroTourTip .faro-tour-head{display:flex;align-items:center;gap:10px}.faro-tour-head img{width:42px;height:42px;object-fit:contain;background:#eff6ff;border-radius:14px;padding:5px}
      #faroTourTip h3{font-size:18px;font-weight:900;color:#0f172a}.faro-tour-text{margin-top:8px;color:#64748b;font-size:12px;line-height:1.5}
      #faroTourTip .faro-tour-progress{font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}
      #faroTourTip .faro-tour-actions{display:grid;grid-template-columns:auto 1fr auto;gap:8px;margin-top:14px}.faro-tour-actions button{min-height:44px;border-radius:14px;padding:0 13px;font-size:11px;font-weight:900}.faro-tour-skip{background:#f8fafc;color:#64748b}.faro-tour-back{background:#f1f5f9;color:#475569}.faro-tour-next{background:#2563eb;color:#fff}
      @media(prefers-reduced-motion:reduce){#faroTourSpotlight{transition:none!important}}
    `;
    document.head.appendChild(style);

    layer = document.createElement('div');
    layer.id = 'faroTourLayer';
    layer.className = 'hidden';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'false');
    layer.setAttribute('aria-label', 'Tour rápido do FARO');
    layer.innerHTML = `<div id="faroTourSpotlight"></div><div id="faroTourTip"><div class="faro-tour-head"><img src="./faro-mark.svg" alt=""><div class="min-w-0 flex-1"><span id="faroTourProgress" class="faro-tour-progress"></span><h3 id="faroTourTitle"></h3></div></div><p id="faroTourText" class="faro-tour-text"></p><div class="faro-tour-actions"><button id="faroTourSkip" type="button" class="faro-tour-skip">PULAR</button><button id="faroTourBack" type="button" class="faro-tour-back">VOLTAR</button><button id="faroTourNext" type="button" class="faro-tour-next">PRÓXIMO</button></div></div>`;
    document.body.appendChild(layer);
    layer.querySelector('#faroTourSkip').addEventListener('click', skip);
    layer.querySelector('#faroTourBack').addEventListener('click', previous);
    layer.querySelector('#faroTourNext').addEventListener('click', next);
    return layer;
  };

  const currentTarget = () => document.querySelector(steps[state.step]?.target || '');
  const place = () => {
    if (!layer || layer.classList.contains('hidden') || state.status !== 'active') return;
    const target = currentTarget();
    if (!target) {
      layer.classList.add('hidden');
      console.error(`FARO TOUR: alvo obrigatório ausente: ${steps[state.step]?.target}`);
      return;
    }
    const rect = target.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(6, rect.top - pad);
    const left = Math.max(6, rect.left - pad);
    const width = Math.min(window.innerWidth - left - 6, rect.width + pad * 2);
    const height = Math.min(window.innerHeight - top - 6, rect.height + pad * 2);
    const spotlight = layer.querySelector('#faroTourSpotlight');
    spotlight.style.top = `${top}px`;
    spotlight.style.left = `${left}px`;
    spotlight.style.width = `${Math.max(36, width)}px`;
    spotlight.style.height = `${Math.max(36, height)}px`;

    const tip = layer.querySelector('#faroTourTip');
    const desiredTop = top + height + 12;
    const tipHeight = Math.min(245, tip.offsetHeight || 210);
    const tipTop = desiredTop + tipHeight <= window.innerHeight - 8 ? desiredTop : Math.max(8, top - tipHeight - 12);
    tip.style.top = `${tipTop}px`;
    tip.style.left = `${Math.max(12, Math.min(window.innerWidth - Math.min(330, window.innerWidth - 24) - 12, left + width / 2 - Math.min(330, window.innerWidth - 24) / 2))}px`;
  };

  const render = () => {
    ensureLayer();
    if (state.status !== 'active') { layer.classList.add('hidden'); return; }
    const step = steps[state.step];
    if (!step) return complete();
    if (step.view && app.currentView !== step.view) app.navigateToPrimary(step.view);
    const target = currentTarget();
    if (!target) {
      layer.classList.add('hidden');
      console.error(`FARO TOUR: alvo obrigatório ausente: ${step.target}`);
      return;
    }
    layer.querySelector('#faroTourProgress').textContent = `${state.step + 1}/${steps.length}`;
    layer.querySelector('#faroTourTitle').textContent = step.title;
    layer.querySelector('#faroTourText').textContent = step.text;
    layer.querySelector('#faroTourBack').classList.toggle('invisible', state.step === 0);
    layer.querySelector('#faroTourNext').textContent = state.step === steps.length - 1 ? 'PRONTO' : 'PRÓXIMO';
    layer.classList.remove('hidden');
    requestAnimationFrame(place);
  };

  function start({ replay = false } = {}) {
    if (!replay && (state.status === 'done' || state.status === 'skipped')) return;
    state = { status:'active', step: replay ? 0 : (state.status === 'active' ? state.step : 0) };
    writeState(state);
    app.navigateToPrimary('dashboard');
    setTimeout(render, 60);
  }
  function next() {
    if (state.step >= steps.length - 1) return complete();
    state = { status:'active', step:state.step + 1 };
    writeState(state);
    render();
  }
  function previous() {
    if (state.step <= 0) return;
    state = { status:'active', step:state.step - 1 };
    writeState(state);
    render();
  }
  function skip() {
    state = { status:'skipped', step:state.step };
    writeState(state);
    layer?.classList.add('hidden');
    app.toast('Tour pulado. Você pode rever pela Central.');
  }
  function complete() {
    state = { status:'done', step:steps.length - 1 };
    writeState(state);
    layer?.classList.add('hidden');
    app.toast('Pronto. Agora é só usar a pista.');
  }

  const central = document.getElementById('view-more');
  if (central && !document.getElementById('faroTourHelp')) {
    const help = document.createElement('section');
    help.id = 'faroTourHelp';
    help.className = 'card-vetta p-5';
    help.innerHTML = `<span class="label-micro !text-blue-600">Ajuda</span><div class="flex items-center justify-between gap-3"><div><strong class="block text-sm">Tour rápido do FARO</strong><p class="text-xs text-slate-500 mt-1">Reveja onde ficam as cinco ações principais.</p></div><button id="faroReplayTour" type="button" class="min-h-[44px] px-4 rounded-2xl bg-blue-50 text-blue-700 text-[10px] font-extrabold">VER TOUR</button></div>`;
    central.appendChild(help);
    help.querySelector('#faroReplayTour').addEventListener('click', () => start({ replay:true }));
  }

  const finish = document.getElementById('faroFinish');
  finish?.addEventListener('click', () => {
    setTimeout(() => {
      if (!app.state.onboardingComplete) return;
      state = { status:'active', step:0 };
      writeState(state);
      start();
    }, 30);
  });

  const schedulePlace = () => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = null; place(); });
  };
  window.addEventListener('resize', schedulePlace);
  window.addEventListener('orientationchange', schedulePlace);
  window.addEventListener('scroll', schedulePlace, { passive:true });

  if (state.status === 'active' && app.state.onboardingComplete) setTimeout(render, 80);

  window.FaroTour = Object.freeze({ start, replay:() => start({ replay:true }), skip, complete, getState:() => ({ ...state }) });
})();
