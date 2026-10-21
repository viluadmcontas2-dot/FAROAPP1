// Componente raiz do FARO: liga a interface (view.gen.js) ao estado real.
// - Dados: lê o store (src/data/store.js) e despacha ações do núcleo (src/core/actions.js). Nada de dado de mentira.
// - Contas e números: tudo sai de `calc` (src/core/calc.js); as telas (vals*.js) só formatam.
// - Aqui fica só o estado EFÊMERO de tela: tela atual, folha aberta, aviso, rascunho do fechamento e do onboarding.
import React from 'react';
import { View } from './view.gen.js';
import { getStore } from '../data/store.js';
import { reduce } from '../core/actions.js';
import { calc, occ as occOf, streak as streakOf } from '../core/calc.js';
import { todayISO } from '../core/dates.js';
import { R } from '../core/money.js';
import { themeOf } from './theme.js';
import { SCREEN_NAV } from './kit.js';
import { indexFaro } from './derive.js';
import { homeVals, planVals } from './vals.js';
import { billsVals, remindVals, carVals, journeyVals, contaVals } from './vals-secondary.js';
import { decideAccess, isBlocked } from '../data/access.js';
import { contaActions, newContaState } from './conta-actions.js';
import { onboardingVals, closeVals, sheetVals, keypadVals, newOnboardingDraft, onboardingPayload, newCloseDraft } from './vals-forms.js';

const TOAST_MS = 2300;
const GUARD_MS = 600; // janela em que um toque repetido na mesma ação é ignorado (duplo toque)
const SCROLL_HINT_MIN_PX = 90;
const ONBOARDING_SCREEN = 'onb';

const NEW_SHEET = { open: false, type: 'in', digits: '', plat: 'uber', cat: 'Combustível', adding: false, newName: '', newIcon: '', editId: null };
const NEW_BILL = { name: '', icon: 'ph-lightbulb', color: '#F2B544', cat: 'casa', due: 28 };

const INTRO = {
  plan: ['ph-fill ph-target', 'Seu plano do mês', 'A meta nasce das suas contas. Edite quanto quer guardar e gastar; o resto o Faro calcula sozinho.'],
  bills: ['ph-fill ph-receipt', 'Todas as contas num lugar só', 'Carro, casa e cartão. O Faro avisa 2 dias antes; quando pagar, toque em "Paguei".'],
  car: ['ph-fill ph-car-profile', 'Quanto custa cada km', 'Combustível, desgaste e aluguel viram R$/km. Mudou algo no carro? Toque em Ajustar.'],
  journey: ['ph-fill ph-fire', 'Sua Jornada', 'Cada dia fechado conta. Suba de nível e melhore seu Índice Faro com constância e lucro por km.'],
  remind: ['ph-fill ph-bell-ringing', 'Você não precisa lembrar de nada', 'Escolha aqui o que o Faro te avisa e quando.'],
};
const IMPORT_ERRORS = { formato: 'Esse arquivo não é um backup do Faro.', tamanho: 'O arquivo é grande demais para ser um backup.', json: 'Não consegui ler o arquivo.', versao: 'Esse backup é de outra versão do Faro.' };

const readCloud = cloud => ({
  configured: !!(cloud && cloud.backend && cloud.backend.configured),
  user: cloud && cloud.backend ? cloud.backend.getUser() : null,
  status: cloud && cloud.sync ? cloud.sync.getStatus().status : 'idle',
});

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.store = props.store || getStore();
    const app = this.store.getState();
    this.state = {
      app, screen: 'home', prev: 'home', onbStep: 0, ob: newOnboardingDraft(app), period: 'dia', billFilter: 'todas', wfOpen: false,
      cl: newCloseDraft(app, todayISO()), sh: NEW_SHEET, nb: NEW_BILL, toast: null, more: false, cloud: readCloud(props.cloud), contaMsg: null, ct: newContaState(props.cloud),
    };
  }

  conta = contaActions(this);
  scRef = React.createRef();
  guards = new Set();

  componentDidMount() {
    this.unsubscribe = [this.store.subscribe(app => this.setState({ app }))];
    const { cloud } = this.props;
    if (cloud) {
      this.seenUser = cloud.backend.getUser() ? cloud.backend.getUser().id : null;
      this.unsubscribe.push(cloud.sync.subscribe(this.refreshCloud), cloud.backend.onAuthChange(this.refreshCloud));
      this.conta.start();
    }
    // ao voltar para o app em outro dia, "hoje" muda
    this.onVisible = () => { if (document.visibilityState === 'visible') this.forceUpdate(); };
    document.addEventListener('visibilitychange', this.onVisible);
    this.hintTimer = setTimeout(() => this.checkScroll(), 400);
  }

  componentDidUpdate() {
    if (this.lastScreen !== this.state.screen) {
      this.lastScreen = this.state.screen;
      if (this.scRef.current) this.scRef.current.scrollTop = 0;
    }
    this.checkScroll();
  }

  componentWillUnmount() {
    clearTimeout(this.toastTimer);
    clearTimeout(this.hintTimer);
    this.conta.stop();
    this.unsubscribe.forEach(fn => fn());
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  checkScroll() {
    const el = this.scRef.current;
    if (!el) return;
    const more = el.scrollHeight - el.clientHeight - el.scrollTop > SCROLL_HINT_MIN_PX;
    if (more !== this.state.more) this.setState({ more });
  }

  // conta/nuvem mudou: relê o estado e, se trocou de usuário, confere a assinatura de novo
  refreshCloud = () => {
    const next = readCloud(this.props.cloud);
    this.setState({ cloud: next });
    const id = next.user ? next.user.id : null;
    if (id !== this.seenUser) { const prev = this.seenUser; this.seenUser = id; this.conta.onUser(prev, id); }
  };

  // ---- ações de UI (o que o usuário toca)
  set = o => this.setState(o);
  patch = (name, o) => this.setState(st => ({ [name]: { ...st[name], ...o } }));
  flash = message => {
    clearTimeout(this.toastTimer);
    this.setState({ toast: message });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), TOAST_MS);
  };
  // true na primeira chamada de cada chave; ignora o toque repetido por GUARD_MS (o núcleo também é idempotente)
  once = key => {
    if (this.guards.has(key)) return false;
    this.guards.add(key);
    setTimeout(() => this.guards.delete(key), GUARD_MS);
    return true;
  };
  today = () => todayISO();
  // despacha no núcleo e devolve quantos XP a ação rendeu
  act = action => {
    const before = this.store.getState().xp;
    this.store.dispatch(action);
    return this.store.getState().xp - before;
  };
  go = screen => {
    if (SCREEN_NAV.includes(screen) && !this.store.getState().seen[screen]) this.act({ type: 'seen/mark', payload: { screen } });
    this.setState(st => ({ screen, prev: st.screen }));
  };
  openSheet = (type, extra) => this.patch('sh', { open: true, type, digits: '', editId: null, adding: false, ...extra });
  closeSheet = () => this.patch('sh', { open: false, adding: false, editId: null, digits: '' });
  openClose = () => this.setState({ screen: 'close', cl: newCloseDraft(this.store.getState(), this.today()) });
  openSummary = () => this.setState({ screen: 'close', cl: { ...newCloseDraft(this.store.getState(), this.today()), step: 2 } });

  closeDay = payload => {
    if (!this.once('close-day')) return;
    const gain = this.act({ type: 'day/close', payload });
    const rec = this.store.getState().recs[this.today()];
    if (!rec || !rec.closed) return;
    this.patch('cl', { step: 2 });
    this.flash(gain ? `Dia fechado · +${gain} XP` : 'Dia atualizado');
  };
  payBill = (oid, message) => {
    if (!this.once('pay:' + oid)) return;
    const gain = this.act({ type: 'bill/pay', payload: { oid } });
    this.flash(message || (gain ? `Conta paga · +${gain} XP` : 'Conta paga'));
  };
  unpayBill = oid => { if (this.once('unpay:' + oid)) this.act({ type: 'bill/unpay', payload: { oid } }); };
  saveEntry = (action, message) => {
    if (!this.once('entry')) return;
    this.act(action);
    this.closeSheet();
    this.setState({ screen: 'home', period: 'dia' });
    this.flash(message);
  };
  removeEntry = id => {
    const old = this.store.getState().exps.find(e => e.id === id);
    if (!old || !this.once('remove:' + id)) return;
    this.act({ type: 'entry/remove', payload: { id } });
    this.closeSheet();
    this.flash(`${old.cat} removido`);
  };
  createBill = p => {
    if (!this.once('bill-create')) return;
    this.act({ type: 'bill/create', payload: p });
    this.closeSheet();
    this.setState({ screen: 'bills' });
    this.flash(`${p.name} criada · meta recalculada`);
  };
  addSource = (name, icon, then) => {
    if (!name || !this.once('source:' + name)) return;
    this.act({ type: 'source/add', payload: { name, icon } });
    const added = this.store.getState().sources.find(x => x.name === name);
    if (added) then(added.k);
    this.flash(`${name} adicionada`);
  };
  addExpenseCategory = (name, icon, then) => {
    if (!name || !this.once('expcat:' + name)) return;
    this.act({ type: 'expcat/add', payload: { name, icon } });
    then();
    this.flash(`${name} adicionada`);
  };
  finishOnboarding = () => {
    if (!this.once('onboarding')) return;
    this.act({ type: 'onboarding/complete', payload: onboardingPayload(this.state.ob) });
    this.setState({ screen: 'home', onbStep: 0, ob: newOnboardingDraft(this.store.getState()) });
    this.flash('Seu Faro está pronto');
  };

  // ---- backup (a tela Conta completa vem na tarefa 6; o backup local já funciona aqui)
  exportBackup = () => {
    try {
      const url = URL.createObjectURL(new Blob([this.store.exportBackup()], { type: 'application/json' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: `faro-backup-${this.today()}.json` });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.setState({ contaMsg: { ok: true, text: 'Backup salvo no seu aparelho.' } });
    } catch {
      this.setState({ contaMsg: { ok: false, text: 'Não deu para salvar o backup. Tente de novo.' } });
    }
  };
  importBackupFile = async input => {
    const file = input.files && input.files[0];
    if (!file) return;
    const text = await file.text().catch(() => null);
    input.value = ''; // permite escolher o mesmo arquivo de novo
    if (typeof text !== 'string') { this.setState({ contaMsg: { ok: false, text: IMPORT_ERRORS.json } }); return; }
    if (this.store.getState().onboarded && !window.confirm('Trocar os dados deste aparelho pelos do backup?')) return;
    const res = this.store.importBackup(text);
    this.setState({ contaMsg: res.ok ? { ok: true, text: 'Backup restaurado.' } : { ok: false, text: IMPORT_ERRORS[res.error] || IMPORT_ERRORS.formato } });
  };

  render() {
    const { ui, app } = this.viewModel();
    return View({ ...this.props, ...this.buildVals(ui, app) });
  }

  // Estado de tela + estado do app. No onboarding, o app mostrado é uma prévia (estado + escolhas do rascunho).
  viewModel() {
    const ui = this.state, today = this.today();
    const access = this.access();
    const screen = access.blocked ? 'conta' : !ui.app.onboarded && ui.screen !== 'conta' ? ONBOARDING_SCREEN : ui.screen;
    const app = screen === ONBOARDING_SCREEN ? reduce(ui.app, { type: 'onboarding/complete', payload: onboardingPayload(ui.ob) }, { today }) : ui.app;
    return { ui: { ...ui, screen, access }, app };
  }

  // Paywall: só bloqueia com a cobrança ligada. Enquanto confere sessão/assinatura, `checking` mostra uma tela neutra (nunca o app).
  access() {
    const { cloud, ct } = this.state, backend = this.props.cloud && this.props.cloud.backend;
    const billing = !!(backend && backend.billingEnabled);
    if (!billing) return { billing, blocked: false, checking: false, decision: decideAccess({ billingEnabled: false }) };
    const checking = !ct.restored || (!!cloud.user && ct.sub === undefined);
    const decision = decideAccess({ billingEnabled: true, user: cloud.user, subscription: ct.sub });
    return { billing, checking, decision, blocked: checking || isBlocked(decision) };
  }

  buildVals(ui, app) {
    const today = this.today(), t = themeOf(app.theme), C = calc(app, today);
    // contas que venceram antes de o motorista começar a usar o Faro não contam como atrasadas (as já pagas continuam)
    const occ = occOf(app, today).filter(o => o.paid || !app.onboardedAt || o.date >= app.onboardedAt);
    const pend = occ.filter(o => !o.paid).sort((a, b) => a.date.localeCompare(b.date));
    const k = {
      app, C, t, ui, today, occ, pend, idx: indexFaro(app, C, occ), streakNow: streakOf(app, today), cloud: ui.cloud,
      cloudApi: this.props.cloud, conta: this.conta, version: this.props.version || '', calcOf: s => calc(s, today), set: this.set, patch: this.patch, act: this.act, go: this.go, openSheet: this.openSheet, openClose: this.openClose, openSummary: this.openSummary,
      closeDay: this.closeDay, payBill: this.payBill, unpayBill: this.unpayBill, saveEntry: this.saveEntry, removeEntry: this.removeEntry, createBill: this.createBill,
      addSource: this.addSource, addExpenseCategory: this.addExpenseCategory, finishOnboarding: this.finishOnboarding, exportBackup: this.exportBackup, importBackupFile: this.importBackupFile,
    };
    const screen = ui.screen, onb = screen === ONBOARDING_SCREEN, sheetOpen = ui.sh.open;
    const sheets = sheetVals(k);
    const showNav = SCREEN_NAV.includes(screen) && !sheetOpen;
    const navItem = (key, icon, label) => ({ cls: (screen === key ? 'ph-fill ' : 'ph ') + icon, label, color: screen === key ? t.accent : t.muted, onClick: () => this.go(key) });
    const intro = INTRO[screen] && !app.introSeen[screen] && !sheetOpen
      ? { show: true, icon: INTRO[screen][0], title: INTRO[screen][1], text: INTRO[screen][2], ok: () => this.act({ type: 'intro/seen', payload: { screen } }) } : { show: false };

    return {
      t,
      isOnb: onb, isHome: screen === 'home', isClose: screen === 'close', isBills: screen === 'bills', isRemind: screen === 'remind', isJourney: screen === 'journey', isPlan: screen === 'plan', isCar: screen === 'car', isConta: screen === 'conta', showNav,
      onb: onboardingVals(k),
      goalStack: [{ icon: 'ph-fill ph-house-line', color: t.cL, label: 'Contas da vida', value: R(C.life) }, { icon: 'ph-fill ph-vault', color: t.pos, label: 'Guardar', value: R(app.save) }, { icon: 'ph-fill ph-smiley', color: t.gold, label: 'Pra gastar com você', value: R(app.spend) }],
      goalTotal: R(C.target),
      skipOnb: () => this.go('conta'), goPlan: () => this.go('plan'), goBills: () => this.go('bills'), goJourney: () => this.go('journey'), goRemind: () => this.go('remind'), goConta: () => this.go('conta'),
      back: () => this.set({ screen: ui.prev && ui.prev !== screen ? ui.prev : 'journey' }),
      editCar: () => this.openSheet('car'),
      openNewBill: () => this.setState(st => ({ sh: { ...st.sh, open: true, type: 'bill', digits: '', editId: null, adding: false }, nb: NEW_BILL })),
      fab: () => (C.todayClosed ? this.openSummary() : this.openClose()),
      ...homeVals(k), pl: planVals(k), bl: billsVals(k), rm: remindVals(k), car: carVals(k), ...journeyVals(k), conta: contaVals(k), cl: closeVals(k), keys: keypadVals(k), ...sheets,
      toast: ui.toast, intro,
      scRef: this.scRef, onScroll: () => this.checkScroll(),
      scrollHint: ui.more && SCREEN_NAV.includes(screen) && !sheetOpen && !intro.show ? this.scrollHint(t) : null,
      navL: [navItem('home', 'ph-house', 'Início'), navItem('plan', 'ph-target', 'Plano')], navR: [navItem('bills', 'ph-receipt', 'Contas'), navItem('car', 'ph-car-profile', 'Carro')],
    };
  }

  scrollHint(t) {
    const style = { position: 'absolute', left: '50%', bottom: 'calc(102px + env(safe-area-inset-bottom, 0px))', zIndex: 21, height: 30, padding: '0 12px', borderRadius: 15, border: `1px solid ${t.line2}`, background: t.nav, color: t.muted, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', animation: 'fbob 1.8s ease-in-out infinite', backdropFilter: 'blur(12px)', fontFamily: 'inherit', boxShadow: '0 8px 20px -10px rgba(0,0,0,.4)' };
    return React.createElement('button', { onClick: () => this.scRef.current && this.scRef.current.scrollBy({ top: 380, behavior: 'smooth' }), style }, React.createElement('i', { className: 'ph-bold ph-caret-down' }), 'role para ver mais');
  }
}
