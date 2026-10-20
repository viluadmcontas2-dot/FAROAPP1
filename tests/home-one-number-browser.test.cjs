// F4 — Início com 1 número herói e 1 ação, provado no Chrome real.
// Roda direto da raiz do repositório (sem build): node tests/home-one-number-browser.test.cjs [raiz]
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) {
  console.log('SKIP FARO Início 1 número: Chrome não encontrado (defina FARO_CHROME_BIN).');
  process.exit(0);
}

const failures = [];
const check = (label, condition, detail) => {
  if (condition) console.log('  ok   ' + label);
  else { failures.push(label); console.log('  FAIL ' + label + (detail === undefined ? '' : ' -> ' + JSON.stringify(detail))); }
};

const pageHelpers = `
  const app = window.__vettaApp;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const home = document.getElementById('view-dashboard');
  const details = document.getElementById('faroHomeDetails');
  const clean = text => String(text || '').replace(/\\s+/g, ' ').trim();
  // Visível de verdade para o motorista: fora de .hidden/[hidden] e fora de "Detalhes" fechado.
  const shown = el => Boolean(el && el.isConnected && !el.closest('.hidden') && !el.closest('[hidden]')
    && !(el.closest('details') && !el.closest('details').open && !el.closest('summary') && el !== el.closest('details'))
    && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
  const dateKey = offset => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() + offset); return app.dateKey(d); };
  const day = (date, gross, km) => ({ id:'day-' + date, date, gross, km, hours:8, fuelSpend:0, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
  const setRecords = list => { app.state.records = list.sort((a, b) => a.date.localeCompare(b.date)); app.save(); app.render(); app.showView('dashboard'); };
  const visibleText = () => {
    const walker = document.createTreeWalker(home, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) { const node = walker.currentNode; if (node.parentElement && shown(node.parentElement) && clean(node.textContent)) parts.push(clean(node.textContent)); }
    return parts.join(' | ');
  };
  const primaries = () => [...home.querySelectorAll('[data-faro-primary="true"]')].filter(shown);
  const heroes = () => [...home.querySelectorAll('[data-faro-hero="true"]')].filter(shown);
`;

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const faro = await openFaro(root);
  try {
    const run = body => faro.evaluate(`(async () => { ${pageHelpers} ${body} })()`);
    await run(`app.state.onboardingComplete = true; app.state.targetProfit = 4000; localStorage.removeItem('faro-record-draft-v1'); setRecords([]); return true;`);

    // 1. Sem nenhum registro: estado vazio que convida a agir.
    const empty = await run(`
      await wait(30);
      const keysBefore = Object.keys(localStorage).sort();
      return {
        heroes: heroes().length,
        heroText: clean(heroes()[0]?.textContent),
        primaries: primaries().map(el => clean(el.textContent)),
        primaryIsRegister: primaries()[0]?.matches('[data-view="day"]') || false,
        text: visibleText(),
        keysBefore
      };
    `);
    check('vazio: exatamente 1 número/bloco herói', empty.heroes === 1, empty.heroes);
    check('vazio: herói convida "Registre seu primeiro dia"', /Registre seu primeiro dia/.test(empty.heroText), empty.heroText);
    check('vazio: exatamente 1 ação primária, "Registrar dia"', empty.primaries.length === 1 && /^Registrar dia$/.test(empty.primaries[0]), empty.primaries);
    check('vazio: a ação primária é o botão de registro existente (hook data-view="day")', empty.primaryIsRegister);
    check('vazio: nenhum rótulo "bruto" fora de Detalhes', !/brut/i.test(empty.text), empty.text);

    // 2. Hoje registrado: lucro real de hoje é o herói, vindo do núcleo (recordNumbers).
    const today = await run(`
      const list = [day(dateKey(0), 312, 120)];
      for (let i = 1; i <= 4; i += 1) list.push(day(dateKey(-i), 280, 110));
      setRecords(list);
      await wait(30);
      const record = app.state.records.find(r => r.date === app.todayKey());
      const numbers = app.recordNumbers(record, app.monthContext(app.parseDate(record.date)));
      const hero = heroes()[0];
      const value = hero?.querySelector('[data-faro-hero-value]');
      const style = value ? getComputedStyle(value) : null;
      const cta = primaries()[0];
      const small = [...home.querySelectorAll('#faroHomeHero *, #faroHomeGoal *, #faroHomeStreak *, [data-faro-primary] *')]
        .filter(el => shown(el) && clean(el.textContent) && [...el.childNodes].some(n => n.nodeType === 3 && clean(n.textContent)))
        .filter(el => parseFloat(getComputedStyle(el).fontSize) < 12).map(el => clean(el.textContent));
      return {
        heroes: heroes().length,
        heroText: clean(hero?.textContent),
        valueText: clean(value?.textContent),
        netText: clean(app.money(numbers.net)),
        grossText: clean(app.money(numbers.gross)),
        outText: clean(app.money(numbers.gross - numbers.net)),
        tabular: style ? style.fontVariantNumeric : '',
        primaries: primaries().map(el => clean(el.textContent)),
        ctaHeight: cta ? cta.getBoundingClientRect().height : 0,
        text: visibleText(),
        small,
        streakText: clean(document.getElementById('faroHomeStreak')?.textContent),
        detailsHasLegacy: ['kpiGrossDaily','weekStatusTitle','monthStatusTitle','insightTitle'].every(id => details?.contains(document.getElementById(id))),
        detailsOpen: details?.open,
        detailsSummary: clean(details?.querySelector('summary')?.textContent)
      };
    `);
    check('hoje: exatamente 1 bloco herói', today.heroes === 1, today.heroes);
    check('hoje: herói diz "Lucro real de hoje"', /Lucro real de hoje/i.test(today.heroText), today.heroText);
    check('hoje: número herói = lucro do núcleo (recordNumbers.net)', today.valueText.replace(/\s/g, '') === today.netText.replace(/\s/g, ''), { value:today.valueText, net:today.netText });
    check('hoje: "Entrou R$ X · saiu R$ Y com combustível, taxas e reservas"', today.heroText.includes('Entrou ' + today.grossText) && today.heroText.includes('saiu ' + today.outText) && /combustível, taxas e reservas/.test(today.heroText), today.heroText);
    check('hoje: número herói em algarismos tabulares', /tabular-nums/.test(today.tabular), today.tabular);
    check('hoje: botão vira "Editar dia" (verbo + objeto) e continua único', today.primaries.length === 1 && today.primaries[0] === 'Editar dia', today.primaries);
    check('hoje: alvo do botão >= 48px', today.ctaHeight >= 48, today.ctaHeight);
    check('hoje: nenhum texto visível abaixo de 12px', today.small.length === 0, today.small);
    check('hoje: nenhum rótulo "bruto" fora de Detalhes', !/brut/i.test(today.text), today.text);
    check('hoje: sequência mostra 5 dias seguidos', /5 dias/.test(today.streakText) && /seguidos/.test(today.streakText), today.streakText);
    check('hoje: nada sumiu: semana, mês, leitura e meta de faturamento ficam em "Detalhes"', today.detailsHasLegacy && today.detailsSummary.includes('Detalhes'), today);
    check('hoje: "Detalhes" começa recolhido', today.detailsOpen === false, today.detailsOpen);

    // 3. Meta do mês com marcador de ritmo e frase de ação.
    const goal = await run(`
      const card = document.getElementById('faroHomeGoal');
      const c = app.calculations();
      const pace = card?.querySelector('[data-faro-pace]');
      const fill = card?.querySelector('[data-faro-fill]');
      return {
        shown: shown(card),
        text: clean(card?.textContent),
        target: clean(app.money(app.state.targetProfit, 0)).replace(/R\\$\\s?/, ''),
        paceShown: Boolean(pace),
        fillShown: Boolean(fill),
        label: card?.getAttribute('aria-label') || '',
        role: card?.tagName,
        paceDelta: c.paceDelta
      };
    `);
    check('meta: cartão da meta visível', goal.shown);
    check('meta: mostra "/ meta do mês"', goal.text.includes('/ ' + goal.target), goal.text);
    check('meta: barra com marcador de ritmo', goal.paceShown && goal.fillShown);
    check('meta: diz se está à frente ou atrás do ritmo', /à frente|atrás|no ritmo/.test(goal.text), goal.text);
    check('meta: diz quanto falta e quanto por dia', /Faltam R\$/.test(goal.text) && /por dia/.test(goal.text) || /Meta batida/.test(goal.text), goal.text);
    check('meta: é botão com rótulo que diz a ação', goal.role === 'BUTTON' && /Ajustar meta/.test(goal.label), goal);

    const openGoal = await run(`
      document.getElementById('faroHomeGoal').click();
      await wait(350);
      const dialog = document.getElementById('faroMetaDialog');
      const result = { view: app.currentView, dialogOpen: Boolean(dialog?.open) };
      dialog?.close?.();
      app.navigateToPrimary('dashboard');
      await wait(50);
      return result;
    `);
    check('meta: tocar abre Planejar já na folha "Ajustar meta"', openGoal.view === 'planning' && openGoal.dialogOpen, openGoal);

    // 4. Sequência: regra pura, 1 folga por semana não quebra.
    const streak = await run(`
      const s = window.FaroHome.streak;
      const keys = offsets => offsets.map(dateKey);
      const today = app.todayKey();
      return {
        none: s([], today).days,
        five: s(keys([0,-1,-2,-3,-4]), today).days,
        todayPending: s(keys([-1,-2,-3]), today).days,
        oneGap: s(keys([0,-1,-3,-4]), today),
        twoGapsSameWeek: (() => {
          // Segunda a domingo da semana passada, com 2 dias faltando na mesma semana: quebra no segundo buraco.
          const ref = app.parseDate(today); ref.setDate(ref.getDate() - ((ref.getDay() + 6) % 7) - 7); // segunda passada
          const mk = n => { const d = new Date(ref); d.setDate(d.getDate() + n); return app.dateKey(d); };
          const sunday = mk(6);
          return s([mk(0), mk(1), mk(2), mk(5), mk(6)], sunday).days; // faltam qua(3) e qui(4)
        })(),
        persisted: Object.keys(localStorage).filter(key => /streak|sequen/i.test(key))
      };
    `);
    check('sequência: sem registro = 0', streak.none === 0, streak.none);
    check('sequência: 5 dias seguidos = 5', streak.five === 5, streak.five);
    check('sequência: hoje ainda sem registro não quebra', streak.todayPending === 3, streak.todayPending);
    check('sequência: 1 folga na semana não quebra', streak.oneGap.days === 4, streak.oneGap);
    check('sequência: 2 faltas na mesma semana quebram', streak.twoGapsSameWeek === 2, streak.twoGapsSameWeek);
    check('sequência: nada novo salvo no aparelho (só derivado)', streak.persisted.length === 0, streak.persisted);

    // 5. Dias registrados antes, mas hoje ainda não: convida a registrar hoje com a meta do dia.
    const pending = await run(`
      setRecords(app.state.records.filter(r => r.date !== app.todayKey()));
      await wait(30);
      return { heroText: clean(heroes()[0]?.textContent), primaries: primaries().map(el => clean(el.textContent)), heroes: heroes().length };
    `);
    check('pendente: herói convida a registrar hoje', pending.heroes === 1 && /Registre o dia de hoje/.test(pending.heroText), pending.heroText);
    check('pendente: botão "Registrar dia"', pending.primaries.length === 1 && pending.primaries[0] === 'Registrar dia', pending.primaries);
  } finally {
    await faro.close();
  }
  if (failures.length) {
    console.error('FAIL FARO Início 1 número: ' + failures.length + ' falha(s).');
    process.exitCode = 1;
  } else {
    console.log('PASS FARO Início 1 número: lucro de hoje herói, meta com ritmo, sequência com folga e 1 ação.');
  }
})().catch(error => {
  console.error('FAIL FARO Início 1 número:', error);
  process.exitCode = 1;
});
