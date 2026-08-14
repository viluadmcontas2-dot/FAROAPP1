(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroUpdate) return;

  const CHECK_INTERVAL_MS = 15 * 60 * 1000;
  let lastCheckAt = 0;

  const hideLegacyUpdateUi = () => {
    const banner = document.getElementById('updateBanner');
    if (!banner) return;
    banner.classList.add('hidden');
    banner.setAttribute('aria-hidden', 'true');
  };

  const checkForUpdate = async ({ force = false } = {}) => {
    const registration = app.updateRegistration;
    if (!registration || typeof registration.update !== 'function' || !navigator.onLine) return false;
    const now = Date.now();
    if (!force && now - lastCheckAt < CHECK_INTERVAL_MS) return false;
    lastCheckAt = now;
    try {
      await registration.update();
      return true;
    } catch (error) {
      console.warn('FARO: atualização em segundo plano indisponível agora', error);
      return false;
    }
  };

  const activateWaitingWorker = () => {
    const worker = app.updateRegistration?.waiting;
    if (!worker) return false;
    worker.postMessage({ type: 'FARO_ACTIVATE_WHEN_SAFE' });
    return true;
  };

  app.showUpdateBanner = function() {
    hideLegacyUpdateUi();
  };

  app.applyUpdate = function() {
    hideLegacyUpdateUi();
    return checkForUpdate({ force: true });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('online', () => checkForUpdate({ force: true }));
  window.addEventListener('pageshow', () => checkForUpdate());
  window.addEventListener('pagehide', event => {
    if (!event.persisted) activateWaitingWorker();
  });

  hideLegacyUpdateUi();
  window.FaroUpdate = Object.freeze({
    checkForUpdate,
    activateWaitingWorker,
    checkIntervalMs: CHECK_INTERVAL_MS,
    mode: 'background-safe'
  });
})();
