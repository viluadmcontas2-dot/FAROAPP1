// Acabamento no navegador real, em 3 telas (Android pequeno 360x740, 390x844 e desktop 1280x800) e nos dois temas:
// 1) nenhum texto cortado (overflow:hidden/ellipsis) nem rolagem horizontal, em todas as telas e folhas;
// 2) a dica de 1ª visita nunca cobre o fim da lista; o último item aparece inteiro acima da barra;
// 3) contraste >= 4,5:1, foco de teclado visível, nomes em botões só-ícone, teclado numérico, ordem do Tab,
//    prefers-reduced-motion respeitado e estados vazios que convidam a agir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../src/core/actions.js';
import { todayISO } from '../src/core/dates.js';
import { browserAvailable, buildSite, serve, launch, prepareShots, cleanup, watchErrors } from './helpers/e2e-app.mjs';
import { seedState, seedPage, click, button, hasText, bodyText } from './helpers/e2e-ui.mjs';
import { auditClipping, auditContrast, auditNames, auditFocus, auditMotion, auditScrollEnd } from './helpers/e2e-audit.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright não encontrados (veja tests/helpers/e2e-app.mjs)';
const VIEWPORTS = [{ name: 'android-pequeno', width: 360, height: 740 }, { name: 'celular', width: 390, height: 844 }, { name: 'tela-larga', width: 1280, height: 800 }];
const THEMES = ['noturno', 'dia'];

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

// motorista com 3 dias fechados e um ganho e um gasto hoje (telas cheias)
function fullState(theme) {
  const ctx = { today: todayISO() };
  let s = seedState({ closedAgo: [1, 2, 3, 5] });
  s = reduce(s, { type: 'entry/add', payload: { kind: 'in', plat: 'uber', amount: 150 } }, ctx);
  s = reduce(s, { type: 'entry/add', payload: { kind: 'out', cat: 'Alimentação', amount: 24 } }, ctx);
  return reduce(s, { type: 'theme/set', payload: { theme } }, ctx);
}
const emptyState = theme => reduce(seedState(), { type: 'theme/set', payload: { theme } }, { today: todayISO() });

async function open(vp, state, { reducedMotion } = {}) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...(reducedMotion ? { reducedMotion: 'reduce' } : {}) });
  // o service worker tem teste próprio; aqui ele recarregaria a página na 1ª instalação
  await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
  await seedPage(context, state);
  const page = await context.newPage();
  const errors = watchErrors(page);
  page.on('dialog', d => d.accept());
  await page.goto(server.url);
  await hasText(page, 'Lucro de verdade');
  return { context, page, errors };
}

// Faz as auditorias numa tela e junta tudo em `problems` (um teste só falha no fim, mostrando a lista inteira).
function auditor(page, problems, vp, tag) {
  const shots = prepareShots();
  return async (name, { contrast = true, focus = false, end = false, shot = false } = {}) => {
    await page.waitForTimeout(650); // animações de entrada
    const add = (kind, list) => list.forEach(m => problems.push(`[${name}] ${kind}: ${m}`));
    add('corte', await auditClipping(page));
    add('nome', await auditNames(page));
    if (contrast) add('contraste', await auditContrast(page));
    if (end) add('fim da lista', await auditScrollEnd(page));
    if (shot) await page.screenshot({ path: `${shots}/${vp.name}-${tag}-acab-${name}.png` });
    if (focus) {
      const r = await auditFocus(page);
      add('foco', r.problems);
    }
    await page.evaluate(() => { const sc = document.querySelector('.fscroll'); if (sc) sc.scrollTop = 0; });
  };
}

for (const vp of VIEWPORTS) for (const theme of THEMES) {
  test(`acabamento de todas as telas e folhas · ${vp.name} ${vp.width}x${vp.height} · ${theme}`, { skip }, async () => {
    const { context, page, errors } = await open(vp, fullState(theme));
    const problems = [];
    const check = auditor(page, problems, vp, theme);
    const shotHere = theme === 'noturno';

    // --- início: hoje, semana, mês
    await check('inicio', { focus: true, end: true, shot: shotHere });
    await click(page, 'Semana'); await check('inicio-semana', { end: true });
    await click(page, 'Mês'); await check('inicio-mes', { end: true });
    await click(page, 'Hoje');

    // --- folhas de lançamento: ganho, gasto (com "Estacionamento"), nova categoria
    await click(page, 'Anotar ganho'); await check('folha-ganho', { focus: true, shot: shotHere });
    await click(page, 'Gasto'); await click(page, 'Estacionamento'); await check('folha-gasto', { focus: true, shot: true });
    await click(page, 'Nova'); await check('folha-nova-categoria');
    await click(page, 'Fechar'); await page.waitForTimeout(300);

    // --- valor absurdo: o app pergunta antes (caixa de confirmação)
    await click(page, 'Anotar ganho');
    for (const d of ['9', '9', '9', '9', '9', '00']) await click(page, d);
    await click(page, 'Anotar ganho');
    await hasText(page, 'Esse valor está certo?');
    await check('pergunta', { focus: true });
    await click(page, 'Corrigir');
    await click(page, 'Fechar'); await page.waitForTimeout(300);

    // --- Contas (dica de 1ª visita), filtros e nova conta
    await click(page, 'Contas'); await hasText(page, 'Todas as contas num lugar só');
    await check('contas-com-dica', { end: true, shot: shotHere });
    await click(page, 'Entendi'); await check('contas', { end: true, focus: true });
    await page.getByRole('button', { name: /Casa/ }).first().click(); await check('contas-casa', { end: true });
    await page.getByRole('button', { name: /Pessoal/ }).first().click(); await check('contas-vazia', { end: true, shot: shotHere });
    await page.getByRole('button', { name: /Todas/ }).first().click();
    await click(page, 'Nova conta'); await check('folha-nova-conta', { focus: true, shot: shotHere });
    await click(page, 'Fechar'); await page.waitForTimeout(300);

    // --- Plano e Carro (dica + folha de ajuste)
    await click(page, 'Plano'); await hasText(page, 'Seu plano do mês');
    await check('plano-com-dica', { end: true, shot: shotHere });
    await click(page, 'Entendi'); await check('plano', { end: true, focus: true });
    await click(page, 'Editar plano'); await check('folha-plano', { focus: true, shot: shotHere });
    await click(page, /Pronto/); await page.waitForTimeout(300);
    await click(page, 'Carro'); await hasText(page, 'Quanto custa cada km');
    await check('carro-com-dica', { end: true, shot: shotHere });
    await click(page, 'Entendi'); await check('carro', { end: true, focus: true });
    await click(page, 'Editar'); await check('folha-carro', { focus: true });
    await click(page, /Pronto/); await page.waitForTimeout(300);

    // --- Lembretes, Jornada (dica), Conta
    await click(page, 'Início'); await click(page, 'Lembretes'); await hasText(page, 'avisos nos próximos 7 dias');
    await check('lembretes', { end: true, focus: true, shot: shotHere });
    await click(page, 'Voltar');
    await click(page, /dias?\s*Jornada/); await hasText(page, 'Sua nota');
    await check('jornada-com-dica', { end: true, shot: shotHere });
    await click(page, 'Entendi'); await check('jornada', { end: true, focus: true, shot: shotHere });
    await click(page, /Conta\s*Nuvem/); await hasText(page, 'Backup dos seus dados');
    await check('conta', { end: true, focus: true, shot: shotHere });
    await click(page, 'Voltar'); await click(page, 'Voltar');

    // --- fechar o dia: 3 passos e o resumo
    await click(page, 'Fechar dia'); await hasText(page, 'Quanto entrou hoje?');
    await check('fechar-dia-1', { focus: true, shot: shotHere });
    await click(page, 'Informar km e horas');
    await page.locator('input[placeholder="0"]').fill('100'); await click(page, '9h');
    await check('fechar-dia-2', { focus: true, shot: shotHere });
    await click(page, 'Fechar o dia'); await hasText(page, 'Dia fechado · lucro de verdade');
    await check('fechar-dia-resumo', { shot: shotHere });

    await context.close();
    assert.deepEqual(errors, [], 'o navegador não pode reportar erros');
    assert.deepEqual(problems, [], `${problems.length} problema(s) de acabamento:\n${problems.join('\n')}`);
  });
}

for (const vp of VIEWPORTS) {
  test(`acabamento do onboarding e da tela de instalar · ${vp.name} ${vp.width}x${vp.height}`, { skip }, async () => {
    const problems = [];
    // onboarding: estado de fábrica, 7 passos
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
    const page = await context.newPage();
    const check = auditor(page, problems, vp, 'onb');
    await page.goto(server.url); await hasText(page, 'Ver meu lucro de verdade');
    await check('onboarding-0', { focus: true, shot: true });
    await click(page, /^Ver meu lucro de verdade/);
    let i = 1;
    for (const [kicker, next] of [['Seus apps', 'Continuar'], ['Seu carro', 'Continuar'], ['Combustível', 'Continuar'], ['Sua vida', 'Continuar'], ['Meta', 'Continuar'], ['Pronto', 'Entrar no Faro']]) {
      await hasText(page, kicker.toUpperCase());
      await check(`onboarding-${i++}`, { focus: true, shot: true });
      await click(page, next);
    }
    await context.close();

    // fora do app instalado: só a tela "Instalar o Faro"
    const plain = await launch({ standalone: false }); // navegador comum: sem forçar o modo instalado
    const web = await plain.newContext({ viewport: { width: vp.width, height: vp.height } });
    await web.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
    const gate = await web.newPage();
    await gate.goto(server.url); await hasText(gate, 'Faro');
    const checkGate = auditor(gate, problems, vp, 'instalar');
    await checkGate('instalar', { focus: true, shot: true });
    await web.close(); await plain.close();
    assert.deepEqual(problems, [], `${problems.length} problema(s) de acabamento:\n${problems.join('\n')}`);
  });
}

// estados vazios que convidam a agir
for (const vp of VIEWPORTS) {
  test(`estados vazios convidam a agir (Início, Contas, Jornada) · ${vp.name}`, { skip }, async () => {
    const { context, page } = await open(vp, emptyState('noturno'));
    const shots = prepareShots();
    // Início: guia dos primeiros passos e os dois botões de anotar
    let text = await bodyText(page);
    assert.match(text, /Primeiros passos no Faro/);
    assert.ok(await button(page, 'Anotar ganho').count(), 'Início vazio oferece "Anotar ganho"');
    assert.ok(await button(page, 'Anotar gasto').count(), 'Início vazio oferece "Anotar gasto"');
    // Contas: um filtro sem nenhuma conta explica e oferece criar
    await click(page, 'Contas'); await click(page, 'Entendi');
    await page.getByRole('button', { name: /Pessoal/ }).first().click();
    await page.waitForTimeout(500);
    text = await bodyText(page);
    assert.match(text, /Nenhuma conta em Pessoal/, 'Contas vazia diz o que falta');
    assert.ok(await button(page, 'Adicionar conta').count(), 'Contas vazia convida: "Adicionar conta"');
    await page.screenshot({ path: `${shots}/${vp.name}-acab-vazio-contas.png` });
    await button(page, 'Adicionar conta').click();
    await hasText(page, 'Nova conta');
    await click(page, 'Fechar'); await page.waitForTimeout(300);
    // Jornada sem nenhum dia fechado: convite para fechar o primeiro dia
    await click(page, 'Início'); await click(page, /Jornada/); await click(page, 'Entendi');
    await page.waitForTimeout(500);
    text = await bodyText(page);
    assert.match(text, /Sua Jornada começa no primeiro dia fechado/, 'Jornada vazia explica');
    assert.ok(await button(page, 'Fechar meu primeiro dia').count(), 'Jornada vazia convida: "Fechar meu primeiro dia"');
    await page.screenshot({ path: `${shots}/${vp.name}-acab-vazio-jornada.png` });
    await button(page, 'Fechar meu primeiro dia').click();
    await hasText(page, 'Quanto entrou hoje?');
    await context.close();
  });
}

// prefers-reduced-motion: nada de animação, transição, rolagem suave nem contagem animada
for (const vp of VIEWPORTS) {
  test(`movimento reduzido é respeitado · ${vp.name}`, { skip }, async () => {
    const heroText = page => page.evaluate(() => { const e = [...document.querySelectorAll('div')].find(d => d.children.length === 3 && d.textContent.startsWith('R$')); return e ? e.textContent : null; });
    const swap = async page => { // troca Hoje -> Semana e lê o número grande 100 ms depois e quando assenta
      await click(page, 'Hoje'); await page.waitForTimeout(900);
      const before = await heroText(page);
      await click(page, 'Semana'); await page.waitForTimeout(100);
      const early = await heroText(page); await page.waitForTimeout(1000);
      return { before, early, final: await heroText(page) };
    };
    // com movimento normal o número ainda está contando (prova de que o teste enxerga a animação)
    const normal = await open(vp, fullState('noturno'));
    const n = await swap(normal.page);
    assert.notEqual(n.before, n.final, 'o número muda de Hoje para Semana');
    assert.notEqual(n.early, n.final, 'com movimento normal o número conta de um valor ao outro');
    await normal.context.close();

    const { context, page } = await open(vp, fullState('noturno'), { reducedMotion: true });
    const r = await swap(page);
    assert.equal(r.early, r.final, 'com movimento reduzido o número troca de uma vez, sem contar');
    const bad = [];
    const visit = async name => { await page.waitForTimeout(100); for (const m of await auditMotion(page)) bad.push(`[${name}] ${m}`); };
    await visit('inicio');
    await click(page, 'Anotar ganho'); await visit('folha');
    await click(page, 'Fechar');
    await click(page, 'Contas'); await visit('contas');
    await click(page, 'Plano'); await visit('plano');
    await click(page, 'Início'); await click(page, 'Lembretes'); await visit('lembretes');
    await context.close();
    assert.deepEqual(bad, [], `movimento sem respeitar prefers-reduced-motion:\n${bad.join('\n')}`);
  });
}
