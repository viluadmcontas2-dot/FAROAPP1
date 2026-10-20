(() => {
  const app = window.__vettaApp;
  const config = window.FARO_CONFIG || {};
  const central = document.getElementById('view-more');
  if (!app || !central || window.FaroAccount) return;

  const SYNC_META_KEY = 'faro-sync-meta-v1';
  const DEVICE_KEY = 'faro-device-id-v1';
  const SDK_URL = './vendor/supabase-js-2.112.3.mjs';
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
  let deletionInProgress = false;
  const DELETED_BACKUP_KEY = 'faro-deleted-account-backup-v1';
  // Cópias exportáveis de outra conta, guardadas quando o usuário da sessão muda (nunca enviadas).
  const SWITCH_BACKUP_KEY = 'faro-account-switch-backup-v1';
  const RECORD_DRAFT_KEY = 'faro-record-draft-v1';
  const PAYWALL_TEXT = 'Assine para voltar a salvar na nuvem. Seus dados continuam neste aparelho.';
  let writeBlocked = false;
  let signingOut = false;

  const readMeta = () => {
    try {
      return { localRevision: 0, remoteRevision: 0, dirty: false, userId: null, lastMutationId: null, lastSyncedAt: null, ...JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}') };
    } catch {
      return { localRevision: 0, remoteRevision: 0, dirty: false, userId: null, lastMutationId: null, lastSyncedAt: null };
    }
  };
  const writeMeta = meta => localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  // Dono dos dados locais nesta aba. Fica em memória: sobrevive a outra aba apagar a meta.
  let boundUserId = readMeta().userId || null;
  const bindOwner = userId => { boundUserId = userId || null; };
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
        <span id="faroAccountBadge" class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold">LOCAL</span>
      </div>
      <div class="mt-4 rounded-2xl bg-slate-50 p-4"><span class="label-micro">Seus dados</span><strong id="faroSyncStatus" class="block text-sm">Salvos neste aparelho</strong></div>
      <div id="faroAccountActions" class="mt-4 grid gap-2">
        <button id="faroSaveAccount" data-faro-track="salvar_conta" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold text-xs">Salvar meu FARO</button>
        <button id="faroSignOut" type="button" class="hidden w-full rounded-2xl bg-slate-100 text-slate-700 font-extrabold text-xs">Sair da conta</button>
      </div>
      <div id="faroPlanSlot" class="mt-5 pt-5 border-t border-slate-100"></div>
      <nav class="mt-5 grid gap-2" aria-label="Privacidade e conta">
        <a href="termos.html" class="text-sm">Termos de uso</a>
        <a href="privacidade.html" class="text-sm">Política de privacidade</a>
        <label class="flex items-start gap-3 text-sm"><input id="faroAnalyticsToggle" type="checkbox" class="mt-1 w-5 h-5 shrink-0"><span><strong class="block">Ajudar a melhorar o FARO (uso anônimo)</strong><span class="text-xs text-slate-500">Medimos só telas e ações, sem nome, e-mail ou valores. <a href="privacidade.html#uso-anonimo">Saiba como</a></span></span></label>
        <button id="faroExportData" type="button" class="text-sm">Exportar meus dados</button>
        <button id="faroDeleteAccount" type="button" class="text-sm">Excluir minha conta</button>
        <div id="faroSwitchBackup" class="hidden text-sm"><p>Cópia de outra conta guardada neste aparelho.</p>
          <button id="faroExportSwitch" type="button">Exportar cópia da outra conta</button>
          <button id="faroRemoveSwitch" type="button">Apagar cópia da outra conta</button>
        </div>
        <div id="faroDeletedBackup" class="hidden text-sm"><p>Cópia da conta guardada neste aparelho.</p>
          <button id="faroExportDeleted" type="button">Exportar cópia guardada</button>
          <button id="faroRemoveDeleted" type="button">Apagar cópia guardada</button>
        </div>
      </nav>`;
    const intro = $('faroCentralIntro');
    if (intro) intro.insertAdjacentElement('afterend', card);
    else central.prepend(card);
    if (window.FaroPlans) window.FaroPlans.mount($('faroPlanSlot'));
    else $('faroPlanSlot').innerHTML = `<div>
        <span class="label-micro">Meu plano</span>
        <strong id="faroSubscriptionTitle" class="block text-sm">Sem assinatura ativa</strong>
        <p id="faroSubscriptionText" class="text-xs text-slate-500 mt-1">A cobrança comercial será vinculada à sua conta.</p>
        <button id="faroSubscriptionAction" data-faro-track="assinar" type="button" class="w-full mt-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs">Assinar o FARO</button>
      </div>`;

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
          <div id="faroPasswordConfirmWrap" class="hidden"><label class="label-micro" for="faroPasswordConfirm">Confirme a senha</label><input id="faroPasswordConfirm" type="password" autocomplete="new-password" class="input-vetta no-mask" placeholder="Digite a senha novamente"><p class="text-xs text-slate-500 mt-2">Use pelo menos 8 caracteres.</p></div>
          <div id="faroSignInActions" class="grid gap-2">
            <button id="faroSignIn" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">Entrar na conta</button>
            <button id="faroShowSignup" type="button" class="w-full rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs">Criar minha conta</button>
            <button id="faroResetPassword" type="button" class="w-full text-blue-700 font-bold text-xs">Recuperar senha</button>
          </div>
          <div id="faroSignupActions" class="hidden grid gap-2">
            <button id="faroCreateAccount" data-faro-track="criar_conta" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">Criar conta</button>
            <button id="faroBackToLogin" type="button" class="w-full rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs">Entrar com minha conta</button>
          </div>
          <div id="faroRecoveryActions" class="hidden grid gap-2">
            <button id="faroUpdatePassword" type="button" class="w-full rounded-2xl bg-blue-600 text-white font-extrabold">Salvar nova senha</button>
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
          <button id="faroKeepLocal" type="button" class="rounded-2xl bg-blue-600 text-white font-extrabold">Usar dados deste aparelho</button>
          <button id="faroUseRemote" type="button" class="rounded-2xl bg-slate-900 text-white font-extrabold">Usar dados da conta</button>
          <button id="faroDecideLater" type="button" class="rounded-2xl bg-slate-100 text-slate-700 font-bold">Decidir depois</button>
        </div>
      </div>`;
    document.body.appendChild(conflict);
    const deletion = document.createElement('dialog');
    deletion.id = 'faroDeleteDialog';
    deletion.setAttribute('aria-labelledby', 'faroDeleteTitle');
    deletion.innerHTML = `<h2 id="faroDeleteTitle">Excluir minha conta</h2>
      <div id="faroDeleteStepOne"><p>Etapa 1 de 2. Isso cancela a assinatura e apaga sua conta e os dados sincronizados. Não dá para desfazer.</p>
      <p>Vamos guardar uma cópia exportável neste aparelho. Você pode apagá-la depois. Outros aparelhos e arquivos exportados precisam ser limpos por você.</p>
      <button id="faroDeleteExport" type="button">Exportar meus dados</button>
      <button id="faroDeleteContinue" type="button">Continuar exclusão</button></div>
      <div id="faroDeleteStepTwo" hidden><p>Etapa 2 de 2. Digite EXCLUIR para confirmar.</p>
      <label for="faroDeleteWord">Confirmação</label><input id="faroDeleteWord" autocomplete="off" spellcheck="false">
      <button id="faroDeleteConfirm" type="button" disabled>Excluir conta definitivamente</button></div>
      <p id="faroDeleteNotice" role="status"></p><button id="faroDeleteCancel" type="button">Voltar sem excluir</button>`;
    document.body.appendChild(deletion);
    const style = document.createElement('style');
    style.textContent = `#faroAccountCard nav a,#faroAccountCard nav button{min-height:48px;display:flex;align-items:center;text-align:left}
      #faroDeleteDialog{background:#0C0D0F;color:#F5F1E6;border:1px solid #FFC21A;border-radius:20px;padding:24px;width:calc(100% - 32px);max-width:460px;max-height:85dvh;overflow:auto;padding-bottom:calc(24px + env(safe-area-inset-bottom))}
      #faroDeleteDialog::backdrop{background:#000b}#faroDeleteDialog h2{font-size:22px;color:#FFC21A}#faroDeleteDialog p{margin:16px 0}
      #faroDeleteDialog button{min-height:48px;width:100%;touch-action:manipulation;color:#FFC21A}#faroDeleteDialog button:disabled{opacity:.5}
      #faroDeleteDialog input{font-size:16px;background:#17191D;color:#F5F1E6;border:1px solid #CCC;padding:12px;width:100%}
      #faroDeleteDialog :focus-visible{outline:2px solid #FFC21A;outline-offset:2px}`;
    document.head.appendChild(style);
    $('faroDeletedBackup').classList.toggle('hidden', !localStorage.getItem(DELETED_BACKUP_KEY));
    refreshSwitchBackupUi();
  };
  const readSwitchBackups = () => {
    try {
      const list = JSON.parse(localStorage.getItem(SWITCH_BACKUP_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  };
  const writeSwitchBackups = list => {
    if (list.length) localStorage.setItem(SWITCH_BACKUP_KEY, JSON.stringify(list));
    else localStorage.removeItem(SWITCH_BACKUP_KEY);
  };
  function refreshSwitchBackupUi() {
    $('faroSwitchBackup')?.classList.toggle('hidden', readSwitchBackups().length === 0);
  }
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
    if (deletionInProgress || writeBlocked) return;
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
      // Meta recriada (ex.: outra aba a apagou) herda o dono desta aba: dado sem dono nunca vira de outra conta.
      if (!meta.userId && boundUserId) meta.userId = boundUserId;
      writeMeta(meta);
      if (writeBlocked) setSyncText(PAYWALL_TEXT, 'attention');
      else setSyncText(navigator.onLine ? 'Alteração salva no aparelho; sincronizando depois' : 'Salvo no aparelho; enviaremos quando houver internet');
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

  // Tela Plano (faro-plans.js): sessão + trial do servidor + assinatura viram um estado só.
  const renderPlan = async userId => {
    let trialEndsAt = null;
    let subscription = null;
    if (configured && client && userId && !session?.user?.is_anonymous) {
      try {
        const [trial, sub] = await Promise.all([
          client.rpc('faro_my_trial_ends_at'),
          client.from('faro_subscriptions').select('status,stripe_customer_id,current_period_end,cancel_at_period_end').eq('user_id', userId).maybeSingle()
        ]);
        trialEndsAt = trial?.data || null;
        subscription = sub?.data || null;
      } catch (error) { console.warn('FARO plano', error); }
    }
    const plans = window.FaroPlans;
    const state = plans.computeState({ signedIn: Boolean(userId), anonymous: Boolean(session?.user?.is_anonymous), trialEndsAt, subscription });
    const plan = $('faroPlan');
    plans.update(plan, state, { billingEnabled });
    if (billingEnabled && state.kind === 'subscriber' && subscription?.cancel_at_period_end && subscription?.current_period_end) {
      $('faroSubscriptionText').textContent = `Acesso mantido até ${new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}.`;
    }
    plan.dataset.ready = '1';
  };

  const renderSubscription = async userId => {
    if (window.FaroPlans && $('faroPlan')) return renderPlan(userId);
    if (!configured || !userId || !client) {
      const [title, text] = subscriptionCopy('inactive');
      $('faroSubscriptionTitle').textContent = billingEnabled ? title : 'Assinatura em breve';
      $('faroSubscriptionText').textContent = billingEnabled ? text : 'A cobrança permanece desativada até o provedor comercial estar pronto.';
      $('faroSubscriptionAction').textContent = billingEnabled ? 'Assinar o FARO' : 'Em breve';
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
      ? (data?.stripe_customer_id ? 'Gerenciar assinatura' : 'Assinar o FARO')
      : 'Em breve';
    $('faroSubscriptionAction').dataset.portal = data?.stripe_customer_id ? 'true' : 'false';
    $('faroSubscriptionAction').disabled = !billingEnabled;
  };

  const ownershipError = () => Object.assign(new Error('dados locais pertencem a outra conta'), { code: 'FARO_OWNER' });
  const assertOwner = userId => {
    const owner = readMeta().userId || boundUserId;
    if (!userId || userId !== session?.user?.id || (owner && owner !== userId)) throw ownershipError();
  };

  // Linha afetada nenhuma: ou outro aparelho gravou (conflito) ou o servidor recusou a escrita.
  const resolveRejectedWrite = async (userId, expectedRevision) => {
    const { data:remote, error } = await client.from('faro_state').select('schema_version,revision,state,server_updated_at,last_mutation_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!remote) throw new Error('cópia da conta sumiu durante o envio');
    if (expectedRevision != null && Number(remote.revision || 0) === Number(expectedRevision)) throw Object.assign(new Error('escrita recusada'), { code: '42501' });
    openConflict(remote);
  };

  // Compare-and-set: UPDATE só na revisão esperada; INSERT só quando ainda não existe cópia.
  const uploadLocal = async (userId, expectedRevision = null) => {
    assertOwner(userId);
    const meta = readMeta();
    const sentMutationId = meta.lastMutationId || null;
    const payload = {
      user_id: userId,
      schema_version: Number(config.schemaVersion || 1),
      state: app.state,
      device_id: deviceId,
      last_mutation_id: sentMutationId || crypto.randomUUID?.() || `mutation-${Date.now()}`,
      client_updated_at: new Date().toISOString()
    };
    const table = client.from('faro_state');
    const { data, error } = expectedRevision == null
      ? await table.insert(payload).select('revision,server_updated_at')
      : await table.update(payload).eq('user_id', userId).eq('revision', Number(expectedRevision)).select('revision,server_updated_at');
    if (error?.code === '23505') return resolveRejectedWrite(userId, null);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return resolveRejectedWrite(userId, expectedRevision);
    const after = readMeta();
    // Só limpa dirty se ninguém editou durante o voo; senão mantém pendente e reenvia.
    const unchanged = (after.lastMutationId || null) === sentMutationId;
    writeMeta({ ...after, userId, remoteRevision:Number(row.revision || 0), dirty:!unchanged, lastSyncedAt:row.server_updated_at || new Date().toISOString() });
    bindOwner(userId);
    if (unchanged) setSyncText('Seus dados estão salvos', 'positive');
    else { setSyncText('Alteração salva no aparelho; sincronizando depois'); scheduleSync(); }
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
    bindOwner(session.user.id);
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

    if (meta.userId && meta.userId !== userId) {
      // Dados de outra conta: isola (cópia exportável) antes de qualquer coisa; nunca envia.
      if (!isolateLocal(meta.userId)) throw ownershipError();
      if (!remote) return;
      applyRemote(remote);
      return;
    }
    if (!remote) {
      if (!stateHasMeaningfulData(app.state)) return;
      return uploadLocal(userId, null);
    }
    if (!stateHasMeaningfulData(app.state)) {
      applyRemote(remote);
      return;
    }
    if (!stateHasMeaningfulData(remote.state)) return uploadLocal(userId, remote.revision);
    if (sameState(app.state, remote.state)) {
      writeMeta({ ...meta, userId, remoteRevision:Number(remote.revision || 0), dirty:false, lastSyncedAt:remote.server_updated_at || new Date().toISOString() });
      bindOwner(userId);
      setSyncText('Seus dados estão salvos', 'positive');
      return;
    }
    if (!meta.userId) {
      openConflict(remote);
      return;
    }
    if (meta.dirty) {
      if (Number(remote.revision || 0) === Number(meta.remoteRevision || 0)) await uploadLocal(userId, remote.revision);
      else openConflict(remote);
      return;
    }
    if (Number(remote.revision || 0) > Number(meta.remoteRevision || 0)) applyRemote(remote);
  };

  async function syncNow() {
    if (deletionInProgress) return;
    if (!configured || !session?.user || !navigator.onLine || syncing) return;
    syncing = true;
    setSyncText('Salvando sua conta…');
    try {
      await reconcile();
    } catch (error) {
      handleSyncError(error);
    } finally {
      syncing = false;
    }
  }

  // Paywall/RLS (42501, 401/403) não é falha de rede: repetir não adianta.
  const isWriteDenied = error => Boolean(error) && (error.code === '42501' || error.status === 401 || error.status === 403
    || /row-level security|permission denied/i.test(String(error.message || '')));
  function handleSyncError(error) {
    console.warn('FARO sync', error);
    if (error?.code === 'FARO_OWNER') return setSyncText('Dados de outra conta guardados neste aparelho; nada foi enviado', 'attention');
    if (isWriteDenied(error)) {
      writeBlocked = true;
      clearTimeout(syncTimer);
      return setSyncText(PAYWALL_TEXT, 'attention');
    }
    setSyncText('Salvo no aparelho; tentaremos a conta novamente', 'attention');
  }

  // Entrar e recuperar dados não dependem de gravar o perfil (pode ser recusado pelo paywall).
  const ensureProfile = async userId => {
    try {
      const { error } = await client.from('faro_profiles').upsert({ user_id:userId }, { onConflict:'user_id' });
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('FARO perfil', error);
      return false;
    }
  };

  // Guarda cópia exportável e limpa o estado local da conta anterior. Falha ao guardar = não limpa.
  function isolateLocal(previousUserId) {
    const meta = readMeta();
    const synced = meta.userId === previousUserId && !meta.dirty && meta.lastSyncedAt;
    if (stateHasMeaningfulData(app.state) && !synced) {
      const list = readSwitchBackups();
      list.push({ userId: previousUserId || null, savedAt: new Date().toISOString(), remoteRevision: Number(meta.remoteRevision || 0),
        lastMutationId: meta.lastMutationId || null, recordDraft: localStorage.getItem(RECORD_DRAFT_KEY), state: app.state });
      try { writeSwitchBackups(list); } catch (error) {
        console.warn('FARO cópia da conta', error);
        app.toast('Sem espaço para guardar a cópia. Exporte seus dados antes de trocar de conta.');
        return false;
      }
    }
    clearTimeout(syncTimer);
    pendingConflict = null;
    $('faroSyncConflict').classList.add('hidden');
    localStorage.removeItem(SYNC_META_KEY);
    localStorage.removeItem(RECORD_DRAFT_KEY);
    suppressDirty = true;
    try {
      app.state = app.cloneDefaults();
      app.state.onboardingComplete = false;
      baseSave.call(app);
      app.syncInputs();
      app.render();
    } finally { suppressDirty = false; }
    bindOwner(null);
    refreshSwitchBackupUi();
    return true;
  }

  // Volta a cópia guardada quando a mesma conta entra de novo com o aparelho vazio.
  const restoreOwnBackup = userId => {
    if (stateHasMeaningfulData(app.state)) return;
    const list = readSwitchBackups();
    const index = list.map(item => item?.userId).lastIndexOf(userId);
    if (index < 0) return;
    const [entry] = list.splice(index, 1);
    suppressDirty = true;
    try {
      app.state = app.normalizeState(entry.state || {});
      baseSave.call(app);
      app.syncInputs();
      app.render();
    } finally { suppressDirty = false; }
    if (entry.recordDraft) localStorage.setItem(RECORD_DRAFT_KEY, entry.recordDraft);
    writeMeta({ ...readMeta(), userId, dirty:true, remoteRevision:entry.remoteRevision || 0, lastMutationId:entry.lastMutationId || null });
    writeSwitchBackups(list);
    refreshSwitchBackupUi();
  };

  // Toda troca de usuário passa aqui antes de qualquer sincronização.
  const adoptUser = (nextUserId, event = '') => {
    if (signingOut) return true;
    if (event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') writeBlocked = false;
    const owner = boundUserId || readMeta().userId || null;
    if (owner && owner !== nextUserId && !isolateLocal(owner)) return false;
    if (nextUserId) {
      restoreOwnBackup(nextUserId);
      bindOwner(nextUserId);
    }
    return true;
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
    writeBlocked = false;
    adoptUser(session.user.id, 'SIGNED_IN');
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
    signingOut = true;
    try { await client.auth.signOut(); } finally { signingOut = false; }
    session = null;
    bindOwner(null);
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

  const exportDeletedBackup = () => {
    const saved = localStorage.getItem(DELETED_BACKUP_KEY);
    if (!saved) return;
    // Reutilizar o exportador sem recolocar a cópia no estado ativo/sincronizado.
    app.exportData.call(Object.assign(Object.create(app), { state: JSON.parse(saved) }));
  };

  const clearDeletedAccountState = () => {
    session = null;
    pendingConflict = null;
    $('faroSyncConflict').classList.add('hidden');
    for (const key of [SYNC_META_KEY, DEVICE_KEY, 'faro-record-draft-v1', 'faro-onboarding-draft-v2',
      'vetta-driver-intelligence-v3', 'vetta-driver-intelligence-v2', 'vetta-state', 'faro-app-finance-v1']) localStorage.removeItem(key);
    app.state = app.cloneDefaults();
    app.state.onboardingComplete = false;
    saveWithoutDirty();
    app.syncInputs();
    app.render();
    $('faroDeletedBackup').classList.remove('hidden');
  };

  const deleteAccount = async () => {
    if (deletionInProgress || $('faroDeleteStepTwo').hidden || $('faroDeleteWord').value !== 'EXCLUIR') return;
    if (!client || !session?.user || session.user.is_anonymous) return;
    if (!navigator.onLine) { $('faroDeleteNotice').textContent = 'Conecte-se à internet para excluir.'; return; }
    if (syncing) { $('faroDeleteNotice').textContent = 'Aguarde a sincronização terminar e tente novamente.'; return; }
    deletionInProgress = true;
    clearTimeout(syncTimer);
    for (const id of ['faroDeleteConfirm', 'faroDeleteCancel']) $(id).disabled = true;
    $('faroDeleteNotice').textContent = 'Excluindo conta…';
    let deleted = false;
    let backupCreated = false;
    try {
      // Sem espaço para preservar a cópia, não iniciar a operação destrutiva.
      if (localStorage.getItem(DELETED_BACKUP_KEY)) throw new Error('backup existente');
      localStorage.setItem(DELETED_BACKUP_KEY, JSON.stringify(app.state));
      backupCreated = true;
      const { data, error } = await client.functions.invoke('excluir-conta-faro', { body: { confirmation: 'EXCLUIR' } });
      if (error || data?.deleted !== true) throw new Error('exclusão não confirmada');
      deleted = true;
      // O usuário já não existe; logout local não depende de refresh no servidor.
      try { await client.auth.signOut({ scope: 'local' }); } catch { /* limpar sessão abaixo */ }
      const authKey = `sb-${new URL(config.supabaseUrl).hostname.split('.')[0]}-auth-token`;
      localStorage.removeItem(authKey);
      clearDeletedAccountState();
      await setAccountState();
      $('faroDeleteDialog').close();
      app.toast('Conta excluída. Sua cópia continua disponível para exportar.');
      // O Registro salva o formulário em pagehide; remover esse rascunho após seus listeners.
      window.addEventListener('pagehide', () => localStorage.removeItem('faro-record-draft-v1'), { once: true });
      location.reload();
    } catch {
      $('faroDeleteNotice').textContent = deleted
        ? 'Conta excluída no servidor. Não foi possível concluir a limpeza do aparelho. Exporte a cópia e limpe os dados deste site.'
        : 'Exclusão não confirmada. Seus dados locais continuam aqui. Confira sua conexão e tente novamente.';
      if (!deleted && backupCreated) localStorage.removeItem(DELETED_BACKUP_KEY);
    } finally {
      deletionInProgress = deleted;
      $('faroDeleteConfirm').disabled = deleted;
      $('faroDeleteCancel').disabled = false;
    }
  };

  $('faroExportData').addEventListener('click', () => app.exportData());
  $('faroDeleteExport').addEventListener('click', () => app.exportData());
  $('faroExportDeleted').addEventListener('click', exportDeletedBackup);
  $('faroRemoveDeleted').addEventListener('click', () => {
    localStorage.removeItem(DELETED_BACKUP_KEY);
    $('faroDeletedBackup').classList.add('hidden');
  });
  $('faroDeleteAccount').addEventListener('click', () => {
    if (!session?.user || session.user.is_anonymous) return app.toast('Entre com sua conta para excluir.');
    if (localStorage.getItem(DELETED_BACKUP_KEY)) return app.toast('Exporte e apague a cópia guardada antes de excluir outra conta.');
    $('faroDeleteStepOne').hidden = false;
    $('faroDeleteStepTwo').hidden = true;
    $('faroDeleteWord').value = '';
    $('faroDeleteConfirm').disabled = true;
    $('faroDeleteNotice').textContent = '';
    $('faroDeleteDialog').showModal();
  });
  $('faroDeleteContinue').addEventListener('click', () => {
    $('faroDeleteStepOne').hidden = true;
    $('faroDeleteStepTwo').hidden = false;
    $('faroDeleteWord').focus();
  });
  $('faroDeleteWord').addEventListener('input', () => { $('faroDeleteConfirm').disabled = deletionInProgress || $('faroDeleteWord').value !== 'EXCLUIR'; });
  $('faroDeleteConfirm').addEventListener('click', deleteAccount);
  $('faroDeleteCancel').addEventListener('click', () => $('faroDeleteDialog').close());
  $('faroDeleteDialog').addEventListener('cancel', event => { if (deletionInProgress) event.preventDefault(); });

  const openBilling = async () => {
    if ($('faroSubscriptionAction').dataset.action === 'signup') {
      setAuthMode('signup');
      $('faroAccountModal').classList.remove('hidden');
      $('faroEmail').focus();
      return;
    }
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
  $('faroPlanExport')?.addEventListener('click', () => app.exportData());
  $('faroKeepLocal').addEventListener('click', async () => {
    $('faroSyncConflict').classList.add('hidden');
    const chosen = pendingConflict;
    pendingConflict = null;
    // O usuário escolheu substituir exatamente a versão que viu; se mudou de novo, o conflito reabre.
    try { await uploadLocal(session.user.id, chosen ? chosen.revision : null); } catch (error) { handleSyncError(error); }
  });
  $('faroExportSwitch').addEventListener('click', () => {
    const latest = readSwitchBackups().at(-1);
    if (latest) app.exportData.call(Object.assign(Object.create(app), { state: latest.state }));
  });
  $('faroRemoveSwitch').addEventListener('click', () => {
    const list = readSwitchBackups();
    list.pop();
    writeSwitchBackups(list);
    refreshSwitchBackupUi();
  });
  // Outra aba trocou ou encerrou a conta: isola os dados desta aba antes de qualquer envio.
  window.addEventListener('storage', event => {
    if (event.key !== SYNC_META_KEY && event.key !== null) return;
    if (!boundUserId || deletionInProgress) return;
    let nextOwner = null;
    try { nextOwner = event.newValue ? JSON.parse(event.newValue).userId || null : null; } catch { nextOwner = null; }
    if (nextOwner === boundUserId) return;
    if (isolateLocal(boundUserId)) setAccountState();
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
      if (session?.user) adoptUser(session.user.id, 'INITIAL_SESSION');
      supabase.auth.onAuthStateChange((event, nextSession) => {
        if (deletionInProgress) return;
        session = nextSession;
        adoptUser(nextSession?.user?.id || null, event);
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