(() => {
  const app = window.__vettaApp;
  const config = window.FARO_CONFIG || {};
  const central = document.getElementById('view-more');
  if (!app || !central || window.FaroAccount) return;

  const SYNC_META_KEY = 'faro-sync-meta-v1';
  const DEVICE_KEY = 'faro-device-id-v1';
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';
  const $ = id => document.getElementById(id);
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  const billingEnabled = config.billingEnabled === true;
  let client = null;
  let session = null;
  let syncing = false;
  let suppressDirty = false;
  let syncTimer = null;
  let pendingConflict = null;
  let authMode = 'signin';

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
        <div class="flex justify-between items-start gap-3">
          <div><span class="label-micro !text-blue-700">Salvar meu FARO</span><h3 id="faroAuthTitle" class="text-xl font-extrabold">Entre no seu FARO</h3><p id="faroAuthText" class="text-xs text-slate-500 mt-2">Use seu e-mail e sua senha.</p></div>
          <button id="faroAccountClose" type="button" class="w-12 h-12 rounded-2xl bg-slate-100" aria-label="Fechar"><i class="fas fa-xmark"></i></button>
        </div>
        <div class="space-y-4 mt-5">
          <div><label class="label-micro" for="faroEmail">E-mail</label><input id="faroEmail" type="email" inputmode="email" autocomplete="email" class="input-vetta no-mask" placeholder="voce@exemplo.com"></div>
          <div><label class="label-micro" for="faroPassword">Senha</label><input id="faroPassword" type="password" autocomplete="current-password" class="input-vetta no-mask" placeholder="Sua senha"></div>
          <div id="faroPasswordConfirmWrap" class="hidden"><label class="label-micro" for="faroPasswordConfirm">Confirme a senha</label><input id="faroPasswordConfirm" type="password" autocomplete="new-password" class="input-vetta no-mask" placeholder="Digite a senha novamente"><p class="text-[10px] text-slate-500 mt-2">Use pelo menos 8 caracteres.</p></div>
          <div id="faroSignInActions" class="grid gap-2">
            <button id="faroSignIn" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">ENTRAR</button>
            <button id="faroShowSignup" type="button" class="w-full rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs">CRIAR MINHA CONTA</button>
            <button id="faroResetPassword" type="button" class="w-full text-blue-700 font-bold text-xs">ESQUECI MINHA SENHA</button>
          </div>
          <div id="faroSignupActions" class="hidden grid gap-2">
            <button id="faroCreateAccount" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">CRIAR CONTA</button>
            <button id="faroBackToLogin" type="button" class="w-full rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs">JÁ TENHO CONTA</button>
          </div>
          <div id="faroRecoveryActions" class="hidden grid gap-2">
            <button id="faroUpdatePassword" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">SALVAR NOVA SENHA</button>
          </div>
        </div>
        <p id="faroAccountNotice" class="hidden mt-4 rounded-2xl bg-blue-50 text-blue-800 p-3 text-xs"></p>
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

  const normalizeEmail = raw => String(raw || '').trim().toLowerCase();
  const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showAccountError = message => {
    const error = $('faroAccountError');
    error.textContent = message;
    error.classList.remove('hidden');
  };
  const clearAccountError = () => $('faroAccountError')?.classList.add('hidden');
  const showAccountNotice = message => {
    const notice = $('faroAccountNotice');
    notice.textContent = message;
    notice.classList.remove('hidden');
  };
  const clearAccountNotice = () => $('faroAccountNotice')?.classList.add('hidden');

  const setAuthMode = mode => {
    authMode = mode;
    clearAccountError();
    clearAccountNotice();
    const signup = mode === 'signup';
    const recovery = mode === 'recovery';
    $('faroSignInActions').classList.toggle('hidden', signup || recovery);
    $('faroSignupActions').classList.toggle('hidden', !signup);
    $('faroRecoveryActions').classList.toggle('hidden', !recovery);
    $('faroPasswordConfirmWrap').classList.toggle('hidden', !(signup || recovery));
    $('faroEmail').disabled = recovery;
    $('faroPassword').autocomplete = signup || recovery ? 'new-password' : 'current-password';
    $('faroAuthTitle').textContent = recovery ? 'Crie uma nova senha' : signup ? 'Crie sua conta FARO' : 'Entre no seu FARO';
    $('faroAuthText').textContent = recovery
      ? 'Confirme a nova senha para continuar.'
      : signup
        ? 'Use um e-mail que você consiga acessar. Vamos pedir confirmação antes de liberar a conta.'
        : 'Use seu e-mail e sua senha.';
    if (!signup && !recovery) $('faroPasswordConfirm').value = '';
  };

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
      $('faroAccountText').textContent = 'Use seu e-mail e uma senha para salvar e recuperar seus dados em outro aparelho.';
      $('faroAccountBadge').textContent = 'LOCAL';
      $('faroSaveAccount').classList.remove('hidden');
      $('faroSignOut').classList.add('hidden');
      setSyncText('Salvos neste aparelho');
      await renderSubscription(null);
      return;
    }
    $('faroAccountTitle').textContent = 'Seu FARO está vinculado';
    $('faroAccountText').textContent = `Conta protegida pelo e-mail ${session.user.email || ''}.`;
    $('faroAccountBadge').textContent = 'CONTA';
    $('faroSaveAccount').classList.add('hidden');
    $('faroSignOut').classList.remove('hidden');
    await renderSubscription(session.user.id);
  };

  const renderSubscription = async userId => {
    if (!configured || !userId || !client) {
      const [title, text] = subscriptionCopy('inactive');
      $('faroSubscriptionTitle').textContent = billingEnabled ? title : 'Assinatura em breve';
      $('faroSubscriptionText').textContent = billingEnabled ? text : 'A cobrança permanece desativada até o provedor comercial estar pronto.';
      $('faroSubscriptionAction').textContent = billingEnabled ? 'ASSINAR FARO' : 'EM BREVE';
      $('faroSubscriptionAction').disabled = !billingEnabled;
      return;
    }
    const { data } = await client.from('faro_subscriptions').select('status,stripe_customer_id,current_period_end,cancel_at_period_end').eq('user_id', userId).maybeSingle();
    const status = data?.status || 'inactive';
    const [title, text] = subscriptionCopy(status);
    $('faroSubscriptionTitle').textContent = billingEnabled ? title : 'Assinatura em breve';
    $('faroSubscriptionText').textContent = billingEnabled
      ? (data?.cancel_at_period_end && data?.current_period_end
          ? `Acesso mantido até ${new Date(data.current_period_end).toLocaleDateString('pt-BR')}.`
          : text)
      : 'A cobrança permanece desativada até o provedor comercial estar pronto.';
    $('faroSubscriptionAction').textContent = billingEnabled
      ? (data?.stripe_customer_id ? 'GERENCIAR ASSINATURA' : 'ASSINAR FARO')
      : 'EM BREVE';
    $('faroSubscriptionAction').dataset.portal = data?.stripe_customer_id ? 'true' : 'false';
    $('faroSubscriptionAction').disabled = !billingEnabled;
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

  const readCredentials = ({ requireConfirmation = false } = {}) => {
    const email = normalizeEmail($('faroEmail').value);
    const password = $('faroPassword').value;
    const confirmation = $('faroPasswordConfirm').value;
    if (!validEmail(email)) {
      showAccountError('Digite um e-mail válido.');
      return null;
    }
    if (!password) {
      showAccountError('Digite sua senha.');
      return null;
    }
    if (requireConfirmation) {
      if (password.length < 8) {
        showAccountError('Sua senha precisa ter pelo menos 8 caracteres.');
        return null;
      }
      if (password !== confirmation) {
        showAccountError('As senhas não coincidem. Digite a mesma senha nos dois campos.');
        return null;
      }
    }
    return { email, password };
  };

  const signIn = async () => {
    clearAccountError();
    clearAccountNotice();
    if (!configured) return showAccountError('A conta online ainda não está conectada nesta branch de validação. Seu FARO continua salvo neste aparelho.');
    const credentials = readCredentials();
    if (!credentials) return;
    const { email, password } = credentials;
    const supabase = await loadClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      const message = /confirm/i.test(String(error?.message || ''))
        ? 'Confirme seu e-mail antes de entrar. Abra a mensagem enviada pelo FARO e tente novamente.'
        : 'E-mail ou senha não conferem. Tente novamente.';
      return showAccountError(message);
    }
    session = data.session;
    await ensureProfile(session.user.id);
    $('faroAccountModal').classList.add('hidden');
    await setAccountState();
    await syncNow();
  };

  const createAccount = async () => {
    clearAccountError();
    clearAccountNotice();
    if (!configured) return showAccountError('A conta online ainda não está conectada nesta branch de validação. Seu FARO continua salvo neste aparelho.');
    const credentials = readCredentials({ requireConfirmation:true });
    if (!credentials) return;
    const { email, password } = credentials;
    const supabase = await loadClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return showAccountError('Não foi possível criar sua conta agora. Confira o e-mail e tente novamente.');
    if (data.session) {
      await supabase.auth.signOut();
      session = null;
      return showAccountError('A confirmação de e-mail não está ativa. O FARO não vai liberar esta conta até a verificação estar habilitada.');
    }
    $('faroPassword').value = '';
    $('faroPasswordConfirm').value = '';
    setAuthMode('signin');
    showAccountNotice('Confirme seu e-mail para ativar a conta. Depois volte ao FARO e entre com sua senha.');
  };

  const resetPassword = async () => {
    clearAccountError();
    clearAccountNotice();
    const email = normalizeEmail($('faroEmail').value);
    if (!validEmail(email)) return showAccountError('Digite seu e-mail para recuperar a senha.');
    const supabase = await loadClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname || '/'}` });
    if (error) return showAccountError('Não foi possível enviar a recuperação agora. Tente novamente em instantes.');
    showAccountNotice('Se esse e-mail estiver cadastrado, enviaremos um link para criar uma nova senha.');
  };

  const updateRecoveredPassword = async () => {
    clearAccountError();
    clearAccountNotice();
    const password = $('faroPassword').value;
    const confirmation = $('faroPasswordConfirm').value;
    if (password.length < 8) return showAccountError('Sua senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirmation) return showAccountError('As senhas não coincidem. Digite a mesma senha nos dois campos.');
    const supabase = await loadClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return showAccountError('Não foi possível salvar a nova senha. Peça outro link de recuperação e tente novamente.');
    showAccountNotice('Senha atualizada. Sua conta está pronta.');
    setAuthMode('signin');
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
    if (!billingEnabled) return app.toast('Assinatura ainda não está disponível.');
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
      $('faroSubscriptionAction').disabled = !billingEnabled;
    }
  };

  $('faroSaveAccount').addEventListener('click', () => {
    setAuthMode('signin');
    $('faroAccountModal').classList.remove('hidden');
    $('faroEmail').focus();
  });
  $('faroAccountClose').addEventListener('click', () => $('faroAccountModal').classList.add('hidden'));
  $('faroSignIn').addEventListener('click', signIn);
  $('faroShowSignup').addEventListener('click', () => setAuthMode('signup'));
  $('faroCreateAccount').addEventListener('click', createAccount);
  $('faroBackToLogin').addEventListener('click', () => setAuthMode('signin'));
  $('faroResetPassword').addEventListener('click', resetPassword);
  $('faroUpdatePassword').addEventListener('click', updateRecoveredPassword);
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
      supabase.auth.onAuthStateChange((event, nextSession) => {
        session = nextSession;
        if (event === 'PASSWORD_RECOVERY') {
          $('faroAccountModal').classList.remove('hidden');
          setAuthMode('recovery');
        }
        setAccountState();
        if (session?.user && event !== 'PASSWORD_RECOVERY') syncNow();
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
  window.FaroAccount = { syncNow, normalizeEmail, configured:() => configured };
})();