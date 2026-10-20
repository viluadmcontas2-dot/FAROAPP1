// Backup malicioso importado pelo botão real: nenhum script roda em Histórico, Planejar, Reservas e Conta.
// Roda da raiz: node tests/import-xss-browser.test.cjs [raiz]
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) { console.log('SKIP FARO importação segura: Chrome não encontrado (defina FARO_CHROME_BIN).'); process.exit(0); }

const failures = [];
const check = (label, ok, detail) => { if (ok) console.log('  ok   ' + label); else { failures.push(label); console.log('  FAIL ' + label + (detail === undefined ? '' : ' -> ' + JSON.stringify(detail))); } };

(async () => {
  const faro = await openFaro(path.resolve(process.argv[2] || '.'));
  try {
    const run = async (name, json) => faro.evaluate(`(async () => {
      const app = window.__vettaApp; const wait = ms => new Promise(r => setTimeout(r, ms));
      const input = document.getElementById('importInput');
      const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify('PAYLOAD')}.length ? ${json} : ''], 'b.json', { type: 'application/json' }));
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(500);
      return document.getElementById('toast') ? document.getElementById('toast').textContent : '';
    })()`);
    const evil = '"><img src=x onerror=window.__xss=1>';
    const day = new Date().toISOString().slice(0, 10);
    const malicious = {
      app: 'FARO',
      data: {
        version: 3, onboardingComplete: true, targetProfit: 'abc', __proto__: { polluted: 1 },
        costs: [{ id: evil, name: evil, kind: 'monthly', category: 'reserve', value: 100, active: true, dueDay: 5 }],
        events: [{ id: evil, title: evil, date: day, category: evil, notes: evil }],
        records: [{ id: evil, date: day, gross: 300, km: 100, hours: 8, fuelSpend: 0 }],
        reserveContributions: [{ id: evil, reserveId: evil, date: day, amount: 10, createdAt: day }],
        reserveProfiles: { [evil]: { goalAmount: 500 } },
        paymentOccurrences: [{ id: evil + ':' + day, costId: evil, dueDate: day, status: 'paid', amount: 100 }]
      }
    };
    const text = JSON.stringify(malicious).replace('"data":{', '"data":{"__proto__":{"polluted":1},');
    await run('malicioso', JSON.stringify(text));
    const after = await faro.evaluate(`(async () => {
      const app = window.__vettaApp; const wait = ms => new Promise(r => setTimeout(r, ms));
      const ID = /^[A-Za-z0-9_-]{1,64}$/;
      const views = {};
      for (const v of ['history', 'planning', 'settings', 'account', 'dashboard']) {
        try { app.showView(v, v === 'dashboard' ? 'dashboard' : v); } catch (e) {}
        try { app.render(); } catch (e) {}
        await wait(200);
      }
      for (const el of document.querySelectorAll('button, [data-view], a')) { if (/Reserva|Conta|Hist|Plan/i.test(el.textContent || '')) { try { el.click(); } catch (e) {} await wait(60); } }
      await wait(300);
      const s = app.state;
      return { xss: window.__xss === undefined, polluted: ({}).polluted === undefined,
        costIds: s.costs.map(c => c.id), eventIds: s.events.map(e => e.id), recordIds: s.records.map(r => r.id),
        ok: [...s.costs, ...s.events, ...s.records, ...s.reserveContributions].every(i => ID.test(i.id)),
        injected: document.querySelectorAll('img[src="x"]').length, target: s.targetProfit };
    })()`);
    check('window.__xss continua indefinido nas telas', after.xss, after);
    check('Object.prototype não foi poluído', after.polluted);
    check('todos os ids ficaram seguros', after.ok, after);
    check('nenhuma <img> injetada no DOM', after.injected === 0, after.injected);
    check('número inválido virou o padrão', after.target === 4000, after.target);

    const rejected = await faro.evaluate(`(async () => {
      const app = window.__vettaApp; const wait = ms => new Promise(r => setTimeout(r, ms));
      const send = async content => { const dt = new DataTransfer(); dt.items.add(new File([content], 'b.json')); const i = document.getElementById('importInput'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); await wait(400); return document.getElementById('toast').textContent; };
      const before = JSON.stringify(app.state);
      const a = await send('isto nao e json');
      const b = await send(JSON.stringify({ app: 'OUTRO', data: { records: [] } }));
      const c = await send(JSON.stringify({ app: 'FARO', data: { version: 3, records: [], pad: 'x'.repeat(600 * 1024) } }));
      return { a: a.includes('Esse arquivo não parece um backup do FARO.'), b: b.includes('Esse arquivo não parece um backup do FARO.'), c: c.includes('grande demais'), same: before === JSON.stringify(app.state) };
    })()`);
    check('arquivo que não é JSON é recusado com mensagem clara', rejected.a, rejected);
    check('backup de outro app é recusado', rejected.b);
    check('arquivo gigante (>512 KB) é recusado', rejected.c);
    check('estado não muda quando a importação é recusada', rejected.same);
  } finally { await faro.close(); }
  if (failures.length) { console.error('FAIL FARO importação segura: ' + failures.length + ' falha(s).'); process.exitCode = 1; }
  else console.log('PASS FARO importação segura: backup malicioso saneado, sem XSS, arquivos inválidos recusados.');
})().catch(e => { console.error('FAIL FARO importação segura:', e); process.exitCode = 1; });
