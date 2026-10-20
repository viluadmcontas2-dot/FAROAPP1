(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroPwa) return;

  const root = document.documentElement;
  const CAR_KEY = 'faro-car-mode-v1';
  const LIGHT_THEME = '#FFFFFF';
  const CAR_THEME = '#000000';
  const store = {
    get: key => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível: segue sem lembrar */ } }
  };
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Cor da barra de status (theme-color dinâmico) ---------- */
  const syncThemeColor = () => {
    const color = root.dataset.faroCar === 'on' ? CAR_THEME : LIGHT_THEME;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    if (meta.content !== color) meta.content = color;
    root.style.colorScheme = root.dataset.faroCar === 'on' ? 'dark' : 'light';
  };

  /* ---------- Armazenamento persistente (o navegador não apaga os dados do motorista) ---------- */
  const requestPersistence = async () => {
    try {
      if (!navigator.storage?.persist) return false;
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    } catch { return false; }
  };

  /* ---------- Tela sempre acesa no modo carro (Wake Lock) ---------- */
  let wakeLock = null;
  const releaseWakeLock = async () => {
    const lock = wakeLock;
    wakeLock = null;
    try { await lock?.release(); } catch { /* já liberado pelo sistema */ }
  };
  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible' || root.dataset.faroCar !== 'on') return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { wakeLock = null; }
  };

  /* ---------- Modo carro ---------- */
  const setCarMode = on => {
    root.dataset.faroCar = on ? 'on' : 'off';
    store.set(CAR_KEY, on ? 'on' : 'off');
    const toggle = document.getElementById('faroCarToggle');
    if (toggle) toggle.setAttribute('aria-checked', String(on));
    syncThemeColor();
    if (on) acquireWakeLock(); else releaseWakeLock();
  };

  const mountCarCard = () => {
    const central = document.getElementById('view-more');
    if (!central || document.getElementById('faroCarMode')) return;
    const card = document.createElement('section');
    card.id = 'faroCarMode';
    card.className = 'card-vetta faro-car-card';
    card.setAttribute('aria-labelledby', 'faroCarTitle');
    card.innerHTML = `
      <div class="faro-car-copy">
        <strong id="faroCarTitle">Modo carro</strong>
        <span id="faroCarHint">Tema escuro, botões grandes e tela sempre acesa.</span>
      </div>
      <button id="faroCarToggle" class="faro-switch" type="button" role="switch" aria-checked="false" aria-labelledby="faroCarTitle" aria-describedby="faroCarHint"><span class="faro-switch-knob" aria-hidden="true"></span></button>`;
    central.insertBefore(card, central.firstChild);
    const toggle = card.querySelector('#faroCarToggle');
    toggle.setAttribute('aria-checked', String(root.dataset.faroCar === 'on'));
    toggle.addEventListener('click', () => setCarMode(root.dataset.faroCar !== 'on'));
  };

  /* ---------- Selo no ícone: lembra de registrar o dia ---------- */
  const localToday = () => {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };
  const updateBadge = async () => {
    try {
      if (!('setAppBadge' in navigator)) return;
      const pending = document.visibilityState === 'hidden'
        && app.state?.onboardingComplete === true
        && !(app.state.records || []).some(record => record.date === localToday());
      if (pending) await navigator.setAppBadge(1); else await navigator.clearAppBadge();
    } catch { /* Badging API opcional */ }
  };

  /* ---------- Atalhos do ícone (manifest.shortcuts) ---------- */
  const shortcutTargets = { registrar: 'day', inicio: 'dashboard' };
  const handleShortcut = () => {
    const params = new URLSearchParams(location.search);
    const target = shortcutTargets[params.get('atalho')];
    if (!target) return;
    let tries = 0;
    const attempt = () => {
      const ready = root.dataset.faroPlatformReady === 'true' && root.dataset.faroActivationStage !== 'install';
      if (ready && app.state?.onboardingComplete === true) {
        app.navigateToPrimary(target);
        const clean = new URL(location.href);
        clean.searchParams.delete('atalho');
        history.replaceState(history.state, '', clean.pathname + clean.search + clean.hash);
        return;
      }
      if (++tries < 40) setTimeout(attempt, 150);
    };
    attempt();
  };

  /* ---------- Atualização: "Nova versão — Atualizar" ---------- */
  let userRequestedUpdate = false;
  const showUpdateBar = registration => {
    if (document.getElementById('faroUpdateBar')) return;
    const bar = document.createElement('div');
    bar.id = 'faroUpdateBar';
    bar.className = 'faro-update-bar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<span>Nova versão disponível</span><button id="faroUpdateApply" type="button">Atualizar</button>';
    document.body.appendChild(bar);
    bar.querySelector('#faroUpdateApply').addEventListener('click', () => {
      userRequestedUpdate = true;
      bar.querySelector('button').disabled = true;
      const worker = registration.waiting;
      if (worker) worker.postMessage({ type: 'FARO_ACTIVATE_WHEN_SAFE' });
      else location.reload();
    });
  };
  const watchUpdates = async () => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (userRequestedUpdate) location.reload();
    });
    try {
      const registration = await navigator.serviceWorker.ready;
      const offer = () => { if (navigator.serviceWorker.controller) showUpdateBar(registration); };
      if (registration.waiting) offer();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(); });
      });
    } catch { /* sem service worker: o app segue funcionando */ }
  };

  /* ---------- Ciclo de vida ---------- */
  document.addEventListener('visibilitychange', () => {
    updateBadge();
    if (document.visibilityState === 'visible') acquireWakeLock();
  });
  window.addEventListener('pageshow', updateBadge);

  const baseShowView = app.showView;
  app.showView = function(...args) {
    const result = baseShowView.apply(this, args);
    syncThemeColor();
    return result;
  };

  mountCarCard();
  syncThemeColor();
  if (root.dataset.faroCar === 'on') acquireWakeLock();
  requestPersistence();
  handleShortcut();
  watchUpdates();

  window.FaroPwa = Object.freeze({ setCarMode, requestPersistence, updateBadge, syncThemeColor, reducedMotion });
})();
