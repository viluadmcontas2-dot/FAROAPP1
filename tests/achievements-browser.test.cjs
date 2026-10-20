// Conquistas no Chrome real: linha única no Início, folha inferior, escape e celebração sóbria.
const assert = require('node:assert/strict');
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) { console.log('SKIP FARO conquistas: Chrome não encontrado.'); process.exit(0); }

const helpers = `
  const app = window.__vettaApp; const el = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = offset => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() + offset); return app.dateKey(d); };
  const day = date => ({ id:'day-'+date, date, gross:300, km:100, hours:8, fuelSpend:0, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
  const set = patch => { Object.assign(app.state, patch); app.save(); app.render(); app.showView('dashboard'); };
`;
(async () => {
  const faro = await openFaro(path.resolve(process.argv[2] || '.'));
  try {
    const run = body => faro.evaluate(`(async () => { ${helpers} ${body} })()`);
    await run(`document.documentElement.dataset.faroActivationStage='product'; app.state.onboardingComplete=true; app.state.targetProfit=4000; localStorage.removeItem('faro-achievements-seen-v1'); set({ records:[], costs:[], reserveContributions:[], reserveProfiles:{} }); return true;`);

    // 1. Vazio: convite para agir, alvo >= 48px, abre a folha com o mesmo convite.
    let r = await run(`await wait(30); const line = el('faroAchievementsLine'); line.click(); await wait(250);
      return { text: line.textContent.trim(), h: line.getBoundingClientRect().height, open: el('faroAchievementsSheet').open, empty: !el('faroAchievementsEmpty').hidden, inHome: line.closest('#view-dashboard') !== null };`);
    assert.equal(r.text.replace('›','').trim(), 'Registre 1 dia para destravar sua primeira conquista');
    assert.ok(r.h >= 48, 'alvo >= 48px'); assert.ok(r.open && r.empty && r.inHome, JSON.stringify(r));
    await run(`el('faroAchievementsClose').click(); await wait(250); return true;`);

    // 2. Reserva a 78% vira a próxima conquista; nome malicioso sai como texto.
    r = await run(`set({ records:[day(key(0))], costs:[{ id:'r1', name:'IPVA', category:'reserve', kind:'monthly', value:100, active:true }, { id:'r2', name:'<img src=x onerror=window.pwned=1>', category:'reserve', kind:'monthly', value:10, active:true }],
        reserveProfiles:{ r1:{ goalAmount:1000 }, r2:{ goalAmount:100 } }, reserveContributions:[{ id:'c1', reserveId:'r1', date:key(0), amount:780, createdAt:new Date().toISOString() }] });
      await wait(30); el('faroAchievementsLine').click(); await wait(250);
      const sheet = el('faroAchievementsSheet');
      const small = [...sheet.querySelectorAll('.faro-ach-list *')].filter(n => n.textContent.trim() && parseFloat(getComputedStyle(n).fontSize) < 12).length;
      const fill = sheet.querySelector('[data-id="reserve-r1"] .faro-ach-fill').style.width;
      const close = el('faroAchievementsClose').getBoundingClientRect();
      const out = { text: el('faroAchievementsText').textContent, imgs: sheet.querySelectorAll('.faro-ach-list img').length, pwned: window.pwned || 0, escaped: sheet.textContent.includes('<img src=x'), small, fill, close: Math.min(close.width, close.height) };
      el('faroAchievementsClose').click(); await wait(250); return out;`);
    assert.equal(r.text, 'Próxima conquista: Reserva IPVA 78%');
    assert.equal(r.imgs, 0); assert.equal(r.pwned, 0); assert.ok(r.escaped, 'nome aparece como texto');
    assert.equal(r.small, 0, 'fonte >= 12px'); assert.equal(r.fill, '78%'); assert.ok(r.close >= 48);

    // 3. Completar a reserva: aviso único "Conquista nova", sem guardar dado financeiro novo.
    r = await run(`const before = Object.keys(app.state).sort().join(',');
      app.state.reserveContributions.push({ id:'c2', reserveId:'r1', date:key(0), amount:220, createdAt:new Date().toISOString() }); app.save(); app.render(); await wait(50);
      const toast = el('faroAchievementToast');
      const out = { shown: !toast.hidden, text: toast.textContent.trim(), role: toast.getAttribute('role'), same: Object.keys(app.state).sort().join(',') === before, seen: JSON.parse(localStorage.getItem('faro-achievements-seen-v1')) };
      app.render(); await wait(30); out.once = el('faroAchievementToastText').textContent; return out;`);
    assert.ok(r.shown, JSON.stringify(r)); assert.equal(r.text, 'Conquista nova: Reserva IPVA 100%'); assert.equal(r.role, 'status');
    assert.ok(r.same, 'nenhum campo novo no estado financeiro: ' + JSON.stringify(r)); assert.ok(r.seen['reserve-r1'] && r.seen['first-day']);

    // 4. 320 px: sem rolagem horizontal no Início com a linha.
    await faro.command('Emulation.setDeviceMetricsOverride', { width:320, height:640, deviceScaleFactor:1, mobile:true });
    r = await run(`await wait(100); const w = document.documentElement.clientWidth; const line = el('faroAchievementsLine'); return { w, right: line.getBoundingClientRect().right, inner: line.scrollWidth <= line.clientWidth };`);
    await faro.command('Emulation.clearDeviceMetricsOverride', {});
    assert.ok(r.right <= r.w && r.inner, 'linha cabe em 320px: ' + JSON.stringify(r));
    console.log('PASS conquistas no navegador: vazio, próxima, escape, celebração, 320px');
  } finally { await faro.close(); }
})().catch(error => { console.error(error); process.exit(1); });
