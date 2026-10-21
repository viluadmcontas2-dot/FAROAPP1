// Ações da tela Conta: entrar, criar conta, sair, resolver conflito, assinatura e aviso de nova versão.
// Recebe o componente raiz (`app`) só para ler props/estado e chamar setState/flash. A tela em si fica em vals-secondary.js + template.
import { SW_UPDATE_EVENT } from '../pwa/register.js';

const SUB_CACHE = 'faro-sub-cache-v1';
const readCache = uid => { try { const c = JSON.parse(window.localStorage.getItem(SUB_CACHE) || 'null'); return c && c.uid === uid ? c.sub : null; } catch { return null; } };
const writeCache = (uid, sub) => { try { window.localStorage.setItem(SUB_CACHE, JSON.stringify({ uid, sub })); } catch { /* sem armazenamento */ } };

export const newContaState = cloud => ({
  auth: { mode: 'entrar', email: '', password: '', show: false, busy: false, msg: null },
  sub: undefined, confirm: null, swApply: null, restored: !(cloud && cloud.ready), busy: false, trialWarned: false,
});

export function contaActions(app) {
  const cloud = () => app.props.cloud;
  const setCt = o => app.setState(st => ({ ct: { ...st.ct, ...o } }));
  const setAuth = o => app.setState(st => ({ ct: { ...st.ct, auth: { ...st.ct.auth, ...o } } }));
  const say = (ok, text) => app.setState({ contaMsg: { ok, text } });
  let seq = 0;

  const loadSub = async () => {
    const c = cloud();
    if (!c || !c.backend.billingEnabled) return;
    const user = c.backend.getUser();
    if (!user) { setCt({ sub: undefined }); return; }
    const my = ++seq;
    try {
      const sub = await c.backend.fetchSubscription();
      if (my !== seq) return;
      writeCache(user.id, sub);
      setCt({ sub });
    } catch {
      if (my !== seq) return;
      const cached = readCache(user.id); // sem internet: vale a última assinatura conhecida (o período dela continua sendo conferido)
      setCt({ sub: cached ? { ...cached, stale: true } : { status: 'inactive', error: true } });
    }
  };

  return {
    loadSub,
    start() {
      const c = cloud();
      this.onSw = e => setCt({ swApply: e && e.detail && typeof e.detail.apply === 'function' ? e.detail.apply : null });
      window.addEventListener(SW_UPDATE_EVENT, this.onSw);
      if (c && c.ready && typeof c.ready.then === 'function') { c.ready.then(() => { setCt({ restored: true }); app.refreshCloud(); }, () => setCt({ restored: true })); }
      loadSub();
    },
    stop() { window.removeEventListener(SW_UPDATE_EVENT, this.onSw); seq += 1; },
    // chamado quando a conta muda (entrou/saiu): confere a assinatura de novo
    onUser(prevId, id) { if (prevId !== id) { setCt({ sub: undefined, confirm: null }); loadSub(); } },

    setAuth, setCt,
    setField: key => e => setAuth({ [key]: e.target.value, msg: null }),
    toggleShow: () => app.setState(st => ({ ct: { ...st.ct, auth: { ...st.ct.auth, show: !st.ct.auth.show } } })),
    switchMode: () => app.setState(st => ({ ct: { ...st.ct, auth: { ...st.ct.auth, mode: st.ct.auth.mode === 'entrar' ? 'criar' : 'entrar', msg: null, password: '' } } })),

    async submit(e) {
      if (e && e.preventDefault) e.preventDefault();
      const { backend } = cloud();
      const { mode, email, password, busy } = app.state.ct.auth;
      if (busy) return;
      setAuth({ busy: true, msg: null });
      try {
        if (mode === 'entrar') {
          await backend.signIn({ email, password });
          setAuth({ busy: false, password: '', show: false, msg: null });
          app.flash('Você entrou na conta');
        } else {
          await backend.signUp({ email, password });
          setAuth({ busy: false, mode: 'entrar', password: '', msg: { ok: true, text: `Enviamos um link para ${String(email).trim().toLowerCase()}. Abra o e-mail para confirmar e depois toque em Entrar.` } });
        }
      } catch (err) {
        setAuth({ busy: false, msg: { ok: false, text: (err && err.message) || 'Não deu certo. Tente de novo.' } });
      }
    },
    async forgot() {
      const { backend } = cloud();
      const { email, busy } = app.state.ct.auth;
      if (busy) return;
      setAuth({ busy: true, msg: null });
      try {
        await backend.resetPassword(email);
        setAuth({ busy: false, msg: { ok: true, text: `Enviamos o link para criar uma nova senha em ${String(email).trim().toLowerCase()}.` } });
      } catch (err) {
        setAuth({ busy: false, msg: { ok: false, text: (err && err.message) || 'Não deu para enviar agora. Tente de novo.' } });
      }
    },
    async signOut() {
      const { backend, sync } = cloud();
      let clean = true;
      try { ({ clean } = await sync.flush()); } catch { clean = false; }
      if (!clean && !window.confirm('Há mudanças que ainda não subiram para a nuvem. Elas ficam guardadas neste aparelho. Sair da conta mesmo assim?')) return;
      try { await backend.signOut(); app.setState({ contaMsg: null }); app.flash('Você saiu da conta'); } catch (err) { say(false, (err && err.message) || 'Não deu para sair agora. Tente de novo.'); }
    },

    askResolve: choice => setCt({ confirm: choice }),
    cancelResolve: () => setCt({ confirm: null }),
    async doResolve() {
      const { sync } = cloud();
      const choice = app.state.ct.confirm;
      if (!choice) return;
      setCt({ confirm: null });
      try {
        if (choice === 'cloud') await sync.usarNuvem(); else await sync.usarEsteAparelho();
        app.flash(choice === 'cloud' ? 'Dados da nuvem mantidos' : 'Dados deste aparelho enviados');
      } catch { say(false, 'Não deu para concluir. Seus dados continuam salvos neste aparelho. Tente de novo.'); }
    },

    async checkout() { try { await cloud().backend.startCheckout(); } catch (err) { say(false, (err && err.message) || 'Não deu para abrir a assinatura. Tente de novo.'); } },
    async portal() { try { await cloud().backend.openPortal(); } catch (err) { say(false, (err && err.message) || 'Não deu para abrir a assinatura. Tente de novo.'); } },
    retrySub: () => { setCt({ sub: undefined }); loadSub(); },
    applyUpdate() { const fn = app.state.ct.swApply; if (fn) try { fn(); } catch { /* o aviso nunca derruba o app */ } },
  };
}
