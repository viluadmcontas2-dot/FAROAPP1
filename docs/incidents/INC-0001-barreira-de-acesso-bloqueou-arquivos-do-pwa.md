# INC-0001 — Barreira de acesso bloqueou arquivos técnicos do PWA

**Tipo:** incidente  
**Estado:** confirmado  
**Data:** 2026-08-03  
**Área:** PWA, acesso e publicação  
**Alcance:** PWA reutilizável; aplicação web reutilizável

## 1. Resumo

O site continuava protegido, mas a proteção global também interceptava arquivos técnicos necessários para o navegador reconhecer e instalar o PWA.

O sintoma parecia um problema no botão ou na detecção de instalação, porém a causa estava antes disso: o navegador não conseguia acessar corretamente os pré-requisitos técnicos.

## 2. Sintoma observado

- o botão de instalação não concluía o fluxo esperado;
- o navegador não disponibilizava de forma confiável o instalador nativo;
- ajustes na lógica de estado não eliminavam o problema principal.

## 3. Impacto ou risco

- impedir instalação no Android;
- gerar estados de espera ou mensagens enganosas;
- fazer o time investigar a interface quando a falha estava na infraestrutura de acesso;
- repetir o mesmo erro em qualquer PWA protegido por senha, middleware ou função de borda.

## 4. Causa imediata

A Edge Function de acesso usava uma regra global para `/*` e também interceptava:

- `/manifest.webmanifest`;
- `/sw.js`;
- `/icon.svg`;
- `/icon-192.png`;
- `/icon-512.png`.

Esses arquivos são necessários para instalação, identificação, cache e apresentação do PWA.

## 5. Causa estrutural

A proteção do site não possuía um contrato explícito separando:

- conteúdo do aplicativo, que deve continuar protegido;
- arquivos técnicos públicos exigidos pelo navegador.

A regra de segurança foi tratada apenas como proteção de páginas, sem considerar o protocolo de instalação do PWA.

## 6. Falha de detecção

Não existia inicialmente um teste dedicado verificando que:

- os arquivos técnicos respondiam sem autenticação;
- as páginas internas continuavam protegidas;
- o tipo de conteúdo do manifesto permanecia correto.

O deploy pronto também dava uma falsa sensação de segurança: ele provava que os arquivos foram publicados, não que o navegador conseguia acessá-los no caminho real.

## 7. Tentativas materiais que não resolveram

Antes da causa estrutural ser isolada, parte da investigação ficou concentrada em:

- memória local de instalação;
- detecção por `getInstalledRelatedApps()`;
- estados do botão;
- evento `beforeinstallprompt`.

Esses pontos eram relevantes para a experiência, mas não poderiam resolver sozinhos um manifesto e um service worker bloqueados.

Lição: antes de ajustar a interface de instalação, provar primeiro que todos os pré-requisitos técnicos estão publicamente acessíveis.

## 8. Correção ou decisão aplicada

A barreira continuou protegendo o aplicativo, mas passou a excluir explicitamente os cinco arquivos técnicos do PWA.

Nenhuma página financeira, dado ou tela interna foi tornada pública.

## 9. Prevenção permanente

- Toda barreira global deve listar explicitamente as exceções técnicas do PWA.
- Alterações em senha, middleware, redirects ou Edge Functions devem revisar essas exceções.
- A prova não pode depender apenas do build ou deploy.
- A regra operacional está registrada em `PWA_RULES.md`.

## 10. Prova contra regressão

Teste dedicado:

- `tests/pwa-access-boundary.test.mjs`

A prova deve confirmar:

- manifesto acessível e com tipo correto;
- service worker acessível e válido;
- ícones acessíveis;
- páginas internas ainda protegidas.

Também houve validação física posterior da instalação no Android.

## 11. Aplicação em outros projetos

Este aprendizado se aplica a qualquer PWA protegido por:

- senha;
- autenticação;
- middleware;
- Edge Function;
- reverse proxy;
- regra global de redirect;
- CDN com acesso restrito.

A regra geral é: segurança da aplicação e disponibilidade dos metadados técnicos precisam ser projetadas juntas.

## 12. Evidências

- correção principal: commit `d20128067a5c9a671508cd75a1bed6027129aeae`;
- teste dedicado: `tests/pwa-access-boundary.test.mjs`;
- regra permanente: `PWA_RULES.md`;
- validação física: instalador nativo aberto e PWA instalado com sucesso no Android.

## 13. Estado final

Aprendizado fechado.

A causa, a regra preventiva, o teste automatizado e a validação física estão registrados.
