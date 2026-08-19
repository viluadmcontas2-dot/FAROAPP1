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

  // O Radar vive na top-layer do navegador. Formulários financeiros antigos
  // ainda são overlays comuns; portanto fechamos o Radar antes do handoff e,
  // quando o formulário termina, devolvemos o motorista ao contexto financeiro.
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
  const reopenAfterLegacy = (modalId, tab) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    let becameVisible = !modal.classList.contains('hidden');
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('hidden')) { becameVisible = true; return; }
      if (!becameVisible) return;
      observer.disconnect();
      window.setTimeout(() => window.FaroPlanning?.openMoney?.(tab, document.getElementById('faroOpenMoney')), 80);
    });
    observer.observe(modal,{attributes:true,attributeFilter:['class']});
  };

  moneyDialog?.addEventListener('click', event => {
    const contribution = event.target.closest('[data-r3-reserve-contribute]');
    const goal = event.target.closest('[data-r3-reserve-goal]');
    const addBill = event.target.closest('#faroMoneyAddBill');
    const createReserve = event.target.closest('#faroMoneyCreateReserve');
    const undoRadar = event.target.closest('.faro-r3b2-undo-bar [data-r3-undo]');
    if (!contribution && !goal && !addBill && !createReserve && !undoRadar) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (undoRadar) return window.FaroFinance?.undoPaid?.(undoRadar.dataset.r3Undo);
    if (contribution) return afterMoneyClose(() => clickReserveAction('data-reserve-contribute', contribution.dataset.r3ReserveContribute));
    if (goal) return afterMoneyClose(() => clickReserveAction('data-reserve-goal', goal.dataset.r3ReserveGoal));
    if (addBill) {
      reopenAfterLegacy('costModal','bills');
      return afterMoneyClose(() => app.openCostModal());
    }
    if (createReserve) {
      reopenAfterLegacy('costModal','reserves');
      return afterMoneyClose(() => {
        const legacy = document.getElementById('faroCreateReserve');
        if (legacy) return legacy.click();
        app.openCostModal();
        app.applyCostTemplate?.('reserve');
      });
    }
  }, true);

  window.FaroR3Routing = Object.freeze({ openMoneyFrom });
})();
