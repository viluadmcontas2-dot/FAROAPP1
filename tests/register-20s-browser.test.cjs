// F3 no Chrome real: registrar o dia em ~20 s e no máximo 4 toques de botão (mockup 4 "Registrar dia").
// Roda direto da raiz do repositório (sem build): node tests/register-20s-browser.test.cjs [raiz]
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) {
  console.log('SKIP FARO registrar em 20 s: Chrome não encontrado (defina FARO_CHROME_BIN).');
  process.exit(0);
}

const failures = [];
const check = (label, condition, detail) => {
  if (condition) console.log('  ok   ' + label);
  else { failures.push(label); console.log('  FAIL ' + label + (detail === undefined ? '' : ' -> ' + JSON.stringify(detail))); }
};

// Funções que rodam dentro da página. Os toques passam pela interface de verdade (chips, teclado, botões).
const pageHelpers = `
  const app = window.__vettaApp;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const visible = el => Boolean(el && el.isConnected && !el.closest('.hidden') && !el.closest('[hidden]'));
  const text = el => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : '');
  const field = id => document.getElementById(id);
  const type = (el, value) => { el.value = String(value); el.dispatchEvent(new Event('input', { bubbles:true })); el.dispatchEvent(new Event('change', { bubbles:true })); };
  const source = key => document.querySelector('[data-faro-earning-source="' + key + '"]');
  const chip = key => document.querySelector('[data-faro-source-chip="' + key + '"]');
  const key = k => document.querySelector('[data-faro-key="' + k + '"]');
  const addButton = () => document.getElementById('faroEarningAdd');
  const message = () => document.getElementById('faroEarningMessage');
  const display = () => document.getElementById('faroEarningDisplay');
  const dateKey = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  let taps = 0;
  const tap = el => { if (!el) throw new Error('botão ausente'); taps += 1; el.click(); };
  const typeDigits = digits => { for (const d of digits) key(d).click(); };
  const record = date => { const r = app.state.records.find(item => item.date === date); return r ? JSON.parse(JSON.stringify(r)) : null; };
  const openFromHome = async () => { app.showView('dashboard'); document.querySelector('#view-dashboard [data-view="day"]').click(); await wait(80); };
  const savedBanner = () => document.getElementById('faroDaySaved');
  const savedButton = label => [...(savedBanner()?.querySelectorAll('button') || [])].filter(visible).find(el => el.textContent.trim() === label);
`;

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const faro = await openFaro(root);
  try {
    const run = body => faro.evaluate(`(async () => { ${pageHelpers} ${body} })()`);

    // Ontem rodou 150 km: o km de hoje já vem preenchido com esse valor.
    await run(`
      const yesterday = dateKey(-1);
      app.state.onboardingComplete = true;
      app.state.records = [{ id:'day-' + yesterday, date:yesterday, gross:400, km:150, hours:8, fuelSpend:0, earningsBySource:{ uber:400, ninetyNine:0, indrive:0, extras:0 }, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }];
      app.save(); localStorage.removeItem('faro-record-draft-v1'); app.render(); return true;`);

    // 1) Tela pronta: data de hoje sem pedir, km do último dia, chips, teclado e estado vazio.
    const ready = await run(`
      await openFromHome();
      const chips = [...document.querySelectorAll('[data-faro-source-chip]')];
      const keys = [...document.querySelectorAll('[data-faro-key]')].map(el => el.dataset.faroKey);
      return {
        date: field('recordDate').value, today: app.todayKey(),
        dateInputVisible: visible(field('recordDate')),
        dateSummary: text(document.getElementById('faroDateSummary')),
        km: field('recordKm').value,
        sameAsYesterday: text(document.getElementById('faroKmSame')),
        sameVisible: visible(document.getElementById('faroKmSame')),
        chips: chips.map(el => el.textContent.trim()), checked: chips.filter(el => el.getAttribute('aria-checked') === 'true').map(el => el.dataset.faroSourceChip),
        role: chips[0]?.getAttribute('role'),
        keys, display: text(display()), question: text(document.getElementById('faroEarningQuestion')),
        empty: text(document.getElementById('faroEarningList')),
        saveLabel: text(field('saveDayButton')),
        oldCards: document.querySelectorAll('[data-faro-earning-card]').length
      };
    `);
    check('1: data de hoje por padrão', ready.date === ready.today, ready.date);
    check('1: campo de data não é pedido (resumo "Hoje")', !ready.dateInputVisible && /^Hoje/.test(ready.dateSummary) && ready.dateSummary.includes('Trocar data'), ready.dateSummary);
    check('1: km já vem com o valor do último dia', ready.km === '150', ready.km);
    check('1: ação "Igual a ontem" disponível', ready.sameVisible && ready.sameAsYesterday === 'Igual a ontem', ready.sameAsYesterday);
    check('1: chips Uber, 99, inDrive, Extras como escolha única', JSON.stringify(ready.chips) === JSON.stringify(['Uber', '99', 'inDrive', 'Extras']) && ready.role === 'radio' && ready.checked.length === 1, ready);
    check('1: teclado próprio com 00, 0 e Apagar', ['1','2','3','4','5','6','7','8','9','00','0','del'].every(k => ready.keys.includes(k)), ready.keys);
    check('1: valor começa em R$ 0,00 e pergunta pelo app', /R\$\s0,00/.test(ready.display) && ready.question === 'Quanto entrou em Uber?', [ready.display, ready.question]);
    check('1: estado vazio convida a agir', ready.empty.includes('Nenhum ganho ainda') && ready.empty.includes('Adicionar'), ready.empty);
    check('1: botão principal é "Salvar dia"', ready.saveLabel === 'Salvar dia', ready.saveLabel);
    check('1: um só lugar para digitar dinheiro (sem cartões com campo por app)', ready.oldCards === 0, ready.oldCards);

    // 2) Erros junto do campo, dizendo o que fazer.
    const errors = await run(`
      addButton().click();
      const addError = { text: text(message()), visible: visible(message()), inSection: Boolean(message()?.closest('#faroEarningsBySource')) };
      const toastBefore = visible(field('toast'));
      field('saveDayButton').click(); await wait(60);
      const saveError = text(message());
      return { addError, saveError, toast: toastBefore || visible(field('toast')), records: app.state.records.length };
    `);
    check('2: "Adicionar" sem valor mostra o erro do mockup junto do teclado', errors.addError.visible && errors.addError.inSection && errors.addError.text === 'Digite um valor no teclado antes de adicionar.', errors.addError);
    check('2: "Salvar dia" sem ganho explica o que fazer', errors.saveError === 'Sem ganho não há o que salvar. Adicione pelo menos um app.', errors.saveError);
    check('2: erro não vira aviso rápido que some, e nada é salvo', !errors.toast && errors.records === 1, errors);

    // 3) Teclado: 00, 0 e Apagar; o valor aparece em tempo real.
    const pad = await run(`
      typeDigits(['1', '00']); const a = text(display());
      key('del').click(); const b = text(display());
      key('del').click(); key('del').click(); const c = text(display());
      return { a, b, c, messageCleared: !visible(message()) || !text(message()) };
    `);
    check('3: "1" + "00" mostra R$ 1,00', /R\$\s1,00/.test(pad.a), pad.a);
    check('3: "Apagar" tira o último dígito (R$ 0,10)', /R\$\s0,10/.test(pad.b), pad.b);
    check('3: apagar tudo volta a R$ 0,00', /R\$\s0,00/.test(pad.c), pad.c);
    check('3: digitar limpa o erro', pad.messageCleared);

    // 4) Fluxo do mockup: 2 apps + km em no máximo 4 toques de botão, total em tempo real.
    const flow = await run(`
      const start = performance.now();
      typeDigits(['1','8','0','00']); tap(addButton());
      tap(chip('ninetyNine'));
      const question99 = text(document.getElementById('faroEarningQuestion'));
      typeDigits(['1','2','0','00']); tap(addButton());
      const list = text(document.getElementById('faroEarningList'));
      const gross = field('recordGross').value;
      tap(field('saveDayButton'));
      await wait(80);
      const saved = record(app.todayKey());
      return { taps, question99, list, gross, saved, banner: text(savedBanner()), undo: Boolean(savedButton('Desfazer')), ms: performance.now() - start };
    `);
    check('4: pergunta segue o chip escolhido', flow.question99 === 'Quanto entrou em 99?', flow.question99);
    check('4: lista mostra os apps e o "Total do dia" somado', /Uber/.test(flow.list) && /99/.test(flow.list) && /Total do dia/.test(flow.list) && /R\$\s300,00/.test(flow.list), flow.list);
    check('4: um único bruto = soma das plataformas', flow.gross === '300', flow.gross);
    check('4: no máximo 4 toques de botão', flow.taps <= 4, flow.taps);
    check('4: dia salvo com bruto, origem e km de ontem', flow.saved && flow.saved.gross === 300 && flow.saved.km === 150 && flow.saved.earningsBySource.uber === 180 && flow.saved.earningsBySource.ninetyNine === 120, flow.saved);
    check('4: retorno único com lucro e "Desfazer"', /Dia salvo\. Lucro de hoje/.test(flow.banner) && flow.undo, flow.banner);

    // 5) Desfazer um dia novo: o registro sai e o que foi digitado volta para o formulário.
    const undoNew = await run(`
      tap(savedButton('Desfazer')); await wait(120);
      return { saved: record(app.todayKey()), yesterday: Boolean(record(dateKey(-1))), view: app.currentView, uber: source('uber').value, ninetyNine: source('ninetyNine').value, km: field('recordKm').value, banner: visible(savedBanner()) ? text(savedBanner()) : '' };
    `);
    check('5: "Desfazer" remove o dia que acabou de ser criado', undoNew.saved === null && undoNew.yesterday, undoNew);
    check('5: o que foi digitado volta para o formulário', undoNew.view === 'day' && undoNew.uber === '180' && undoNew.ninetyNine === '120' && undoNew.km === '150', undoNew);

    // 6) Valor digitado e não adicionado entra ao salvar (não se perde). Depois, desfazer uma edição volta a versão anterior inteira.
    const undoEdit = await run(`
      tap(field('saveDayButton')); await wait(450);
      const first = record(app.todayKey());
      await openFromHome();
      tap(chip('extras'));
      typeDigits(['5','0','00']);
      tap(field('saveDayButton')); await wait(80);
      const edited = record(app.todayKey());
      tap(savedButton('Desfazer')); await wait(120);
      return { first, edited, restored: record(app.todayKey()) };
    `);
    check('6: valor digitado sem "Adicionar" entra ao salvar', undoEdit.edited && undoEdit.edited.earningsBySource.extras === 50 && undoEdit.edited.gross === 350, undoEdit.edited);
    check('6: "Desfazer" uma edição devolve o registro anterior inteiro', JSON.stringify(undoEdit.restored) === JSON.stringify(undoEdit.first), { first:undoEdit.first, restored:undoEdit.restored });

    // 7) Km: sem km o erro aparece junto do campo; "Igual a ontem" preenche.
    const km = await run(`
      await wait(400);
      localStorage.removeItem('faro-record-draft-v1');
      field('clearDayButton').click();
      type(field('recordDate'), dateKey(-4));
      await wait(30);
      typeDigits(['9','0','00']); tap(addButton());
      type(field('recordKm'), '');
      field('saveDayButton').click(); await wait(60);
      const kmError = document.getElementById('faroKmMessage');
      const out = { error: text(kmError), errorVisible: visible(kmError), saved: record(dateKey(-4)), toast: visible(field('toast')) };
      document.getElementById('faroKmSame').click();
      out.kmAfter = field('recordKm').value;
      out.dateSummary = text(document.getElementById('faroDateSummary'));
      out.sameLabel = text(document.getElementById('faroKmSame'));
      return out;
    `);
    check('7: sem km, erro junto do campo dizendo o que fazer', km.errorVisible && km.error === 'Informe os km rodados nesse dia.' && !km.saved && !km.toast, km);
    check('7: botão de km preenche com o último dia', km.kmAfter === '150', km.kmAfter);
    check('7: outra data aparece no resumo', !/^Hoje/.test(km.dateSummary) && km.dateSummary.includes('Trocar data'), km.dateSummary);

    // 8) Alvos de toque >= 48 px (tolerância de 0,5 px para arredondamento de subpixel) e fonte >= 12 px na área nova.
    const sizes = await run(`
      // O perfil de teste não está instalado: a trava de instalação esconde o app. Para medir, tiramos a trava.
      document.documentElement.removeAttribute('data-faro-activation-stage');
      await wait(30);
      const targets = [...document.querySelectorAll('[data-faro-source-chip], [data-faro-key], #faroEarningAdd, #faroKmSame, #faroDateChange, #faroEarningList button')].filter(visible);
      const small = targets.filter(el => el.getBoundingClientRect().height < 47.5).map(el => (el.id || el.dataset.faroKey || el.dataset.faroSourceChip || el.textContent.trim()) + ':' + el.getBoundingClientRect().height);
      const tinyFont = [...document.querySelectorAll('#faroEarningsBySource *, #faroDateSummary, #faroKmSame, #faroKmMessage')].filter(visible).filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).filter(el => parseFloat(getComputedStyle(el).fontSize) < 12).map(el => el.textContent.trim());
      const shown = id => { const el = document.getElementById(id); return Boolean(el && el.getBoundingClientRect().height > 0); };
      const hiddenLeaks = ['faroDateConflict', 'faroLegacyEarnings', 'faroKmMessage', 'faroEarningMessage'].filter(id => document.getElementById(id)?.classList.contains('hidden') && shown(id));
      const total = document.getElementById('faroEarningsTotalWrap');
      const totalBg = total ? getComputedStyle(total).backgroundImage : 'none';
      return { count: targets.length, small, tinyFont, hiddenLeaks, totalBg };
    `);
    check('8: alvos de toque com pelo menos 48 px', sizes.count > 10 && sizes.small.length === 0, sizes);
    check('8: nenhuma fonte abaixo de 12 px', sizes.tinyFont.length === 0, sizes.tinyFont);
    check('8: avisos marcados como ocultos não aparecem na tela (CSS real)', sizes.hiddenLeaks.length === 0, sizes.hiddenLeaks);
    check('8: total do dia é uma linha da lista, sem cartão escuro', sizes.totalBg === 'none', sizes.totalBg);
  } finally {
    await faro.close();
  }
  if (failures.length) {
    console.error('FAIL FARO registrar em 20 s: ' + failures.length + ' falha(s).');
    process.exitCode = 1;
  } else {
    console.log('PASS FARO registrar em 20 s: teclado próprio, chips, km de ontem, erros no campo e Desfazer.');
  }
})().catch(error => {
  console.error('FAIL FARO registrar em 20 s:', error);
  process.exitCode = 1;
});
