// Comportamento real no Chrome: editar um dia nunca perde dado (F1) e salvar dá um único retorno (F2).
// Roda direto da raiz do repositório (sem build): node tests/day-edit-safety-browser.test.cjs [raiz]
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) {
  // Sem Chrome não há como provar comportamento de navegador; o aviso fica explícito, nunca silencioso.
  console.log('SKIP FARO edição segura do dia: Chrome não encontrado (defina FARO_CHROME_BIN).');
  process.exit(0);
}

const failures = [];
const check = (label, condition, detail) => {
  if (condition) console.log('  ok   ' + label);
  else { failures.push(label); console.log('  FAIL ' + label + (detail === undefined ? '' : ' -> ' + JSON.stringify(detail))); }
};

// Funções executadas dentro da página: simulam o motorista tocando e digitando.
const pageHelpers = `
  const app = window.__vettaApp;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  // Visibilidade lógica do app (classe .hidden / atributo hidden): o CSS remoto (Tailwind CDN) não carrega no teste offline.
  const visible = el => Boolean(el && el.isConnected && !el.closest('.hidden') && !el.closest('[hidden]'));
  const type = (el, value) => { el.value = String(value); el.dispatchEvent(new Event('input', { bubbles:true })); el.dispatchEvent(new Event('change', { bubbles:true })); };
  const field = id => document.getElementById(id);
  const source = key => document.querySelector('[data-faro-earning-source="' + key + '"]');
  const typeEarning = (key, value) => {
    const card = document.querySelector('[data-faro-earning-card="' + key + '"]');
    if (card?.dataset.active !== 'true') document.querySelector('[data-faro-earning-toggle="' + key + '"]').click();
    type(source(key), value);
  };
  const dateKey = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const form = () => ({
    date: field('recordDate').value, km: field('recordKm').value, hours: field('recordHours').value, fuel: field('recordFuel').value,
    uber: source('uber').value, ninetyNine: source('ninetyNine').value, indrive: source('indrive').value, extras: source('extras').value
  });
  const record = date => { const r = app.state.records.find(item => item.date === date); return r ? { gross:r.gross, km:r.km, hours:r.hours, fuelSpend:r.fuelSpend, earningsBySource:r.earningsBySource || null } : null; };
  const save = async () => { field('saveDayButton').click(); await wait(450); };
  const openFromHome = async () => { app.showView('dashboard'); document.querySelector('#view-dashboard [data-view="day"]').click(); await wait(80); };
`;

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const faro = await openFaro(root);
  try {
    const run = body => faro.evaluate(`(async () => { ${pageHelpers} ${body} })()`);

    await run(`app.state.onboardingComplete = true; app.state.records = []; app.save(); localStorage.removeItem('faro-record-draft-v1'); app.render(); return true;`);

    // Cenário B: trocar a data para um dia que já tem registro.
    const b = await run(`
      const old = dateKey(-2);
      await openFromHome();
      type(field('recordDate'), old);
      typeEarning('uber', 300); type(field('recordKm'), 120); type(field('recordHours'), 9);
      await save();
      const before = record(old);
      await openFromHome();
      typeEarning('uber', 50); type(field('recordKm'), 10);
      type(field('recordDate'), old);
      await wait(50);
      const warning = document.getElementById('faroDateConflict');
      const warningText = warning ? warning.textContent.replace(/\\s+/g, ' ').trim() : '';
      const warningVisible = visible(warning);
      await save();
      const afterBlockedSave = record(old);
      const openButton = document.querySelector('[data-faro-conflict="open"]');
      openButton?.click();
      await wait(50);
      return { old, before, warningText, warningVisible, afterBlockedSave, formAfterOpen: form(), warningVisibleAfterOpen: visible(warning) };
    `);
    check('B: registro antigo foi salvo', b.before && b.before.gross === 300 && b.before.km === 120, b.before);
    check('B: aviso "Esse dia já tem registro. Abrir e editar?" aparece', b.warningVisible && b.warningText.includes('Esse dia já tem registro. Abrir e editar?'), b.warningText);
    check('B: salvar sem confirmar NÃO sobrescreve o dia antigo', b.afterBlockedSave && b.afterBlockedSave.gross === 300 && b.afterBlockedSave.km === 120 && b.afterBlockedSave.hours === 9, b.afterBlockedSave);
    check('B: "Abrir e editar" carrega o dia salvo', b.formAfterOpen.uber === '300' && b.formAfterOpen.km === '120' && b.formAfterOpen.hours === '9' && b.formAfterOpen.date === b.old, b.formAfterOpen);
    check('B: aviso some depois de abrir o dia', !b.warningVisibleAfterOpen);

    // Cenário A: "Revisar meu dia" depois de salvar abre preenchido; editar um ganho não apaga o resto.
    const a = await run(`
      const today = app.todayKey();
      field('clearDayButton').click();
      await openFromHome();
      type(field('recordDate'), today);
      typeEarning('uber', 180); typeEarning('ninetyNine', 120); type(field('recordKm'), 80); type(field('recordHours'), 8); type(field('recordFuel'), 50);
      await save();
      const saved = record(today);
      const homeLabel = document.querySelector('#view-dashboard [data-view="day"] strong')?.textContent || '';
      await openFromHome();
      const reopened = form();
      typeEarning('uber', 200);
      await save();
      return { today, saved, homeLabel, reopened, afterEdit: record(today) };
    `);
    check('A: dia de hoje salvo com 2 apps', a.saved && a.saved.gross === 300 && a.saved.km === 80, a.saved);
    check('A: Início oferece "Revisar meu dia"', a.homeLabel.includes('Revisar meu dia'), a.homeLabel);
    check('A: "Revisar meu dia" abre o formulário PREENCHIDO', a.reopened.uber === '180' && a.reopened.ninetyNine === '120' && a.reopened.km === '80' && a.reopened.hours === '8' && a.reopened.fuel === '50' && a.reopened.date === a.today, a.reopened);
    check('A: mudar só a Uber mantém 99, km, horas e combustível', a.afterEdit && a.afterEdit.gross === 320 && a.afterEdit.km === 80 && a.afterEdit.hours === 8 && a.afterEdit.fuelSpend === 50 && a.afterEdit.earningsBySource?.ninetyNine === 120 && a.afterEdit.earningsBySource?.uber === 200, a.afterEdit);

    // Cenário C (F2): um único retorno depois de salvar, falando de lucro, com ações claras.
    const c = await run(`
      await openFromHome();
      typeEarning('extras', 30); type(field('recordKm'), 80);
      field('saveDayButton').click();
      await wait(60);
      const banner = document.getElementById('faroDaySaved');
      const modal = document.getElementById('faroDailyResult');
      const toast = document.getElementById('toast');
      const text = banner ? banner.textContent.replace(/\\s+/g, ' ').trim() : '';
      const buttons = banner ? [...banner.querySelectorAll('button')].filter(visible).map(el => el.textContent.trim()) : [];
      const net = app.recordNumbers(app.state.records.find(r => r.date === app.todayKey()), app.monthContext(app.parseDate(app.todayKey()))).net;
      const feedback = { banner: visible(banner), modal: visible(modal), toast: visible(toast), view: app.currentView, text, buttons, netText: app.money(net) };
      await wait(450);
      [...(banner?.querySelectorAll('button') || [])].find(el => el.textContent.trim() === 'Editar dia')?.click();
      await wait(80);
      return { ...feedback, afterEditView: app.currentView, afterEditForm: form() };
    `);
    check('C: modal antigo de resultado não aparece', !c.modal);
    check('C: aviso rápido duplicado do núcleo não aparece', !c.toast);
    check('C: um único retorno visível', c.banner, c);
    check('C: retorno fala do lucro líquido do dia', /Lucro de hoje/.test(c.text) && c.text.includes(c.netText), c.text);
    check('C: retorno não mistura bruto com líquido', !/brut/i.test(c.text) && !/líquid/i.test(c.text), c.text);
    check('C: ação "Editar dia" disponível', c.buttons.includes('Editar dia'), c.buttons);
    check('C: "Editar dia" abre o dia preenchido', c.afterEditView === 'day' && c.afterEditForm.extras === '30' && c.afterEditForm.uber === '200', { view:c.afterEditView, form:c.afterEditForm });
  } finally {
    await faro.close();
  }
  if (failures.length) {
    console.error('FAIL FARO edição segura do dia: ' + failures.length + ' falha(s).');
    process.exitCode = 1;
  } else {
    console.log('PASS FARO edição segura do dia: Revisar preenchido, troca de data protegida e retorno único.');
  }
})().catch(error => {
  console.error('FAIL FARO edição segura do dia:', error);
  process.exitCode = 1;
});
