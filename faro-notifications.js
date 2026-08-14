(() => {
  const app = window.__vettaApp;
  const config = window.FARO_CONFIG || {};
  const central = document.getElementById('view-more');
  if (!app || !central || window.FaroNotifications) return;

  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  const DEVICE_KEY = 'faro-device-id-v1';
  const $ = id => document.getElementById(id);
  let client = null;

  const deviceId = localStorage.getItem(DEVICE_KEY) || (() => {
    const value = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, value);
    return value;
  })();

  const canOffer = () => Boolean(
    config.pushEnabled &&
    config.pushPublicKey &&
    config.supabaseUrl &&
    config.supabasePublishableKey &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );

  const loadClient = async () => {
    if (client) return client;
    const { createClient } = await import(SDK_URL);
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession:true, autoRefreshToken:true } });
    return client;
  };

  const decodeKey = value => {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  };

  const injectUi = () => {
    if ($('faroNotificationsCard')) return;
    const card = document.createElement('section');
    card.id = 'faroNotificationsCard';
    card.className = 'hidden card-vetta p-6';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div><span class="label-micro !text-blue-700">Preferências</span><h3 class="text-lg font-extrabold">Avisos úteis do FARO</h3><p class="text-xs text-slate-500 mt-2">Lembretes de vencimentos, contas pendentes e mudanças importantes no seu plano. Sem excesso.</p></div>
        <button id="faroNoticesToggle" type="button" role="switch" aria-checked="false" class="toggle shrink-0" aria-label="Ativar avisos úteis do FARO"></button>
      </div>
      <p id="faroNoticesStatus" class="text-[10px] text-slate-500 mt-3">Desativados</p>`;
    const account = $('faroAccountCard');
    if (account) account.insertAdjacentElement('afterend', card);
    else central.appendChild(card);
  };
  injectUi();

  const setUi = (active, message) => {
    const toggle = $('faroNoticesToggle');
    if (!toggle) return;
    toggle.classList.toggle('active', active);
    toggle.setAttribute('aria-checked', String(active));
    $('faroNoticesStatus').textContent = message || (active ? 'Ativados neste aparelho' : 'Desativados');
  };

  const currentContext = async () => {
    if (!canOffer()) return null;
    const supabase = await loadClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { supabase, user:data.session.user, registration, subscription };
  };

  const persistPreference = async (supabase, userId, active, subscription = null) => {
    const payload = {
      user_id:userId,
      device_id:deviceId,
      platform:'web',
      subscription:subscription ? subscription.toJSON() : null,
      active
    };
    const { error:deviceError } = await supabase.from('faro_push_devices').upsert(payload, { onConflict:'user_id,device_id' });
    if (deviceError) throw deviceError;
    const { error:profileError } = await supabase.from('faro_profiles').upsert({ user_id:userId, notices_enabled:active }, { onConflict:'user_id' });
    if (profileError) throw profileError;
  };

  const activate = async () => {
    const context = await currentContext();
    if (!context) return app.toast('Salve seu FARO na conta antes de ativar avisos.');
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') {
      setUi(false, 'Permissão não concedida neste aparelho');
      return app.toast('Os avisos continuam desativados.');
    }
    let subscription = context.subscription;
    if (!subscription) {
      subscription = await context.registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:decodeKey(config.pushPublicKey)
      });
    }
    await persistPreference(context.supabase, context.user.id, true, subscription);
    setUi(true, 'Ativados neste aparelho');
    app.toast('Avisos úteis ativados.');
  };

  const deactivate = async () => {
    const context = await currentContext();
    if (!context) return setUi(false, 'Desativados');
    if (context.subscription) await context.subscription.unsubscribe();
    await persistPreference(context.supabase, context.user.id, false, null);
    setUi(false, 'Desativados neste aparelho');
    app.toast('Avisos desativados neste aparelho.');
  };

  const refresh = async () => {
    const card = $('faroNotificationsCard');
    if (!card) return;
    if (!canOffer()) {
      card.classList.add('hidden');
      return;
    }
    const context = await currentContext();
    if (!context) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    const active = Boolean(context.subscription) && Notification.permission === 'granted';
    setUi(active, active ? 'Ativados neste aparelho' : 'Desativados');
  };

  $('faroNoticesToggle').addEventListener('click', async () => {
    const active = $('faroNoticesToggle').getAttribute('aria-checked') === 'true';
    $('faroNoticesToggle').disabled = true;
    try {
      if (active) await deactivate();
      else await activate();
    } catch (error) {
      console.warn('FARO avisos', error);
      app.toast('Não foi possível atualizar os avisos agora.');
    } finally {
      $('faroNoticesToggle').disabled = false;
      refresh();
    }
  });

  window.addEventListener('online', refresh);
  window.addEventListener('focus', refresh);
  setTimeout(refresh, 0);
  window.FaroNotifications = { refresh };
})();
