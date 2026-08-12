# INC-0002 — Tela de instalação apareceu antes do app instalado

**Tipo:** incidente  
**Estado:** confirmado  
**Data:** 2026-08-03  
**Área:** PWA, navegação inicial e experiência  
**Alcance:** PWA reutilizável

## 1. Resumo

Depois da instalação bem-sucedida, o PWA abria pelo ícone, mas mostrava por aproximadamente um segundo a tela de instalação antes de carregar a interface interna.

A instalação funcionava, porém a experiência parecia quebrada e pouco confiável.

## 2. Sintoma observado

- abertura pelo ícone exibia rapidamente `index.html`;
- a tela de instalação aparecia antes do app;
- depois de uma espera curta, o conteúdo interno substituía a página.

## 3. Impacto ou risco

- sensação de aplicativo mal acabado;
- confusão sobre o estado de instalação;
- risco de o usuário tocar novamente em controles da página errada;
- repetição do problema em qualquer PWA que compartilhe a mesma página para instalação e inicialização do app.

## 4. Causa imediata

O PWA instalado iniciava em `index.html`.

Essa página aguardava uma busca assíncrona por `app-shell.html` e somente depois substituía o documento. O navegador conseguia desenhar a tela de instalação antes da troca.

## 5. Causa estrutural

A arquitetura misturava duas responsabilidades:

- página do navegador usada para orientar a instalação;
- entrada do aplicativo já instalado.

Além disso, a correção dependia de uma operação assíncrona posterior ao primeiro desenho da tela.

## 6. Falha de detecção

- a instalação era testada, mas a partida fria pelo ícone não possuía contrato automatizado próprio;
- abrir a página no navegador não reproduzia exatamente a experiência standalone;
- deploy e testes de disponibilidade não verificavam o que aparecia no primeiro quadro da tela.

## 7. Tentativas materiais que não resolveram

Usar busca assíncrona para carregar e substituir o documento parecia permitir reaproveitar a página existente, mas essa abordagem ocorria tarde demais para impedir o primeiro desenho.

Lição: quando o requisito é “não mostrar nem por um instante”, a decisão precisa acontecer antes do `body` e antes de qualquer trabalho assíncrono visível.

## 8. Correção ou decisão aplicada

- novas instalações passaram a usar `app-shell.html` diretamente como `start_url`;
- instalações antigas ainda iniciadas em `index.html` passaram a ser detectadas no `<head>`;
- o documento é ocultado imediatamente e redirecionado com `location.replace()`;
- a substituição assíncrona do documento foi removida;
- o cache do service worker foi renovado.

## 9. Prevenção permanente

- separar página de instalação da entrada standalone do aplicativo;
- não depender de busca assíncrona para esconder conteúdo que jamais pode aparecer;
- testar partida fria pelo ícone, não apenas navegação no browser;
- renovar cache quando `start_url`, entrada ou lógica inicial mudarem;
- manter a regra em `PWA_RULES.md`.

## 10. Prova contra regressão

Teste dedicado:

- `tests/pwa-standalone-launch.test.mjs`

Validação física obrigatória:

1. fechar completamente o PWA;
2. abrir pelo ícone;
3. confirmar ausência total da tela de instalação;
4. repetir a abertura.

O proprietário realizou duas aberturas frias no Android sem observar a piscada.

## 11. Aplicação em outros projetos

Este aprendizado se aplica a PWAs que:

- possuem landing page ou tela de instalação separada do app;
- mantêm compatibilidade com instalações antigas;
- trocam conteúdo por JavaScript após carregar;
- precisam garantir uma primeira tela limpa e previsível.

A regra geral é: requisitos do primeiro quadro precisam ser resolvidos antes do primeiro desenho, não depois.

## 12. Evidências

- compatibilidade com instalações antigas: commit `7cf88fe311f5acd13d020f39a798edde7c416afe`;
- abertura direta: commit `a4f1d029a998c22fa4b3325d8475055ba8e5f5c2`;
- renovação do cache: commit `0b3ff2da3ecad020abb2294dbb616df132b874ff`;
- teste: `tests/pwa-standalone-launch.test.mjs`;
- validação física final: duas aberturas pelo ícone sem qualquer parte da tela de instalação.

## 13. Estado final

Aprendizado fechado.

A causa imediata, a separação estrutural, a prova automatizada e a validação física estão registradas.
