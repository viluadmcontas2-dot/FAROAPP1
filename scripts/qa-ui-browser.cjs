// Auditoria local do build, sem alterar o runtime nem depender de Playwright.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { openFaro } = require('./lib/faro-browser.cjs');

if (process.argv.includes('--help')) {
  require('node:fs').writeSync(1, 'Uso: node scripts/qa-ui-browser.cjs [--help]\nServe _site pelo harness FARO. Gera docs/evidence/qa-ui/relatorio.json e PNGs.\nExit 1: rolagem horizontal; exit 2: auditoria incompleta. Demais achados são informativos.\n');
  process.exit(0);
}
if (process.argv.length > 2) { console.error('Argumento desconhecido. Use --help.'); process.exit(2); }
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'docs/evidence/qa-ui');
const sizes = [[320, 640], [390, 844], [768, 1024]];
const screens = [['inicio', 'Início', 'dashboard'], ['dia', 'Dia/Registrar', 'day'],
  ['historico', 'Histórico', 'history'], ['planejar', 'Planejar', 'planning'],
  ['reservas', 'Reservas', 'planning'], ['conta', 'Mais/Conta', 'more']];
const today = new Date().toISOString().slice(0, 10);
const fixture = {
  version: 3, onboardingComplete: true, targetProfit: 4000, workWeekdays: [1, 2, 3, 4, 5, 6], extraDaysOff: 0, revenueKm: 2.25,
  fuel: { type: 'gnv', label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 },
  costs: [{ id: 'qa-reserva', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: 0.18, active: true },
    { id: 'qa-fixo', name: 'Custos fixos', kind: 'monthly', category: 'obligation', value: 650, active: true }],
  records: [1, 2, 3, 4, 5].map(i => ({ date: new Date(Date.parse(today) - i * 86400000).toISOString().slice(0, 10), gross: 280 + i * 17, km: 150 + i * 6, hours: 9, fuelSpend: 60 + i * 2 })),
  reserveContributions: [{ id: 'qa-aporte', reserveId: 'qa-reserva', amount: 200, date: today, createdAt: today + 'T12:00:00Z' }], events: []
};

// O harness expõe evaluate/close. Uma segunda conexão CDP fornece eventos e PNG,
// sem editar seu contrato; identifica a aba pelo origin exclusivo do servidor.
async function attach(origin, previous) {
  for (const name of await fs.readdir(os.tmpdir())) {
    if (!name.startsWith('faro-browser-') || previous.has(name)) continue;
    try {
      const port = Number((await fs.readFile(path.join(os.tmpdir(), name, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const tab = tabs.find(t => t.type === 'page' && t.url.startsWith(origin + '/'));
      if (!tab) continue;
      const socket = new WebSocket(tab.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      let id = 0;
      const pending = new Map();
      const listeners = [];
      socket.onmessage = ({ data }) => {
        const event = JSON.parse(data);
        if (event.id) {
          const p = pending.get(event.id);
          if (!p) return;
          clearTimeout(p.timer); pending.delete(event.id);
          event.error ? p.reject(Error(event.error.message)) : p.resolve(event.result);
        } else listeners.forEach(fn => fn(event));
      };
      return { on: fn => listeners.push(fn), close: () => socket.close(),
        send: (method, params = {}) => new Promise((resolve, reject) => {
          const key = ++id;
          const timer = setTimeout(() => { pending.delete(key); reject(Error(`Timeout CDP: ${method}`)); }, 20000);
          pending.set(key, { resolve, reject, timer }); socket.send(JSON.stringify({ id: key, method, params }));
        }) };
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw Error('A conexão CDP do harness não foi localizada');
}

function inspect() {
  const visible = el => {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const selector = el => {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    while (el && el !== document.body) {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      parts.unshift(el.localName + ':nth-child(' + (Array.from(el.parentElement.children).indexOf(el) + 1) + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  };
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, el = node.parentElement;
    if (!node.textContent.trim() || !visible(el) || el.closest('script,style,noscript')) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    if (![...range.getClientRects()].some(r => r.width && r.height)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12) texts.push({ seletor: selector(el), texto: node.textContent.trim(), fontePx: size });
  }
  const targets = [...document.querySelectorAll('button,a,[role="button"],[role="tab"],input,select,textarea,summary')].filter(visible).flatMap(el => {
    const r = el.getBoundingClientRect();
    return r.width < 44 || r.height < 44 ? [{ seletor: selector(el), texto: el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '', largura: r.width, altura: r.height }] : [];
  });
  const width = document.documentElement.clientWidth;
  const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  return { largura: width, larguraConteudo: scrollWidth, rolagemHorizontal: scrollWidth > width,
    textosPequenos: texts, alvosPequenos: targets,
    elementosExcedentes: [...document.body.querySelectorAll('*')].filter(visible).filter(el => {
      const r = el.getBoundingClientRect(); return r.left < -1 || r.right > width + 1;
    }).map(el => ({ seletor: selector(el), esquerda: el.getBoundingClientRect().left, direita: el.getBoundingClientRect().right })) };
}

(async () => {
  await fs.access(path.join(root, '_site/app-shell.html'));
  await fs.mkdir(output, { recursive: true });
  const report = { geradoEm: new Date().toISOString(), estado: 'INCOMPLETO', fixture, escopo: 'DOM renderizado completo, inclusive abaixo da dobra; PNG do viewport, DPR 1. Sem modais ou autenticação. Eventos desde recarga instrumentada; externos bloqueados e registrados.', telas: [] };
  let browser, cdp, active;
  try {
    // Diagnostica restrições do ambiente antes do harness (que não trata erro de listen).
    const probe = require('node:http').createServer();
    await new Promise((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => probe.close(resolve));
    });
    const previous = new Set(await fs.readdir(os.tmpdir()));
    browser = await openFaro(path.join(root, '_site'));
    const origin = await browser.evaluate('location.origin');
    cdp = await attach(origin, previous);
    cdp.on(event => {
      if (!active) return;
      const p = event.params;
      if (event.method === 'Runtime.consoleAPICalled' && p.type === 'error') active.errosConsole.push({ tipo: 'console', mensagem: p.args.map(a => a.value ?? a.description ?? '').join(' ') });
      if (event.method === 'Runtime.exceptionThrown') active.errosConsole.push({ tipo: 'excecao', mensagem: p.exceptionDetails.exception?.description || p.exceptionDetails.text });
      if (event.method === 'Log.entryAdded' && p.entry.level === 'error') {
        // O servidor do harness não mapeia .mjs (SDK Supabase em vendor/): artefato do teste, não do app em produção.
        const alvo = /Expected a JavaScript-or-Wasm module script/.test(p.entry.text) ? (active.avisosHarness ||= []) : active.errosConsole;
        alvo.push({ tipo: 'log', mensagem: p.entry.text });
      }
      if (event.method === 'Network.requestWillBeSent') {
        const url = new URL(p.request.url);
        if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.host !== new URL(origin).host)
          active.requisicoesExternas.push({ host: url.host, caminho: url.pathname, metodo: p.request.method });
      }
    });
    for (const domain of ['Page', 'Runtime', 'Network', 'Log']) await cdp.send(domain + '.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.setBypassServiceWorker', { bypass: true });
    // Registra e bloqueia tentativas externas sem enviar dados da fixture.
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    cdp.on(event => {
      if (event.method !== 'Fetch.requestPaused') return;
      const p = event.params, url = new URL(p.request.url);
      const external = ['http:', 'https:'].includes(url.protocol) && url.origin !== origin;
      cdp.send(external ? 'Fetch.failRequest' : 'Fetch.continueRequest', external ? { requestId: p.requestId, errorReason: 'BlockedByClient' } : { requestId: p.requestId }).catch(error => { report.erroInterceptacao = error.message; });
    });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }); localStorage.clear(); localStorage.setItem('faro-app-finance-v1', ${JSON.stringify(JSON.stringify(fixture))}); localStorage.setItem('faro-ui-tour-v1', '{"done":true,"completed":true,"seen":true}');` });
    for (const [width, height] of sizes) for (const [slug, title, view] of screens) {
      active = { tela: title, view, viewport: { width, height }, errosConsole: [], requisicoesExternas: [] };
      report.telas.push(active);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await cdp.send('Page.navigate', { url: origin + '/app-shell.html?qa=' + slug });
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try { ready = await browser.evaluate(`Boolean(document.documentElement.dataset.faroPlatformReady === 'true' && window.FaroRegister && window.__vettaApp && window.__vettaApp.state.records.length === 5)`); } catch {}
        if (ready) break;
        await browser.sleep(100);
      }
      if (!ready) throw Error('Runtime/fixture não ficou pronto: ' + title + ' ' + await browser.evaluate(`JSON.stringify({p:document.documentElement.dataset.faroPlatformReady,r:!!window.FaroRegister,a:!!window.__vettaApp,n:window.__vettaApp&&window.__vettaApp.state.records.length,ls:Object.keys(localStorage)})`));
      // Reservas é um painel de Planejar (botão "Dinheiro" > aba Reservas); as demais são abas primárias.
      await browser.evaluate(slug === 'reservas'
        ? `window.__vettaApp.navigateToPrimary('planning'); document.getElementById('faroOpenMoney').click(); document.getElementById('faroMoneyTabReserves').click(); window.scrollTo(0,0)`
        : `window.__vettaApp.navigateToPrimary(${JSON.stringify(view)}); window.scrollTo(0,0)`);
      await browser.evaluate(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
      // Janela explícita para efeitos assíncronos e coleta de eventos, não critério de prontidão.
      await browser.sleep(600);
      const shown = await browser.evaluate(`document.getElementById('${slug === 'reservas' ? 'faroMoneyReserves' : 'view-' + view}').checkVisibility({checkVisibilityCSS:true})`);
      if (!shown) throw Error('Tela solicitada não está visível: ' + title + ' ' + await browser.evaluate(`(()=>{let e=document.getElementById('view-${view}'),o=[];while(e&&e!==document.documentElement){const c=getComputedStyle(e);o.push(e.localName+'#'+e.id+' d='+c.display+' v='+c.visibility);e=e.parentElement}return o.join(' ; ')+' ob='+window.__vettaApp.state.onboardingComplete+' sa='+window.__vettaApp.isStandalone()+' gate='+!!document.getElementById('faroInstallGate')+' ml='+document.getElementById('view-dashboard').closest('main').outerHTML.slice(0,0)+document.querySelector('main').getAttribute('style')+'/'+document.querySelector('main').inert+' cur='+window.__vettaApp.currentView})()`));
      Object.assign(active, await browser.evaluate('(' + inspect.toString() + ')()'));
      active.screenshot = `${slug}-${width}x${height}.png`;
      const png = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(path.join(output, active.screenshot), Buffer.from(png.data, 'base64'));
      active.contagem = { rolagemHorizontal: Number(active.rolagemHorizontal), textosPequenos: active.textosPequenos.length, alvosPequenos: active.alvosPequenos.length, errosConsole: active.errosConsole.length, requisicoesExternas: active.requisicoesExternas.length };
      console.log(`${title} ${width}x${height}: ${JSON.stringify(active.contagem)}`);
    }
    if (report.erroInterceptacao) throw Error(report.erroInterceptacao);
    report.estado = report.telas.some(t => t.rolagemHorizontal) ? 'FALHOU_ROLAGEM_HORIZONTAL' : 'CONCLUIDO';
    process.exitCode = report.estado === 'CONCLUIDO' ? 0 : 1;
  } catch (error) {
    report.erro = error.stack; process.exitCode = 2; console.error(error.message);
  } finally {
    active = null;
    await fs.writeFile(path.join(output, 'relatorio.json'), JSON.stringify(report, null, 2) + '\n');
    cdp?.close(); await browser?.close();
    console.log(`Relatório: docs/evidence/qa-ui/relatorio.json (${report.estado})`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 2; });
