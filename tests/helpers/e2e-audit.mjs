// Auditorias de acabamento no navegador real: texto cortado, contraste, foco, nomes de botões, teclado numérico,
// movimento reduzido e fim da rolagem. Cada função roda dentro da página (autocontida) e devolve a lista de problemas.

// Termina de uma vez as animações em andamento (o Chromium sem tela só avança quadro a quadro) para ler o estado final.
export const settle = page => page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish(); } catch { /* animação infinita */ } } });

// Texto cortado (overflow:hidden / ellipsis) e rolagem horizontal da página.
export const auditClipping = page => page.evaluate(() => {
  const out = [];
  const label = e => `${e.tagName.toLowerCase()}${e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : ''}"${(e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`;
  const shown = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const doc = document.documentElement;
  if (doc.scrollWidth > innerWidth + 1) out.push(`rolagem horizontal da página: ${doc.scrollWidth} > ${innerWidth}`);
  for (const e of document.body.querySelectorAll('*')) {
    if (!shown(e) || e.closest('svg')) continue;
    const cs = getComputedStyle(e);
    const hasText = (e.textContent || '').trim().length > 0;
    const hidesX = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
    const hidesY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    if (hasText && hidesX && e.scrollWidth > e.clientWidth + 1) out.push(`texto cortado na largura (${e.scrollWidth}>${e.clientWidth}): ${label(e)}`);
    if (hasText && hidesY && e.scrollHeight > e.clientHeight + 1) out.push(`texto cortado na altura (${e.scrollHeight}>${e.clientHeight}): ${label(e)}`);
    // rolagem horizontal escondida em quem não é faixa de propósito (.hscroll)
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && !e.classList.contains('hscroll') && e.scrollWidth > e.clientWidth + 1) out.push(`rolagem horizontal inesperada (${e.scrollWidth}>${e.clientWidth}): ${label(e)} ${(e.getAttribute('style') || '').slice(0, 90)}`);
  }
  // folha de baixo (z-index 41): o conteúdo cabe na altura dela, sem teclado/botão por cima de outro
  for (const e of document.body.querySelectorAll('div')) {
    if (getComputedStyle(e).zIndex !== '41' || !shown(e)) continue;
    if (e.scrollHeight > e.clientHeight + 1) out.push(`conteúdo da folha estoura a altura (${e.scrollHeight}>${e.clientHeight})`);
    const pad = e.getBoundingClientRect();
    for (const c of e.querySelectorAll('button,input')) { if (c.closest('.hscroll') || c.closest('.fscroll')) continue; const r = c.getBoundingClientRect(); if (r.width && (r.bottom > pad.bottom + 1 || r.right > pad.right + 1 || r.left < pad.left - 1)) out.push(`controle fora da folha: ${label(c)}`); }
  }
  // texto que sai da tela (fora de faixas roláveis de propósito)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const e = n.parentElement;
    if (!e || !shown(e) || e.closest('.hscroll') || e.closest('svg')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width && (r.right > innerWidth + 1 || r.left < -1)) out.push(`texto fora da tela: ${label(e)} (${Math.round(r.left)}..${Math.round(r.right)} de ${innerWidth})`);
  }
  return out;
});

// Contraste WCAG: cor de texto computada (com a opacidade de quem está acima) contra o fundo.
// Fundo liso: composto dos ancestrais. Fundo em degradê: lê os pixels reais atrás do texto (captura com o texto transparente).
// Desativado de verdade (disabled / aria-disabled) fica de fora, como na regra da WCAG.
const decoders = new WeakMap();
async function decoderPage(page) {
  const ctx = page.context();
  if (!decoders.has(ctx)) decoders.set(ctx, await ctx.newPage());
  return decoders.get(ctx);
}

async function auditContrastOnce(page, min = 4.5) {
  const items = await page.evaluate(min => {
    const out = [];
    const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const over = (top, bottom) => { const a = top.a + bottom.a * (1 - top.a); return a === 0 ? { r: 0, g: 0, b: 0, a: 0 } : { r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a, g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a, b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a, a }; };
    const opacityOf = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    const label = e => `${e.tagName.toLowerCase()}"${(e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 36)}"`;
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || seen.has(el) || el.closest('svg') || el.closest('[disabled],[aria-disabled=true],[aria-hidden=true],[inert]')) continue;
      if (el.textContent.trim() === 'Λ' || /^F\s*Λ\s*RO$/.test(el.textContent.replace(/\s+/g, ' ').trim())) continue; // logotipo não tem regra de contraste (WCAG 1.4.3)
      const cs = getComputedStyle(el);
      const range = document.createRange(); range.selectNodeContents(n);
      const rect = range.getBoundingClientRect();
      if (cs.visibility === 'hidden' || cs.display === 'none' || !rect.width || !rect.height) continue;
      if (/\bph(-\w+)?\b/.test(el.className)) continue; // ícone de fonte, não texto
      seen.add(el);
      const fg = parse(cs.color); if (!fg) continue;
      const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
      // fundos possíveis: cada camada lisa compõe sobre as de baixo; degradê vira lista de cores (pior caso) e marca `grad`
      let bgs = [{ r: 255, g: 255, b: 255, a: 1 }], grad = false;
      const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e);
      for (const e of chain.reverse()) {
        const c = getComputedStyle(e);
        const color = parse(c.backgroundColor);
        if (color && color.a > 0) bgs = bgs.map(b => over(color, b));
        if (c.backgroundImage && /gradient/.test(c.backgroundImage)) {
          grad = true;
          // camadas separadas por vírgula de fora; a última é a de baixo. Cada cor de uma camada compõe sobre as de baixo (pior caso).
          const layers = []; let depth = 0, cur = '';
          for (const ch of c.backgroundImage) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { layers.push(cur); cur = ''; } else cur += ch; }
          layers.push(cur);
          for (const layer of layers.reverse()) {
            const stops = [...layer.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter(Boolean);
            if (stops.length) bgs = stops.flatMap(top => bgs.map(b => over(top, b))).slice(0, 80);
          }
        }
      }
      // parte do texto que o usuário vê agora: recorta pela tela e por cada contêiner que rola ou corta (faixas .hscroll, folhas)
      let vis = { l: Math.max(0, rect.left), t: Math.max(0, rect.top), r: Math.min(innerWidth, rect.right), b: Math.min(innerHeight, rect.bottom) };
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (ac.overflowX === 'visible' && ac.overflowY === 'visible') continue;
        const ar = a.getBoundingClientRect();
        vis = { l: Math.max(vis.l, ar.left), t: Math.max(vis.t, ar.top), r: Math.min(vis.r, ar.right), b: Math.min(vis.b, ar.bottom) };
      }
      const area = Math.max(0, vis.r - vis.l) * Math.max(0, vis.b - vis.t);
      if (area < rect.width * rect.height * 0.999) { seen.delete(el); if (area < rect.width * rect.height * 0.5) continue; } // fora de vista: outra passada (faixa rolada até o fim) cuida
      const inView = vis.b - vis.t > 0 && vis.r - vis.l > 0;
      out.push({ i: out.length, label: label(el), color: cs.color, o: opacityOf(el), fg, need: size >= 24 || (size >= 18.66 && bold) ? 3 : min, bgs: bgs.map(b => over({ ...b, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })), grad, inView, rect: { x: vis.l, y: vis.t, w: vis.r - vis.l, h: vis.b - vis.t } });
    }
    return out;
  }, min);

  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const blend = (fg, o, bg) => { const a = fg.a * o; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) }; };

  // pixels reais atrás dos textos em degradê que estão à vista
  const sampled = items.filter(x => x.grad && x.inView);
  const pixelBgs = new Map();
  if (sampled.length) {
    // folha de estilo construída (a CSP do app proíbe <style> inline, mas aceita esta)
    await page.evaluate(() => { const sh = new CSSStyleSheet(); sh.replaceSync('*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important}'); window.__noText = sh; document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; void document.body.offsetHeight; for (const a of document.getAnimations()) { try { a.finish(); } catch { /* infinita */ } } });
    {
      const png = await page.screenshot();
      await page.evaluate(() => { document.adoptedStyleSheets = document.adoptedStyleSheets.filter(x => x !== window.__noText); });
      const dec = await decoderPage(page);
      const dpr = await page.evaluate(() => devicePixelRatio);
      const px = await dec.evaluate(async ([b64, rects, dpr, vw]) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        return rects.map(r => {
          const pts = [];
          for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) pts.push([r.x + (r.w * (i + 0.5)) / 8, r.y + (r.h * (j + 0.5)) / 3]);
          return pts.map(([x, y]) => { const d = g.getImageData(Math.min(img.width - 1, Math.max(0, Math.round(x * dpr))), Math.min(img.height - 1, Math.max(0, Math.round(y * dpr))), 1, 1).data; return { r: d[0], g: d[1], b: d[2] }; });
        });
      }, [png.toString('base64'), sampled.map(s => s.rect), dpr, await page.evaluate(() => innerWidth)]);
      sampled.forEach((s, k) => pixelBgs.set(s.i, px[k]));
    }
  }

  const out = [];
  for (const x of items) {
    const bgs = pixelBgs.get(x.i) || x.bgs;
    let worst = Infinity;
    for (const bg of bgs) worst = Math.min(worst, ratio(blend(x.fg, x.o, bg), bg));
    if (worst < x.need) out.push(`contraste ${worst.toFixed(2)} < ${x.need}: ${x.label} cor ${x.color} opacidade ${x.o}${pixelBgs.has(x.i) ? ' (fundo lido dos pixels)' : ''}`);
  }
  return out;
}

// duas passadas: faixas .hscroll no começo e rolada até o fim (assim todo chip é lido enquanto está à vista)
export async function auditContrast(page, min = 4.5) {
  const out = await auditContrastOnce(page, min);
  const moved = await page.evaluate(() => { let n = 0; for (const e of document.querySelectorAll('.hscroll')) if (e.scrollWidth > e.clientWidth + 1) { e.style.scrollBehavior = 'auto'; e.scrollLeft = e.scrollWidth; n++; } return n; });
  if (moved) {
    await page.waitForTimeout(120);
    for (const m of await auditContrastOnce(page, min)) if (!out.includes(m)) out.push(m);
    await page.evaluate(() => { for (const e of document.querySelectorAll('.hscroll')) e.scrollLeft = 0; });
  }
  return out;
}

// Botões só-ícone sem nome, campos sem nome e teclado numérico errado.
export const auditNames = page => page.evaluate(() => {
  const out = [];
  const shown = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const strip = s => (s || '').replace(/[-\s]/g, '');
  const nameOf = e => {
    const lab = e.getAttribute('aria-label'); if (lab && lab.trim()) return lab.trim();
    const by = e.getAttribute('aria-labelledby'); if (by) { const t = by.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' '); if (strip(t)) return t; }
    if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') { const l = e.closest('label'); if (l && strip(l.textContent)) return l.textContent; if (e.id && document.querySelector(`label[for="${e.id}"]`)) return 'label'; return ''; }
    if (strip(e.textContent)) return e.textContent;
    if (e.getAttribute('title')) return e.getAttribute('title');
    return '';
  };
  const where = e => e.outerHTML.replace(/ style="[^"]*"/g, '').slice(0, 110);
  for (const e of document.body.querySelectorAll('button,a[href],[role=button],input:not([type=hidden]),select,textarea')) {
    if (!shown(e) && !(e.tagName === 'INPUT' && e.type === 'file')) continue;
    if (!nameOf(e)) out.push(`sem nome acessível: ${where(e)}`);
  }
  for (const e of document.body.querySelectorAll('input')) {
    if (!shown(e) || ['file', 'checkbox', 'radio', 'hidden'].includes(e.type)) continue;
    const ph = e.getAttribute('placeholder') || '', mode = e.getAttribute('inputmode'), name = (e.getAttribute('aria-label') || ph || e.id).slice(0, 30);
    if (e.type === 'number') out.push(`type=number (use inputmode): ${name}`);
    else if (e.type === 'email') { if (mode && mode !== 'email') out.push(`inputmode errado em e-mail: ${name}`); }
    else if (e.type === 'password') { /* teclado normal */ }
    else if (/^[\d.,\s]+$/.test(ph) && ph.trim()) {
      const want = ph.includes(',') ? 'decimal' : 'numeric';
      if (mode !== want) out.push(`campo numérico "${name}" (placeholder "${ph}") com inputmode=${mode} em vez de ${want}`);
    }
  }
  return out;
});

// Foco de teclado: percorre com Tab e confere o anel visível, a ordem e que o foco não escapa para trás de uma folha.
export async function auditFocus(page, { maxStops = 60, scope } = {}) {
  const problems = [];
  await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); window.scrollTo(0, 0); });
  const stops = [];
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.finish(); } catch { /* animação infinita */ } } // o anel de foco tem transição: lê o estado final
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 && !/rgba\([^)]*,\s*0\)/.test(cs.outlineColor);
      const shadow = cs.boxShadow !== 'none' && /\b[1-9]\d*px/.test(cs.boxShadow.replace(/rgba?\([^)]*\)/g, ''));
      const sc = document.querySelector('.fscroll');
      const inScroll = !!(sc && sc.contains(e)) && !e.closest('[role=dialog],[role=alertdialog]');
      const name = (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 30);
      // posição na página (dentro do contêiner que rola, soma a rolagem) para comparar com a ordem visual
      const top = r.top + (inScroll ? sc.scrollTop : 0);
      return { name, ring: ring || shadow, left: r.left, top, inScroll, visible: r.width > 0 && r.height > 0, key: e.outerHTML.slice(0, 120) };
    });
    if (!info) break;
    if (stops.length && stops[0].key === info.key && stops.length > 1) break; // deu a volta
    stops.push(info);
  }
  for (const s of stops) if (!s.ring) problems.push(`sem anel de foco: "${s.name}"`);
  // ordem: dentro do conteúdo, nunca volta mais de uma linha para cima; e depois do conteúdo vêm barra/folha (nunca o contrário)
  let seenOutside = false;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    if (!a.inScroll) seenOutside = true;
    if (b.inScroll && seenOutside) problems.push(`ordem de Tab: "${b.name}" (conteúdo) veio depois de "${a.name}" (fora do conteúdo)`);
    if (a.inScroll && b.inScroll && b.top < a.top - 8) problems.push(`ordem de Tab: "${b.name}" está acima de "${a.name}"`);
    if (a.inScroll && b.inScroll && Math.abs(b.top - a.top) <= 8 && b.left < a.left - 8) problems.push(`ordem de Tab: "${b.name}" está à esquerda de "${a.name}" na mesma linha`);
  }
  return { problems, stops: stops.map(s => s.name) };
}

// Com `reduce`, nada se mexe: animações e transições de todo o app duram (quase) zero.
export const auditMotion = page => page.evaluate(() => {
  const out = [];
  const secs = v => v.split(',').map(s => parseFloat(s) * (s.trim().endsWith('ms') ? 0.001 : 1));
  for (const e of document.querySelectorAll('body, body *')) {
    const cs = getComputedStyle(e);
    if (cs.animationName !== 'none' && Math.max(...secs(cs.animationDuration)) > 0.02) out.push(`animação ${cs.animationName} dura ${cs.animationDuration}: ${e.tagName.toLowerCase()}`);
    if (Math.max(...secs(cs.transitionDuration)) > 0.02) out.push(`transição ${cs.transitionDuration}: ${e.tagName.toLowerCase()}`);
    if (cs.scrollBehavior === 'smooth') out.push(`rolagem suave: ${e.tagName.toLowerCase()}`);
  }
  return [...new Set(out)];
});

// Rola a tela até o fim e confere que o último elemento com conteúdo está inteiro acima da barra (e da dica).
export async function auditScrollEnd(page) {
  await page.evaluate(() => { const sc = document.querySelector('.fscroll'); sc.style.scrollBehavior = 'auto'; sc.scrollTop = sc.scrollHeight; });
  await page.waitForTimeout(200);
  await settle(page);
  await page.getByText('role para ver mais').waitFor({ state: 'detached', timeout: 1500 }).catch(() => {});
  return page.evaluate(() => {
    const sc = document.querySelector('.fscroll');
    const nav = [...document.querySelectorAll('button')].find(b => /^\s*[-]*\s*Início\s*$/.test(b.innerText) || /Início/.test(b.innerText));
    const navBar = nav ? nav.parentElement : null;
    // tudo o que paira sobre o conteúdo: barra, dica de 1ª visita, aviso "role para ver mais"
    const floating = [...document.querySelectorAll('div,button')].filter(e => {
      if (sc.contains(e) || e.contains(sc)) return false;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return cs.position === 'absolute' && r.width > 40 && r.height > 30 && r.bottom > innerHeight / 2 && cs.zIndex !== '40' && cs.zIndex !== '41' && !(r.width >= innerWidth - 1 && r.height >= innerHeight - 1);
    });
    let top = innerHeight;
    for (const f of floating) top = Math.min(top, f.getBoundingClientRect().top);
    const items = [...sc.querySelectorAll('*')].filter(e => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return r.height > 0 && r.width > 0 && cs.visibility !== 'hidden' && ((e.children.length === 0 && (e.textContent || '').trim()) || e.tagName === 'BUTTON' || e.tagName === 'INPUT');
    });
    const last = items.reduce((m, e) => (e.getBoundingClientRect().bottom > m.getBoundingClientRect().bottom ? e : m), items[0]);
    const b = last.getBoundingClientRect();
    const atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
    const problems = [];
    if (!atEnd) problems.push('não chegou ao fim da rolagem');
    if (b.bottom > top + 0.5) problems.push(`último item "${(last.innerText || last.textContent || '').trim().slice(0, 30)}" termina em ${Math.round(b.bottom)}px e a barra/dica começa em ${Math.round(top)}px`);
    return problems;
  });
}
