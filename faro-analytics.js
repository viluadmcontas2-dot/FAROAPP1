// FARO Analytics: medição anônima de telas e ações. Sem terceiros, sem cookies, sem PII,
// sem valores financeiros e sem texto digitado. Falha sempre em silêncio e nunca bloqueia a interface.
(() => {
  const KEY_SESSION = 'faro.analytics.session';
  const KEY_OPTOUT = 'faro.analytics.optout';
  const KEY_QUEUE = 'faro.analytics.queue';
  const KEY_SEEN = 'faro.analytics.seen';
  const MAX_QUEUE = 50;
  const EVENTS = ['screen_view', 'cta_tap', 'trial_start', 'app_installed', 'first_entry', 'subscription_active'];
  const PROPS = ['tela', 'id_cta', 'origem', 'plano', 'modo', 'faixa_dia'];
  const config = window.FARO_CONFIG || {};
  const memory = { queue: [], session: null, once: new Set() };

  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); return true; } catch { return false; } },
    del(key) { try { window.localStorage.removeItem(key); } catch {} }
  };

  const enabled = () => {
    try {
      const nav = typeof navigator === 'undefined' ? {} : navigator;
      if (store.get(KEY_OPTOUT) === '1') return false;
      if (nav.doNotTrack === '1' || window.doNotTrack === '1') return false;
      if (nav.globalPrivacyControl) return false;
      return Boolean(config.supabaseUrl && config.supabasePublishableKey);
    } catch { return false; }
  };

  const uuid = () => {
    try {
      const c = typeof crypto !== 'undefined' ? crypto : window.crypto;
      if (c?.randomUUID) return c.randomUUID();
      const b = c.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
      const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    } catch { return null; }
  };
  // Id aleatório de sessão (sessionStorage), renovado a cada dia. Sem cookie e sem ID persistente.
  const day = () => new Date().toISOString().slice(0, 10);
  const sessionId = () => {
    const today = day();
    if (memory.session?.day === today) return memory.session.id;
    let saved = null;
    try { saved = JSON.parse(window.sessionStorage.getItem(KEY_SESSION) || 'null'); } catch {}
    if (saved?.day === today && /^[0-9a-f-]{36}$/.test(saved.id || '')) { memory.session = saved; return saved.id; }
    const id = uuid();
    if (!id) return null;
    memory.session = { id, day: today };
    try { window.sessionStorage.setItem(KEY_SESSION, JSON.stringify(memory.session)); } catch {}
    return id;
  };

  const cleanScreen = value => {
    const s = String(value ?? '').toLowerCase();
    return /^[a-z0-9_-]{1,40}$/.test(s) ? s : null;
  };
  const cleanProps = value => {
    const out = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const key of PROPS) {
      const v = value[key];
      if (typeof v === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(v)) out[key] = v;
    }
    return out;
  };

  const persist = () => {
    if (memory.queue.length) store.set(KEY_QUEUE, JSON.stringify(memory.queue));
    else store.del(KEY_QUEUE);
  };
  const load = () => {
    try {
      const saved = JSON.parse(store.get(KEY_QUEUE) || '[]');
      if (Array.isArray(saved)) memory.queue = saved.filter(e => e && EVENTS.includes(e.p_event)).slice(-MAX_QUEUE);
    } catch { memory.queue = []; }
  };
  const push = item => {
    memory.queue.push(item);
    if (memory.queue.length > MAX_QUEUE) memory.queue.splice(0, memory.queue.length - MAX_QUEUE);
    persist();
  };

  let timer = null;
  const schedule = () => {
    try {
      if (timer) return;
      timer = window.setTimeout(() => { timer = null; flush(); }, 3000);
    } catch {}
  };

  const send = item => {
    const url = `${String(config.supabaseUrl).replace(/\/$/, '')}/rest/v1/rpc/faro_track`;
    return window.fetch(url, {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', apikey: config.supabasePublishableKey, Authorization: `Bearer ${config.supabasePublishableKey}` },
      body: JSON.stringify(item)
    });
  };

  function flush() {
    try {
      if (!enabled() || !memory.queue.length) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const batch = memory.queue.splice(0);
      persist();
      const retry = item => { push(item); };
      for (const item of batch) {
        try {
          Promise.resolve(send(item)).then(res => { if (res && !res.ok && res.status >= 500) retry(item); }, () => retry(item));
        } catch { retry(item); }
      }
    } catch {}
  }

  function track(event, screen, props) {
    try {
      if (!EVENTS.includes(event) || !enabled()) return;
      const id = sessionId();
      if (!id) return;
      push({ p_session: id, p_event: event, p_screen: cleanScreen(screen), p_props: cleanProps(props) });
      schedule();
    } catch {}
  }

  const setEnabled = on => {
    try {
      if (on) store.del(KEY_OPTOUT);
      else { store.set(KEY_OPTOUT, '1'); memory.queue = []; store.del(KEY_QUEUE); }
    } catch {}
  };
  const once = (name, fn) => {
    if (memory.once.has(name)) return;
    memory.once.add(name);
    fn();
  };
  // Marcas únicas por aparelho ("primeiro registro", "teste iniciado") guardadas só como sim/não.
  const oncePerDevice = (name, fn) => {
    let seen = {};
    try { seen = JSON.parse(store.get(KEY_SEEN) || '{}') || {}; } catch {}
    if (seen[name]) return;
    seen[name] = 1;
    store.set(KEY_SEEN, JSON.stringify(seen));
    fn();
  };
  const mode = () => {
    try { return window.matchMedia?.('(display-mode: standalone)').matches ? 'pwa' : 'browser'; } catch { return 'browser'; }
  };

  try {
    load();
    window.addEventListener('online', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    // Clique delegado: qualquer elemento com data-faro-track="id" vira cta_tap (só o id, nunca texto).
    document.addEventListener?.('click', event => {
      try {
        const el = event?.target?.closest?.('[data-faro-track]');
        const id = el?.getAttribute?.('data-faro-track');
        if (id) track('cta_tap', memory.screen, { id_cta: id, modo: mode() });
      } catch {}
    }, true);

    window.addEventListener('appinstalled', () => track('app_installed', 'instalar'));
    window.addEventListener('faro:plan-state', event => {
      const kind = event?.detail?.kind;
      if (kind === 'trial') oncePerDevice('trial', () => track('trial_start', 'plano'));
      if (kind === 'subscriber' && config.billingEnabled === true) oncePerDevice('subscription', () => track('subscription_active', 'plano'));
    });

    const app = window.__vettaApp;
    if (app) {
      const baseShowView = app.showView;
      if (typeof baseShowView === 'function') {
        app.showView = function(...args) {
          const result = baseShowView.apply(this, args);
          const name = cleanScreen(args[0]);
          if (name && name !== memory.screen) { memory.screen = name; track('screen_view', name, { tela: name, modo: mode() }); }
          return result;
        };
      }
      const baseSaveDay = app.saveDay;
      if (typeof baseSaveDay === 'function') {
        app.saveDay = function(...args) {
          const before = Array.isArray(this.state?.records) ? this.state.records.length : -1;
          const result = baseSaveDay.apply(this, args);
          try {
            const after = Array.isArray(this.state?.records) ? this.state.records.length : -1;
            if (before >= 0 && after > before) oncePerDevice('first_entry', () => track('first_entry', 'day'));
          } catch {}
          return result;
        };
      }
    }
  } catch {}

  // Interruptor da tela de conta (#faroAnalyticsToggle). Sinais DNT/GPC do navegador valem mais: ficam desligados e travados.
  const bindToggle = () => {
    try {
      const toggle = document.getElementById?.('faroAnalyticsToggle');
      if (!toggle || toggle.dataset.faroBound) return;
      toggle.dataset.faroBound = '1';
      const nav = typeof navigator === 'undefined' ? {} : navigator;
      const signal = nav.doNotTrack === '1' || window.doNotTrack === '1' || Boolean(nav.globalPrivacyControl);
      toggle.checked = enabled();
      toggle.disabled = signal;
      toggle.addEventListener('change', () => setEnabled(toggle.checked));
    } catch {}
  };
  try { bindToggle(); window.addEventListener('load', bindToggle); } catch {}

  window.FaroAnalytics = Object.freeze({ track, flush, enabled, setEnabled, queueSize: () => memory.queue.length });
})();
