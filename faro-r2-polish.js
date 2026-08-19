(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroR2Polish) return;

  const history = document.getElementById('view-history');
  const more = document.getElementById('view-more');

  const centralIntro = document.getElementById('faroCentralIntro');
  centralIntro?.remove();

  if (history && !document.getElementById('faroHistoryAnalytics')) {
    const chartCard = document.getElementById('historyChart')?.closest('.card-vetta');
    if (chartCard) {
      const details = document.createElement('details');
      details.id = 'faroHistoryAnalytics';
      details.className = 'faro-plan-details';
      details.innerHTML = '<summary>Ver evolução do líquido</summary>';
      chartCard.parentNode.insertBefore(details, chartCard);
      details.appendChild(chartCard);
    }
  }

  if (more) {
    const heading = more.querySelector('h2');
    const description = more.querySelector('h2 + p');
    if (heading) heading.textContent = 'Central';
    if (description) description.textContent = 'Dados, aplicativo, ajuda e ferramentas ocasionais.';

    const account = document.getElementById('faroAccountCard') || document.querySelector('[data-faro-account]');
    const exportCard = document.getElementById('exportButton')?.closest('.card-vetta');
    const compareCard = document.getElementById('compareDetails')?.closest('.card-vetta') || document.getElementById('compareDetails');
    const installCard = document.getElementById('installCardButton');
    const help = document.getElementById('faroTourHelp');
    const safety = document.getElementById('faroSafetyZone');

    if (help && safety && help.parentElement === safety.parentElement) {
      safety.parentElement.insertBefore(help, safety);
    }

    const addGroupLabel = (node, text) => {
      if (!node?.parentElement || node.previousElementSibling?.dataset?.faroCentralGroup === text) return;
      const label = document.createElement('div');
      label.dataset.faroCentralGroup = text;
      label.className = 'px-1 pt-2';
      label.innerHTML = `<span class="label-micro !text-slate-400">${text}</span>`;
      node.parentElement.insertBefore(label, node);
    };
    addGroupLabel(account || exportCard, 'Conta e dados');
    if (compareCard) addGroupLabel(compareCard.closest?.('.card-vetta') || compareCard, 'Ferramentas');
    if (installCard) addGroupLabel(installCard, 'Aplicativo');
    if (help) addGroupLabel(help, 'Ajuda');
    if (safety) addGroupLabel(safety, 'Segurança');
  }

  window.FaroR2Polish = Object.freeze({ historyCollapsed:true, centralGrouped:true, helpBeforeSafety:true });
})();
