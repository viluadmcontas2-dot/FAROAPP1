// Liga tudo e escolhe a primeira tela: fora do app instalado só aparece "Instalar o Faro"; instalado, o app.
// Tudo entra por parâmetro (config, createClient, redirect, win) para os testes usarem uma nuvem falsa sem atalho de produção.
import React from 'react';
import { createRoot } from 'react-dom/client';
import './app.css';
import './pseudo.gen.css';
import App from './logic.js';
import { InstallGate, createInstallPrompt, detectInstall, readInstallEnv } from './install-gate.js';
import { getStore } from '../data/store.js';
import { createBackend } from '../data/backend.js';
import { createSync } from '../data/sync.js';
import { registerServiceWorker } from '../pwa/register.js';

export function boot({ root, config, createClient, version = '', win = window, redirect } = {}) {
  const prompt = createInstallPrompt(win); // o navegador avisa uma vez só: precisa ouvir desde o início
  const info = detectInstall(readInstallEnv(win));
  const view = createRoot(root);
  registerServiceWorker();

  if (!info.installed) {
    view.render(React.createElement(InstallGate, { info, prompt }));
    return { installed: false };
  }

  const storage = (() => { try { return win.localStorage; } catch { return null; } })();
  const store = getStore();
  const backend = createBackend({ config, createClient, storage, ...(redirect ? { redirect } : {}) });
  // "tem dados" = o usuário já passou pelo onboarding; estado de fábrica nunca conflita com a nuvem
  const sync = createSync({ backend, store, storage, hasData: state => !!(state && state.onboarded) });
  // restaura a sessão salva antes de ligar o sync; sem internet o app segue local
  const ready = backend.restore().catch(() => null).finally(() => sync.start());
  view.render(React.createElement(App, { store, cloud: { backend, sync, ready }, version }));

  win.addEventListener('online', () => sync.setOnline(true));
  win.addEventListener('offline', () => sync.setOnline(false));
  return { installed: true, backend, sync, store };
}
