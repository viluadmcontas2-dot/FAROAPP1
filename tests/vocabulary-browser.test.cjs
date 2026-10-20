// F7 no Chrome real: varre o texto VISÍVEL das 6 telas (+ Central, editor de conta) e falha com termo proibido ou botão em CAIXA ALTA.
// Roda da raiz: node tests/vocabulary-browser.test.cjs [raiz]
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');
const { find, isShouting } = require('./helpers/vocabulary.cjs');

if (!findChrome()) { console.log('SKIP FARO vocabulário: Chrome não encontrado (defina FARO_CHROME_BIN).'); process.exit(0); }

const scan = `
  const visible = el => el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
  const scan = root => {
    const texts = [], shouts = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode, e = n.parentElement; if (n.textContent.trim() && e && visible(e) && !e.closest('script,style')) texts.push(n.textContent.trim().replace(/\\s+/g, ' ')); }
    root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(e => { if (visible(e)) for (const a of ['aria-label','title','placeholder']) if (e.getAttribute(a)) texts.push(e.getAttribute(a)); });
    root.querySelectorAll('button,[role=button],summary,a.btn').forEach(b => { if (visible(b)) shouts.push((b.innerText || '').trim().replace(/\\s+/g, ' ')); });
    return { texts, shouts };
  };
`;

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const faro = await openFaro(root);
  const failures = [];
  try {
    await faro.evaluate(`(async () => { const app = window.__vettaApp;
      document.getElementById('faroInstallGate')?.style.setProperty('display', 'none', 'important');
      document.documentElement.dataset.faroActivationStage = 'product';
      document.querySelectorAll('[data-faro-install-locked]').forEach(el => { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); delete el.dataset.faroInstallLocked; });
      app.state.onboardingComplete = true;
      app.state.costs = [{ id:'c1', name:'Seguro', category:'obligation', kind:'monthly', value:200, dueDay:10, active:true }, { id:'r1', name:'Pneus', category:'reserve', kind:'monthly', value:150, active:true }];
      app.state.reserveContributions = [{ id:'a1', reserveId:'r1', date:app.todayKey(), amount:300, createdAt:new Date().toISOString() }];
      app.state.records = [{ date:app.todayKey(), gross:300, km:120, hours:8 }, { date:'2026-10-19', gross:250, km:100, hours:7 }];
      app.save(); app.render(); })()`);
    const steps = [
      ['Início', `window.__vettaApp.navigateToPrimary('dashboard')`, '#view-dashboard'],
      ['Dia', `window.__vettaApp.navigateToPrimary('day')`, '#view-day'],
      ['Histórico', `window.__vettaApp.navigateToPrimary('history')`, '#view-history'],
      ['Planejar', `window.__vettaApp.navigateToPrimary('planning')`, '#view-planning'],
      ['Reservas e contas', `window.__vettaApp.navigateToPrimary('planning'); window.FaroPlanning.openMoney('bills')`, '#faroMoneyDialog'],
      ['Reservas', `window.FaroPlanning.openMoney('reserves')`, '#faroMoneyDialog'],
      ['Editor de conta', `document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.FaroEdit.editCost('c1')`, '#costModal'],
      ['Conta (Central)', `document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden')); window.__vettaApp.navigateToPrimary('more')`, '#view-more']
    ];
    for (const [name, action, selector] of steps) {
      const result = await faro.evaluate(`(async () => { ${scan} ${action}; await new Promise(r => setTimeout(r, 600));
        const el = document.querySelector(${JSON.stringify(selector)}); return el ? scan(el) : null; })()`);
      if (!result) { failures.push(`${name}: área ${selector} não encontrada`); continue; }
      const found = new Set();
      for (const t of result.texts) for (const hit of find(t)) found.add(`"${hit}" em "${t.slice(0, 60)}"`);
      const caps = result.shouts.filter(isShouting);
      console.log(`  ${name}: ${result.texts.length} textos, ${result.shouts.length} botões, ${found.size} proibidos, ${caps.length} em CAIXA ALTA`);
      for (const f of found) failures.push(`${name}: termo proibido ${f}`);
      for (const c of new Set(caps)) failures.push(`${name}: botão em CAIXA ALTA "${c}"`);
    }
  } finally { await faro.close(); }
  if (failures.length) { console.log('FALHOU:\n' + failures.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log('vocabulário no navegador: OK');
})().catch(e => { console.error(e); process.exit(1); });
