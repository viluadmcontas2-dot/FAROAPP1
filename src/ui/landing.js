// Landing de venda (fora do app instalado): promessa, preço e "Assinar e começar". Os passos de instalar só aparecem
// depois de uma assinatura ativa ou em teste. Sem atalho de produção: o modo instalado é decidido em boot.js.
import React from 'react';
import { themeOf } from './theme.js';
import { InstallGate } from './install-gate.js';
import { AuthForm } from './landing-auth.js';

const h = React.createElement;
const ACCESS = ['active', 'trialing'];
const sleep = (ms, set) => new Promise(ok => { set(setTimeout(ok, ms)); });

export class Landing extends React.Component {
  constructor(props) {
    super(props);
    const q = new URLSearchParams(props.search || '');
    this.flow = q.get('faro_cobranca'); // 'retorno' | 'cancelada' | null
    this.state = {
      user: null, sub: null, phase: 'home', mode: 'criar', intent: 'subscribe', email: '', password: '', busy: false, msg: null,
      notice: this.flow === 'cancelada' ? 'Pagamento cancelado. Você pode tentar de novo.' : null,
    };
    this.run = 0; this.dead = false;
  }
  get billing() { return !!this.props.backend.billingEnabled; }
  componentDidMount() {
    const { backend } = this.props;
    if (!this.billing) return;
    this.off = backend.onAuthChange(() => this.onAuth());
    this.ready = backend.restore().catch(() => null).then(() => {
      if (this.dead) return;
      const user = backend.getUser();
      this.setState({ user });
      if (this.flow === 'retorno') {
        if (user) this.verify();
        else this.setState({ phase: 'auth', mode: 'entrar', intent: 'login', msg: { ok: true, text: 'Entre na sua conta para confirmar a assinatura.' } });
      } else if (user) this.peek(user);
    });
  }
  componentWillUnmount() { this.dead = true; this.run += 1; clearTimeout(this.timer); if (this.off) this.off(); }

  // a conta mudou: nada da anterior fica na tela
  onAuth() {
    if (this.dead) return;
    const user = this.props.backend.getUser();
    if ((user && user.id) === (this.state.user && this.state.user.id)) return;
    this.run += 1;
    this.setState({ user, sub: null, password: '', msg: null, notice: null, busy: false, phase: this.state.phase === 'auth' ? 'auth' : 'home' });
  }
  hasAccess(user = this.state.user, sub = this.state.sub) { return !!(user && sub && sub.uid === user.id && ACCESS.includes(sub.status)); }
  async load(user) { const s = await this.props.backend.fetchSubscription(); return { ...s, uid: user.id }; }

  async peek(user) { // quem já assina e abre a landing vê o instalar
    const my = ++this.run;
    try { const sub = await this.load(user); if (this.dead || my !== this.run) return; this.setState({ sub, phase: this.hasAccess(user, sub) ? 'active' : 'home' }); } catch { /* segue na landing */ }
  }
  async verify() {
    const my = ++this.run, user = this.props.backend.getUser();
    const { every: pollEvery = 1500, total: pollTotal = 20000 } = this.props.poll || {};
    this.setState({ phase: 'verifying', msg: null });
    const end = Date.now() + pollTotal;
    for (;;) {
      try {
        const sub = await this.load(user);
        if (this.dead || my !== this.run) return;
        this.setState({ sub });
        if (this.hasAccess(user, sub)) { this.setState({ phase: 'active' }); return; }
      } catch { if (this.dead || my !== this.run) return; }
      if (Date.now() >= end) { this.setState({ phase: 'pending' }); return; }
      await sleep(pollEvery, t => { this.timer = t; });
      if (this.dead || my !== this.run) return;
    }
  }

  subscribe = async () => {
    if (!this.billing || this.state.busy) return;
    await this.ready;
    const user = this.props.backend.getUser();
    if (!user) { this.setState({ phase: 'auth', mode: 'criar', intent: 'subscribe', msg: null, notice: null }); return; }
    await this.checkout(user);
  };
  async checkout(user) {
    const my = this.run;
    this.setState({ busy: true, msg: null, notice: null });
    try {
      const sub = await this.load(user); // quem já assina não paga de novo
      if (this.dead || my !== this.run) return;
      if (this.hasAccess(user, sub)) { this.setState({ sub, phase: 'active', busy: false }); return; }
      await this.props.backend.startCheckout();
      if (!this.dead) this.setState({ busy: false });
    } catch (err) {
      if (!this.dead && my === this.run) this.setState({ busy: false, phase: 'home', msg: { ok: false, text: (err && err.message) || 'Não deu para abrir a assinatura. Tente de novo.' } });
    }
  }
  goLogin = () => this.setState({ phase: 'auth', mode: 'entrar', intent: 'login', msg: null, notice: null });
  back = () => this.setState({ phase: 'home', msg: null, password: '' });
  switchMode = () => this.setState(s => ({ mode: s.mode === 'criar' ? 'entrar' : 'criar', msg: null, password: '' }));
  set = key => e => this.setState({ [key]: e.target.value, msg: null });
  signOut = async () => { try { await this.props.backend.signOut(); } catch { /* segue */ } this.run += 1; this.setState({ user: null, sub: null, phase: 'home', msg: null, notice: null, password: '' }); };
  submit = async e => {
    if (e && e.preventDefault) e.preventDefault();
    const { backend } = this.props, { mode, email, password, intent, busy } = this.state;
    if (busy) return;
    this.setState({ busy: true, msg: null });
    try {
      if (mode === 'criar') {
        await backend.signUp({ email, password });
        this.setState({ busy: false, mode: 'entrar', password: '', msg: { ok: true, text: `Enviamos um link para ${String(email).trim().toLowerCase()}. Abra o e-mail para confirmar e depois toque em Entrar e continuar.` } });
        return;
      }
      await backend.signIn({ email, password });
    } catch (err) { this.setState({ busy: false, msg: { ok: false, text: (err && err.message) || 'Não deu certo. Tente de novo.' } }); return; }
    const user = backend.getUser();
    this.setState({ user, password: '', busy: false });
    try {
      const sub = await this.load(user);
      if (this.hasAccess(user, sub)) { this.setState({ sub, phase: 'active' }); return; }
      this.setState({ sub });
    } catch (err) { this.setState({ phase: 'home', msg: { ok: false, text: (err && err.message) || 'Não deu para conferir a assinatura. Tente de novo.' } }); return; }
    if (intent === 'subscribe') await this.checkout(user);
    else this.setState({ phase: 'home', notice: 'Você entrou. Falta assinar para instalar o Faro.' });
  };

  render() {
    const { info, prompt } = this.props, s = this.state;
    const t = themeOf(this.props.theme || 'noturno');
    if (s.phase === 'active' && this.hasAccess()) return h(InstallGate, { info, prompt, theme: this.props.theme, badge: 'Assinatura ativa', share: true, onSwitch: this.signOut });
    const btn = { height: 60, borderRadius: 30, border: 'none', background: t.gold, color: t.goldInk, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', width: '100%' };
    const ghost = { ...btn, height: 52, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.3)' };
    const off = !this.billing;
    const note = (m, role) => h('p', { role, style: { margin: '0 0 14px', fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: m.ok === false ? '#FFB4A8' : t.gold } }, m.text);
    let body;
    if (s.phase === 'verifying') body = [h('h1', { key: 'h', style: H1 }, 'Confirmando sua assinatura'), h('p', { key: 'p', role: 'status', style: P }, 'Isso leva alguns segundos. Não feche esta tela.')];
    else if (s.phase === 'pending') body = [h('h1', { key: 'h', style: H1 }, 'Quase lá'), h('p', { key: 'p', role: 'status', style: P }, 'Ainda não recebemos a confirmação do pagamento. Toque em Verificar de novo.'),
      h('div', { key: 'b', style: { height: 24 } }), h('button', { key: 'v', onClick: () => this.verify(), style: btn }, 'Verificar de novo')];
    else if (s.phase === 'auth') body = [
      h('h1', { key: 'h', style: { ...H1, fontSize: 30 } }, s.mode === 'criar' ? 'Crie sua conta' : 'Entre na sua conta'),
      h('div', { key: 'm', style: { height: 14 } }),
      s.msg ? h('div', { key: 'n' }, note(s.msg, s.msg.ok ? 'status' : 'alert')) : null,
      h(AuthForm, { key: 'f', t, mode: s.mode, state: s, set: this.set, busy: s.busy, submit: this.submit, labels: { primary: btn } }),
      h('div', { key: 's', style: { display: 'flex', gap: 10, marginTop: 12 } },
        h('button', { type: 'button', onClick: this.switchMode, style: { ...ghost, height: 48 } }, s.mode === 'criar' ? 'Já tenho conta' : 'Criar conta nova'),
        h('button', { type: 'button', onClick: this.back, style: { ...ghost, height: 48 } }, 'Voltar'))];
    else body = [
      h('h1', { key: 'h', style: H1 }, 'Veja o lucro de verdade do seu dia'),
      h('p', { key: 'p', style: P }, 'Anote o que entrou e o que saiu em segundos. O Faro mostra quanto sobrou de verdade.'),
      h('p', { key: 'price', style: { margin: '14px 0 0', fontSize: 16, fontWeight: 800, lineHeight: 1.4 } }, '2 dias de teste, sem cartão, depois R$ 22,99/mês. Cancele quando quiser.'),
      off ? null : h('p', { key: 'cup', style: { margin: '6px 0 0', fontSize: 14, opacity: 0.8 } }, 'Tem cupom? Digite na tela de pagamento.'),
      h('div', { key: 'sp', style: { height: 24 } }),
      s.notice ? h('p', { key: 'no', role: 'status', style: { margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: t.gold } }, s.notice) : null,
      s.msg ? h('div', { key: 'er' }, note(s.msg, s.msg.ok ? 'status' : 'alert')) : null,
      off ? h('button', { key: 'a', disabled: true, 'aria-disabled': true, style: { ...btn, opacity: 0.6, cursor: 'default' } }, 'A assinatura abre em breve')
        : h('button', { key: 'a', onClick: this.subscribe, disabled: s.busy, style: btn }, 'Assinar e começar'),
      off || s.user ? null : h('button', { key: 'l', onClick: this.goLogin, style: { ...ghost, marginTop: 10 } }, 'Já tenho conta'),
      s.user ? h('div', { key: 'u', style: { marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 14 } },
        h('span', { style: { opacity: 0.8, overflowWrap: 'anywhere' } }, s.user.email), h('button', { onClick: this.signOut, style: { ...ghost, width: 'auto', height: 44, padding: '0 16px', fontSize: 14 } }, 'Trocar de conta')) : null];
    return h('main', { 'aria-label': 'Faro', style: { position: 'fixed', inset: 0, background: t.bg, color: t.ink, fontFamily: "'Manrope',system-ui,sans-serif", WebkitFontSmoothing: 'antialiased', overflowY: 'auto' } },
      h('div', { style: { minHeight: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', background: t.heroBg, color: '#fff', padding: 'calc(env(safe-area-inset-top,0px) + 40px) 26px calc(28px + env(safe-area-inset-bottom,0px))', boxSizing: 'border-box' } },
        h('div', { style: { fontFamily: "'Unbounded'", fontSize: 34, fontWeight: 700, letterSpacing: 2, display: 'flex', alignItems: 'baseline' } }, 'F', h('span', { style: { position: 'relative' } }, 'Λ', h('span', { style: { position: 'absolute', left: '50%', bottom: 3, transform: 'translateX(-50%)', width: 7, height: 7, borderRadius: '50%', background: t.gold } })), 'RO'),
        h('div', { style: { flex: 1, minHeight: 24 } }), ...body));
  }
}
const H1 = { margin: 0, fontFamily: "'Bricolage Grotesque'", fontSize: 36, lineHeight: 1.05, fontWeight: 700, letterSpacing: -1.2, textWrap: 'pretty' };
const P = { margin: '12px 0 0', fontSize: 16, lineHeight: 1.5, opacity: 0.82, textWrap: 'pretty' };
