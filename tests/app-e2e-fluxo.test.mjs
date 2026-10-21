// Ponta a ponta no navegador real (Chromium): onboarding -> início vazio -> lançar ganho e gasto -> fechar o dia
// -> lucro/meta conferidos contra o `calc` do núcleo -> recarregar -> backup. Roda em celular (390x844) e em tela larga (1280x800).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reduce } from '../src/core/actions.js';
import { calc } from '../src/core/calc.js';
import { defaultState } from '../src/core/state.js';
import { todayISO, monthName } from '../src/core/dates.js';
import { R, fmt } from '../src/core/money.js';
import { browserAvailable, buildSite, serve, launch, prepareShots, cleanup, watchErrors } from './helpers/e2e-app.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright não encontrados (veja tests/helpers/e2e-app.mjs)';
const VIEWPORTS = [{ name: 'celular', width: 390, height: 844 }, { name: 'tela-larga', width: 1280, height: 800 }];

// o que o app TEM que mostrar, calculado direto pelo núcleo com as mesmas ações do roteiro
const today = todayISO();
const ctx = { today };
let expected = reduce(defaultState(), { type: 'onboarding/complete', payload: {} }, ctx);
expected = reduce(expected, { type: 'entry/add', payload: { kind: 'in', plat: 'uber', amount: 150 } }, ctx);
expected = reduce(expected, { type: 'entry/add', payload: { kind: 'in', plat: 'n99', amount: 80 } }, ctx);
expected = reduce(expected, { type: 'entry/add', payload: { kind: 'out', cat: 'Alimentação', amount: 24 } }, ctx);
expected = reduce(expected, { type: 'day/close', payload: { p: { uber: 150, n99: 80 }, km: 100, h: 9 } }, ctx);
const C = calc(expected, today);
const dayLucro = C.num(today).lucro;

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

// o nome acessível de um botão inclui o glifo do ícone (área privada Unicode): casa o texto ignorando glifos e espaços
const ICON_GLYPHS = '[\\s\\uE000-\\uF8FF]*';
const button = (page, name) => page.getByRole('button', { name: name instanceof RegExp ? name : new RegExp(`^${ICON_GLYPHS}${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${ICON_GLYPHS}$`) });
const click = (page, name) => button(page, name).click();
const dismissIntro = async page => { const ok = button(page, 'Entendi'); if (await ok.count()) await ok.click(); }; // balão de 1ª visita de cada tela
const savedState = page => page.evaluate(() => JSON.parse(localStorage.getItem('faro-v2-state')).state);
const flushed = page => page.waitForTimeout(700); // o app grava com atraso de 400 ms
const hasText = (page, text) => page.waitForFunction(t => document.body.innerText.includes(t), text);
// o número grande do herói é "R$" + inteiro + centavos em três filhos de um mesmo bloco
const heroShows = (page, value) => page.waitForFunction(t => [...document.querySelectorAll('div')].some(e => e.children.length === 3 && e.textContent === t), 'R$' + fmt(value));

for (const vp of VIEWPORTS) {
  test(`fluxo completo · ${vp.name} ${vp.width}x${vp.height}`, { skip }, async () => {
    const shots = prepareShots();
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, acceptDownloads: true });
    // o service worker tem teste próprio; aqui ele recarregaria a página na 1ª instalação e atrapalharia o roteiro
    await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
    const page = await context.newPage();
    const errors = watchErrors(page);
    page.on('dialog', d => d.accept());
    const shot = async name => { await page.waitForTimeout(600); await page.screenshot({ path: `${shots}/${vp.name}-${name}.png` }); }; // espera as animações de entrada
    const noBrokenNumbers = async tela => assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /NaN|undefined|Infinity|\{\{/, `número quebrado em ${tela}`);

    // --- tela cheia, sem moldura de celular
    await page.goto(server.url);
    await hasText(page, 'Ver meu lucro de verdade');
    const frame = await page.evaluate(() => {
      const app = document.querySelector('#root > div');
      const r = app.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, scrollX: document.documentElement.scrollWidth - innerWidth, fixed: getComputedStyle(app).position, text: document.body.innerText };
    });
    assert.equal(frame.fixed, 'fixed');
    assert.deepEqual([frame.w, frame.h], [frame.vw, frame.vh], 'o app deve ocupar 100% da viewport');
    assert.ok(frame.scrollX <= 0, 'sem rolagem horizontal');
    assert.doesNotMatch(frame.text, /9:41/, 'sem barra de status falsa');
    await shot('onboarding-0');

    // --- onboarding completo (7 passos)
    await click(page, /^Ver meu lucro de verdade/);
    for (const [kicker, next] of [['Seus apps', 'Continuar'], ['Seu carro', 'Continuar'], ['Combustível', 'Continuar'], ['Sua vida', 'Continuar'], ['Meta', 'Continuar'], ['Pronto', 'Entrar no Faro']]) {
      await hasText(page, kicker.toUpperCase());
      await click(page, next);
    }
    await hasText(page, 'Seu Faro está pronto');

    // --- início vazio e honesto
    await hasText(page, 'Lucro de verdade até agora');
    const empty = await page.evaluate(() => document.body.innerText);
    assert.match(empty, /Primeiros passos no Faro/, 'tela vazia convida a agir');
    assert.match(empty, /0 de 4 feitos/);
    assert.doesNotMatch(empty, /Troca de óleo|Chevrolet|84\.320/, 'nada inventado');
    await shot('home-vazia');

    // --- lançar ganhos e gasto
    await click(page, 'Anotar ganho');
    for (const d of ['1', '5', '0', '00']) await click(page, d);
    await click(page, 'Anotar ganho');
    await hasText(page, 'Ganho de R$ 150,00 anotado');
    await click(page, 'Anotar ganho');
    await click(page, '99');
    for (const d of ['8', '0', '00']) await click(page, d);
    await click(page, 'Anotar ganho');
    await hasText(page, 'Ganho de R$ 80,00 anotado');
    await click(page, 'Anotar gasto');
    await click(page, 'Alimentação');
    for (const d of ['2', '4', '00']) await click(page, d);
    await click(page, 'Anotar gasto');
    await hasText(page, 'Gasto de R$ 24,00 anotado');

    // --- fechar o dia (3 passos)
    await click(page, 'Fechar dia');
    await hasText(page, 'Quanto entrou hoje?');
    assert.equal(await page.locator('input[placeholder="0,00"]').first().inputValue(), '150,00', 'o que foi lançado vem preenchido');
    await shot('fechar-dia-1');
    await click(page, 'Informar km e horas');
    await page.locator('input[placeholder="0"]').fill('100');
    await click(page, '9h');
    await shot('fechar-dia-2');
    await click(page, 'Fechar o dia');
    await hasText(page, 'Dia fechado · lucro de verdade');
    await hasText(page, R(dayLucro, 2));
    await shot('fechar-dia-resumo');

    // --- lucro e meta conferidos contra o calc
    await click(page, 'Voltar ao início');
    await hasText(page, 'Lucro de verdade de hoje');
    await heroShows(page, dayLucro);
    await click(page, 'Mês');
    await hasText(page, `Lucro de verdade de ${monthName(today)}`);
    await hasText(page, `${R(C.month.lucro)} de ${R(C.target)}`);
    await shot('home-mes');
    await click(page, 'Hoje');
    await shot('home-hoje');

    // --- reabrir o resumo e concluir de novo não rende XP em dobro
    await click(page, 'Resumo');
    await click(page, 'Voltar ao início');
    await flushed(page);
    const afterClose = await savedState(page);
    assert.equal(afterClose.xp, 40, 'fechar o dia rende 40 XP uma única vez');
    assert.equal(afterClose.recs[today].closed, true);
    assert.equal(afterClose.exps.length, 1);

    // --- recarregar mantém tudo
    await page.reload();
    await hasText(page, 'Lucro de verdade de hoje');
    await heroShows(page, dayLucro);
    assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /Ver meu lucro de verdade/, 'não volta ao onboarding');
    assert.deepEqual(await savedState(page), afterClose);

    // --- cada tela abre com números reais (nada de NaN, nada de dado inventado)
    for (const [name, wanted] of [['Plano', 'Quanto ganhar por dia'], ['Carro', 'Cada km rodado custa'], ['Contas', 'Todas']]) {
      await click(page, name);
      await hasText(page, wanted);
      await noBrokenNumbers(name);
      if (name !== 'Contas') await shot(name.toLowerCase());
    }
    await click(page, 'Início');
    await click(page, 'Agenda');
    await hasText(page, 'nos próximos 7 dias');
    await noBrokenNumbers('Agenda');
    assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /Troca de óleo/, 'sem manutenção inventada');
    await shot('lembretes');
    await click(page, 'Voltar');

    // --- contas: pagar rende 10 XP
    await click(page, 'Contas');
    await hasText(page, 'Paguei');
    await button(page, 'Paguei').first().click();
    await flushed(page);
    assert.equal((await savedState(page)).xp, 50);
    await shot('contas');

    // --- backup: exportar, mudar, importar
    await click(page, 'Início');
    await click(page, /dias?\s*Jornada/);
    await hasText(page, 'Sua nota');
    await shot('jornada');
    await dismissIntro(page);
    await click(page, /Conta\s*Nuvem/);
    await hasText(page, 'Backup dos seus dados');
    const [download] = await Promise.all([page.waitForEvent('download'), click(page, 'Salvar backup')]);
    const file = await download.path();
    const backup = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(backup.app, 'FARO');
    assert.equal(backup.data.xp, 50);
    await shot('conta');
    await click(page, 'Voltar');
    await click(page, 'Voltar');
    await click(page, 'Contas');
    await button(page, 'Paguei').first().click();
    await flushed(page);
    assert.equal((await savedState(page)).xp, 60);
    await click(page, 'Início');
    await click(page, /dias?\s*Jornada/);
    await click(page, /Conta\s*Nuvem/);
    await page.locator('input[type=file]').setInputFiles(file);
    await hasText(page, 'Backup restaurado.');
    await flushed(page);
    assert.deepEqual(await savedState(page), backup.data, 'restaurar devolve exatamente o estado do backup');

    assert.deepEqual(errors, [], 'nenhum erro de console, exceção ou pedido que falhou');
    await context.close();
  });
}
