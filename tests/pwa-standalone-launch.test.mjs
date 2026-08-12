import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const installPage = readFileSync('index.html', 'utf8');
const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
const sw = readFileSync('sw.js', 'utf8');

const bodyPosition = installPage.indexOf('<body');
const redirectPosition = installPage.indexOf("location.replace('./app-shell.html')");
const hidePosition = installPage.indexOf("document.documentElement.classList.add('standalone-launch')");

assert.equal(manifest.start_url, './app-shell.html', 'PWA instalado deve abrir diretamente o app shell');
assert.ok(hidePosition > -1 && hidePosition < bodyPosition, 'modo standalone deve ser escondido antes do primeiro paint');
assert.ok(redirectPosition > -1 && redirectPosition < bodyPosition, 'instalações antigas devem redirecionar antes do body');
assert.ok(installPage.includes('html.standalone-launch body'));
assert.ok(installPage.includes('visibility: hidden') || installPage.includes('visibility:hidden'));
assert.ok(!installPage.includes("fetch('./app-shell.html'"), 'troca assíncrona causava a piscada da instalação');
assert.ok(sw.includes("calculaae-install-flow-5"), 'cache deve mudar após alteração crítica do fluxo PWA');

console.log('PWA standalone launch contract passed');
