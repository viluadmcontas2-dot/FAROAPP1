(() => {
  const app = window.__vettaApp;
  const config = window.FARO_CONFIG || {};
  const central = document.getElementById('view-more');
  if (!app || !central || window.FaroAccount) return;

  const SYNC_META_KEY = 'faro-sync-meta-v1';
  const DEVICE_KEY = 'faro-device-id-v1';
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  const $ = id => document.getElementById(id);
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  let client = null;
  let session = null;
  let syncing = false;
  let suppressDirty = false;
  let syncTimer = null;
  let pendingPhone = '';
  let pendingConflict = null;

  const readMeta = () => {
    try {
      return { localRevision: 0, remoteRevision: 0, dirty: false, userId: null, lastMutationId: null, lastSyncedAt: null, ...JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}') };
    } catch {
      return { localRevision: 0, remoteRevision: 0, dirty: false, userId: null, lastMutationId: null, lastSyncedAt: null };
    }
  };
  const writeMeta = meta => localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  const deviceId = (() => {
    let value = localStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  })();

  const stateHasMeaningfulData = state => Boolean(
    state && (
      state.onboardingComplete ||
      (Array.isArray(state.records) && state.records.length) ||
      (Array.isArray(state.paymentOccurrences) && state.paymentOccurrences.length) ||
      (Array.isArray(state.reserveContributions) && state.reserveContributions.length)
    )
  );

  const sameState = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };

  const setSyncText = (text, tone = 'neutral') => {
    const element = $('faroSyncStatus');
    if (!element) return;
    element.textContent = text;
    element.dataset.tone = tone;
  };

  const subscriptionCopy = status => ({
    active: ['Assinatura ativa', 'Seu FARO está ativo.'],
    trialing: ['Período de teste ativo', 'Seu acesso está liberado durante o teste.'],
    past_due: ['Pagamento precisa de atenção', 'Seus dados continuam preservados. Atualize o pagamento quando puder.'],
    unpaid: ['Pagamento precisa de atenção', 'Seus dados continuam preservados.'],
    paused: ['Assinatura pausada', 'Seus dados permanecem salvos.'],
    canceled: ['Assinatura encerrada', 'Seus dados permanecem salvos.'],
    inactive: ['Sem assinatura ativa', 'Assine quando quiser liberar o acesso comercial.']
  })[status] || ['Sem assinatura ativa', 'Seu histórico local continua preservado.'];

  const injectUi = () => {
    if ($('faroAccountCard')) return;
    const card = document.createElement('section');
    card.id = 'faroAccountCard';
    card.className = 'card-vetta p-6';
    card.innerHTML = `
      <div class="flex justify-between items-start gap-3">
        <div><span class="label-micro !text-blue-700">Minha conta</span><h3 id="faroAccountTitle" class="text-lg font-extrabold">Seus dados estão neste aparelho</h3><p id="faroAccountText" class="text-xs text-slate-500 mt-2">O uso local continua funcionando mesmo sem internet.</p></div>
        <span id="faroAccountBadge" class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold">LOCAL</span>
      </div>
      <div class="mt-4 rounded-2xl bg-slate-50 p-4"><span class="label-micro">Seus dados</span><strong id="faroSyncStatus" class="block text-sm">Salvos neste aparelho</strong></div>
      <div id="faroAccountActions" class="mt-4 grid gap-2">
        <button id="faroSaveAccount" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold text-xs">SALVAR MEU FARO</button>
        <button id="faroSignOut" type="button" class="hidden w-full rounded-2xl bg-slate-100 text-slate-700 font-extrabold text-xs">SAIR DESTA CONTA</button>
      </div>
      <div class="mt-5 pt-5 border-t border-slate-100">
        <span class="label-micro">Meu plano</span>
        <strong id="faroSubscriptionTitle" class="block text-sm">Sem assinatura ativa</strong>
        <p id="faroSubscriptionText" class="text-xs text-slate-500 mt-1">A cobrança comercial será vinculada à sua conta.</p>
        <button id="faroSubscriptionAction" type="button" class="w-full mt-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs">ASSINAR FARO</button>
      </div>`;
    const intro = $('faroCentralIntro');
    if (intro) intro.insertAdjacentElement('afterend', card);
    else central.prepend(card);

    const modal = document.createElement('div');
    modal.id = 'faroAccountModal';
    modal.className = 'modal-backdrop hidden';
    modal.innerHTML = `
      <div class="modal-sheet">
        <div class="flex justify-between items-start gap-3"><div><span class="label-micro !text-blue-700">Salvar meu FARO</span><h3 class="text-xl font-extrabold">Entre com seu telefone</h3><p class="text-xs text-slate-500 mt-2">Sem senha e sem e-mail obrigatório.</p></div><button id="faroAccountClose" type="button" class="w-12 h-12 rounded-2xl bg-slate-100" aria-label="Fechar"><i class="fas fa-xmark"></i></button></div>
        <div id="faroPhoneStep" class="space-y-4 mt-5">
          <div><label class="label-micro">Seu número</label><div class="input-wrapper"><span>+55</span><input id="faroPhone" type="tel" inputmode="tel" autocomplete="tel" class="input-vetta" placeholder="DDD + número"></div><p class="text-[10px] text-slate-500 mt-2">O código será enviado pelo ${config.otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} quando o serviço estiver conectado.</p></div>
          <button id="faroSendCode" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">ENVIAR CÓDIGO</button>
        </div>
        <div id="faroCodeStep" class="hidden space-y-4 mt-5">
          <div><label class="label-micro">Código recebido</label><input id="faroOtpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="input-vetta no-mask text-center text-xl tracking-[.25em]" placeholder="000000"></div>
          <button id="faroVerifyCode" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">CONFIRMAR CÓDIGO</button>
          <button id="faroChangePhone" type="button" class="w-full rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs">CORRIGIR TELEFONE</button>
        </div>
        <p id="faroAccountError" class="hidden mt-4 rounded-2xl bg-red-50 text-red-700 p-3 text-xs"></p>
      </div>`;
    document.body.appendChild(modal);

    const conflict = document.createElement('div');
    conflict.id = 'faroSyncConflict';
    conflict.className = 'modal-backdrop hidden';
    conflict.innerHTML = `
      <div class="modal-sheet">
        <span class="label-micro !text-amber-700">Escolha antes de sincronizar</span>
        <h3 class="text-xl font-extrabold">Há dados neste aparelho e na sua conta</h3>
        <p class="text-xs text-slate-500 mt-2">O FARO não vai sobrescrever nada sozinho.</p>
        <div class="grid gap-3 mt-5">
          <button id="faroKeepLocal" type="button" class="rounded-2xl bg-blue-600 text-white font-extrabold">USAR DADOS DESTE APARELHO</button>
          <button id="faroUseRemote" type="button" class="rounded-2xl bg-slate-900 text-white font-extrabold">USAR DADOS SALVOS NA CONTA</button>
          <button id="faroDecideLater" type="button" class="rounded-2xl bg-slate-100 text-slate-700 font-bold">DECIDIR DEPOIS</button>
        </div>
      </div>`;
    document.body.appendChild(conflict);
  };
  injectUi();

  const normalizePhone = raw => {
    const value = String(raw || '').trim();
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (value.startsWith('+')) return `+${digits}`;
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return `+${digits}`;
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
    return `+${digits}`;
  };

  const showAccountError = message => {
    const error = $('faroAccountError');
    error.textContent = message;
    error.classList.remove('hidden');
  };
  const clearAccountError = () => $('faroAccountError')?.classList.add('hidden');

  const loadClient = async () => {
    if (!configured) return null;
    if (client) return client;
    const { createClient } = await import(SDK_URL);
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client;
  };

  const baseSave = app.save;
  const saveWithoutDirty = () => {
    suppressDirty = true;
    try { return baseSave.call(app); } finally { suppressDirty = false; }
  };

  const scheduleSync = () => {
    if (!configured || !session || !navigator.onLine) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow('debounced'), 2500);
  };

  app.save = function(...args) {
    const result = baseSave.apply(this, args);
    if (!suppressDirty) {
      const meta = readMeta();
      meta.localRevision += 1;
      meta.dirty = true;
      meta.lastMutationId = crypto.randomUUID?.() || `mutation-${Date.now()}`;
      writeMeta(meta);
      setSyncText(navigator.onLine ? 'Alteração salva no aparelho; sincronizando depois' : 'Salvo no aparelho; enviaremos quando houver internet');
      scheduleSync();
    }
    return result;
  };

  const setAccountState = async () => {
    if (!configured) {
      $('faroAccountTitle').textContent = 'Seus dados estão neste aparelho';
      $('faroAccountText').textContent = 'A fundação de conta está pronta; o serviço online ainda não está conectado nesta validação.';
      $('faroAccountBadge').textContent = 'LOCAL';
      $('faroSaveAccount').disabled = false;
      $('faroSignOut').classList.add('hidden');
      setSyncText('Salvos neste aparelho');
      $('faroSubscriptionAction').disabled = true;
      return;
    }
    if (!session?.user) {
      $('faroAccountTitle').textContent = 'Proteja seu FARO';
      $('faroAccountText').textContent = 'Use seu telefone para salvar e recuperar seus dados em outro aparelho.';
      $('faroAccountBadge').textContent = 'LOCAL';
      $('faroSaveAccount').classList.remove('hidden');
      $('faroSignOut').classList.add('hidden');
      setSyncText('Salvos neste aparelho');
      await renderSubscription(null);
      return;
    }
    $('faroAccountTitle').textContent = 'Seu FARO está vinculado';
    $('faroAccountText').textContent = `Conta protegida pelo telefone ${session.user.phone || ''}.`;
    $('faroAccountBadge').textContent = 'CONTA';
    $('faroSaveAccount').classList.add('hidden');
    $('faroSignOut').classList.remove('hidden');
    await renderSubscription(session.user.id);
  };

  const renderSubscription = async userId => {
    if (!configured || !userId || !client) {
      const [title, text] = subscriptionCopy('inactive');
      $('faroSubscriptionTitle').textContent = title;
      $('faroSubscriptionText').textContent = text;
      $('faroSubscriptionAction').textContent = 'ASSINAR FARO';
      $('faroSubscriptionAction').disabled = !configured;
      return;
    }
    const { data } = await client.from('faro_subscriptions').select('status,stripe_customer_id,current_period_end,cancel_at_period_end').eq('user_id', userId).maybeSingle();
    const status = data?.status || 'inactive';
    const [title, text] = subscriptionCopy(status);
    $('faroSubscriptionTitle').textContent = title;
    $('faroSubscriptionText').textContent = data?.cancel_at_period_end && data?.current_period_end
      ? `Acesso mantido até ${new Date(data.current_period_end).toLocaleDateString('pt-BR')}.`
      : text;
    $('faroSubscriptionAction').textContent = data?.stripe_customer_id ? 'GERENCIAR ASSINATURA' : 'ASSINAR FARO';
    $('faroSubscriptionAction').dataset.portal = data?.stripe_customer_id ? 'true' : 'false';
    $('faroSubscriptionAction').disabled = false;
  };

  const uploadLocal = async userId => {
    const meta = readMeta();
    const payload = {
      user_id: userId,
      schema_version: Number(config.schemaVersion || 1),
      state: app.state,
      device_id: deviceId,
      last_mutation_id: meta.lastMutationId || crypto.randomUUID?.() || `mutation-${Date.now()}`,
      client_updated_at: new Date().toISOString()
    };
    const { data, error } = await client.from('faro_state').upsert(payload, { onConflict:'user_id' }).select('revision,server_updated_at').single();
    if (error) throw error;
    writeMeta({ ...meta, userId, remoteRevision:Number(data.revision || 0), dirty:false, lastSyncedAt:data.server_updated_at || new Date().toISOString() });
    setSyncText('Seus dados estão salvos', 'positive');
  };

  const applyRemote = remote => {
    suppressDirty = true;
    try {
      app.state = app.normalizeState(remote.state || {});
      baseSave.call(app);
      app.syncInputs();
      app.render();
    } finally {
      suppressDirty = false;
    }
    const meta = readMeta();
    writeMeta({ ...meta, userId:session.user.id, remoteRevision:Number(remote.revision || 0), dirty:false, lastSyncedAt:remote.server_updated_at || new Date().toISOString() });
    setSyncText('Dados recuperados da sua conta', 'positive');
  };

  const openConflict = remote => {
    pendingConflict = remote;
    $('faroSyncConflict').classList.remove('hidden');
    setSyncText('Escolha quais dados usar antes de sincronizar', 'attention');
  };

  const reconcile = async () => {
    if (!session?.user || !client) return;
    const userId = session.user.id;
    const meta = readMeta();
    const { data:remote, error } = await client.from('faro_state').select('schema_version,revision,state,server_updated_at,last_mutation_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;

    if (!remote) return uploadLocal(userId);
    if (meta.userId && meta.userId !== userId) {
      applyRemote(remote);
      return;
    }
    if (!stateHasMeaningfulData(app.state)) {
      applyRemote(remote);
      return;
    }
    if (!stateHasMeaningfulData(remote.state)) return uploadLocal(userId);
    if (sameState(app.state, remote.state)) {
      writeMeta({ ...meta, userId, remoteRevision:Number(remote.revision || 0), dirty:false, lastSyncedAt:remote.server_updated_at || new Date().toISOString() });
      setSyncText('Seus dados estão salvos', 'positive');
      return;
    }
    if (!meta.userId) {
      openConflict(remote);
      return;
    }
    if (meta.dirty) {
      if (Number(remote.revision || 0) === Number(meta.remoteRevision || 0)) await uploadLocal(userId);
      else openConflict(remote);
      return;
    }
    if (Number(remote.revision || 0) > Number(meta.remoteRevision || 0)) applyRemote(remote);
  };

  async function syncNow() {
    if (!configured || !session?.user || !navigator.onLine || syncing) return;
    syncing = true;
    setSyncText('Salvando sua conta…');
    try {
      await reconcile();
    } catch (error) {
      console.warn('FARO sync', error);
      setSyncText('Salvo no aparelho; tentaremos a conta novamente', 'attention');
    } finally {
      syncing = false;
    }
  }

  const ensureProfile = async userId => {
    const { error } = await client.from('faro_profiles').upsert({ user_id:userId }, { onConflict:'user_id' });
    if (error) throw error;
  };

  const sendCode = async () => {
    clearAccountError();
    if (!configured) return showAccountError('A conta online ainda não está conectada nesta branch de validação. Seu FARO continua salvo neste aparelho.');
    const phone = normalizePhone($('faroPhone').value);
    if (!/^\+\d{10,15}$/.test(phone)) return showAccountError('Confira o DDD e o número do telefone.');
    const supabase = await loadClient();
    const credentials = { phone, ...(config.otpChannel === 'whatsapp' ? { options:{ channel:'whatsapp' } } : {}) };
    const { error } = await supabase.auth.signInWithOtp(credentials);
    if (error) return showAccountError('Não foi possível enviar o código agora. Tente novamente em instantes.');
    pendingPhone = phone;
    $('faroPhoneStep').classList.add('hidden');
    $('faroCodeStep').classList.remove('hidden');
    $('faroOtpCode').focus();
  };

  const verifyCode = async () => {
    clearAccountError();
    const token = $('faroOtpCode').value.replace(/\D/g,'');
    if (token.length !== 6) return showAccountError('Digite os 6 números do código recebido.');
    const supabase = await loadClient();
    const { data, error } = await supabase.auth.verifyOtp({ phone:pendingPhone, token, type:'sms' });
    if (error || !data.session) return showAccountError('Esse código não foi aceito. Confira e tente novamente.');
    session = data.session;
    await ensureProfile(session.user.id);
    $('faroAccountModal').classList.add('hidden');
    await setAccountState();
    await syncNow();
  };

  const safeSignOut = async () => {
    if (!configured || !client || !session?.user) return;
    if (!navigator.onLine) return app.toast('Conecte-se à internet para sair sem arriscar dados não sincronizados.');
    await syncNow();
    if (readMeta().dirty) return app.toast('Ainda há dados esperando sincronização. Tente sair novamente em instantes.');
    await client.auth.signOut();
    session = null;
    localStorage.removeItem(SYNC_META_KEY);
    suppressDirty = true;
    try {
      app.state = app.cloneDefaults();
      app.state.onboardingComplete = false;
      baseSave.call(app);
      app.syncInputs();
      app.render();
    } finally { suppressDirty = false; }
    await setAccountState();
    app.toast('Conta desconectada deste aparelho.');
  };

  const openBilling = async () => {
    if (!configured || !client || !session?.user) return app.toast('Salve seu FARO na conta antes de gerenciar a assinatura.');
    const name = $('faroSubscriptionAction').dataset.portal === 'true' ? 'abrir-portal-faro' : 'criar-checkout-faro';
    $('faroSubscriptionAction').disabled = true;
    try {
      const { data, error } = await client.functions.invoke(name);
      if (error || !data?.url) throw error || new Error('URL ausente');
      location.href = data.url;
    } catch (error) {
      console.warn('FARO cobrança', error);
      app.toast('Não foi possível abrir a assinatura agora.');
      $('faroSubscriptionAction').disabled = false;
    }
  };

  $('faroSaveAccount').addEventListener('click', () => {
    $('faroAccountError').classList.add('hidden');
    $('faroPhoneStep').classList.remove('hidden');
    $('faroCodeStep').classList.add('hidden');
    $('faroAccountModal').classList.remove('hidden');
  });
  $('faroAccountClose').addEventListener('click', () => $('faroAccountModal').classList.add('hidden'));
  $('faroSendCode').addEventListener('click', sendCode);
  $('faroVerifyCode').addEventListener('click', verifyCode);
  $('faroChangePhone').addEventListener('click', () => { $('faroCodeStep').classList.add('hidden'); $('faroPhoneStep').classList.remove('hidden'); });
  $('faroSignOut').addEventListener('click', safeSignOut);
  $('faroSubscriptionAction').addEventListener('click', openBilling);
  $('faroKeepLocal').addEventListener('click', async () => {
    $('faroSyncConflict').classList.add('hidden');
    pendingConflict = null;
    await uploadLocal(session.user.id);
  });
  $('faroUseRemote').addEventListener('click', () => {
    if (pendingConflict) applyRemote(pendingConflict);
    pendingConflict = null;
    $('faroSyncConflict').classList.add('hidden');
  });
  $('faroDecideLater').addEventListener('click', () => {
    pendingConflict = null;
    $('faroSyncConflict').classList.add('hidden');
    setSyncText('Sincronização pausada até você escolher', 'attention');
  });
  window.addEventListener('online', () => { setSyncText('Internet voltou; conferindo seus dados…'); syncNow(); });
  window.addEventListener('offline', () => setSyncText('Salvo no aparelho; enviaremos quando houver internet'));

  const initialize = async () => {
    await setAccountState();
    if (!configured) return;
    try {
      const supabase = await loadClient();
      const { data } = await supabase.auth.getSession();
      session = data.session;
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession;
        setAccountState();
        if (session?.user) syncNow();
      });
      await setAccountState();
      if (session?.user) {
        await ensureProfile(session.user.id);
        await syncNow();
      }
    } catch (error) {
      console.warn('FARO conta indisponível', error);
      setSyncText('Salvo no aparelho; conta online indisponível agora', 'attention');
    }
  };

  initialize();
  window.FaroAccount = { syncNow, normalizePhone, configured:() => configured };
})();
