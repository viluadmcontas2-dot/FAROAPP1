// Backend FARO (Supabase): sessão, assinatura (Stripe via Edge Functions) e aparelhos de push.
// ESM puro e sem rede própria: tudo entra por injeção (`createClient`, `storage`, `now`, `redirect`).
import { readConfig } from './config.js';

const DEVICE_KEY = 'faro-device-id-v2';
const CHECKOUT_HOSTS = ['checkout.stripe.com'];
const PORTAL_HOSTS = ['billing.stripe.com'];

export class BackendError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
  }
}

const MSG = {
  not_configured: 'A conta online não está disponível agora. Seu FARO continua salvo neste aparelho.',
  invalid_email: 'Digite um e-mail válido.',
  empty_password: 'Digite sua senha.',
  weak_password: 'Sua senha precisa ter pelo menos 8 caracteres.',
  invalid_credentials: 'E-mail ou senha não conferem. Tente novamente.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Abra a mensagem enviada pelo FARO e tente novamente.',
  confirmation_disabled: 'A confirmação de e-mail não está ativa, então a conta não foi liberada. Tente mais tarde.',
  signup_failed: 'Não foi possível criar sua conta agora. Confira o e-mail e tente novamente.',
  rate_limited: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  offline: 'Sem internet. Conecte-se e tente novamente.',
  unavailable: 'Serviço indisponível agora. Tente novamente em instantes.',
  not_signed_in: 'Entre na sua conta para continuar.',
  reset_failed: 'Não foi possível enviar a recuperação agora. Tente novamente em instantes.',
  password_update_failed: 'Não foi possível salvar a nova senha. Peça outro link de recuperação e tente novamente.',
  delete_offline: 'Sem internet. Conecte e tente de novo.',
  delete_failed: 'Não foi possível excluir a conta agora. Tente de novo.',
  confirmation_required: 'Confirme para excluir a conta.',
  billing_off: 'Assinatura ainda não está disponível.',
  billing_failed: 'Não foi possível abrir a assinatura agora. Tente novamente em instantes.',
  billing_bad_url: 'Recebemos um endereço de pagamento inesperado e não abrimos. Tente novamente.',
  push_off: 'Os avisos ainda não estão disponíveis.',
  push_failed: 'Não foi possível ativar os avisos neste aparelho agora.'
};
const fail = code => new BackendError(code, MSG[code] || MSG.unavailable);

const isNetworkError = e => {
  const text = `${e?.name || ''} ${e?.message || ''}`;
  return /retryablefetch|failed to fetch|network|load failed|fetch failed/i.test(text) || e?.status === 0;
};

const mapAuthError = (e, fallback) => {
  if (!e) return fallback;
  const code = String(e.code || '');
  const msg = String(e.message || '');
  if (code === 'email_not_confirmed' || /not confirmed|confirm/i.test(msg)) return 'email_not_confirmed';
  if (code === 'invalid_credentials' || /invalid login/i.test(msg)) return 'invalid_credentials';
  if (code === 'weak_password') return 'weak_password';
  if (e.status === 429 || /rate.?limit/i.test(code)) return 'rate_limited';
  if (isNetworkError(e)) return 'offline';
  if (e.status >= 500) return 'unavailable';
  return fallback;
};

export const normalizeEmail = raw => String(raw || '').trim().toLowerCase();
export const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

// Só aceita https, sem usuário/senha/porta, em host exato do Stripe.
export const safeStripeUrl = (value, hosts) => {
  try {
    const u = new URL(String(value));
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    return hosts.includes(u.hostname.toLowerCase()) ? u.href : null;
  } catch {
    return null;
  }
};

const userView = u => (u ? { id: String(u.id), email: u.email ? String(u.email) : '' } : null);

export const SUBSCRIPTION_STATUSES = ['inactive', 'trialing', 'active', 'past_due', 'unpaid', 'paused', 'canceled'];

export const createBackend = ({
  config: rawConfig,
  createClient,
  storage = null,
  now = () => Date.now(),
  redirect = url => globalThis.location?.assign(url),
  randomId = () => globalThis.crypto?.randomUUID?.() || `d-${now()}-${Math.random().toString(36).slice(2)}`,
  redirectTo = () => (globalThis.location ? `${globalThis.location.origin}${globalThis.location.pathname || '/'}` : undefined)
} = {}) => {
  const config = readConfig(rawConfig);
  const listeners = new Set();
  let client = null;
  let user = null;

  const safeStore = {
    get: k => { try { return storage?.getItem(k) ?? null; } catch { return null; } },
    set: (k, v) => { try { storage?.setItem(k, v); } catch { /* sem armazenamento: segue em memória */ } }
  };
  let memoryDeviceId = null;
  const deviceId = () => {
    let id = safeStore.get(DEVICE_KEY) || memoryDeviceId;
    if (!id) { id = randomId(); safeStore.set(DEVICE_KEY, id); }
    memoryDeviceId = id;
    return id;
  };

  const emit = (event, extra = {}) => {
    const payload = { event, user, ...extra };
    for (const fn of [...listeners]) { try { fn(payload); } catch { /* ouvinte não derruba o backend */ } }
  };

  const getClient = () => {
    if (!config.configured || typeof createClient !== 'function') throw fail('not_configured');
    if (!client) {
      client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange((event, session) => {
        const next = userView(session?.user);
        const changed = (next?.id || null) !== (user?.id || null);
        user = next;
        if (event === 'PASSWORD_RECOVERY') emit('passwordRecovery');
        else if (event === 'SIGNED_OUT' || !next) { if (changed || event === 'SIGNED_OUT') emit('signedOut'); }
        else if (changed) emit('signedIn');
        else emit('refreshed');
      });
    }
    return client;
  };

  const requireUser = () => {
    if (!user) throw fail('not_signed_in');
    return user;
  };

  const ensureProfile = async () => {
    try { await client.from('faro_profiles').upsert({ user_id: user.id }, { onConflict: 'user_id' }); } catch { /* perfil é best-effort */ }
  };

  const restore = async () => {
    if (!config.configured) return { status: 'unconfigured', user: null };
    try {
      const { data, error } = await getClient().auth.getSession();
      if (error) throw error;
      user = userView(data?.session?.user);
    } catch (e) {
      // Offline/erro: sessão fica como estava; app segue local.
      return { status: user ? 'signedIn' : 'signedOut', user, offline: isNetworkError(e) };
    }
    if (user) await ensureProfile();
    return { status: user ? 'signedIn' : 'signedOut', user };
  };

  const checkCredentials = (emailRaw, password, { confirm = null } = {}) => {
    const email = normalizeEmail(emailRaw);
    if (!validEmail(email)) throw fail('invalid_email');
    if (!password) throw fail('empty_password');
    if (confirm !== null) {
      if (String(password).length < 8) throw fail('weak_password');
      if (password !== confirm) throw new BackendError('password_mismatch', 'As senhas não coincidem. Digite a mesma senha nos dois campos.');
    }
    return email;
  };

  const signIn = async ({ email: emailRaw, password } = {}) => {
    const email = checkCredentials(emailRaw, password);
    let res;
    try { res = await getClient().auth.signInWithPassword({ email, password }); } catch (e) { throw fail(mapAuthError(e, 'unavailable')); }
    if (res.error || !res.data?.session) throw fail(mapAuthError(res.error, 'invalid_credentials'));
    user = userView(res.data.session.user);
    await ensureProfile();
    emit('signedIn');
    return user;
  };

  const signUp = async ({ email: emailRaw, password, confirmPassword } = {}) => {
    const email = checkCredentials(emailRaw, password, { confirm: confirmPassword ?? password });
    const c = getClient();
    let res;
    try { res = await c.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }); } catch (e) { throw fail(mapAuthError(e, 'signup_failed')); }
    if (res.error) throw fail(mapAuthError(res.error, 'signup_failed'));
    if (res.data?.session) {
      // Confirmação desligada no servidor: fail-closed, não libera a conta.
      try { await c.auth.signOut(); } catch { /* segue */ }
      user = null;
      throw fail('confirmation_disabled');
    }
    // Resposta igual para e-mail novo e já existente (não revela cadastros).
    return { needsEmailConfirmation: true };
  };

  const signOut = async () => {
    if (!config.configured) return;
    try { await getClient().auth.signOut(); } catch (e) {
      if (!isNetworkError(e)) throw fail('unavailable');
      // Offline: encerra só localmente.
      try { await getClient().auth.signOut({ scope: 'local' }); } catch { /* segue */ }
    }
    if (user) { user = null; emit('signedOut'); }
  };

  const resetPassword = async emailRaw => {
    const email = normalizeEmail(emailRaw);
    if (!validEmail(email)) throw new BackendError('invalid_email', 'Digite seu e-mail para recuperar a senha.');
    try {
      const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
      if (error) throw error;
    } catch (e) { throw fail(isNetworkError(e) ? 'offline' : 'reset_failed'); }
    return { sent: true };
  };

  const updatePassword = async ({ password, confirmPassword } = {}) => {
    if (String(password || '').length < 8) throw fail('weak_password');
    if (password !== confirmPassword) throw new BackendError('password_mismatch', 'As senhas não coincidem. Digite a mesma senha nos dois campos.');
    try {
      const { error } = await getClient().auth.updateUser({ password });
      if (error) throw error;
    } catch (e) { throw fail(isNetworkError(e) ? 'offline' : 'password_update_failed'); }
  };

  const fetchSubscription = async () => {
    const empty = { status: 'inactive', hasCustomer: false, currentPeriodEnd: null, cancelAtPeriodEnd: false, billingEnabled: config.billingEnabled };
    if (!config.billingEnabled || !user) return empty;
    try {
      const { data, error } = await getClient().from('faro_subscriptions')
        .select('status,stripe_customer_id,current_period_end,cancel_at_period_end')
        .eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) return empty;
      return {
        status: SUBSCRIPTION_STATUSES.includes(data.status) ? data.status : 'inactive',
        hasCustomer: Boolean(data.stripe_customer_id),
        currentPeriodEnd: data.current_period_end || null,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        billingEnabled: true
      };
    } catch (e) { throw fail(isNetworkError(e) ? 'offline' : 'unavailable'); }
  };

  const invokeAndGo = async (name, hosts) => {
    if (!config.billingEnabled) throw fail('billing_off');
    requireUser();
    let data;
    try {
      const res = await getClient().functions.invoke(name, { method: 'POST' });
      if (res.error) throw res.error;
      data = res.data;
    } catch (e) {
      if (isNetworkError(e)) throw fail('offline');
      throw fail('billing_failed');
    }
    const url = safeStripeUrl(data?.url, hosts);
    if (!url) throw fail(data?.url ? 'billing_bad_url' : 'billing_failed');
    redirect(url);
    return { url };
  };
  const startCheckout = () => invokeAndGo('criar-checkout-faro', CHECKOUT_HOSTS);
  const openPortal = () => invokeAndGo('abrir-portal-faro', PORTAL_HOSTS);

  // Excluir minha conta: a função `excluir-conta-faro` cancela a assinatura no Stripe e só então apaga a conta e os dados da nuvem.
  // Só roda com confirmed === true (a tela pede em 2 passos). NÃO mexe no aparelho: quem chama limpa os dados locais (sync.discardLocal)
  // e encerra a sessão (endLocalSession) depois do sucesso.
  const deleteAccount = async ({ confirmed = false } = {}) => {
    if (confirmed !== true) throw fail('confirmation_required');
    requireUser();
    let data;
    try {
      const res = await getClient().functions.invoke('excluir-conta-faro', { method: 'POST', body: { confirmation: 'EXCLUIR' } });
      if (res.error) throw res.error;
      data = res.data;
    } catch (e) {
      if (isNetworkError(e)) throw new BackendError('offline', MSG.delete_offline);
      let said = '';
      try { const body = await e?.context?.json?.(); if (typeof body?.error === 'string') said = body.error.slice(0, 200); } catch { /* sem corpo */ }
      throw said ? new BackendError('delete_failed', said) : fail('delete_failed');
    }
    if (data?.deleted !== true) throw fail('delete_failed');
    return { deleted: true };
  };

  // Encerra a sessão só neste aparelho (a conta já não existe no servidor, então não há o que revogar lá).
  const endLocalSession = async () => {
    if (config.configured) { try { await getClient().auth.signOut({ scope: 'local' }); } catch { /* segue */ } }
    if (user) { user = null; emit('signedOut'); }
  };

  const registerPushDevice = async ({ subscription = null, platform = 'web', city = null, region = null } = {}) => {
    if (!config.pushEnabled) throw fail('push_off');
    requireUser();
    if (!['web', 'android', 'ios'].includes(platform)) throw fail('push_failed');
    try {
      const { error } = await getClient().from('faro_push_devices').upsert({
        user_id: user.id, device_id: deviceId(), platform, subscription, active: true,
        city: city ? String(city).slice(0, 120) : null, region: region ? String(region).slice(0, 120) : null
      }, { onConflict: 'user_id,device_id' });
      if (error) throw error;
    } catch (e) { throw fail(isNetworkError(e) ? 'offline' : 'push_failed'); }
    return { deviceId: deviceId() };
  };

  const unregisterPushDevice = async () => {
    if (!config.pushEnabled || !user) return;
    try { await getClient().from('faro_push_devices').update({ active: false }).eq('user_id', user.id).eq('device_id', deviceId()); } catch { /* best-effort */ }
  };

  return {
    config,
    configured: config.configured,
    billingEnabled: config.billingEnabled,
    pushEnabled: config.pushEnabled,
    deviceId,
    getUser: () => user,
    getClient,
    onAuthChange: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    restore, signIn, signUp, signOut, resetPassword, updatePassword, deleteAccount, endLocalSession,
    fetchSubscription, startCheckout, openPortal,
    registerPushDevice, unregisterPushDevice
  };
};
