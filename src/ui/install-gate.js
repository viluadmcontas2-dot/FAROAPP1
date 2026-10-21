// "Só funciona instalado": detector do modo de instalação (puro, testável) + a tela "Instalar o Faro".
// Fora do app instalado só esta tela aparece. Não existe atalho de produção para pular: os testes simulam o modo instalado.
import React from 'react';
import { themeOf } from './theme.js';

const h = React.createElement;

// ---------------------------------------------------------------- detector
const EMBEDDED = [
  [/Instagram/i, 'Instagram'], [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'], [/WhatsApp/i, 'WhatsApp'], [/TikTok|musical_ly|BytedanceWebview/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'], [/Twitter/i, 'Twitter'], [/LinkedInApp/i, 'LinkedIn'], [/Pinterest/i, 'Pinterest'], [/\bLine\//i, 'Line'], [/MicroMessenger/i, 'WeChat'], [/GSA\//i, 'Google'],
];

// env = { userAgent, platform, maxTouchPoints, standaloneMedia, navStandalone }
export function detectInstall(env = {}) {
  const ua = String(env.userAgent || '');
  const ipadOs = env.platform === 'MacIntel' && Number(env.maxTouchPoints) > 1; // iPad novo se apresenta como Mac
  const ios = /iPhone|iPad|iPod/i.test(ua) || ipadOs;
  const android = /Android/i.test(ua);
  const os = ios ? 'ios' : android ? 'android' : 'desktop';
  const installed = !!(env.standaloneMedia || env.navStandalone);
  let app = null;
  for (const [re, name] of EMBEDDED) if (re.test(ua)) { app = name; break; }
  if (!app && android && /; wv\)/.test(ua)) app = 'app';
  if (!app && ios && !ipadOs && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) app = 'app'; // WebView do iOS não tem "Safari/"
  const browser = /SamsungBrowser/.test(ua) ? 'samsung' : /EdgiOS|EdgA|Edg\//.test(ua) ? 'edge' : /FxiOS|Firefox/.test(ua) ? 'firefox' : /CriOS|Chrome\//.test(ua) && !/OPR\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other';
  return { installed, os, browser, embedded: installed ? null : app };
}

export function readInstallEnv(win = globalThis.window) {
  const nav = (win && win.navigator) || {};
  let standaloneMedia = false;
  try { standaloneMedia = !!(win.matchMedia && (win.matchMedia('(display-mode: standalone)').matches || win.matchMedia('(display-mode: fullscreen)').matches)); } catch { /* sem matchMedia */ }
  return { userAgent: nav.userAgent, platform: nav.platform, maxTouchPoints: nav.maxTouchPoints, standaloneMedia, navStandalone: nav.standalone === true };
}

export const isInstalled = (win = globalThis.window) => detectInstall(readInstallEnv(win)).installed;

// Guarda o evento `beforeinstallprompt` (Chrome/Android). Precisa ser criado cedo: o evento dispara uma vez só.
export function createInstallPrompt(win = globalThis.window) {
  let deferred = null, done = false;
  const subs = new Set();
  const emit = () => subs.forEach(fn => { try { fn(); } catch { /* ouvinte */ } });
  win.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; emit(); });
  win.addEventListener('appinstalled', () => { done = true; deferred = null; emit(); });
  return {
    canPrompt: () => !!deferred,
    installedNow: () => done,
    subscribe: fn => { subs.add(fn); return () => subs.delete(fn); },
    async prompt() {
      if (!deferred) return 'unavailable';
      const ev = deferred; deferred = null;
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        if (choice && choice.outcome === 'accepted') done = true;
        emit();
        return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
      } catch { emit(); return 'unavailable'; }
    },
  };
}

// ---------------------------------------------------------------- tela
const svg = (children, size = 22) => h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, ...children);
const ICONS = {
  share: () => svg([h('path', { key: 1, d: 'M12 15V4M8 8l4-4 4 4' }), h('path', { key: 2, d: 'M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6' })]),
  plus: () => svg([h('rect', { key: 1, x: 4, y: 4, width: 16, height: 16, rx: 4 }), h('path', { key: 2, d: 'M12 8v8M8 12h8' })]),
  dots: () => svg([h('circle', { key: 1, cx: 12, cy: 5, r: 1.2 }), h('circle', { key: 2, cx: 12, cy: 12, r: 1.2 }), h('circle', { key: 3, cx: 12, cy: 19, r: 1.2 })]),
  phone: () => svg([h('rect', { key: 1, x: 7, y: 2.5, width: 10, height: 19, rx: 3 }), h('path', { key: 2, d: 'M11 18.5h2' })]),
};

// o que a tela mostra para cada situação: título, texto e passos (ícone + frase)
export function installCopy(info, canPrompt, installedNow) {
  if (installedNow) return { kind: 'done', title: 'Faro instalado', text: 'Feche esta aba e abra o Faro pelo ícone na tela inicial do celular.', steps: [] };
  if (info.embedded) {
    const browser = info.os === 'ios' ? 'Safari' : 'Chrome';
    return {
      kind: 'embedded', title: `Abra no ${browser}`, text: `Você está dentro de outro aplicativo (${info.embedded === 'app' ? 'navegador interno' : info.embedded}). Para instalar o Faro, abra este link no ${browser}.`,
      steps: [['dots', 'Toque nos três pontinhos ou no ícone de compartilhar'], ['share', `Escolha "Abrir no ${browser}"`]], copy: true,
    };
  }
  if (canPrompt) return { kind: 'prompt', title: 'Instale o Faro no celular', text: 'O Faro funciona como app: abre pelo ícone, sem barra de navegador e mesmo sem internet.', steps: [], install: true };
  if (info.os === 'ios') {
    return {
      kind: 'ios', title: 'Instale o Faro no iPhone', text: info.browser === 'safari' ? 'A instalação é feita pelo Safari e leva poucos segundos.' : 'Se não achar estas opções, abra este link no Safari.',
      steps: [['share', 'Toque em Compartilhar'], ['plus', 'Toque em Adicionar à Tela de Início'], ['phone', 'Abra o Faro pelo novo ícone']],
    };
  }
  if (info.os === 'android') {
    return {
      kind: 'android', title: 'Instale o Faro no celular', text: 'Use o menu do navegador para instalar.',
      steps: [['dots', 'Toque no menu do navegador'], ['plus', 'Toque em Instalar app ou Adicionar à tela inicial'], ['phone', 'Abra o Faro pelo novo ícone']],
    };
  }
  return {
    kind: 'desktop', title: 'O Faro é um app de celular', text: 'Abra este endereço no celular do motorista e instale o Faro pela tela inicial.',
    steps: [['phone', 'Abra este link no celular'], ['plus', 'Instale pelo menu do navegador'], ['phone', 'Abra o Faro pelo ícone']], copy: true,
  };
}

export class InstallGate extends React.Component {
  constructor(props) {
    super(props);
    this.state = { canPrompt: props.prompt.canPrompt(), installedNow: props.prompt.installedNow(), copied: false, failed: false };
  }
  componentDidMount() { this.off = this.props.prompt.subscribe(() => this.setState({ canPrompt: this.props.prompt.canPrompt(), installedNow: this.props.prompt.installedNow() })); }
  componentWillUnmount() { if (this.off) this.off(); clearTimeout(this.timer); }
  install = async () => { const r = await this.props.prompt.prompt(); if (r === 'unavailable') this.setState({ failed: true }); };
  copy = async () => {
    try { await navigator.clipboard.writeText(location.href); this.setState({ copied: true }); clearTimeout(this.timer); this.timer = setTimeout(() => this.setState({ copied: false }), 2300); } catch { this.setState({ failed: true }); }
  };
  render() {
    const t = themeOf(this.props.theme || 'noturno'), c = installCopy(this.props.info, this.state.canPrompt, this.state.installedNow);
    const btn = { height: 60, borderRadius: 30, border: 'none', background: t.gold, color: t.goldInk, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', width: '100%' };
    return h('main', { 'aria-label': 'Instalar o Faro', style: { position: 'fixed', inset: 0, background: t.bg, color: t.ink, fontFamily: "'Manrope',system-ui,sans-serif", WebkitFontSmoothing: 'antialiased', overflowY: 'auto' } },
      h('div', { style: { minHeight: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', background: t.heroBg, color: '#fff', padding: 'calc(env(safe-area-inset-top,0px) + 56px) 26px calc(36px + env(safe-area-inset-bottom,0px))', boxSizing: 'border-box' } },
        h('div', { style: { fontFamily: "'Unbounded'", fontSize: 34, fontWeight: 700, letterSpacing: 2, display: 'flex', alignItems: 'baseline' } }, 'F', h('span', { style: { position: 'relative' } }, 'Λ', h('span', { style: { position: 'absolute', left: '50%', bottom: 3, transform: 'translateX(-50%)', width: 7, height: 7, borderRadius: '50%', background: t.gold } })), 'RO'),
        h('div', { style: { flex: 1 } }),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h('h1', { style: { margin: 0, fontFamily: "'Bricolage Grotesque'", fontSize: 36, lineHeight: 1.05, fontWeight: 700, letterSpacing: -1.2, textWrap: 'pretty' } }, c.title),
          h('p', { style: { margin: 0, fontSize: 16, lineHeight: 1.5, opacity: 0.82, textWrap: 'pretty' } }, c.text)),
        c.steps.length ? h('ol', { style: { listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 } },
          c.steps.map(([icon, text], i) => h('li', { key: i, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)' } },
            h('span', { style: { width: 38, height: 38, flex: 'none', borderRadius: 12, background: t.goldSoft, color: t.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ICONS[icon]()),
            h('span', { style: { fontSize: 14, fontWeight: 600, lineHeight: 1.35 } }, `${i + 1}. ${text}`)))) : null,
        h('div', { style: { height: 28 } }),
        c.install ? h('button', { onClick: this.install, style: btn }, 'Instalar o Faro') : null,
        c.copy ? h('button', { onClick: this.copy, style: { ...btn, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.3)' } }, this.state.copied ? 'Link copiado' : 'Copiar link') : null,
        this.state.failed ? h('p', { role: 'alert', style: { margin: '14px 0 0', fontSize: 14, fontWeight: 700, color: t.gold } }, c.install ? 'Não deu para abrir a instalação. Use o menu do navegador e toque em Instalar app.' : 'Não deu para copiar. Copie o endereço na barra do navegador.') : null));
  }
}
