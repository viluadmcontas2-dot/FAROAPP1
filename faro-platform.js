(() => {
  const app = window.__vettaApp;
  if (!app) return;

  const INSTALL_GATE_ENFORCED = true;

  const isAndroid = () => /Android/i.test(navigator.userAgent);
  const isSamsungBrowser = () => /SamsungBrowser/i.test(navigator.userAgent);
  const isInstallRequired = () => INSTALL_GATE_ENFORCED && !app.isStandalone();
  const getActivationStage = () => isInstallRequired() ? 'install' : 'product';
  const deviceKind = () => app.isIos() ? 'ios' : isAndroid() ? 'android' : 'desktop';

  const deviceLabel = kind => ({ ios:'iPhone ou iPad', android:'Android', desktop:'Computador' })[kind] || 'Dispositivo';

  const tutorialFor = (kind, manual = false) => {
    if (kind === 'ios') {
      return {
        title: 'Como instalar no iPhone',
        steps: [
          'Toque em Compartilhar.',
          'Escolha “Adicionar à Tela de Início”.',
          'Se aparecer “Abrir como App da Web”, deixe ativado.',
          'Toque em “Adicionar” e depois abra o FARO pelo novo ícone.'
        ],
        help: app.isSafari()
          ? 'A instalação é feita pelo menu de compartilhamento do iPhone.'
          : 'Se “Adicionar à Tela de Início” não aparecer neste navegador, abra este mesmo link no Safari.',
        button: 'VER PASSO A PASSO'
      };
    }

    if (kind === 'android' && manual) {
      const samsung = isSamsungBrowser();
      return {
        title: samsung ? 'Instalar pelo Samsung Internet' : 'Instalar pelo menu do Android',
        steps: samsung
          ? ['Toque no menu ☰.', 'Escolha “Adicionar página a”.', 'Escolha “Tela inicial” e confirme.', 'Abra o FARO pelo ícone criado.']
          : ['Toque no menu ⋮ do navegador.', 'Escolha “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme a instalação.', 'Abra o FARO pelo ícone criado.'],
        help: 'O instalador automático não apareceu. Esse caminho faz a mesma instalação.',
        button: 'TENTAR INSTALAR DE NOVO'
      };
    }

    if (kind === 'android') {
      return {
        title: 'Instalar no Android',
        steps: ['Toque em “Instalar FARO” abaixo.', 'Confirme a instalação quando o celular perguntar.', 'Quando terminar, feche esta página e abra o ícone FARO.'],
        help: 'Leva poucos segundos. Depois o FARO abre como aplicativo, sem barra de navegador.',
        button: 'INSTALAR FARO'
      };
    }

    if (manual) {
      return {
        title: 'Instalar no computador',
        steps: ['Abra o menu do navegador.', 'Procure “Instalar FARO”, “Instalar app” ou opção equivalente.', 'Confirme.', 'Abra o FARO pelo novo ícone ou atalho criado.'],
        help: 'O instalador automático não apareceu. Use o menu do navegador para concluir.',
        button: 'TENTAR INSTALAR DE NOVO'
      };
    }

    return {
      title: 'Instalar no computador',
      steps: ['Clique em “Instalar FARO”.', 'Confirme quando o navegador perguntar.', 'Depois abra o FARO pelo ícone ou atalho criado.'],
      help: 'O FARO foi pensado para abrir como aplicativo também no computador.',
      button: 'INSTALAR FARO'
    };
  };

  const injectStyles = () => {
    if (document.getElementById('faroPlatformStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroPlatformStyles';
    style.textContent = `
      #faroInstallGate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:18px;background:rgba(11,17,33,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:auto}
      #faroInstallGate .faro-install-sheet{width:min(100%,500px);max-height:calc(100dvh - 28px);overflow:auto;border-radius:28px;background:#fff;padding:24px;box-shadow:0 24px 80px rgba(2,6,23,.42)}
      #faroInstallGate .faro-install-mark{width:72px;height:72px;border-radius:23px;background:#eff6ff;display:grid;place-items:center;margin-bottom:18px}
      #faroInstallGate .faro-install-mark img{width:56px;height:56px;object-fit:contain}
      #faroInstallGate .faro-install-benefits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:18px}
      #faroInstallGate .faro-install-benefit{border-radius:15px;background:#f8fafc;padding:11px 9px;text-align:center;font-size:10px;line-height:1.35;font-weight:800;color:#475569}
      #faroInstallGate .faro-install-tutorial{margin-top:18px;border:1px solid #dbeafe;border-radius:20px;background:#eff6ff;padding:16px}
      #faroInstallGate .faro-install-tutorial ol{margin:11px 0 0;padding-left:20px;display:grid;gap:9px;color:#334155;font-size:12px;line-height:1.45}
      #faroInstallGate .faro-install-button{width:100%;margin-top:18px;min-height:54px;border:0;border-radius:17px;background:#2563eb;color:#fff;font-size:13px;font-weight:900;letter-spacing:.02em;box-shadow:0 12px 28px rgba(37,99,235,.24)}
      #faroInstallGate .faro-install-button:disabled{opacity:.62;box-shadow:none}
      #faroInstallGate .faro-install-help{margin-top:12px;text-align:center;color:#64748b;font-size:11px;line-height:1.5}
      #faroInstallGate .faro-install-device{display:inline-flex;margin-top:12px;padding:6px 9px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      #faroInstallGate[data-state="installed"] .faro-install-tutorial{background:#ecfdf5;border-color:#a7f3d0}
      #faroInstallGate[data-state="installed"] .faro-install-mark{background:#ecfdf5}
      @media(max-width:390px){#faroInstallGate{padding:10px}#faroInstallGate .faro-install-sheet{padding:20px;border-radius:24px}#faroInstallGate .faro-install-benefits{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){#faroInstallGate *{scroll-behavior:auto!important}}
    `;
    document.head.appendChild(style);
  };

  const lockProductBehindGate = gate => {
    [...document.body.children].forEach(child => {
      if (child === gate) return;
      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
      child.dataset.faroInstallLocked = 'true';
    });
    document.body.style.overflow = 'hidden';
  };

  const renderTutorial = (gate, kind, manual = false) => {
    const tutorial = tutorialFor(kind, manual);
    gate.querySelector('#faroInstallTutorialTitle').textContent = tutorial.title;
    gate.querySelector('#faroInstallSteps').innerHTML = tutorial.steps.map(step => `<li>${step}</li>`).join('');
    gate.querySelector('#faroInstallGateHelp').textContent = tutorial.help;
    gate.querySelector('#faroInstallGateButton').textContent = tutorial.button;
  };

  const showInstalledState = gate => {
    gate.dataset.state = 'installed';
    gate.querySelector('#faroInstallTitle').textContent = 'FARO instalado.';
    gate.querySelector('#faroInstallLead').textContent = 'Agora feche esta página e abra o FARO pelo ícone que apareceu no seu aparelho.';
    gate.querySelector('#faroInstallTutorialTitle').textContent = 'Último passo';
    gate.querySelector('#faroInstallSteps').innerHTML = '<li>Feche esta aba.</li><li>Procure o ícone FARO na tela inicial, menu de apps ou área de aplicativos.</li><li>Abra por ele. A partir daí você entra no FARO como aplicativo.</li>';
    gate.querySelector('#faroInstallGateHelp').textContent = 'Esta página continua bloqueada de propósito para evitar usar o FARO como site.';
    gate.querySelector('#faroInstallGateButton').classList.add('hidden');
  };

  const showInstallGate = () => {
    if (!isInstallRequired() || document.getElementById('faroInstallGate')) return;

    const kind = deviceKind();
    const gate = document.createElement('section');
    gate.id = 'faroInstallGate';
    gate.dataset.state = 'required';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'faroInstallTitle');
    gate.innerHTML = `
      <div class="faro-install-sheet">
        <div class="faro-install-mark"><img src="./faro-mark.svg" alt="Símbolo FARO"></div>
        <span class="label-micro !text-blue-600">FARO · APP DO MOTORISTA</span>
        <h1 id="faroInstallTitle" class="text-2xl font-extrabold mt-2">Instale o FARO para continuar</h1>
        <p id="faroInstallLead" class="text-sm text-slate-500 mt-3 leading-relaxed">O FARO foi feito para funcionar como aplicativo. A instalação coloca o ícone no seu aparelho e tira a sensação de estar usando um site.</p>
        <span class="faro-install-device">${deviceLabel(kind)} detectado</span>
        <div class="faro-install-benefits" aria-label="Vantagens da instalação">
          <div class="faro-install-benefit">Abre pelo ícone do FARO</div>
          <div class="faro-install-benefit">Sem barra de navegador</div>
          <div class="faro-install-benefit">Mais preparado para a pista</div>
        </div>
        <div id="faroInstallTutorial" class="faro-install-tutorial">
          <strong id="faroInstallTutorialTitle" class="text-sm text-blue-900"></strong>
          <ol id="faroInstallSteps"></ol>
        </div>
        <button id="faroInstallGateButton" type="button" class="faro-install-button"></button>
        <p id="faroInstallGateHelp" class="faro-install-help" aria-live="polite"></p>
        <p class="text-[10px] text-slate-400 text-center mt-4">Já instalou? Feche esta página e abra o FARO pelo ícone do aplicativo.</p>
      </div>`;
    document.body.appendChild(gate);
    lockProductBehindGate(gate);
    renderTutorial(gate, kind, false);

    const button = gate.querySelector('#faroInstallGateButton');
    let installing = false;

    button.addEventListener('click', async () => {
      if (kind === 'ios') {
        gate.querySelector('#faroInstallTutorial')?.scrollIntoView({ behavior:'smooth', block:'center' });
        gate.querySelector('#faroInstallGateHelp').classList.add('font-bold', 'text-blue-700');
        return;
      }

      if (installing) return;
      const prompt = app.deferredPrompt;
      if (!prompt) {
        renderTutorial(gate, kind, true);
        gate.querySelector('#faroInstallTutorial')?.scrollIntoView({ behavior:'smooth', block:'center' });
        return;
      }

      installing = true;
      button.disabled = true;
      button.textContent = 'ABRINDO INSTALAÇÃO…';
      try {
        prompt.prompt();
        const choice = await prompt.userChoice;
        app.deferredPrompt = null;
        if (choice?.outcome === 'accepted') {
          gate.querySelector('#faroInstallGateHelp').textContent = 'Instalação confirmada. Aguarde o aparelho concluir.';
          button.textContent = 'FINALIZANDO…';
        } else {
          renderTutorial(gate, kind, true);
          gate.querySelector('#faroInstallGateHelp').textContent = 'A instalação continua necessária para entrar no FARO. Você pode tentar novamente pelo menu do navegador.';
          button.disabled = false;
          installing = false;
        }
      } catch (error) {
        console.warn('FARO: instalador automático indisponível', error);
        renderTutorial(gate, kind, true);
        button.disabled = false;
        installing = false;
      }
    });

    window.addEventListener('beforeinstallprompt', () => {
      if (kind !== 'ios' && gate.dataset.state !== 'installed') renderTutorial(gate, kind, false);
    });

    window.addEventListener('appinstalled', () => showInstalledState(gate), { once:true });
    requestAnimationFrame(() => button.focus());
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