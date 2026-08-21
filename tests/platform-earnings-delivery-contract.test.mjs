import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [shell, sw, build] = await Promise.all([
  readFile('app-shell.html', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('scripts/build-netlify-of.mjs', 'utf8')
]);

const helper = 'faro-register-earnings.js?v=1';
const register = 'faro-register.js?v=2';
const home = 'faro-home-r2.js?v=1';
const finance = 'faro-finance.js?v=1';

assert.match(shell, /faro-register-earnings\.js\?v=1/, 'shell precisa carregar helper de ganhos por origem');
assert.match(shell, /faro-register\.js\?v=2/, 'shell precisa carregar a geração nova de Registrar');
assert.ok(shell.indexOf(home) < shell.indexOf(helper), 'helper precisa carregar depois da Home');
assert.ok(shell.indexOf(helper) < shell.indexOf(register), 'helper precisa carregar antes do owner Registrar');
assert.ok(shell.indexOf(register) < shell.indexOf(finance), 'Registrar precisa continuar antes do Financeiro');

assert.match(sw, /const CORE_CACHE = 'faro-v1-core-22'/, 'feature precisa renovar o core cache instalado');
assert.match(sw, /\.\/faro-register-earnings\.js\?v=1/);
assert.match(sw, /\.\/faro-register\.js\?v=2/);
for (const asset of [
  './assets/platforms/faro-platform-99.svg',
  './assets/platforms/faro-platform-indrive.svg',
  './assets/platforms/faro-platform-uber.svg'
]) assert.equal(sw.includes(`'${asset}'`), true, `service worker precisa cachear ${asset}`);

assert.match(build, /'faro-register-earnings\.js'/);
for (const asset of [
  'assets/platforms/faro-platform-99.svg',
  'assets/platforms/faro-platform-indrive.svg',
  'assets/platforms/faro-platform-uber.svg'
]) assert.equal(build.includes(`'${asset}'`), true, `build precisa copiar ${asset}`);

console.log('platform-earnings-delivery-contract: shell, PWA e assets na mesma geração — ok');
