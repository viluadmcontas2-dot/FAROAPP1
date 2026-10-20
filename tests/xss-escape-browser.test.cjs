const assert = require('node:assert/strict');
const { openFaro } = require('../scripts/lib/faro-browser.cjs');
(async () => {
  const faro = await openFaro(process.argv[2] || '.');
  try {
    // Sem CSP no servidor do harness: ausência de execução prova escape, não bloqueio por headers.
    const result = await faro.evaluate(`(async () => {
      const app = window.__vettaApp;
      const payload = '<img src=x onerror=window.__xss=1>';
      // Controle positivo: a mesma carga executaria se fosse inserida como HTML.
      const probe = document.createElement('div');
      document.body.appendChild(probe); probe.innerHTML = payload;
      await new Promise(resolve => probe.querySelector('img').addEventListener('error',resolve,{once:true}));
      const control = window.__xss === 1;
      probe.remove(); delete window.__xss;
      app.state.onboardingComplete = true;
      app.state.costs = [
        {id:'xss-cost',name:payload,kind:'monthly',category:'obligation',value:100,active:true,dueDay:new Date().getDate()},
        {id:'xss-reserve',name:payload,kind:'monthly',category:'reserve',value:50,active:true}
      ];
      // Não há campo visual de nome pessoal nesta versão; manter no estado não prova essa UI.
      app.state.profile = {...app.state.profile, name:payload};
      app.state.reserveProfiles = {'xss-reserve':{goalAmount:200,targetDate:app.todayKey()}};
      app.state.reserveContributions = [{id:'entry',reserveId:'xss-reserve',date:app.todayKey(),amount:25,createdAt:new Date().toISOString()}];
      app.save(); app.render();
      const screens = [];
      for (const view of ['dashboard','planning','settings','history']) {
        app.showView(view);
        window.FaroFinance.refresh(); window.FaroReserves.render(); window.FaroR3B.renderMoneyWorkspace();
        await new Promise(requestAnimationFrame);
        screens.push({view, safe:window.__xss === undefined, images:document.querySelectorAll('img[onerror]').length});
      }
      const names = ['faroPaymentList','faroReserveList','faroMoneyBillList','faroMoneyReserveList'].map(id => ({id, text:document.getElementById(id).textContent.includes(payload)}));
      // IDs importados são dados externos também. Renderizar apenas owners autorizados:
      // o renderCosts do app.js imutável continua com dívida documentada.
      const hostileId = 'id"><img src=x onerror=window.__xss=1>';
      app.state.costs[0].id = hostileId + '-cost';
      app.state.costs[1].id = hostileId;
      app.state.reserveProfiles[hostileId] = app.state.reserveProfiles['xss-reserve'];
      app.state.reserveContributions[0].reserveId = hostileId;
      app.state.reserveContributions[0].id = hostileId + '-entry';
      window.FaroFinance.refresh();
      window.FaroReserves.render(); window.FaroR3B.renderMoneyWorkspace();
      await new Promise(resolve => setTimeout(resolve,100));
      // Registro: valores monetários vêm de app.money (formatação externa); lista de ganhos usa innerHTML.
      window.__xss = undefined;
      app.showView('day');
      const realMoney = app.money;
      app.money = () => payload;
      const earn = document.querySelector('[data-faro-earning-source="uber"]');
      earn.value = '10'; earn.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(resolve => setTimeout(resolve,100));
      const earningList = document.getElementById('faroEarningList');
      const register = {safe:window.__xss === undefined, images:earningList.querySelectorAll('img[onerror]').length, text:earningList.textContent.includes(payload), row:!!earningList.querySelector('[data-faro-earning-row="uber"]')};
      app.money = realMoney;
      return {register,control,screens,names,contribution:document.querySelector('#faroReserveList [data-reserve-remove-entry]').dataset.reserveRemoveEntry,safe:window.__xss === undefined, id:document.querySelector('#faroReserveList [data-reserve-contribute]').dataset.reserveContribute, hostileId};
    })()`);
    assert.equal(result.control,true,'controle positivo executou a carga sem escape');
    assert.equal(result.contribution,result.hostileId + '-entry','aporte preserva ID como atributo');
    for (const screen of result.screens) { assert.equal(screen.safe,true,screen.view); assert.equal(screen.images,0,screen.view); }
    for (const name of result.names) assert.equal(name.text,true,`${name.id}: nome preservado como texto`);
    assert.equal(result.register.row,true,'registro: linha do app renderizada');
    assert.equal(result.register.safe,true,'registro: valor monetário não executa HTML');
    assert.equal(result.register.images,0,'registro: nenhuma tag injetada');
    assert.equal(result.register.text,true,'registro: valor preservado como texto');
    assert.equal(result.safe,true,'ID de backup não executa HTML');
    assert.equal(result.id,result.hostileId,'ID preservado como um único atributo');
    console.log('PASS XSS no Chromium: custos, reservas, aportes e IDs importados (nome pessoal sem UI nesta versão)');
  } finally { await faro.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
