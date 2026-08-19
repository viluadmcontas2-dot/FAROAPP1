(() => {
  const app = window.__vettaApp;
  const planning = document.getElementById('view-planning');
  if (!app || !planning || window.FaroPlanningInvariants) return;

  // app.js é o motor canônico e ainda escreve neste ID em todo render().
  // A nova composição não exibe o badge no primeiro nível, mas preserva o nó
  // para que reorganização visual nunca quebre o contrato de render do motor.
  if (!document.getElementById('extraDaysOffBadge')) {
    const compatibility = document.createElement('span');
    compatibility.id = 'extraDaysOffBadge';
    compatibility.hidden = true;
    compatibility.setAttribute('aria-hidden', 'true');
    planning.appendChild(compatibility);
  }

  window.FaroPlanningInvariants = Object.freeze({
    hasExtraDaysRenderTarget: () => Boolean(document.getElementById('extraDaysOffBadge'))
  });
})();
