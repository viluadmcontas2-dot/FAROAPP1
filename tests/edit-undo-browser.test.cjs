// F6 no Chrome real: um caminho de edição, confirmação dentro da UI (sem confirm() nativo) e "Desfazer" por ~8 s.
// Roda direto da raiz do repositório: node tests/edit-undo-browser.test.cjs [raiz]
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) {
  console.log('SKIP FARO editar com desfazer: Chrome não encontrado (defina FARO_CHROME_BIN).');
  process.exit(0);
}

const failures = [];
const check = (label, condition, detail) => {
  if (condition) console.log('  ok   ' + label);
  else { failures.push(label); console.log('  FAIL ' + label + (detail === undefined ? '' : ' -> ' + JSON.stringify(detail))); }
};

const helpers = `
  const app = window.__vettaApp;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const $ = id => document.getElementById(id);
  // Visível de verdade: o ponto central do elemento pertence a ele (nada da camada superior por cima).
  const onTop = el => {
    if (!el || !el.isConnected || el.closest('.hidden')) return false;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 30));
    return Boolean(hit && (el === hit || el.contains(hit)));
  };
  const openMoney = async (tab = 'bills') => { app.showView('planning'); window.FaroPlanning.openMoney(tab); await wait(350); };
  const closeAll = async () => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden')); await wait(60); };
  window.__nativeConfirm = 0; window.__nativeAlert = 0;
  window.confirm = () => { window.__nativeConfirm += 1; return true; };
  window.alert = () => { window.__nativeAlert += 1; };
`;

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const faro = await openFaro(root);
  try {
    const run = body => faro.evaluate(`(async () => { ${helpers} ${body} })()`);
    // Fora do modo instalado o app fica atrás do portão de instalação; o teste mede o produto.
    await run(`
      document.getElementById('faroInstallGate')?.style.setProperty('display', 'none', 'important');
      document.documentElement.dataset.faroActivationStage = 'product';
      // Simula o app instalado: o portão deixa o produto inerte no navegador comum.
      document.querySelectorAll('[data-faro-install-locked]').forEach(el => { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); delete el.dataset.faroInstallLocked; });
      document.body.style.overflow = '';
      app.state.onboardingComplete = true;
      app.state.costs = [
        { id:'c-sem-data', name:'Seguro', category:'obligation', kind:'monthly', value:200, active:true },
        { id:'c-aluguel', name:'Aluguel do carro', category:'obligation', kind:'monthly', value:900, dueDay:10, active:true },
        { id:'r-pneus', name:'Pneus', category:'reserve', kind:'monthly', value:150, active:true }
      ];
      app.state.reserveContributions = [{ id:'ap-1', reserveId:'r-pneus', date:app.todayKey(), amount:300, createdAt:new Date().toISOString() }];
      app.state.records = [{ date:app.todayKey(), gross:300, km:120, hours:8 }];
      app.save(); app.render(); return true;`);

    // 1. Conta sem vencimento: Editar visível na Central, abre o editor único e salva.
    const a = await run(`
      await openMoney('bills');
      const btn = document.querySelector('#faroMoneyDialog [data-faro-edit-cost="c-sem-data"]');
      const visibleBtn = onTop(btn); const label = btn?.textContent.trim();
      btn?.click(); await wait(500);
      const sheet = document.querySelector('#costModal .modal-sheet');
      const modalOnTop = onTop(sheet); const name = $('costName').value;
      $('costName').value = 'Seguro do carro'; $('saveCostButton').click(); await wait(500);
      const saved = app.state.costs.find(c => c.id === 'c-sem-data')?.name;
      const undoVisible = onTop($('faroUndoBar')); const undoText = $('faroUndoAction')?.textContent.trim();
      $('faroUndoAction')?.click(); await wait(200);
      const restored = app.state.costs.find(c => c.id === 'c-sem-data')?.name;
      await closeAll();
      return { visibleBtn, label, modalOnTop, name, saved, undoVisible, undoText, restored };`);
    check('conta sem vencimento tem "Editar" visível na Central', a.visibleBtn && a.label === 'Editar', a);
    check('editor de conta abre visível (não atrás da Central)', a.modalOnTop && a.name === 'Seguro', a);
    check('salvar edição grava e oferece "Desfazer"', a.saved === 'Seguro do carro' && a.undoVisible && a.undoText === 'Desfazer', a);
    check('"Desfazer" restaura a edição', a.restored === 'Seguro', a);

    // 2. Suspeita da auditoria: "Editar" da lista antiga (dentro da Central) abria o modal atrás do <dialog>.
    const b = await run(`
      await openMoney('bills');
      const legacy = $('faroMoneyLegacyCosts'); if (legacy) legacy.open = true;
      document.querySelector('#costList [data-cost-action="edit"][data-cost-id="c-aluguel"]').click(); await wait(500);
      const onTopNow = onTop(document.querySelector('#costModal .modal-sheet'));
      await closeAll(); return { onTopNow };`);
    check('editar pela lista antiga também abre visível', b.onTopNow, b);

    // 3. Excluir conta: folha na UI, nada nativo, e "Desfazer" devolve a conta.
    const c = await run(`
      await openMoney('bills');
      document.querySelector('#faroMoneyDialog [data-faro-delete-cost="c-aluguel"]').click(); await wait(300);
      const sheetOnTop = onTop($('faroConfirmSheet')?.querySelector('.faro-confirm-panel'));
      const accept = $('faroConfirmAccept')?.textContent.trim();
      const stillThere = app.state.costs.some(x => x.id === 'c-aluguel');
      $('faroConfirmAccept').click(); await wait(400);
      const gone = !app.state.costs.some(x => x.id === 'c-aluguel');
      const undoVisible = onTop($('faroUndoBar'));
      $('faroUndoAction').click(); await wait(300);
      const back = app.state.costs.find(x => x.id === 'c-aluguel');
      await closeAll();
      return { sheetOnTop, accept, stillThere, gone, undoVisible, back:back ? back.name + '|' + back.dueDay : null };`);
    check('excluir abre folha de confirmação visível com "Excluir conta"', c.sheetOnTop && c.accept === 'Excluir conta' && c.stillThere, c);
    check('excluir + desfazer restaura a conta inteira', c.gone && c.undoVisible && c.back === 'Aluguel do carro|10', c);

    // 4. Reserva: editar pelo mesmo editor; "Remover aporte" ≠ "Excluir reserva", ambos com desfazer.
    const d = await run(`
      await openMoney('reserves');
      const edit = document.querySelector('#faroMoneyDialog [data-faro-edit-cost="r-pneus"]');
      const editLabel = edit?.textContent.trim(); edit?.click(); await wait(500);
      const modalOnTop = onTop(document.querySelector('#costModal .modal-sheet')); const name = $('costName').value;
      $('costValue').value = '180'; $('saveCostButton').click(); await wait(500);
      const value = app.state.costs.find(x => x.id === 'r-pneus')?.value;
      await closeAll(); await openMoney('reserves');
      const details = document.querySelector('#faroMoneyDialog .faro-r3b2-reserve-details'); if (details) details.open = true;
      const remove = document.querySelector('#faroMoneyDialog [data-r3-reserve-remove="ap-1"]');
      const removeLabel = remove?.textContent.trim(); remove?.click(); await wait(300);
      const removeAccept = $('faroConfirmAccept')?.textContent.trim(); $('faroConfirmAccept')?.click(); await wait(400);
      const contribGone = !app.state.reserveContributions.some(x => x.id === 'ap-1');
      $('faroUndoAction')?.click(); await wait(300);
      const contribBack = app.state.reserveContributions.some(x => x.id === 'ap-1');
      const del = document.querySelector('#faroMoneyDialog [data-faro-delete-cost="r-pneus"]');
      const delLabel = del?.textContent.trim(); del?.click(); await wait(300);
      const delAccept = $('faroConfirmAccept')?.textContent.trim(); $('faroConfirmAccept')?.click(); await wait(400);
      const reserveGone = !app.state.costs.some(x => x.id === 'r-pneus');
      $('faroUndoAction')?.click(); await wait(300);
      const reserveBack = app.state.costs.some(x => x.id === 'r-pneus') && app.state.reserveContributions.some(x => x.id === 'ap-1');
      await closeAll();
      return { editLabel, modalOnTop, name, value, removeLabel, removeAccept, contribGone, contribBack, delLabel, delAccept, reserveGone, reserveBack };`);
    check('reserva tem "Editar reserva" e abre o editor visível', d.editLabel === 'Editar reserva' && d.modalOnTop && d.name === 'Pneus' && d.value === 180, d);
    check('"Remover aporte" confirma na UI e desfaz', d.removeLabel === 'Remover aporte' && d.removeAccept === 'Remover aporte' && d.contribGone && d.contribBack, d);
    check('"Excluir reserva" confirma na UI e desfaz tudo', d.delLabel === 'Excluir reserva' && d.delAccept === 'Excluir reserva' && d.reserveGone && d.reserveBack, d);

    // 5. Excluir um dia pelo Histórico (botão do app.js) também vira folha + desfazer.
    const e = await run(`
      app.showView('history'); app.render(); await wait(200);
      const btn = document.querySelector('[data-action="delete"][data-date="' + app.todayKey() + '"]');
      btn?.click(); await wait(300);
      const accept = $('faroConfirmAccept')?.textContent.trim(); $('faroConfirmAccept')?.click(); await wait(400);
      const gone = !app.state.records.some(r => r.date === app.todayKey());
      $('faroUndoAction')?.click(); await wait(300);
      const back = app.state.records.some(r => r.date === app.todayKey());
      return { found:Boolean(btn), accept, gone, back };`);
    check('excluir dia: folha "Excluir dia" e desfazer', e.found && e.accept === 'Excluir dia' && e.gone && e.back, e);

    const n = await run(`return { confirm: window.__nativeConfirm, alert: window.__nativeAlert };`);
    check('nenhum confirm()/alert() nativo foi chamado', n.confirm === 0 && n.alert === 0, n);
  } finally {
    await faro.close();
  }
  if (failures.length) { console.log(`FAIL FARO editar com desfazer: ${failures.length} falha(s).`); process.exit(1); }
  console.log('PASS FARO editar com desfazer (Chrome real).');
})().catch(error => { console.error(error); process.exit(1); });
