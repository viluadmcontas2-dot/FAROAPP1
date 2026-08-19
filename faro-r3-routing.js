(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroR3Routing) return;

  const openMoneyFrom = opener => {
    app.navigateToPrimary('planning');
    window.setTimeout(() => window.FaroPlanning?.openMoney?.('bills', opener), 0);
  };

  const homeAttention = document.getElementById('faroHomeAttention');
  homeAttention?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openMoneyFrom(homeAttention);
  }, true);

  const legacyManageCosts = document.getElementById('faroManageCosts');
  legacyManageCosts?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openMoneyFrom(legacyManageCosts);
  }, true);

  window.FaroR3Routing = Object.freeze({ openMoneyFrom });
})();
