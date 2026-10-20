// Tema global FARO no Chrome real (390x844): 6 telas sem o azul antigo, contraste AA e modo carro intacto.
// Uso: node tests/theme-browser.test.cjs [raiz]  (capturas em docs/evidence/tema/)
const fs = require('node:fs');
const path = require('node:path');
const { openFaro, findChrome } = require('../scripts/lib/faro-browser.cjs');

if (!findChrome()) {
  console.log('SKIP FARO tema global: Chrome não encontrado (defina FARO_CHROME_BIN).');
  process.exit(0);
}

const failures = [];
const check = (label, condition, detail) => {
  if (condition) console.log('  ok   ' + label);
  else { failures.push(label); console.log('  FAIL ' + label + (detail === undefined ? '' : ' -> ' + JSON.stringify(detail).slice(0, 1200))); }
};

// Roda dentro da página: auditoria de cor de um escopo (tela + barras).
const audit = `
  const parse = value => { const m = String(value).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r:p[0], g:p[1], b:p[2], a:p.length > 3 ? p[3] : 1 }; };
  const colorsIn = value => [...String(value).matchAll(/rgba?\\([^)]+\\)/g)].map(m => parse(m[0])).filter(Boolean);
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const blend = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  // Fundos possíveis atrás do elemento (gradiente = todos os tons dele; transparência = mistura com o de baixo).
  // Ancestral que não cobre o ponto do texto (ex.: rótulo posicionado fora da caixa do pai) não conta como fundo.
  const backgrounds = (el, point, escaped) => {
    if (!el || el.nodeType !== 1) return [{ r:255, g:255, b:255, a:1 }];
    if (!point) { const r = el.getBoundingClientRect(); point = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    const style = getComputedStyle(el);
    const under = backgrounds(el.parentElement, point, escaped || /absolute|fixed/.test(style.position));
    const box = el.getBoundingClientRect();
    if (escaped && (point.x < box.left || point.x > box.right || point.y < box.top || point.y > box.bottom)) return under;
    const grad = style.backgroundImage !== 'none' ? colorsIn(style.backgroundImage) : [];
    const base = parse(style.backgroundColor);
    let layers = under;
    if (base && base.a > 0) layers = under.map(u => blend(base, u));
    if (grad.length) layers = grad.flatMap(g => layers.map(u => blend(g, u)));
    return layers;
  };
  const shown = el => { if (!el.isConnected || !el.getClientRects().length) return false; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false; } return true; };
  const OLD = ['#2563EB','#1D4ED8','#3B82F6','#60A5FA','#93C5FD','#BFDBFE','#DBEAFE','#EFF6FF','#1E40AF','#1E3A8A','#172554','#0B1121','#111E39','#12325D','#16213B','#132444','#173B6D'];
  const isOldBlue = c => { if (!c || c.a === 0) return false; if (OLD.includes(hex(c))) return true;
    const r = c.r / 255, g = c.g / 255, b = c.b / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (d === 0) return false; const s = d / (1 - Math.abs(2 * l - 1)); let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    return h >= 200 && h <= 255 && s > .5 && l > .08 && l < .97; };
  const scopeEls = roots => roots.filter(Boolean).flatMap(root => [root, ...root.querySelectorAll('*')]).filter(el => !el.closest('canvas,svg') && shown(el));
  const blueHits = els => els.flatMap(el => { const s = getComputedStyle(el); const out = [];
    const props = [['color', s.color], ['background', s.backgroundColor]];
    for (const side of ['Top','Right','Bottom','Left']) if (parseFloat(s['border' + side + 'Width']) > 0) props.push(['border', s['border' + side + 'Color']]);
    colorsIn(s.backgroundImage).forEach(c => props.push(['gradient', 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + c.a + ')']));
    for (const [prop, value] of props) { const c = parse(value); if (c && c.a > .05 && isOldBlue(c) && !(prop === 'color' && !el.textContent.trim() && !el.matches('i,.fas,.fa'))) out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.')) + ' ' + prop + ' ' + hex(c)); }
    return out; });
  const textFails = els => els.filter(el => !el.disabled && !el.closest('[disabled],[aria-disabled="true"]') && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).flatMap(el => {
    const s = getComputedStyle(el); const fg = parse(s.color); if (!fg) return [];
    const size = parseFloat(s.fontSize), large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    const worst = Math.min(...backgrounds(el).map(bg => ratio(fg.a < 1 ? blend(fg, bg) : fg, bg)));
    return worst + .005 < need ? [(el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.')) + ' "' + el.textContent.trim().slice(0, 24) + '" ' + worst.toFixed(2) + ' < ' + need] : [];
  });
  const AMBER = 'rgb(242, 183, 5)';
`;

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const evidence = path.join(root, 'docs', 'evidence', 'tema');
  fs.mkdirSync(evidence, { recursive: true });
  const faro = await openFaro(root);
  const run = body => faro.evaluate(`(async () => { ${audit} ${body} })()`);
  const shot = async name => { const s = await faro.command('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(evidence, name + '.png'), Buffer.from(s.data, 'base64')); };
  try {
    await faro.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    // Portão de instalação (primeira tela fora do app instalado) também veste a marca.
    const gate = await run(`await new Promise(r => setTimeout(r, 300)); const g = document.getElementById('faroInstallGate'); const b = g && g.querySelector('.faro-install-button');
      return g && shown(g) ? { blue: blueHits(scopeEls([g])), text: textFails(scopeEls([g])), bg: b && getComputedStyle(b).backgroundColor } : null;`);
    if (gate) {
      await shot('0-instalar');
      check('instalar: sem azul antigo', gate.blue.length === 0, gate.blue);
      check('instalar: texto AA', gate.text.length === 0, gate.text);
      check('instalar: botão âmbar', gate.bg === 'rgb(242, 183, 5)', gate.bg);
    }
    // Fora do modo instalado o app fica atrás do portão de instalação; o teste mede o produto, com dados de exemplo.
    await run(`
      document.getElementById('faroInstallGate')?.style.setProperty('display', 'none', 'important');
      document.documentElement.dataset.faroActivationStage = 'product';
      const app = window.__vettaApp; app.state.onboardingComplete = true; app.state.targetProfit = 4000;
      const key = offset => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() + offset); return app.dateKey(d); };
      app.state.records = [0,1,2,3].map(i => ({ id:'d' + i, date:key(-i), gross:300 - i * 20, km:120, hours:8, fuelSpend:0, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() })).sort((a,b) => a.date.localeCompare(b.date));
      app.save(); app.render(); return true;`);

    const screens = [
      { name: '1-inicio', view: 'dashboard', scope: '#view-dashboard', primary: '[data-faro-primary="true"]' },
      { name: '2-registrar', view: 'day', scope: '#view-day', primary: '#saveDayButton' },
      { name: '3-historico', view: 'history', scope: '#view-history' },
      { name: '4-planejar', view: 'planning', scope: '#view-planning' },
      { name: '5-reservas', view: 'planning', scope: '#faroMoneyDialog', open: `window.FaroPlanning.openMoney('reserves')` },
      { name: '6-central-conta', view: 'more', scope: '#view-more', primary: '#view-more button.bg-blue-600' }
    ];
    for (const screen of screens) {
      const result = await run(`
        const app = window.__vettaApp;
        document.querySelectorAll('dialog[open]').forEach(d => d.close());
        app.navigateToPrimary ? app.navigateToPrimary('${screen.view}') : app.showView('${screen.view}');
        ${screen.open || ''};
        await new Promise(r => setTimeout(r, 450)); window.scrollTo(0, 0);
        const modal = ${screen.open ? 'true' : 'false'};
        const roots = [document.querySelector('${screen.scope}')].concat(modal ? [] : [document.querySelector('nav.fixed.bottom-0'), document.querySelector('nav.sticky.top-0')]);
        const els = scopeEls(roots);
        const buttons = els.filter(el => el.matches('button,[role="button"]'));
        const primary = ${screen.primary ? `[...document.querySelectorAll('${screen.primary}')].find(shown)` : 'null'};
        const ps = primary && getComputedStyle(primary);
        return {
          count: els.length,
          blue: blueHits(els),
          blueButtons: blueHits(buttons),
          text: textFails(els),
          primary: primary ? { bg: ps.backgroundColor, ratio: ratio(parse(ps.color), parse(ps.backgroundColor)) } : null,
          body: getComputedStyle(document.body).backgroundColor
        };`);
      await shot(screen.name);
      check(`${screen.name}: tela renderizou`, result.count > 5, result.count);
      check(`${screen.name}: nenhum botão com azul antigo no estilo computado`, result.blueButtons.length === 0, result.blueButtons);
      check(`${screen.name}: nenhum elemento visível com azul antigo`, result.blue.length === 0, result.blue);
      check(`${screen.name}: todo texto com contraste AA`, result.text.length === 0, result.text);
      if (screen.primary) {
        check(`${screen.name}: botão primário âmbar`, result.primary && result.primary.bg === 'rgb(242, 183, 5)', result.primary);
        check(`${screen.name}: texto do primário AA (>=4.5)`, result.primary && result.primary.ratio >= 4.5, result.primary);
      }
      if (!screen.open) check(`${screen.name}: fundo papel quente #F6F1E4`, result.body === 'rgb(246, 241, 228)', result.body);
    }

    // Barra inferior: alvos >= 48px, rótulos >= 12px, item ativo em âmbar e legível.
    const nav = await run(`
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      window.__vettaApp.navigateToPrimary('history'); await new Promise(r => setTimeout(r, 200));
      const items = [...document.querySelectorAll('nav.fixed.bottom-0 .nav-item')].filter(shown);
      const active = items.find(i => i.classList.contains('active'));
      const a = getComputedStyle(active), before = getComputedStyle(active, '::before');
      return {
        heights: items.map(i => Math.round(i.getBoundingClientRect().height)),
        widths: items.map(i => Math.round(i.getBoundingClientRect().width)),
        fonts: items.map(i => parseFloat(getComputedStyle(i.querySelector('span')).fontSize)),
        activeAmber: [a.backgroundColor, a.color, a.borderTopColor, before.backgroundColor, a.boxShadow].some(v => String(v).includes('242, 183, 5')),
        labelRatios: items.map(i => { const s = i.querySelector('span'); return Math.min(...backgrounds(s).map(bg => ratio(parse(getComputedStyle(s).color), bg))); })
      };`);
    check('barra inferior: alvos >= 48px', nav.heights.every(h => h >= 48) && nav.widths.every(w => w >= 48), nav);
    check('barra inferior: rótulos >= 12px', nav.fonts.every(f => f >= 12), nav.fonts);
    check('barra inferior: item ativo em âmbar', nav.activeAmber, nav);
    check('barra inferior: rótulos com contraste AA', nav.labelRatios.every(r => r >= 4.5), nav.labelRatios);

    // Modo carro continua: preto, botões grandes, sem azul antigo; desligar volta ao tema claro.
    const car = await run(`
      window.FaroPwa.setCarMode(true); window.__vettaApp.navigateToPrimary('dashboard'); await new Promise(r => setTimeout(r, 250));
      const els = scopeEls([document.querySelector('#view-dashboard'), document.querySelector('nav.fixed.bottom-0')]);
      const btn = [...document.querySelectorAll('#view-dashboard button')].find(shown);
      return { body: getComputedStyle(document.body).backgroundColor, btn: btn && btn.getBoundingClientRect().height, blue: blueHits(els), text: textFails(els) };`);
    await shot('7-modo-carro');
    // O legado põe bg-slate-50 no <body>; o modo carro o pinta de #141414 (quase preto) desde a base PWA.
    check('modo carro: fundo preto', ['rgb(0, 0, 0)', 'rgb(20, 20, 20)'].includes(car.body), car.body);
    check('modo carro: botões >= 64px', car.btn >= 64, car.btn);
    check('modo carro: sem azul antigo', car.blue.length === 0, car.blue);
    check('modo carro: texto AA', car.text.length === 0, car.text);
    const off = await run(`window.FaroPwa.setCarMode(false); await new Promise(r => setTimeout(r, 100)); return getComputedStyle(document.body).backgroundColor;`);
    check('modo carro desligado: volta ao papel quente', off === 'rgb(246, 241, 228)', off);
  } finally {
    await faro.close();
  }
  if (failures.length) { console.error(`FARO tema global: ${failures.length} falha(s)`); process.exit(1); }
  console.log('FARO tema global no Chrome: 6 telas + modo carro sem azul antigo e com contraste AA — ok');
})().catch(error => { console.error(error); process.exit(1); });
