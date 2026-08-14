(() => {
  const app = window.__vettaApp;
  if (!app) return;

  // Durante o refinamento esta trava fica desligada para acelerar testes.
  // No lançamento comercial, deve ser ativada somente após a validação física de instalação em Android e iOS.
  const INSTALL_GATE_ENFORCED = false;

  const isInstallRequired = () => INSTALL_GATE_ENFORCED && !app.isStandalone();
  const getActivationStage = () => isInstallRequired() ? 'install' : 'product';

  const injectStyles = () => {
    if (document.getElementById('faroPlatformStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroPlatformStyles';
    style.textContent = `
      #faroInstallGate .faro-install-mark{width:70px;height:70px;border-radius:22px;background:#eff6ff;display:grid;place-items:center;margin-bottom:18px}
      #faroInstallGate .faro-install-mark img{width:54px;height:54px}
    `;
    document.head.appendChild(style);
  };

  const showInstallGate = () => {
    if (!isInstallRequired() || document.getElementById('faroInstallGate')) return;

    const gate = document.createElement('div');
    gate.id = 'faroInstallGate';
    gate.className = 'modal-backdrop';
    gate.innerHTML = `
      <div class="modal-sheet">
        <div class="faro-install-mark"><img src="./faro-mark.svg" alt=""></div>
        <span class="label-micro !text-blue-600">Primeiro passo</span>
        <h2 class="text-2xl font-extrabold mt-2">Instale o FARO</h2>
        <p class="text-sm text-slate-500 mt-3 leading-relaxed">O FARO funciona como aplicativo no seu celular e continua disponível para sua rotina mesmo quando a conexão oscila.</p>
        <button id="faroInstallGateButton" class="w-full mt-6 py-4 rounded-2xl bg-blue-600 text-white font-extrabold">INSTALAR FARO</button>
        <p id="faroInstallGateHelp" class="text-xs text-slate-500 mt-4 text-center"></p>
      </div>`;
    document.body.appendChild(gate);

    const help = document.getElementById('faroInstallGateHelp');
    const button = document.getElementById('faroInstallGateButton');

    if (app.isIos()) {
      help.textContent = 'No iPhone: abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Depois abra o FARO pelo novo ícone.';
      button.textContent = 'COMO INSTALAR NO IPHONE';
    }

    button.addEventListener('click', async () => {
      if (app.isIos()) {
        help.classList.add('font-bold', 'text-blue-700');
        return;
      }
      await app.install();
      help.textContent = 'Quando a instalação terminar, abra o FARO pelo ícone criado no celular.';
    });

    window.addEventListener('appinstalled', () => {
      document.getElementById('faroInstallGate')?.classList.add('hidden');
      setTimeout(() => location.reload(), 250);
    }, { once: true });
  };

  document.documentElement.dataset.faroInstallGate = INSTALL_GATE_ENFORCED ? 'obrigatorio' : 'liberado-para-testes';
  document.documentElement.dataset.faroActivationStage = getActivationStage();
  injectStyles();
  showInstallGate();

  window.FaroPlatform = Object.freeze({
    installGateEnforced: INSTALL_GATE_ENFORCED,
    getActivationStage,
    canEnterProduct: () => getActivationStage() === 'product'
  });
})();
