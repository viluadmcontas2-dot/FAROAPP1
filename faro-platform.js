(() => {
  const app = window.__vettaApp;
  if (!app) return;

  const INSTALL_GATE_ENFORCED = true;
  const root = document.documentElement;

  const isAndroid = () => /Android/i.test(navigator.userAgent);
  const isSamsungBrowser = () => /SamsungBrowser/i.test(navigator.userAgent);
  const isInstallRequired = () => INSTALL_GATE_ENFORCED && !app.isStandalone();
  const getActivationStage = () => isInstallRequired() ? 'install' : 'product';
  const deviceKind = () => app.isIos() ? 'ios' : isAndroid() ? 'android' : 'desktop';
  const deviceLabel = kind => ({ ios:'iPhone ou iPad', android:'Android', desktop:'Computador' })[kind] || 'Dispositivo';

  const getInstallPrompt = () => window.__faroInstallPrompt || app.deferredPrompt || null;
  const rememberInstallPrompt = event => {
    event.preventDefault();
    window.__faroInstallPrompt = event;
    app.deferredPrompt = event;
    window.dispatchEvent(new CustomEvent('faro:install-ready'));
  };
  const clearInstallPrompt = () => {
    window.__faroInstallPrompt = null;
    app.deferredPrompt = null;
  };

  const ensureInstallInfrastructure = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.warn('FARO: service worker não registrado pela plataforma', error);
    }
  };

  const waitForInstallPrompt = (timeout = 1800) => new Promise(resolve => {
    const current = getInstallPrompt();
    if (current) return resolve(current);

    let settled = false;
    let timer = null;
    const finish = value => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('faro:install-ready', onReady);
      resolve(value || null);
    };
    const onReady = () => finish(getInstallPrompt());
    window.addEventListener('faro:install-ready', onReady, { once:true });
    timer = setTimeout(() => finish(getInstallPrompt()), timeout);
  });

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
          ? 'No Safari, use o menu Compartilhar para concluir.'
          : 'Se “Adicionar à Tela de Início” não aparecer, abra este mesmo link no Safari.',
        button: 'VER PASSO A PASSO'
      };
    }

    if (kind === 'android' && manual) {
      const samsung = isSamsungBrowser();
      return {
        title: samsung ? 'Instalar pelo Samsung Internet' : 'Instalar pelo menu do Android',
        steps: samsung
          ? ['Toque no menu ☰.', 'Escolha “Adicionar página a”.', 'Escolha “Tela inicial” e confirme.', 'Abra o FARO pelo ícone criado.']
          : ['Toque no menu ⋮.', 'Escolha “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme a instalação.', 'Abra o FARO pelo ícone criado.'],
        help: 'Use esse passo a passo se o instalador não abrir sozinho.',
        button: 'TENTAR INSTALAR DE NOVO'
      };
    }

    if (kind === 'android') {
      return {
        title: 'Instalar no Android',
        steps: ['Toque em “Instalar FARO” abaixo.', 'Confirme quando o celular perguntar.', 'Quando terminar, abra o FARO pelo novo ícone.'],
        help: '',
        button: 'INSTALAR FARO'
      };
    }

    if (manual) {
      return {
        title: 'Instalar no computador',
        steps: ['Abra o menu do navegador.', 'Procure “Instalar FARO”, “Instalar app” ou opção equivalente.', 'Confirme.', 'Abra o FARO pelo novo ícone ou atalho criado.'],
        help: 'Use esse passo a passo se o instalador não abrir sozinho.',
        button: 'TENTAR INSTALAR DE NOVO'
      };
    }

    return {
      title: 'Instalar no computador',
      steps: ['Clique em “Instalar FARO”.', 'Confirme quando aparecer a instalação.', 'Depois abra o FARO pelo novo ícone ou atalho criado.'],
      help: '',
      button: 'INSTALAR FARO'
    };
  };

  const injectStyles = () => {
    if (document.getElementById('faroPlatformStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroPlatformStyles';
    style.textContent = `
      #faroInstallGate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:18px;background:#0B1121;overflow:auto}
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
    const help = gate.querySelector('#faroInstallGateHelp');
    gate.querySelector('#faroInstallTutorialTitle').textContent = tutorial.title;
    gate.querySelector('#faroInstallSteps').innerHTML = tutorial.steps.map(step => `<li>${step}</li>`).join('');
    help.textContent = tutorial.help;
    help.classList.toggle('hidden', !tutorial.help);
    gate.querySelector('#faroInstallGateButton').textContent = tutorial.button;
  };

  const showInstalledState = gate => {
    gate.dataset.state = 'installed';
    gate.querySelector('#faroInstallTitle').textContent = 'Tudo pronto!';
    gate.querySelector('#faroInstallLead').textContent = 'O FARO já está instalado neste aparelho.';
    gate.querySelector('#faroInstallTutorialTitle').textContent = 'Agora é só abrir';
    gate.querySelector('#faroInstallSteps').innerHTML = '<li>Feche esta aba.</li><li>Procure o ícone FARO na tela inicial, menu de apps ou área de aplicativos.</li><li>Toque no ícone FARO para começar.</li>';
    const help = gate.querySelector('#faroInstallGateHelp');
    help.textContent = 'Nos próximos acessos, entre sempre pelo ícone FARO.';
    help.classList.remove('hidden');
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
        <h1 id="faroInstallTitle" class="text-2xl font-extrabold mt-2">Instale o FARO</h1>
        <p id="faroInstallLead" class="text-sm text-slate-500 mt-3 leading-relaxed">Seu FARO, sempre à mão.</p>
        <span class="faro-install-device">${deviceLabel(kind)}</span>
        <div class="faro-install-benefits" aria-label="Vantagens da instalação">
          <div class="faro-install-benefit">Acesso rápido</div>
          <div class="faro-install-benefit">Instalação única</div>
          <div class="faro-install-benefit">Mais preparado pra pista</div>
        </div>
        <div id="faroInstallTutorial" class="faro-install-tutorial">
          <strong id="faroInstallTutorialTitle" class="text-sm text-blue-900"></strong>
          <ol id="faroInstallSteps"></ol>
        </div>
        <button id="faroInstallGateButton" type="button" class="faro-install-button"></button>
        <p id="faroInstallGateHelp" class="faro-install-help hidden" aria-live="polite"></p>
        <p class="text-[10px] text-slate-400 text-center mt-4">Já instalou? Abra o FARO pelo ícone.</p>
      </div>`;
    document.body.appendChild(gate);
    lockProductBehindGate(gate);
    renderTutorial(gate, kind, false);

    const button = gate.querySelector('#faroInstallGateButton');
    let installing = false;

    button.addEventListener('click', async () => {
      if (kind === 'ios') {
        gate.querySelector('#faroInstallTutorial')?.scrollIntoView({ behavior:'smooth', block:'center' });
        const help = gate.querySelector('#faroInstallGateHelp');
        help.classList.remove('hidden');
        help.classList.add('font-bold', 'text-blue-700');
        return;
      }

      if (installing) return;
      installing = true;
      button.disabled = true;
      button.textContent = 'PREPARANDO…';

      await ensureInstallInfrastructure();
      const prompt = await waitForInstallPrompt();
      if (!prompt) {
        renderTutorial(gate, kind, true);
        gate.querySelector('#faroInstallTutorial')?.scrollIntoView({ behavior:'smooth', block:'center' });
        button.disabled = false;
        installing = false;
        return;
      }

      button.textContent = 'ABRINDO INSTALAÇÃO…';
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        clearInstallPrompt();
        if (choice?.outcome === 'accepted') {
          const help = gate.querySelector('#faroInstallGateHelp');
          help.textContent = 'Instalação confirmada. Aguarde o aparelho concluir.';
          help.classList.remove('hidden');
          button.textContent = 'FINALIZANDO…';
        } else {
          renderTutorial(gate, kind, true);
          const help = gate.querySelector('#faroInstallGateHelp');
          help.textContent = 'Instalação não concluída. Use o passo a passo acima e tente novamente.';
          help.classList.remove('hidden');
          button.disabled = false;
          installing = false;
        }
      } catch (error) {
        console.warn('FARO: instalador automático indisponível', error);
        clearInstallPrompt();
        renderTutorial(gate, kind, true);
        button.disabled = false;
        installing = false;
      }
    });

    window.addEventListener('beforeinstallprompt', event => {
      rememberInstallPrompt(event);
      if (kind !== 'ios' && gate.dataset.state !== 'installed') renderTutorial(gate, kind, false);
    });
    window.addEventListener('appinstalled', () => {
      clearInstallPrompt();
      showInstalledState(gate);
    }, { once:true });
    requestAnimationFrame(() => button.focus());
  };

  root.dataset.faroInstallGate = INSTALL_GATE_ENFORCED ? 'obrigatorio' : 'liberado-para-testes';
  root.dataset.faroActivationStage = getActivationStage();
  injectStyles();
  ensureInstallInfrastructure();
  showInstallGate();
  root.dataset.faroPlatformReady = 'true';

  window.FaroPlatform = Object.freeze({
    installGateEnforced: INSTALL_GATE_ENFORCED,
    getActivationStage,
    canEnterProduct: () => getActivationStage() === 'product'
  });
})();