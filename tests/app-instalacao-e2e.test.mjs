// "Só funciona instalado": no navegador comum aparece apenas a tela "Instalar o Faro"; instalado (standalone) abre o app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { browserAvailable, buildSite, serve, launch, forceStandalone, prepareShots, cleanup, watchErrors } from './helpers/e2e-app.mjs';

const skip = browserAvailable() ? false : 'Chromium ou Playwright não encontrados (veja tests/helpers/e2e-app.mjs)';
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 Instagram 330.0.0.20.114 (iPhone14,2; iOS 17_4)',
};
const PHONE = { width: 390, height: 844 }, WIDE = { width: 1280, height: 800 };

let siteDir, server, browser;
test.before(async () => {
  if (skip) return;
  siteDir = buildSite();
  server = await serve(siteDir);
  browser = await launch({ standalone: false }); // navegador comum: nada de standalone
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
  if (siteDir) cleanup(siteDir);
});

const open = async (opts, init) => {
  const context = await browser.newContext(opts);
  await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; }); // o service worker tem teste próprio
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto(server.url);
  await page.waitForFunction(() => document.getElementById('root') && document.getElementById('root').children.length > 0);
  return { context, page, errors };
};
const text = page => page.evaluate(() => document.body.innerText);
const appHidden = async page => {
  const body = await text(page);
  assert.doesNotMatch(body, /Ver meu lucro de verdade|Já uso o Faro|Lucro de verdade/, 'fora do modo instalado o app não pode aparecer');
  assert.equal(await page.evaluate(() => localStorage.getItem('faro-v2-state')), null, 'a tela de instalar não toca nos dados');
};

test('Android/Chrome: botão "Instalar o Faro" chama prompt() e depois manda abrir pelo ícone', { skip }, async () => {
  const shots = prepareShots();
  const { context, page, errors } = await open({ viewport: PHONE, userAgent: UA.android, isMobile: true, hasTouch: true });
  assert.match(await text(page), /O Faro é um app de celular|Instale o Faro no celular/);
  await appHidden(page);
  // o Chrome avisa que dá para instalar: o botão aparece
  await page.evaluate(() => {
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    ev.prompt = async () => { window.__prompted = (window.__prompted || 0) + 1; };
    ev.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(ev);
  });
  const install = page.getByRole('button', { name: 'Instalar o Faro' });
  await install.waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/celular-instalar-android.png` });
  await install.click();
  await page.waitForFunction(() => document.body.innerText.includes('Faro instalado'));
  assert.equal(await page.evaluate(() => window.__prompted), 1, 'prompt() chamado uma vez');
  assert.match(await text(page), /Abra o Faro pelo ícone|abra o Faro pelo ícone/i);
  await appHidden(page);
  assert.deepEqual(errors, []);
  await context.close();
});

test('iPhone/Safari: passo a passo Compartilhar → Adicionar à Tela de Início, sem botão de prompt', { skip }, async () => {
  const shots = prepareShots();
  const { context, page, errors } = await open({ viewport: PHONE, userAgent: UA.iphone, isMobile: true, hasTouch: true });
  const body = await text(page);
  assert.match(body, /Instale o Faro no iPhone/);
  assert.match(body, /Toque em Compartilhar/);
  assert.match(body, /Toque em Adicionar à Tela de Início/);
  assert.equal(await page.getByRole('button', { name: 'Instalar o Faro' }).count(), 0, 'iPhone não tem prompt');
  await appHidden(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/celular-instalar-iphone.png` });
  assert.deepEqual(errors, []);
  await context.close();
});

test('navegador embutido (Instagram): pede para abrir no Safari', { skip }, async () => {
  const { context, page, errors } = await open({ viewport: PHONE, userAgent: UA.instagram, isMobile: true, hasTouch: true });
  assert.match(await text(page), /Abra no Safari/);
  await appHidden(page);
  await page.getByRole('button', { name: 'Copiar link' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('tela larga: mostra só a tela de instalar, sem rolagem horizontal', { skip }, async () => {
  const shots = prepareShots();
  const { context, page, errors } = await open({ viewport: WIDE });
  await appHidden(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem horizontal');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/tela-larga-instalar.png` });
  assert.deepEqual(errors, []);
  await context.close();
});

test('instalado: standalone (Android) e navigator.standalone (iOS) abrem o app', { skip }, async () => {
  for (const [opts, init] of [[{ viewport: PHONE, userAgent: UA.android }, forceStandalone],
    [{ viewport: PHONE, userAgent: UA.iphone }, () => Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })]]) {
    const { context, page, errors } = await open(opts, init);
    await page.waitForFunction(() => document.body.innerText.includes('Ver meu lucro de verdade'));
    assert.doesNotMatch(await text(page), /Instalar o Faro|Instale o Faro/);
    assert.deepEqual(errors, []);
    await context.close();
  }
});
