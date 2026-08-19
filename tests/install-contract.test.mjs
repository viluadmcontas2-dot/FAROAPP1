import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const platform = await readFile('faro-platform.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-netlify-of.mjs', 'utf8');
const onboarding = await readFile('faro-onboarding.js', 'utf8');
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
const icon192 = await readFile('icon-192.png');
const icon512 = await readFile('icon-512.png');

const contains = (source, snippet, label) => assert.equal(source.includes(snippet), true, label);
const pngSize = buffer => {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Arquivo precisa ser PNG válido');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
};

contains(platform, 'const INSTALL_GATE_ENFORCED = true', 'Instalação comercial precisa ser obrigatória');
contains(platform, "!app.isStandalone()", 'Gate deve liberar somente o app instalado');
contains(platform, 'Instale o FARO', 'Gate precisa pedir instalação de forma direta');
contains(platform, 'Seu FARO, sempre à mão.', 'Abertura precisa ter identidade sem explicar tecnologia');
contains(platform, 'INSTALAR FARO', 'Android/computador precisam ter ação clara de instalação');
contains(platform, 'Adicionar à Tela de Início', 'iPhone precisa ter tutorial de instalação');
contains(platform, 'SamsungBrowser', 'Samsung Internet precisa de fallback próprio');
contains(platform, 'window.__faroInstallPrompt', 'Plataforma precisa consumir o prompt capturado cedo');
contains(platform, 'waitForInstallPrompt', 'Botão precisa aguardar prompt tardio antes do fallback');
contains(platform, 'prompt.userChoice', 'Gate precisa tratar aceite ou recusa do instalador');
contains(platform, "setAttribute('inert', '')", 'Produto atrás do gate não pode continuar interativo');
contains(platform, "root.dataset.faroPlatformReady = 'true'", 'Interface só pode ser liberada depois da decisão da plataforma');
contains(platform, 'canEnterProduct', 'Onboarding e produto precisam consultar o gate');
contains(onboarding, 'FaroPlatform && !window.FaroPlatform.canEnterProduct()', 'Onboarding não pode começar antes da instalação');

contains(shell, 'data-faro-platform-ready', 'Shell precisa esconder UI até a plataforma ficar pronta');
contains(shell, 'visibility:hidden!important', 'Shell precisa impedir piscada da Home no primeiro frame');
contains(shell, 'window.__faroInstallPrompt = null', 'Bootstrap precisa preparar captura precoce do instalador');
contains(shell, "window.addEventListener('beforeinstallprompt'", 'Bootstrap precisa capturar o instalador antes da UI');
contains(shell, 'faro-platform.js?v=3', 'Shell precisa carregar a porta de instalação');
contains(shell, 'faro-update.js?v=1', 'Shell precisa carregar a política de atualização silenciosa');
contains(shell, 'faro-interactions.js?v=2', 'Shell precisa carregar a fundação de interação R3-B');
contains(shell, 'faro-planning.js?v=2', 'Shell precisa carregar o cockpit estrutural R3');
contains(shell, 'faro-r3b.js?v=1', 'Shell precisa carregar a identidade/interação R3-B');
contains(shell, 'faro-r3-routing.js?v=2', 'Shell precisa carregar a navegação R3-B.3 dentro do mesmo workspace');

contains(sw, "const CORE_CACHE = 'faro-v1-core-16'", 'Instalação precisa acompanhar a geração UX-R3-B.3 do PWA');
contains(sw, 'faro-platform.js?v=3', 'PWA precisa armazenar a mesma geração da porta de instalação');
contains(sw, 'faro-update.js?v=1', 'PWA precisa armazenar a política de atualização silenciosa');
contains(sw, 'faro-interactions.js?v=2', 'PWA precisa armazenar a fundação de interação R3-B');
contains(sw, 'faro-planning.js?v=2', 'PWA precisa armazenar Planejar R3');
contains(sw, 'faro-r3b.js?v=1', 'PWA precisa armazenar a camada R3-B');
contains(sw, 'faro-r3-routing.js?v=2', 'PWA precisa armazenar rotas R3-B.3');
contains(sw, 'faro-tour.js?v=1', 'PWA precisa armazenar o tour');
contains(sw, './icon-192.png', 'PWA precisa armazenar ícone 192');
contains(sw, './icon-512.png', 'PWA precisa armazenar ícone 512');
contains(build, "'icon-192.png'", 'Build precisa copiar ícone 192');
contains(build, "'icon-512.png'", 'Build precisa copiar ícone 512');
contains(build, "'faro-interactions.js'", 'Build precisa copiar a fundação de interação R3-B');
contains(build, "'faro-planning.js'", 'Build precisa copiar Planejar R3');
contains(build, "'faro-r3b.js'", 'Build precisa copiar a camada R3-B');
contains(build, "'faro-r3-routing.js'", 'Build precisa copiar rotas R3');
contains(build, "'faro-tour.js'", 'Build precisa copiar o tour');
contains(sw, "event.data?.type === 'FARO_ACTIVATE_WHEN_SAFE'", 'Worker só pode antecipar atualização pelo sinal de saída segura');

const installStart = sw.indexOf("self.addEventListener('install'");
const activateStart = sw.indexOf("self.addEventListener('activate'");
const messageStart = sw.indexOf("self.addEventListener('message'");
assert.ok(installStart >= 0 && activateStart > installStart && messageStart > activateStart, 'Ciclo install/activate/message precisa existir na ordem esperada');
const installBlock = sw.slice(installStart, activateStart);
const activateBlock = sw.slice(activateStart, messageStart);
const messageBlock = sw.slice(messageStart, sw.indexOf('async function externalResponse'));
assert.doesNotMatch(installBlock, /skipWaiting\s*\(/, 'Instalação não pode forçar troca de versão durante uso ativo');
assert.doesNotMatch(activateBlock, /clients\.claim\s*\(/, 'Ativação não pode tomar a página atual do motorista');
assert.match(messageBlock, /FARO_ACTIVATE_WHEN_SAFE[\s\S]*self\.skipWaiting\(\)/, 'Ativação antecipada só pode ocorrer após sinal explícito de saída segura');

assert.deepEqual(pngSize(icon192), [192, 192], 'icon-192.png precisa medir 192×192');
assert.deepEqual(pngSize(icon512), [512, 512], 'icon-512.png precisa medir 512×512');
const manifest192 = manifest.icons.find(icon => icon.src === './icon-192.png');
const manifest512 = manifest.icons.find(icon => icon.src === './icon-512.png');
assert.equal(manifest192?.sizes, '192x192');
assert.equal(manifest512?.sizes, '512x512');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, './app-shell.html');
assert.equal(manifest.prefer_related_applications, false);
assert.equal(manifest.background_color, '#0B1121');

assert.doesNotMatch(platform, /continuar no navegador|entrar sem instalar/i, 'Não pode existir bypass comercial visível');
assert.doesNotMatch(platform, /appinstalled[\s\S]{0,500}location\.reload/, 'Instalação concluída não pode criar loop de reload');

console.log('FARO UX-R3-B.3: instalação, cache e atualização segura acompanham a navegação atual — ok');