// Decisao pura (testavel em Node) de como o service worker trata cada requisicao.
// Regra de ouro: so o shell estatico do proprio app e guardado. Nada de API, nada autenticado.

export const API_HOST_SUFFIXES = ['.supabase.co', '.supabase.in', '.stripe.com', '.stripe.network'];
export const API_HOSTS = ['supabase.co', 'supabase.in', 'stripe.com', 'stripe.network'];

export function isApiHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return API_HOSTS.includes(h) || API_HOST_SUFFIXES.some((s) => h.endsWith(s));
}

/**
 * @param {{url:string, method?:string, mode?:string, hasAuth?:boolean, hasCookie?:boolean}} req
 * @param {string} origin origem do app (self.location.origin)
 * @returns {'bypass'|'navigate'|'shell'}
 *  bypass   = o SW nao mexe (rede direta, nunca cacheia)
 *  navigate = navegacao: responde com o index em cache (offline) ou rede
 *  shell    = arquivo estatico: cache primeiro (so se estiver no pre-cache)
 */
export function decide(req, origin) {
  let u;
  try { u = new URL(req.url); } catch { return 'bypass'; }
  if ((req.method || 'GET').toUpperCase() !== 'GET') return 'bypass';
  if (isApiHost(u.hostname)) return 'bypass';
  if (u.origin !== origin) return 'bypass';
  if (req.hasAuth) return 'bypass';
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/auth/') || u.pathname.startsWith('/functions/')) return 'bypass';
  if (req.mode === 'navigate') return 'navigate';
  return 'shell';
}

/** So respostas simples e publicas entram no cache. */
export function isCacheableResponse(res) {
  if (!res || !res.ok || res.status !== 200) return false;
  if (res.type !== 'basic') return false;
  const h = res.headers;
  if (h.get('set-cookie')) return false;
  const cc = (h.get('cache-control') || '').toLowerCase();
  if (/\bprivate\b/.test(cc)) return false;
  return true;
}
