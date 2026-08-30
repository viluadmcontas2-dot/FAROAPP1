(() => {
  const app = window.__vettaApp;
  const modal = document.getElementById('onboardingModal');
  const original = document.getElementById('faroFinish');
  if (!app || !modal || !original || window.FaroOnboardingCommit) return;

  // O onboarding antigo registrava um listener anônimo no CTA final. Substituímos
  // o nó inteiro para remover aquele listener e manter exatamente um owner do gesto.
  const button = original.cloneNode(true);
  original.replaceWith(button);
  let finalizing = false;

  const setBusy = value => {
    button.disabled = value;
    if (value) button.setAttribute('aria-busy', 'true');
    else button.removeAttribute('aria-busy');
  };

  const refreshCommittedUi = () => {
    try {
      app.syncInputs();
      app.render();
    } catch (error) {
      // O commit e o handoff já aconteceram. Uma falha de apresentação não pode
      // devolver o motorista ao onboarding nem deixar o CTA permanentemente preso.
      console.error('FARO onboarding: conclusão persistida; falha apenas no refresh visual', error);
    }
  };

  const finish = () => {
    if (finalizing) return;
    if (app.state.onboardingComplete) {
      modal.classList.add('hidden');
      return;
    }

    finalizing = true;
    setBusy(true);
    app.state.onboardingComplete = true;

    try {
      app.save();
    } catch (error) {
      app.state.onboardingComplete = false;
      finalizing = false;
      setBusy(false);
      console.error('FARO onboarding: falha ao persistir conclusão', error);
      app.toast('Não foi possível concluir agora. Tente novamente.');
      return;
    }

    try { localStorage.removeItem('faro-onboarding-draft-v2'); } catch {}
    modal.classList.add('hidden');
    try {
      app.navigateToPrimary('dashboard');
    } catch (error) {
      console.error('FARO onboarding: conclusão persistida; falha ao navegar para a Home', error);
    }
    window.dispatchEvent(new CustomEvent('faro:onboarding-complete'));
    refreshCommittedUi();
    app.toast('Seu FARO está pronto. Ajuste quando sua rotina mudar.');
  };

  button.addEventListener('click', finish);

  window.FaroOnboardingCommit = Object.freeze({
    finish,
    ownsFinishGesture: true,
    postCommitRefreshIsFailSafe: true
  });
})();
