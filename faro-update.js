(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroUpdate) return;

  const hideLegacyUpdateUi = () => {
    const banner = document.getElementById('updateBanner');
    if (!banner) return;
    banner.classList.add('hidden');
    banner.setAttribute('aria-hidden', 'true');
  };

  const checkForUpdate = async () => {
    const registration = app.updateRegistration;
    if (!registration || typeof registration.update !== 'function' || !navigator.onLine) return;
    try {
      await registration.update();
    } catch (error) {
      console.warn('FARO: atualização em segundo plano indisponível agora', error);
    }
  };

  // A versão nova é baixada em segundo plano e fica aguardando o ciclo natural
  // do Service Worker. Quando o FARO é fechado/descarregado, o navegador ativa
  // a nova versão sozinho; no próximo acesso, o usuário já entra atualizado.
  app.showUpdateBanner = function() {
    hideLegacyUpdateUi();
  };

  app.applyUpdate = function() {
    hideLegacyUpdateUi();
    return checkForUpdate();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('online', checkForUpdate);
  window.addEventListener('pageshow', checkForUpdate);

  hideLegacyUpdateUi();
  window.FaroUpdate = Object.freeze({ checkForUpdate, mode:'background-native' });
})();
