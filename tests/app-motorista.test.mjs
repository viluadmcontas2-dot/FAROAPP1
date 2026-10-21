// O app na mão do motorista (Chromium, celular 390x844): erros do núcleo viram conversa, dia retroativo, palavras dele,
// uma porta por ação, legibilidade de rua, confiança (preço) e a conta do fechamento que fecha.
import test from 'node:test';
import assert from 'node:assert/strict';
import { calc } from '../src/core/calc.js';
import { reduce } from '../src/core/actions.js';
import { browserAvailable, buildSite, serve, launch, prepareShots, cleanup, watchErrors } from './helpers/e2e-app.mjs';
import { button, click, hasText, savedState, flushed, bodyText, today, daysAgo, seedState, seedPage, parseR, R } from './helpers/e2e-ui.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright não encontrados (veja tests/helpers/e2e-app.mjs)';
let siteDir, server, browser;
test.before(async () => {
  if (skip) return;
  siteDir = buildSite();
  server = await serve(siteDir);
  browser = await launch();
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
  if (siteDir) cleanup(siteDir);
});

// abre o app já com um estado semeado (sem passar pelo onboarding)
async function open(state, { name = 'x', shots = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
  if (state) await seedPage(context, state);
  const page = await context.newPage();
  const errors = watchErrors(page);
  page.on('dialog', d => d.accept());
  const dir = prepareShots();
  const shot = async n => { await page.waitForTimeout(600); await page.screenshot({ path: `${dir}/motorista-${name}-${n}.png` }); };
  await page.goto(server.url);
  return { context, page, errors, shot, shots };
}
const dismissIntros = async page => { for (let i = 0; i < 3; i++) { const ok = button(page, 'Entendi'); if (await ok.count()) await ok.first().click(); } };
const focusedId = page => page.evaluate(() => document.activeElement && document.activeElement.id);

test('erros do núcleo viram conversa: dia vazio, km vazio e valor improvável', { skip }, async () => {
  const { context, page, errors, shot } = await open(seedState(), { name: 'erros' });
  await hasText(page, 'Meta do dia');
  await click(page, 'Fechar dia');
  await hasText(page, 'Quanto entrou hoje?');
  // dia vazio: o botão responde
  await click(page, 'Informar km e horas');
  await hasText(page, 'Lance quanto entrou hoje');
  assert.ok(await focusedId(page), 'o foco vai para o primeiro campo de valor');
  await shot('dia-vazio');
  // valor improvável (R$ 99.999,99 num app só)
  await page.locator('input[placeholder="0,00"]').first().fill('99999,99');
  await click(page, 'Informar km e horas');
  // km vazio: mensagem no campo e foco nele
  await click(page, 'Fechar o dia');
  await hasText(page, 'Informe os km rodados');
  assert.equal(await focusedId(page), 'faro-km', 'o foco vai para o campo de km');
  await shot('km-vazio');
  await page.locator('#faro-km').fill('120');
  await click(page, 'Fechar o dia');
  await hasText(page, 'Esse valor está certo?');
  const dialog = await page.getByRole('alertdialog').innerText();
  assert.match(dialog, /R\$\s*99\.999,99 em Uber/);
  await shot('valor-improvavel');
  await click(page, 'Corrigir');
  await page.waitForFunction(() => !document.body.innerText.includes('Esse valor está certo?'));
  await flushed(page);
  assert.ok(!((await savedState(page)).recs[today()] || {}).closed, 'Corrigir não grava nada');
  await click(page, 'Fechar o dia');
  await hasText(page, 'Esse valor está certo?');
  await click(page, 'Sim, confirmar');
  await hasText(page, 'Dia fechado');
  await flushed(page);
  const rec = (await savedState(page)).recs[today()];
  assert.equal(rec.closed, true);
  assert.equal(rec.p.uber, 99999.99, 'Sim, confirmar reenvia confirmed:true');
  assert.deepEqual(errors, []);
  await context.close();
});

test('valor improvável ao anotar um ganho: confirmar grava, corrigir não', { skip }, async () => {
  const { context, page, errors } = await open(seedState(), { name: 'ganho-improvavel' });
  await hasText(page, 'Meta do dia');
  await click(page, 'Anotar ganho');
  for (const d of ['9', '00', '0', '00']) await click(page, d); // R$ 9.000,00
  await click(page, 'Anotar ganho');
  await hasText(page, 'Esse valor está certo?');
  assert.match(await page.getByRole('alertdialog').innerText(), /R\$\s*9\.000,00 em Uber/);
  await click(page, 'Corrigir');
  await flushed(page);
  assert.equal((await savedState(page)).recs[today()], undefined);
  await click(page, 'Anotar ganho');
  await hasText(page, 'Esse valor está certo?');
  await click(page, 'Sim, confirmar');
  await hasText(page, 'Ganho de R$ 9.000,00 anotado');
  await flushed(page);
  assert.equal((await savedState(page)).recs[today()].p.uber, 9000);
  assert.deepEqual(errors, []);
  await context.close();
});

test('dia retroativo: Fechar ontem, data sempre enviada e lançamento de ontem', { skip }, async () => {
  const { context, page, errors, shot } = await open(seedState({ closedAgo: [2] }), { name: 'retroativo' });
  await hasText(page, 'Meta do dia');
  const text = await bodyText(page);
  assert.match(text, /Ontem ficou aberto/, 'aviso discreto no Início');
  await shot('inicio-ontem-aberto');
  // lançamento de ontem pela folha
  await click(page, 'Anotar ganho');
  await click(page, 'Ontem');
  for (const d of ['5', '0', '00']) await click(page, d);
  await click(page, 'Anotar ganho');
  await hasText(page, 'Ganho de R$ 50,00 anotado');
  await flushed(page);
  let st = await savedState(page);
  assert.equal(st.recs[daysAgo(1)].p.uber, 50, 'o ganho de ontem cai em ontem');
  assert.equal(st.recs[today()], undefined, 'hoje não recebe nada');
  // fechar ontem
  await click(page, 'Fechar ontem');
  await hasText(page, 'Quanto entrou');
  assert.equal(await page.locator('input[placeholder="0,00"]').first().inputValue(), '50,00', 'o que foi anotado ontem vem preenchido');
  await shot('fechar-ontem');
  await click(page, 'Informar km e horas');
  await page.locator('#faro-km').fill('80');
  await click(page, 'Fechar o dia');
  await hasText(page, 'Dia fechado');
  await flushed(page);
  st = await savedState(page);
  assert.equal(st.recs[daysAgo(1)].closed, true);
  assert.equal(st.recs[daysAgo(1)].km, 80);
  assert.equal(st.recs[today()], undefined, 'hoje continua intocado');
  assert.deepEqual(errors, []);
  await context.close();
});

test('fechamento aberto na virada das 04:00 cai no dia que estava na tela', { skip }, async () => {
  const { context, page, errors } = await open(seedState(), { name: 'virada' });
  await hasText(page, 'Meta do dia');
  await click(page, 'Fechar dia');
  await page.locator('input[placeholder="0,00"]').first().fill('200');
  await click(page, 'Informar km e horas');
  await page.locator('#faro-km').fill('130');
  // o relógio passa da virada com a tela aberta
  await page.evaluate(() => {
    const Real = Date, off = 24 * 3600 * 1000;
    window.Date = class extends Real { constructor(...a) { if (a.length) super(...a); else super(Real.now() + off); } static now() { return Real.now() + off; } };
  });
  const original = today();
  await click(page, 'Fechar o dia');
  await hasText(page, 'Dia fechado');
  await flushed(page);
  const st = await savedState(page);
  assert.equal(st.recs[original].closed, true, 'o dia da tela é o que fecha');
  assert.equal(Object.keys(st.recs).length, 1, 'o dia seguinte não ganha registro');
  assert.deepEqual(errors, []);
  await context.close();
});

// ---- telas para varrer palavras, tamanhos e portas
async function walk(page, visit) {
  const dismiss = () => dismissIntros(page);
  await visit('inicio-hoje');
  for (const [label, name] of [['Semana', 'inicio-semana'], ['Mês', 'inicio-mes']]) { await click(page, label); await visit(name); }
  await click(page, 'Hoje');
  for (const [nav, wanted, name] of [['Plano', 'Quanto ganhar por dia', 'plano'], ['Carro', 'Cada km rodado custa', 'carro'], ['Contas', 'A pagar', 'contas']]) {
    await click(page, nav); await hasText(page, wanted); await visit(name); await dismiss();
  }
  await click(page, 'Início');
  await click(page, 'Lembretes'); await hasText(page, 'avisos nos próximos 7 dias'); await visit('lembretes'); await click(page, 'Voltar');
  await click(page, /Jornada/); await hasText(page, 'Sua nota'); await visit('jornada'); await dismiss();
  await click(page, /^\s*Conta/); await hasText(page, 'Seus dados'); await visit('conta'); await click(page, 'Voltar'); await click(page, 'Voltar');
  await click(page, 'Resumo'); await hasText(page, 'Lucro de verdade'); await visit('resumo');
  await click(page, 'Voltar ao início');
}

const state1 = () => seedState({ closedAgo: [0, 2], close: { p: { uber: 150, n99: 80 }, km: 100, h: 9 } });

test('palavras do motorista em todas as telas', { skip }, async () => {
  const { context, page, errors } = await open(state1(), { name: 'palavras' });
  await hasText(page, 'Meta do dia');
  const FORBIDDEN = [/\bBruto\b/, /\bbruto\b/, /Lucro líquido/i, /Lançar/, /lançad/i, /lance pelo/i, /Índice Faro/, /projeção/i, /Faturar/i, /faturad/i, /Constância/, /Prévia/, /\bXP\b/, /Farejar/, /Custos\b/, /Carro fixo/];
  await walk(page, async name => {
    const text = await bodyText(page);
    for (const re of FORBIDDEN) assert.doesNotMatch(text, re, `palavra de jargão ${re} na tela ${name}`);
  });
  // as palavras certas existem onde o jargão estava
  assert.match(await bodyText(page), /Lucro de verdade/);
  await click(page, 'Anotar gasto');
  assert.match(await bodyText(page), /Anotar gasto/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('uma porta por ação: sem botões nem faixas repetidos', { skip }, async () => {
  const { context, page, errors } = await open(state1(), { name: 'portas' });
  await hasText(page, 'Meta do dia');
  const count = async name => button(page, name).count();
  // Início: um só caminho para fechar o dia e um só para anotar
  assert.equal(await count('Resumo'), 1, 'Resumo só na barra de baixo');
  assert.equal(await count('Anotar ganho'), 1);
  assert.equal(await count('Anotar gasto'), 1);
  assert.equal(await count(/^\s*Lançar/), 0, 'sem botão Lançar duplicado');
  assert.equal(await count('Ganho'), 0, 'o nome curto Ganho não aparece junto da folha fechada');
  const open1 = await seedStateOpenDay();
  await context.close();
  const b = await open(open1, { name: 'portas-aberto' });
  await hasText(b.page, 'Meta do dia');
  assert.equal(await button(b.page, 'Fechar dia').count(), 1, 'Fechar dia só na barra de baixo');
  // Carro: só "Editar"
  await click(b.page, 'Carro'); await hasText(b.page, 'Cada km rodado custa');
  assert.equal(await button(b.page, 'Editar').count(), 1);
  assert.equal(await button(b.page, 'Ajustar').count(), 0, 'sem Ajustar duplicado');
  assert.doesNotMatch(await bodyText(b.page), /Toque em Ajustar/i);
  // Plano: um caminho só para editar
  await click(b.page, 'Plano'); await hasText(b.page, 'Quanto ganhar por dia');
  assert.equal(await button(b.page, 'Editar plano').count(), 1);
  assert.equal(await b.page.locator('button i.ph-pencil-simple').count(), 0, 'sem lápis repetido nas linhas do plano');
  // Contas: sem faixa "toque em Paguei"
  await click(b.page, 'Contas'); await hasText(b.page, 'A pagar');
  assert.doesNotMatch(await bodyText(b.page), /toque em .?Paguei/i);
  assert.deepEqual(b.errors, []);
  await b.context.close();
});

const seedStateOpenDay = async () => seedState({ closedAgo: [2] });

test('uma dica por vez, dispensável e que não volta', { skip }, async () => {
  const { context, page, errors } = await open(seedState(), { name: 'dicas' });
  await hasText(page, 'Meta do dia');
  await click(page, 'Plano'); await hasText(page, 'Quanto ganhar por dia');
  assert.equal(await button(page, 'Entendi').count(), 1, 'uma dica por vez');
  await click(page, 'Contas'); // sai sem tocar em Entendi: a dica do Plano some para sempre
  await click(page, 'Plano');
  await page.waitForTimeout(500);
  assert.equal(await button(page, 'Entendi').count(), 0, 'dica que já saiu da tela não volta');
  await click(page, 'Início');
  await click(page, 'Lembretes'); await hasText(page, 'avisos nos próximos 7 dias');
  assert.equal(await button(page, 'Entendi').count(), 0, 'Lembretes não repete o título numa faixa');
  assert.deepEqual(errors, []);
  await context.close();
});

test('legibilidade de rua: texto >= 14 px, alvos >= 44 px, Paguei grande, rótulo no botão central, toast embaixo', { skip }, async () => {
  const { context, page, errors, shot } = await open(state1(), { name: 'rua' });
  await hasText(page, 'Meta do dia');
  const problems = [];
  const scan = async name => {
    await page.waitForTimeout(450);
    const found = await page.evaluate(() => {
      const out = [], vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight && parseFloat(cs.opacity) > 0.05; };
      for (const el of document.querySelectorAll('body *')) {
        if (!vis(el)) continue;
        const own = [...el.childNodes].some(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent));
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (own && fs < 13.99) out.push(`texto ${fs}px: "${el.textContent.trim().slice(0, 30)}"`);
      }
      for (const el of document.querySelectorAll('button, [role=button], input:not([type=file]), label:has(input[type=file])')) {
        if (!vis(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.height < 43.5 || r.width < 43.5) out.push(`alvo ${Math.round(r.width)}x${Math.round(r.height)}: "${(el.textContent || el.placeholder || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`);
      }
      return [...new Set(out)];
    });
    for (const f of found) problems.push(`${name}: ${f}`);
  };
  await walk(page, scan);
  // abrir folhas e o fechamento também
  await click(page, 'Anotar gasto'); await scan('folha-gasto'); await click(page, 'Fechar');
  await click(page, 'Carro'); await click(page, 'Editar'); await scan('folha-carro'); await click(page, /^\s*Pronto/);
  await click(page, 'Início');
  assert.deepEqual(problems, [], 'texto pequeno ou alvo de toque pequeno:\n' + problems.join('\n'));

  // Paguei grande e rótulo embaixo do botão central
  await click(page, 'Contas'); await hasText(page, 'A pagar');
  await dismissIntros(page);
  const pay = await button(page, 'Paguei').first().boundingBox();
  assert.ok(pay.height >= 44 && pay.width >= 64, `Paguei ${pay.width}x${pay.height}`);
  const nav = await page.evaluate(() => {
    const fab = [...document.querySelectorAll('button')].find(b => /Fechar dia|Resumo/.test(b.textContent));
    const icon = fab.querySelector('i').getBoundingClientRect(), label = [...fab.querySelectorAll('span')].find(s => /Fechar dia|Resumo/.test(s.textContent)).getBoundingClientRect();
    return { iconBottom: icon.bottom, labelTop: label.top };
  });
  assert.ok(nav.labelTop >= nav.iconBottom - 1, 'o rótulo fica embaixo do ícone do botão central');
  // toast embaixo, acima da barra, fora do cabeçalho
  await click(page, 'Início');
  await click(page, 'Anotar ganho');
  for (const d of ['1', '0', '00']) await click(page, d);
  await click(page, 'Anotar ganho');
  await hasText(page, 'anotado');
  const toast = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(d => d.children.length && /anotado/.test(d.textContent) && getComputedStyle(d).position === 'absolute' && d.textContent.length < 60);
    const r = el.getBoundingClientRect(), navEl = [...document.querySelectorAll('button')].find(b => /Fechar dia|Resumo/.test(b.textContent)).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, navTop: navEl.top, vh: innerHeight };
  });
  assert.ok(toast.top > toast.vh / 2, 'toast na metade de baixo');
  assert.ok(toast.bottom <= toast.navTop, 'toast acima da barra');
  await shot('toast');
  assert.deepEqual(errors, []);
  await context.close();
});

test('confiança: preço e 7 dias grátis na 1ª tela; restaurar backup é secundário e avisa', { skip }, async () => {
  const { context, page, errors, shot } = await open(null, { name: 'confianca' });
  await hasText(page, 'Ver meu lucro de verdade');
  const first = await bodyText(page);
  assert.match(first, /Grátis por 7 dias · depois R\$ 22,99\/mês/);
  assert.equal(await button(page, /pagar|assinar|cartão/i).count(), 0, 'sem botão de pagar enquanto a assinatura não abre');
  await shot('onboarding-0');
  // tela Conta
  await click(page, /Já uso o Faro/);
  await hasText(page, 'Seus dados');
  const t = await bodyText(page);
  assert.match(t, /Sem conta, seus dados ficam só neste aparelho/);
  const colors = await page.evaluate(() => {
    const restore = [...document.querySelectorAll('label')].find(l => /Restaurar backup/.test(l.textContent));
    const save = [...document.querySelectorAll('button')].find(b => /Salvar backup/.test(b.textContent));
    return { restore: getComputedStyle(restore).backgroundColor, save: getComputedStyle(save).backgroundColor };
  });
  assert.notEqual(colors.restore, colors.save, 'Restaurar não tem o mesmo destaque de Salvar backup');
  // dourado = cor do botão principal do onboarding (gold do tema)
  await shot('conta');
  assert.deepEqual(errors, []);
  await context.close();
});

test('a conta do fechamento fecha: quanto entrou − custos = lucro de verdade, com os números do calc', { skip }, async () => {
  const s = seedState({ closedAgo: [0] });
  const C = calc(s, today()), n = C.num(today());
  const { context, page, errors, shot } = await open(s, { name: 'conta-do-dia' });
  await hasText(page, 'Meta do dia');
  await click(page, 'Resumo');
  await hasText(page, 'Lucro de verdade');
  const card = page.locator('#conta-do-dia');
  await card.waitFor();
  const rows = (await card.innerText()).split('\n').map(x => x.trim()).filter(Boolean);
  const valueOf = re => { const i = rows.findIndex(r => re.test(r)); assert.ok(i >= 0, `linha ${re} não achada em ${JSON.stringify(rows)}`); return parseR(rows[i + 1] ?? rows[i]); };
  const entrou = valueOf(/^Quanto entrou/);
  const custos = rows.reduce((a, r, i) => (/^(−|-)\s*/.test(rows[i + 1] || '') && /R\$/.test(rows[i + 1] || '') ? a + Math.abs(parseR(rows[i + 1])) : a), 0);
  const lucro = valueOf(/^Lucro de verdade/);
  assert.equal(entrou, Math.round(n.g * 100) / 100, 'quanto entrou = bruto do calc');
  assert.equal(lucro, Math.round(n.lucro * 100) / 100, 'lucro de verdade = lucro do calc');
  assert.ok(Math.abs(entrou - custos - lucro) < 0.03, `${entrou} − ${custos} deveria dar ${lucro}`);
  // a sugestão divide o lucro de verdade, não um total diferente
  const sug = (await page.locator('#sugestao-faro').innerText()).split('\n').map(x => x.trim()).filter(Boolean);
  const parts = sug.filter(r => /^R\$/.test(r)).map(parseR);
  const soma = parts.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(soma - Math.max(0, lucro)) < 0.05, `a sugestão soma ${soma} e o lucro de verdade é ${lucro}`);
  await shot('resumo');
  assert.deepEqual(errors, []);
  await context.close();
});

test('o código da tela não filtra mais por onboardedAt', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../src/ui/', import.meta.url);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.js'))) assert.doesNotMatch(readFileSync(new URL(f, dir), 'utf8'), /onboardedAt/, f);
  void reduce; void R;
});
