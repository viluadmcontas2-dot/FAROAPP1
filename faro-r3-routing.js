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

  // Um <dialog> modal vive na top-layer do navegador. Os formulários financeiros
  // legados ainda são overlays comuns; portanto o sheet Dinheiro deve fechar
  // antes de entregar a ação a esses formulários, evitando um modal atrás do outro.
  const moneyDialog = document.getElementById('faroMoneyDialog');
  const handoffDelay = () => window.FaroInteractions?.reduceMotion?.() ? 0 : 190;
  const afterMoneyClose = callback => {
    window.FaroInteractions?.close?.(moneyDialog, 'handoff');
    window.setTimeout(callback, handoffDelay());
  };
  const clickReserveAction = (attribute, value) => {
    const button = [...document.querySelectorAll(`[${attribute}]`)].find(item => item.getAttribute(attribute) === value && item.closest('#faroReserveCenter'));
    button?.click();
  };

  moneyDialog?.addEventListener('click', event => {
    const contribution = event.target.closest('[data-r3-reserve-contribute]');
    const goal = event.target.closest('[data-r3-reserve-goal]');
    const addBill = event.target.closest('#faroMoneyAddBill');
    const createReserve = event.target.closest('#faroMoneyCreateReserve');
    if (!contribution && !goal && !addBill && !createReserve) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (contribution) return afterMoneyClose(() => clickReserveAction('data-reserve-contribute', contribution.dataset.r3ReserveContribute));
    if (goal) return afterMoneyClose(() => clickReserveAction('data-reserve-goal', goal.dataset.r3ReserveGoal));
    if (addBill) return afterMoneyClose(() => app.openCostModal());
    if (createReserve) return afterMoneyClose(() => {
      const legacy = document.getElementById('faroCreateReserve');
      if (legacy) return legacy.click();
      app.openCostModal();
      app.applyCostTemplate?.('reserve');
    });
  }, true);

  window.FaroR3Routing = Object.freeze({ openMoneyFrom });
})();
