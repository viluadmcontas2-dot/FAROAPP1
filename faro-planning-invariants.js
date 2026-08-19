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

  // O campo exato precisa permitir apagar e digitar antes de normalizar.
  // Ele não vira um segundo owner: ao confirmar, delega ao mesmo slider/draft
  // controlado por faro-planning.js.
  const exact = document.getElementById('faroTargetExact');
  const slider = document.getElementById('faroTargetSlider');
  if (exact && slider && exact.dataset.faroTypingGuard !== 'true') {
    const freeInput = exact.cloneNode(true);
    freeInput.dataset.faroTypingGuard = 'true';
    exact.replaceWith(freeInput);

    const commitExact = () => {
      const raw = String(freeInput.value || '').trim();
      if (!raw) {
        freeInput.value = String(slider.value || app.state.targetProfit || 500);
        return;
      }
      const normalized = Math.max(500, Math.min(50000, Math.round(app.number(raw) / 100) * 100));
      slider.value = String(Math.min(20000, normalized));
      if (normalized > 20000) {
        // O slider visual termina em 20 mil; para valores maiores, atualizamos seu teto
        // só durante esta edição para continuar usando o mesmo owner de draft.
        slider.max = String(normalized);
        slider.value = String(normalized);
      }
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    };

    freeInput.addEventListener('change', commitExact);
    freeInput.addEventListener('blur', commitExact);
    freeInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      commitExact();
      freeInput.blur();
    });
  }

  window.FaroPlanningInvariants = Object.freeze({
    hasExtraDaysRenderTarget: () => Boolean(document.getElementById('extraDaysOffBadge')),
    exactValueDelegatesToDraftOwner: () => Boolean(document.getElementById('faroTargetExact')?.dataset.faroTypingGuard)
  });
})();
