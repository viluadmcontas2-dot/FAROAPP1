// Detector do modo instalado: iPhone, Android, navegador embutido e standalone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectInstall, installCopy, readInstallEnv, isInstalled } from '../src/ui/install-gate.js';

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  iosInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 Instagram 330.0.0.20.114 (iPhone14,2; iOS 17_4)',
  iosWebview: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  androidFacebook: 'Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]',
  androidWebview: 'Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

test('standalone: media query ou navigator.standalone (iOS) contam como instalado', () => {
  assert.equal(detectInstall({ userAgent: UA.androidChrome, standaloneMedia: true }).installed, true);
  assert.equal(detectInstall({ userAgent: UA.iosSafari, navStandalone: true }).installed, true);
  assert.equal(detectInstall({ userAgent: UA.iosSafari }).installed, false);
  assert.equal(detectInstall({ userAgent: UA.androidChrome, standaloneMedia: true }).embedded, null);
});

test('iPhone e iPad (que se apresenta como Mac)', () => {
  assert.deepEqual(detectInstall({ userAgent: UA.iosSafari }), { installed: false, os: 'ios', browser: 'safari', embedded: null });
  assert.equal(detectInstall({ userAgent: UA.iosChrome }).browser, 'chrome');
  assert.equal(detectInstall({ userAgent: UA.desktop, platform: 'MacIntel', maxTouchPoints: 5 }).os, 'ios');
  assert.equal(detectInstall({ userAgent: UA.desktop, platform: 'MacIntel', maxTouchPoints: 0 }).os, 'desktop');
});

test('Android e desktop', () => {
  assert.deepEqual(detectInstall({ userAgent: UA.androidChrome }), { installed: false, os: 'android', browser: 'chrome', embedded: null });
  assert.equal(detectInstall({ userAgent: UA.androidSamsung }).browser, 'samsung');
  assert.equal(detectInstall({ userAgent: UA.desktop }).os, 'desktop');
});

test('navegador embutido (Instagram, Facebook, WebView) pede para abrir no navegador', () => {
  assert.equal(detectInstall({ userAgent: UA.iosInstagram }).embedded, 'Instagram');
  assert.equal(detectInstall({ userAgent: UA.androidFacebook }).embedded, 'Facebook');
  assert.equal(detectInstall({ userAgent: UA.androidWebview }).embedded, 'app');
  assert.equal(detectInstall({ userAgent: UA.iosWebview }).embedded, 'app');
  assert.equal(detectInstall({ userAgent: UA.iosChrome }).embedded, null);
  assert.equal(detectInstall({ userAgent: UA.iosSafari }).embedded, null);
});

test('texto da tela: cada situação tem o passo certo', () => {
  const ios = installCopy(detectInstall({ userAgent: UA.iosSafari }), false, false);
  assert.equal(ios.kind, 'ios');
  assert.match(ios.steps.map(s => s[1]).join('|'), /Compartilhar.*Adicionar à Tela de Início/);
  const android = installCopy(detectInstall({ userAgent: UA.androidChrome }), true, false);
  assert.equal(android.kind, 'prompt'); assert.equal(android.install, true);
  assert.equal(installCopy(detectInstall({ userAgent: UA.androidChrome }), false, false).kind, 'android');
  const emb = installCopy(detectInstall({ userAgent: UA.iosInstagram }), false, false);
  assert.equal(emb.title, 'Abra no Safari');
  assert.equal(installCopy(detectInstall({ userAgent: UA.androidFacebook }), true, false).title, 'Abra no Chrome'); // embutido vence o prompt
  const done = installCopy(detectInstall({ userAgent: UA.androidChrome }), false, true);
  assert.match(done.text, /ícone/);
});

test('lê o ambiente do navegador', () => {
  const win = { navigator: { userAgent: UA.iosSafari, standalone: true }, matchMedia: () => ({ matches: false }) };
  assert.equal(isInstalled(win), true);
  const win2 = { navigator: { userAgent: UA.androidChrome }, matchMedia: q => ({ matches: q === '(display-mode: standalone)' }) };
  assert.equal(readInstallEnv(win2).standaloneMedia, true);
  assert.equal(isInstalled({ navigator: { userAgent: UA.androidChrome }, matchMedia: () => ({ matches: false }) }), false);
  assert.equal(isInstalled({ navigator: { userAgent: UA.androidChrome } }), false); // sem matchMedia
});
