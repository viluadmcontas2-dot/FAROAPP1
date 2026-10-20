// Tela Plano no Chrome real, um estado de conta por vez, com SDK falso (nenhuma chamada real, sem confirm()).
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) { console.log('SKIP FARO plano: Chrome não encontrado.'); process.exit(0); }

const DAY = 86400000;
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'faro-plans-'));
  let browser;
  try {
    for (const item of await fs.readdir('.')) {
      if (item.startsWith('.') || item === '_site' || item === 'faro-account.js' || item === 'faro-config.js') continue;
      await fs.symlink(path.resolve(item), path.join(root, item));
    }
    await fs.writeFile(path.join(root, 'faro-account.js'), (await fs.readFile('faro-account.js', 'utf8')).replace("'./vendor/supabase-js-2.112.3.mjs'", "'./fake-sdk.js'"));
    // Só no teste: a flag vem do cenário. O arquivo real continua com billingEnabled: false.
    await fs.writeFile(path.join(root, 'faro-config.js'), (await fs.readFile('faro-config.js', 'utf8')).replace('billingEnabled: false', "billingEnabled: localStorage.getItem('test-billing') === '1'"));
    await fs.writeFile(path.join(root, 'fake-sdk.js'), `
      const sc = JSON.parse(localStorage.getItem('plan-scenario') || '{}');
      export const createClient = () => {
        const session = sc.session ? { user:{ id:'teste', email:'teste@example.test', is_anonymous:false } } : null;
        const query = table => ({ select(){return this},eq(){return this},upsert(){return this},
          then(resolve){resolve({data:null,error:null})},
          async maybeSingle(){ if (table==='faro_subscriptions') return {data:sc.sub||null,error:null};
            return {data:table==='faro_state'?{state:window.__vettaApp.state,revision:1}:null}; },
          async single(){return {data:{revision:1}}} });
        return { from:query,
          rpc: async name => { window.testRpc=name; return { data: sc.trialDays==null ? null : new Date(Date.now()+sc.trialDays*${DAY}).toISOString(), error:null }; },
          auth:{ async getSession(){return {data:{session}}}, onAuthStateChange(){}, async signOut(){return {error:null}} },
          functions:{ invoke: async (name, options) => { window.testInvoke={name,options}; return { data:{ url:'#faro-teste-'+name }, error:null }; } } };
      };`);
    browser = await openFaro(root);
    await browser.command('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true });" });
    const run = body => browser.evaluate(`(async()=>{const app=window.__vettaApp;const el=id=>document.getElementById(id);${body}})()`);
    const scenario = async (sc, billing = false, kind = sc.session ? null : 'anon') => {
      await run(`localStorage.setItem('plan-scenario', ${JSON.stringify(JSON.stringify(sc))});localStorage.setItem('test-billing','${billing ? 1 : 0}');localStorage.removeItem('faro-promo-code-v1');`);
      await browser.command('Page.reload', {});
      for (let i = 0; i < 60; i += 1) {
        await browser.sleep(150);
        const ok = await browser.evaluate(`Boolean(window.FaroAccount && document.getElementById('faroPlan') && document.getElementById('faroPlan').dataset.ready==='1' && (${JSON.stringify(kind)} ? document.getElementById('faroPlan').dataset.state===${JSON.stringify(kind)} : document.getElementById('faroPlan').dataset.state!=='anon'))`).catch(() => false);
        if (ok) break;
      }
      await run(`window.nativeConfirms=0;window.confirm=()=>{window.nativeConfirms++;return true};app.showView('more');`);
    };
    // 320 px: a Conta (com a seção de plano) nunca rola na horizontal, em cada estado.
    const noOverflow = async label => {
      await browser.command('Emulation.setDeviceMetricsOverride', { width: 320, height: 640, deviceScaleFactor: 1, mobile: true });
      const r = await run(`document.getElementById('faroInstallGate')?.style.setProperty('display','none','important');document.documentElement.dataset.faroActivationStage='product';app.state.onboardingComplete=true;app.save();app.render();app.navigateToPrimary('more');if(el('faroPlanCodeBox').hidden)el('faroPlanCodeToggle').click();await new Promise(r=>setTimeout(r,200));const w=document.documentElement.clientWidth;return {sw:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),w};`);
      await browser.command('Emulation.clearDeviceMetricsOverride', {});
      if (process.env.DBG) console.log(label, JSON.stringify(r));
      assert.ok(r.sw <= r.w, 'rolagem horizontal a 320px em ' + label + ': ' + JSON.stringify(r));
    };
    const state = () => run(`const p=el('faroPlan');return {kind:p.dataset.state,title:el('faroSubscriptionTitle').textContent,badge:el('faroPlanBadge').hidden?'':el('faroPlanBadge').textContent,label:el('faroSubscriptionAction').textContent,disabled:el('faroSubscriptionAction').disabled,exportShown:!el('faroPlanExport').hidden,readOnly:!el('faroPlanReadOnly').hidden,ro:document.documentElement.dataset.faroReadOnly||'',timeline:!el('faroPlanTimeline').hidden};`);

    // 1. Sem conta: convida a criar conta (1 passo), cobrança não aparece.
    await scenario({ session: false });
    let s = await state();
    assert.equal(s.kind, 'anon'); assert.equal(s.title, 'Um plano. Tudo liberado.'); assert.equal(s.label, 'Testar 7 dias grátis');
    await noOverflow('anon');
    assert.equal(s.disabled, false); assert.equal(s.timeline, true);
    assert.equal(await run(`return el('faroPlanTimeline').textContent.includes('Dia 6: a gente avisa') && el('faroPlanTimeline').textContent.includes('Dia 8: você escolhe');`), true);
    await run(`el('faroSubscriptionAction').click();`);
    assert.equal(await run(`return !el('faroAccountModal').classList.contains('hidden') && !el('faroCreateAccount').classList.contains('hidden') && !window.testInvoke;`), true, 'abre o cadastro, sem cobrança');

    // 2. Trial vigente, cobrança desligada.
    await scenario({ session: true, trialDays: 5 });
    s = await state();
    assert.equal(s.kind, 'trial'); assert.equal(s.badge, 'Faltam 5 dias'); assert.equal(s.label, 'Em breve'); assert.equal(s.disabled, true);
    await noOverflow('trial');
    assert.equal(await run(`return window.testRpc;`), 'faro_my_trial_ends_at');

    // 3. Trial acabando.
    await scenario({ session: true, trialDays: 1.5 });
    s = await state();
    assert.equal(s.kind, 'trial-ending'); assert.equal(s.title, 'Seu teste acaba em 2 dias'); assert.equal(s.badge, 'Faltam 2 dias');
    await noOverflow('trial-ending');

    // 4. Trial acabou, cobrança desligada: nada trava, exportar visível.
    await scenario({ session: true, trialDays: -1 });
    s = await state();
    assert.equal(s.kind, 'expired'); assert.equal(s.exportShown, true); assert.equal(s.readOnly, false); assert.equal(s.ro, ''); assert.equal(s.label, 'Em breve');
    await noOverflow('expired');

    // 5. Trial acabou com cobrança ligada (só neste teste): modo leitura, exportar e assinar.
    await scenario({ session: true, trialDays: -1 }, true);
    s = await state();
    assert.equal(s.readOnly, true); assert.equal(s.ro, 'on'); assert.equal(s.label, 'Assinar FARO'); assert.equal(s.disabled, false);
    await noOverflow('leitura');
    assert.equal(await run(`let n=0;const o=app.exportData;app.exportData=function(){n++};el('faroPlanExport').click();app.exportData=o;return n;`), 1);
    await run(`el('faroSubscriptionAction').click();`); await browser.sleep(200);
    assert.equal(await run(`return window.testInvoke?.name+'|'+location.hash;`), 'criar-checkout-faro|#faro-teste-criar-checkout-faro');

    // 6. Assinante: gerenciar pelo portal.
    await scenario({ session: true, trialDays: -3, sub: { status: 'active', stripe_customer_id: 'cus_teste', current_period_end: new Date(Date.now() + 20 * DAY).toISOString() } }, true);
    s = await state();
    assert.equal(s.kind, 'subscriber'); assert.equal(s.label, 'Gerenciar assinatura'); assert.equal(s.ro, '');
    await noOverflow('subscriber');
    await run(`el('faroSubscriptionAction').click();`); await browser.sleep(200);
    assert.equal(await run(`return window.testInvoke?.name;`), 'abrir-portal-faro');

    // 7. Código digitado (não por link): PRAGAS mostra R$ 14,90 e economia R$ 40,45.
    await scenario({ session: true, trialDays: 5 });
    await run(`el('faroPlanCodeToggle').click();el('faroPlanCode').value='pragas';el('faroPlanCodeSave').click();`);
    assert.deepEqual(await run(`return [el('faroPlanAmount').textContent,el('faroPlanSave').hidden,el('faroPlanSave').textContent.includes('R$ 40,45'),el('faroPlanCodeToggle').textContent,el('faroPlanCodeHelp').textContent.includes('Adicionar código promocional')];`),
      ['R$ 14,90', false, true, 'Trocar cupom', true]);
    await noOverflow('codigo');
    assert.equal(await run(`return window.nativeConfirms;`), 0);
    console.log('PASS Chrome plano: sem conta, trial, trial acabando, trial vencido (com e sem cobrança), assinante e código PRAGAS.');
  } finally { await browser?.close(); await fs.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
