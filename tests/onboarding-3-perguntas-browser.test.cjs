// F5 — Onboarding de 3 perguntas, provado no Chrome real.
// Primeiro acesso -> 3 perguntas -> Início com "Registrar dia" em no máximo 4 toques,
// estado gravado completo (sem NaN/undefined) e retomada depois de recarregar no meio.
const path = require('node:path');
const { openFaro, findChrome, sleep } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) {
  console.log('SKIP FARO onboarding 3 perguntas: Chrome não encontrado (defina FARO_CHROME_BIN).');
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
  const modal = document.getElementById('onboardingModal');
  const shown = el => Boolean(el && el.isConnected && !el.closest('.hidden') && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0);
  const step = () => [...modal.querySelectorAll('[data-faro-step]')].find(s => !s.classList.contains('hidden'))?.dataset.faroStep || null;
  const tap = el => { if (!el || !shown(el)) throw new Error('alvo invisível: ' + (el && el.outerHTML.slice(0, 80))); el.click(); window.__taps = (window.__taps || 0) + 1; };
`;

const waitFor = async (run, expr, label) => {
  for (let i = 0; i < 60; i += 1) { if (await run(`return Boolean(${expr});`)) return true; await sleep(100); }
  throw new Error('timeout: ' + label);
};

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const faro = await openFaro(root);
  try {
    const run = body => faro.evaluate(`(async () => { ${helpers} ${body} })()`);
    await faro.command('Page.enable', {});
    await faro.command('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true });" });
    const reload = async () => {
      await faro.command('Page.reload', { ignoreCache: true });
      await sleep(400);
      await waitFor(run, "window.__vettaApp && document.getElementById('onboardingModal')", 'app pronto');
    };
    await run(`localStorage.clear(); return true;`);
    await reload();
    await waitFor(run, "!document.getElementById('onboardingModal').classList.contains('hidden') && document.querySelector('[data-faro-step=\"vehicle\"]')", 'pergunta 1');

    // Pergunta 1: carro (1 toque: escolher já avança).
    const q1 = await run(`window.__taps = 0; return { step: step(), options: [...modal.querySelectorAll('[data-vehicle]')].filter(shown).map(b => b.dataset.vehicle), progress: document.getElementById('faroOnboardingProgress').textContent };`);
    check('pergunta 1 é "Seu carro é..." com próprio/financiado/alugado', q1.step === 'vehicle' && ['own', 'financed', 'rented'].every(v => q1.options.includes(v)), q1);
    check('progresso mostra 1 de 3', /1 de 3/.test(q1.progress), q1.progress);
    await run(`tap(modal.querySelector('[data-vehicle="own"]')); await wait(50); return true;`);
    const afterQ1 = await run(`return { step: step(), taps: window.__taps };`);
    check('próprio avança direto para a pergunta 2', afterQ1.step === 'target', afterQ1);

    // Resiliência: recarregar no meio retoma na pergunta 2 com a resposta 1 guardada.
    await reload();
    await waitFor(run, "document.querySelector('[data-faro-step=\"target\"]:not(.hidden)')", 'retomada');
    const resumed = await run(`return { step: step(), vehicle: JSON.parse(localStorage.getItem('faro-onboarding-draft-v2') || '{}').vehicle, done: app.state.onboardingComplete };`);
    check('recarregar no meio retoma na pergunta 2', resumed.step === 'target' && resumed.vehicle === 'own' && resumed.done === false, resumed);

    // Pergunta 2: meta (3 opções + Outro).
    const q2 = await run(`return [...modal.querySelectorAll('[data-target-choice]')].filter(shown).map(b => b.dataset.targetChoice);`);
    check('pergunta 2 tem 3 valores + Outro', q2.length === 4 && q2.includes('other'), q2);
    await run(`window.__taps = 1; tap(modal.querySelector('[data-target-choice="4000"]')); await wait(50); return true;`);
    const afterQ2 = await run(`return { step: step() };`);
    check('escolher a meta avança para a pergunta 3', afterQ2.step === 'energy', afterQ2);

    // Pergunta 3: combustível.
    const q3 = await run(`return [...modal.querySelectorAll('[data-energy-choice]')].filter(shown).map(b => b.dataset.energyChoice);`);
    check('pergunta 3 tem gasolina/etanol/flex/GNV/elétrico', ['gasoline', 'ethanol', 'flex', 'gnv', 'electric'].every(v => q3.includes(v)), q3);
    const t0 = Date.now();
    await run(`tap(modal.querySelector('[data-energy-choice="flex"]')); return true;`);
    await waitFor(run, "(() => { const b = document.getElementById('faroFinish'); return b && !b.closest('.hidden') && !b.classList.contains('hidden'); })()", 'CTA final');
    check('sem espera longa: plano pronto em até 1 s', Date.now() - t0 <= 1000, Date.now() - t0);
    await run(`tap(document.getElementById('faroFinish')); await wait(300); return true;`);

    const home = await run(`
      const dash = document.getElementById('view-dashboard');
      const primary = [...dash.querySelectorAll('[data-view="day"]')].filter(shown).map(el => el.textContent.replace(/\\s+/g, ' ').trim());
      return { taps: window.__taps, modalHidden: modal.classList.contains('hidden'), dash: shown(dash), primary, view: app.currentView };
    `);
    check('Início aberto com "Registrar dia"', home.modalHidden && home.dash && home.primary.some(t => /Registrar dia/i.test(t)), home);
    check('sem aviso duplicado: o plano pronto já foi dito na tela anterior', await run(`return !/Seu FARO está pronto/.test(document.getElementById('toast')?.textContent || '');`));
    check('do primeiro acesso ao Início em no máximo 4 toques', home.taps <= 4, home.taps);

    const saved = await run(`
      const s = JSON.parse(localStorage.getItem('vetta-driver-intelligence-v3'));
      const c = app.calculations();
      const bad = [];
      const scan = (v, p) => { if (v === undefined || (typeof v === 'number' && !Number.isFinite(v))) bad.push(p); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => scan(x, p + '.' + k)); };
      scan({ targetProfit: s.targetProfit, workWeekdays: s.workWeekdays, fuel: s.fuel, revenueKm: s.revenueKm, costs: s.costs, onboardingProfile: s.onboardingProfile }, 'state');
      scan({ dailyGross: c.dailyGross, dailyKm: c.dailyKm, fuelKm: c.fuelKm, dailyNet: c.dailyNet }, 'calc');
      return { bad, complete: s.onboardingComplete, target: s.targetProfit, days: s.workWeekdays.length, fuel: s.fuel, revenueKm: s.revenueKm, profile: s.onboardingProfile, draft: localStorage.getItem('faro-onboarding-draft-v2') };
    `);
    check('estado gravado sem NaN/undefined (núcleo e cálculos)', saved.bad.length === 0, saved.bad);
    check('meta, dias, combustível e receita/km gravados', saved.complete === true && saved.target === 4000 && saved.days === 6 && saved.fuel.price > 0 && saved.fuel.efficiency > 0 && saved.revenueKm > 0, saved);
    check('valores não perguntados ficam marcados como estimados', saved.profile && saved.profile.version === 3 && saved.profile.estimated && saved.profile.estimated.revenueKm === true, saved.profile);
    check('rascunho apagado depois de concluir', saved.draft === null, saved.draft);

    // Tour: no máximo 3 passos, todos apontando para alvos visíveis.
    const tour = await run(`
      const seen = [];
      for (let i = 0; i < 6; i += 1) {
        await wait(150);
        const layer = document.getElementById('faroTourLayer');
        if (!layer || layer.classList.contains('hidden')) break;
        const st = window.FaroTour.getState();
        const target = document.querySelector(window.FaroTour.steps[st.step].target);
        seen.push({ progress: document.getElementById('faroTourProgress').textContent, visible: shown(target) });
        document.getElementById('faroTourNext').click();
      }
      return seen;
    `);
    check('tour tem no máximo 3 passos', tour.length >= 1 && tour.length <= 3 && /\/3$/.test(tour[0]?.progress || ''), tour);
    check('tour só aponta alvos visíveis', tour.every(s => s.visible), tour);

    const card = await run(`await wait(200); app.navigateToPrimary('dashboard'); await wait(100); const el = document.getElementById('faroCompleteProfile'); return { shown: shown(el), text: el ? el.textContent.replace(/\\s+/g, ' ').trim() : null, h: el?.querySelector('button')?.getBoundingClientRect().height };`);
    check('cartão "Completar meu perfil" aparece no Início', card.shown && /Completar meu perfil/.test(card.text), card);
    check('botão do cartão tem alvo >= 48px', card.h >= 48, card.h);

    // Financiado: 1 campo pré-preenchido gera a conta "Parcela do carro".
    await run(`localStorage.clear(); return true;`);
    await reload();
    await waitFor(run, "document.querySelector('[data-faro-step=\"vehicle\"]:not(.hidden)')", 'pergunta 1 (financiado)');
    const fin = await run(`
      window.__taps = 0;
      tap(modal.querySelector('[data-vehicle="financed"]')); await wait(50);
      const input = document.getElementById('faroVehicleMonthly');
      const prefilled = Number(input.value);
      tap(document.getElementById('faroNext')); await wait(50);
      tap(modal.querySelector('[data-target-choice="3000"]')); await wait(50);
      tap(modal.querySelector('[data-energy-choice="gnv"]')); await wait(100);
      tap(document.getElementById('faroFinish')); await wait(300);
      const s = JSON.parse(localStorage.getItem('vetta-driver-intelligence-v3'));
      return { prefilled, taps: window.__taps, cost: s.costs.find(c => c.name === 'Parcela do carro'), complete: s.onboardingComplete };
    `);
    check('financiado mostra valor mensal pré-preenchido', fin.prefilled > 0, fin.prefilled);
    check('financiado gera a conta "Parcela do carro" mensal com vencimento', fin.complete && fin.cost && fin.cost.kind === 'monthly' && fin.cost.value === fin.prefilled && fin.cost.dueDay >= 1, fin);
    check('financiado chega ao Início em 5 toques (1 a mais para confirmar o valor)', fin.taps <= 5, fin.taps);
  } catch (error) {
    failures.push(String(error && error.message || error));
    console.log('  FAIL ' + error);
  } finally {
    await faro.close();
  }
  if (failures.length) { console.log(`FARO onboarding 3 perguntas: ${failures.length} falha(s)`); process.exit(1); }
  console.log('FARO onboarding 3 perguntas: primeiro acesso ao Início em <= 4 toques, estado completo e retomável — ok');
})();
