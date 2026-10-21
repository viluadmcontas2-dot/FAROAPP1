// Entrada do app: liga o armazenamento local, a nuvem e a interface. Sem eval/new Function (CSP script-src 'self').
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './app.css';
import './pseudo.gen.css';
import App from './logic.js';
import { getStore } from '../data/store.js';
import { createBackend } from '../data/backend.js';
import { createSync } from '../data/sync.js';
import { DEFAULT_CONFIG } from '../data/config.js';
import { registerServiceWorker } from '../pwa/register.js';

const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const store = getStore();
const backend = createBackend({ config: DEFAULT_CONFIG, createClient, storage });
// "tem dados" = o usuário já passou pelo onboarding; estado de fábrica nunca conflita com a nuvem
const sync = createSync({ backend, store, storage, hasData: state => !!(state && state.onboarded) });

createRoot(document.getElementById('root')).render(React.createElement(App, { store, cloud: { backend, sync } }));

window.addEventListener('online', () => sync.setOnline(true));
window.addEventListener('offline', () => sync.setOnline(false));
// restaura a sessão salva antes de ligar o sync; sem internet o app segue local
backend.restore().finally(() => sync.start());

registerServiceWorker();
