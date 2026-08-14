import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const platform = await readFile('faro-platform.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const onboarding = await readFile('faro-onboarding.js', 'utf8');
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));

const contains = (source, snippet, label) => assert.equal(source.includes(snippet), true, label);

contains(platform, 'const INSTALL_GATE_ENFORCED = true', 'Instalação comercial precisa ser obrigatória');
contains(platform, "!app.isStandalone()", 'Gate deve liberar somente o app instalado');
contains(platform, 'Instale o FARO', 'Gate precisa pedir instalação de forma direta');
contains(platform, 'Seu FARO, sempre à mão.', 'Abertura precisa ter identidade sem explicar tecnologia');
contains(platform, 'Acesso rápido', 'Benefício precisa usar linguagem de produto');
contains(platform, 'Instalação única', 'Benefício precisa reforçar uma única etapa');
contains(platform, 'Mais preparado pra pista', 'Benefício precisa manter identidade FARO');
contains(platform, 'INSTALAR FARO', 'Android/computador precisam ter ação clara de instalação');
contains(platform, 'Adicionar à Tela de Início', 'iPhone precisa ter tutorial de instalação');
contains(platform, 'Abrir como App da Web', 'iPhone atual precisa orientar o modo app quando a opção existir');
contains(platform, 'SamsungBrowser', 'Samsung Internet precisa de fallback próprio');
contains(platform, 'window.__faroInstallPrompt', 'Plataforma precisa consumir o prompt capturado cedo');
contains(platform, 'waitForInstallPrompt', 'Botão precisa aguardar prompt tardio antes do fallback');
contains(platform, 'ensureInstallInfrastructure', 'Plataforma precisa garantir infraestrutura de instalação');
contains(platform, 'prompt.userChoice', 'Gate precisa tratar aceite ou recusa do instalador');
contains(platform, "setAttribute('inert', '')", 'Produto atrás do gate não pode continuar interativo');
contains(platform, "setAttribute('aria-hidden', 'true')", 'Produto atrás do gate deve sair da árvore acessível');
contains(platform, "root.dataset.faroPlatformReady = 'true'", 'Interface só pode ser liberada depois da decisão da plataforma');
contains(platform, 'Tudo pronto!', 'Instalação concluída precisa ter fechamento simples');
contains(platform, 'Nos próximos acessos, entre sempre pelo ícone FARO.', 'Fechamento precisa dizer somente como abrir depois');
contains(platform, "window.addEventListener('appinstalled'", 'Gate precisa reconhecer instalação concluída');
contains(platform, 'canEnterProduct', 'Onboarding e produto precisam consultar o gate');
contains(onboarding, 'FaroPlatform && !window.FaroPlatform.canEnterProduct()', 'Onboarding não pode começar antes da instalação');

contains(shell, 'data-faro-platform-ready', 'Shell precisa esconder UI até a plataforma ficar pronta');
contains(shell, 'visibility:hidden!important', 'Shell precisa impedir piscada da Home no primeiro frame');
contains(shell, 'window.__faroInstallPrompt = null', 'Bootstrap precisa preparar captura precoce do instalador');
contains(shell, "window.addEventListener('beforeinstallprompt'", 'Bootstrap precisa capturar o instalador antes da UI');
contains(shell, "window.dispatchEvent(new CustomEvent('faro:install-ready'))", 'Bootstrap precisa avisar quando o prompt estiver pronto');
contains(shell, 'faro-platform.js?v=3', 'Shell precisa carregar a nova geração da porta de instalação');
assert.doesNotMatch(shell, /Abrindo FARO…/, 'Shell não deve mostrar tela intermediária antes do gate');

contains(sw, "const CORE_CACHE = 'faro-v1-core-7'", 'Mudança de bootstrap precisa de nova geração de cache');
contains(sw, 'faro-platform.js?v=3', 'PWA precisa armazenar a mesma geração da porta de instalação');

assert.equal(manifest.display, 'standalone', 'FARO instalado precisa abrir em modo standalone');
assert.equal(manifest.start_url, './app-shell.html', 'FARO instalado precisa abrir direto no app');
assert.doesNotMatch(platform, /continuar no navegador|entrar sem instalar/i, 'Não pode existir bypass comercial visível');
assert.doesNotMatch(platform, /sensação de.*site|como site|barra de navegador/i, 'Microcopy não deve explicar tecnologia nem comparar FARO com site');
assert.doesNotMatch(platform, /É rápido e você só faz isso uma vez|Leva poucos segundos e você faz isso só uma vez/i, 'Copy não deve repetir promessa de rapidez/instalação única');
assert.doesNotMatch(platform, /appinstalled[\s\S]{0,500}location\.reload/, 'Instalação concluída não pode recarregar e criar loop de gate');

console.log('FARO: sem piscada da Home, instalação obrigatória, prompt capturado cedo e linguagem app-first — ok');
