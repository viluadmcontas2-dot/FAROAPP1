// Onboarding costurado: depois do combustível o app pergunta quanto o carro faz e o preço,
// e esses dois números alimentam fuel.efficiency/fuel.price, o plano e a frase do resultado.
const path = require('node:path');
const { openFaro, findChrome, sleep } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) {
  console.log('SKIP FARO onboarding consumo: Chrome não encontrado (defina FARO_CHROME_BIN).');
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
  const $ = id => document.getElementById(id);
  const step = () => [...modal.querySelectorAll('[data-faro-step]')].find(s => !s.classList.contains('hidden'))?.dataset.faroStep || null;
  const type = (id, value) => { const el = $(id); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const draft = () => JSON.parse(localStorage.getItem('faro-onboarding-draft-v2') || '{}');
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
    await waitFor(run, "document.querySelector('[data-faro-step=\"vehicle\"]:not(.hidden)')", 'pergunta 1');
    await run(`modal.querySelector('[data-vehicle="own"]').click(); await wait(50); modal.querySelector('[data-target-choice="4000"]').click(); await wait(50); modal.querySelector('[data-energy-choice="gnv"]').click(); await wait(80); return true;`);

    const s4 = await run(`return { step: step(), progress: $('faroOnboardingProgress')?.textContent, bars: modal.querySelectorAll('.faro-ob-steps i').length, eff: $('faroConsumption')?.value, price: $('faroEnergyPrice')?.value, unitText: modal.querySelector('[data-faro-step="consumption"]')?.textContent || '' };`);
    check('depois do combustível vem a pergunta de consumo', s4.step === 'consumption', s4);
    check('progresso mostra Passo 4 de 6 e 6 barras', /^Passo 4 de 6$/.test(s4.progress || '') && s4.bars === 6, s4);
    check('consumo e preço vêm preenchidos pelo preset do GNV', Number(s4.eff) === 13.2 && Number(s4.price) === 4.79, s4);
    check('GNV pergunta em km/m³', /km\/m³/.test(s4.unitText), s4.unitText);
    const touch = await run(`return ['faroConsumptionMinus','faroConsumptionPlus','faroConsumptionNext'].map(id => { const r = $(id)?.getBoundingClientRect(); return r ? Math.min(r.width, r.height) : 0; });`);
    check('botões +/- e Continuar com alvo >= 44px', touch.every(v => v >= 44), touch);

    await run(`$('faroConsumptionPlus').click(); await wait(30); return true;`);
    const stepped = await run(`return Number($('faroConsumption').value);`);
    check('stepper + aumenta o consumo', stepped > 13.2, stepped);

    await run(`type('faroConsumption', '0'); $('faroConsumptionNext').click(); await wait(60); return true;`);
    const invalid = await run(`return { step: step(), err: $('faroConsumptionError')?.textContent || '' };`);
    check('consumo 0 é recusado e diz o que fazer', invalid.step === 'consumption' && /entre 1 e 40/.test(invalid.err), invalid);
    await run(`type('faroConsumption', '41'); $('faroConsumptionNext').click(); await wait(60); return true;`);
    check('consumo 41 é recusado', await run(`return step() === 'consumption';`));
    await run(`type('faroConsumption', '12'); $('faroConsumptionNext').click(); await wait(60); return true;`);
    check('consumo válido avança para o preço (1 pergunta por tela)', await run(`return step() === 'price' && /^Passo 5 de 6$/.test($('faroOnboardingProgress').textContent);`));
    const pt = await run(`return ['faroPriceMinus','faroPricePlus','faroPriceNext'].map(id => { const r = $(id).getBoundingClientRect(); return Math.min(r.width, r.height); });`);
    check('preço: +/- e Continuar com alvo >= 44px', pt.every(v => v >= 44), pt);
    check('preço padrão do GNV preenchido', await run(`return Number($('faroEnergyPrice').value) === 4.79;`));
    await run(`type('faroEnergyPrice', '21'); $('faroPriceNext').click(); await wait(60); return true;`);
    check('preço 21 é recusado e diz o que fazer', await run(`return step() === 'price' && /até 20/.test($('faroPriceError').textContent);`));
    await run(`type('faroEnergyPrice', '0'); $('faroPriceNext').click(); await wait(60); return true;`);
    check('preço 0 é recusado', await run(`return step() === 'price';`));
    await run(`type('faroEnergyPrice', '5'); await wait(30); return true;`);
    await reload();
    await waitFor(run, "document.querySelector('[data-faro-step=\"price\"]:not(.hidden)')", 'retomada no preço');
    const resumed = await run(`const d = draft(); return { eff: d.energyEfficiency, price: d.energyPrice, shownEff: Number($('faroConsumption').value), shownPrice: Number($('faroEnergyPrice').value) };`);
    check('recarregar retoma no preço com os valores digitados', resumed.eff === 12 && resumed.price === 5 && resumed.shownEff === 12 && resumed.shownPrice === 5, resumed);

    await run(`$('faroBack').click(); await wait(50); return true;`);
    check('Voltar leva ao consumo e depois ao combustível', await run(`const a = step(); $('faroBack').click(); await wait(50); return a === 'consumption' && step() === 'energy';`));
    await run(`modal.querySelector('[data-energy-choice="gnv"]').click(); await wait(60); return true;`);
    const reset = await run(`return Number($('faroConsumption').value);`);
    check('escolher o combustível de novo recarrega o padrão do preset', reset === 13.2, reset);
    await run(`type('faroConsumption', '12'); $('faroConsumptionNext').click(); await wait(60); type('faroEnergyPrice', '5'); $('faroPriceNext').click(); await wait(80); return true;`);

    const result = await run(`
      const sentence = $('faroPlanStory')?.textContent.replace(/\\s+/g, ' ').trim() || '';
      const c = app.calculations();
      return { step: step(), sentence, fuel: app.state.fuel, fuelKm: c.fuelKm, dailyKm: c.dailyKm, finish: !$('faroFinish').classList.contains('hidden') };
    `);
    check('resultado mostra a frase costurada com consumo, preço e custo por 100 km', result.step === 'result' && /12 km\/m³/.test(result.sentence) && /R\$\s?5,00/.test(result.sentence) && /100 km custa R\$\s?41,67/.test(result.sentence) && /por semana/.test(result.sentence) && /km/.test(result.sentence), result);
    check('estado grava consumo e preço digitados', result.fuel.efficiency === 12 && result.fuel.price === 5 && Math.abs(result.fuelKm - 5 / 12) < 1e-9, result.fuel);

    await run(`$('faroFinish').click(); await wait(300); return true;`);
    const home = await run(`const s = JSON.parse(localStorage.getItem('vetta-driver-intelligence-v3')); return { done: s.onboardingComplete, eff: s.fuel.efficiency, price: s.fuel.price, badge: document.getElementById('fuelCostBadge')?.textContent, est: s.onboardingProfile.estimated, flags: [s.onboardingProfile.energyPriceEstimated, s.onboardingProfile.energyEfficiencyEstimated] };`);
    check('Início reflete R$ 0,42/km do consumo informado', home.done && home.eff === 12 && home.price === 5 && /0,42/.test(home.badge || ''), home);
    check('consumo e preço informados deixam de ser estimativa', home.est.energyPrice === false && home.est.energyEfficiency === false && home.flags.every(f => f === false), home);

    // Indicador: cada tela mostra o passo certo (X = 1..N), barras acesas até o passo atual.
    await run(`localStorage.clear(); return true;`);
    await reload();
    await waitFor(run, "document.querySelector('[data-faro-step=\"vehicle\"]:not(.hidden)')", 'indicador');
    const seen = [];
    const snap = () => run(`const bars = [...modal.querySelectorAll('.faro-ob-steps i')]; return { step: step(), text: $('faroOnboardingProgress').textContent, on: bars.filter(b => b.classList.contains('on')).length, total: bars.length };`);
    seen.push(await snap());
    for (const action of ["modal.querySelector('[data-vehicle=\"own\"]').click()", "modal.querySelector('[data-target-choice=\"4000\"]').click()", "modal.querySelector('[data-energy-choice=\"gasoline\"]').click()", "$('faroConsumptionNext').click()", "$('faroPriceNext').click()"]) {
      await run(action + '; await wait(80); return true;');
      seen.push(await snap());
    }
    check('6 telas, cada uma com "Passo X de 6" progressivo e barras até X', seen.length === 6 && seen.every((p, i) => p.text === 'Passo ' + (i + 1) + ' de 6' && p.on === i + 1 && p.total === 6), seen);
    check('telas na ordem carro, meta, combustível, consumo, preço, resumo', seen.map(p => p.step).join() === 'vehicle,target,energy,consumption,price,result', seen.map(p => p.step));

    // Elétrico: km/kWh e R$/kWh, sem quebrar.
    await run(`localStorage.clear(); return true;`);
    await reload();
    await waitFor(run, "document.querySelector('[data-faro-step=\"vehicle\"]:not(.hidden)')", 'pergunta 1 (elétrico)');
    await run(`modal.querySelector('[data-vehicle="own"]').click(); await wait(50); modal.querySelector('[data-target-choice="3000"]').click(); await wait(50); modal.querySelector('[data-energy-choice="electric"]').click(); await wait(80); return true;`);
    const el = await run(`return { step: step(), eff: Number($('faroConsumption').value), price: Number($('faroEnergyPrice').value), text: modal.querySelector('[data-faro-step="consumption"]').textContent };`);
    check('elétrico pergunta km/kWh e R$/kWh com padrão', el.step === 'consumption' && /km\/kWh/.test(el.text) && el.eff >= 1 && el.eff <= 40, el);
    await run(`$('faroConsumptionNext').click(); await wait(60); return true;`);
    const elPrice = await run(`return { step: step(), price: Number($('faroEnergyPrice').value), label: $('faroPriceLabel').textContent };`);
    check('elétrico pergunta preço em R$/kWh com padrão', elPrice.step === 'price' && /kWh/.test(elPrice.label) && elPrice.price > 0, elPrice);
    await run(`$('faroPriceNext').click(); await wait(80); return true;`);
    const elRes = await run(`const c = app.calculations(); return { step: step(), fuel: app.state.fuel, fuelKm: c.fuelKm, sentence: $('faroPlanStory').textContent };`);
    check('elétrico chega ao resultado com custo/km finito', elRes.step === 'result' && elRes.fuel.type === 'electric' && Number.isFinite(elRes.fuelKm) && elRes.fuelKm > 0 && /km\/kWh/.test(elRes.sentence), elRes);
  } catch (error) {
    failures.push(String(error && error.message || error));
    console.log('  FAIL ' + error);
  } finally {
    await faro.close();
  }
  if (failures.length) { console.log(`FARO onboarding consumo: ${failures.length} falha(s)`); process.exit(1); }
  console.log('FARO onboarding consumo: consumo e preço perguntados, validados e costurados no plano — ok');
})();
