// Configuração pública do FARO (somente valores publicáveis; segredos vivem no backend).
export const DEFAULT_CONFIG = Object.freeze({
  supabaseUrl: 'https://mjbyqhreptllilkggiri.supabase.co',
  supabasePublishableKey: 'sb_publishable_UBGdQk2oIJyuWgEcDpK59Q_RFvwWQzS',
  billingEnabled: false,
  pushEnabled: false,
  pushPublicKey: ''
});

const isHttpsUrl = value => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

// Normaliza e valida. Billing/push só ligam com `=== true` (fail-closed). Sem URL/chave válidas => configured=false.
export const readConfig = (raw = DEFAULT_CONFIG) => {
  const c = raw && typeof raw === 'object' ? raw : {};
  const supabaseUrl = String(c.supabaseUrl || '').trim().replace(/\/+$/, '');
  const supabasePublishableKey = String(c.supabasePublishableKey || '').trim();
  const configured = isHttpsUrl(supabaseUrl) && supabasePublishableKey.length > 0;
  return Object.freeze({
    configured,
    supabaseUrl: configured ? supabaseUrl : '',
    supabasePublishableKey: configured ? supabasePublishableKey : '',
    billingEnabled: configured && c.billingEnabled === true,
    pushEnabled: configured && c.pushEnabled === true,
    pushPublicKey: String(c.pushPublicKey || '')
  });
};
