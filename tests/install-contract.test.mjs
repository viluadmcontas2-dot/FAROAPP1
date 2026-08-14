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
contains(platform, 'Instale o FARO para continuar', 'Gate precisa explicar a ação principal em linguagem humana');
contains(platform, 'INSTALAR FARO', 'Android/computador precisam ter ação clara de instalação');
contains(platform, 'Adicionar à Tela de Início', 'iPhone precisa ter tutorial de instalação');
contains(platform, 'Abrir como App da Web', 'iPhone atual precisa orientar o modo app quando a opção existir');
contains(platform, 'SamsungBrowser', 'Samsung Internet precisa de fallback próprio');
contains(platform, 'app.deferredPrompt', 'Gate precisa usar o instalador nativo capturado pelo app');
contains(platform, 'prompt.userChoice', 'Gate precisa tratar aceite ou recusa do instalador');
contains(platform, "setAttribute('inert', '')", 'Produto atrás do gate não pode continuar interativo');
contains(platform, "setAttribute('aria-hidden', 'true')", 'Produto atrás do gate deve sair da árvore acessível');
contains(platform, 'Esta página continua bloqueada de propósito', 'Após instalar, o navegador deve continuar sendo apenas a porta de entrada');
contains(platform, "window.addEventListener('appinstalled'", 'Gate precisa reconhecer instalação concluída');
contains(platform, 'canEnterProduct', 'Onboarding e produto precisam consultar o gate');
contains(onboarding, 'FaroPlatform && !window.FaroPlatform.canEnterProduct()', 'Onboarding não pode começar antes da instalação');
contains(shell, 'faro-platform.js?v=2', 'Shell precisa carregar a nova porta de instalação');
contains(sw, "const CORE_CACHE = 'faro-v1-core-6'", 'Mudança de entrada precisa de nova geração de cache');
contains(sw, 'faro-platform.js?v=2', 'PWA precisa armazenar a mesma geração da porta de instalação');

assert.equal(manifest.display, 'standalone', 'FARO instalado precisa abrir sem interface de navegador');
assert.equal(manifest.start_url, './app-shell.html', 'FARO instalado precisa abrir direto no app');
assert.doesNotMatch(platform, /continuar no navegador|entrar sem instalar/i, 'Não pode existir bypass comercial visível');
assert.doesNotMatch(platform, /appinstalled[\s\S]{0,500}location\.reload/, 'Instalação concluída não pode recarregar o navegador e criar loop de gate');

console.log('FARO: instalação obrigatória, tutorial por dispositivo, bloqueio do navegador e abertura standalone — ok');
