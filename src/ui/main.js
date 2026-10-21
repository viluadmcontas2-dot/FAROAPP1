// Entrada do app: monta o componente raiz. Sem eval/new Function; compativel com CSP script-src 'self'.
import React from 'react';
import { createRoot } from 'react-dom/client';
import './app.css';
import './pseudo.gen.css';
import App from './logic.js';

const root = document.getElementById('root');
const params = new URLSearchParams(location.search);
// parametros de tela so servem para ver/testar telas do design (ex.: ?tela=onb0, ?tela=close1, ?tema=dia)
createRoot(root).render(
  React.createElement(App, {
    theme: params.get('tema') || undefined,
    startScreen: params.get('tela') || undefined,
    startPeriod: params.get('periodo') || undefined,
    sheet: params.get('sheet') || undefined,
  }),
);
