// Registro do service worker + aviso de "Nova versao disponivel".
// Uso no main: import { registerServiceWorker } from '../pwa/register.js';
//   registerServiceWorker({ onUpdate: ({ apply }) => mostrarAviso(apply) });
// Tambem dispara o evento window 'faro:sw-update' (detail.apply() instala a nova versao e recarrega).

export const SW_UPDATE_EVENT = 'faro:sw-update';

export async function registerServiceWorker({ onUpdate, onReady, url = 'sw.js', scope = './' } = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  let reg;
  try { reg = await navigator.serviceWorker.register(url, { scope, updateViaCache: 'none' }); } catch { return null; }

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  const announce = (worker) => {
    const apply = () => worker.postMessage({ type: 'SKIP_WAITING' });
    try { onUpdate && onUpdate({ apply, registration: reg }); } catch { /* aviso nunca derruba o app */ }
    window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT, { detail: { apply, registration: reg } }));
  };
  // so e "atualizacao" se ja havia um SW controlando a pagina (senao e a primeira instalacao)
  const watch = (worker) => worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker);
  });
  if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting);
  if (reg.installing) watch(reg.installing);
  reg.addEventListener('updatefound', () => reg.installing && watch(reg.installing));

  navigator.serviceWorker.ready.then((r) => { try { onReady && onReady(r); } catch { /* ignora */ } });
  // busca versao nova quando o app volta ao primeiro plano
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  return reg;
}
