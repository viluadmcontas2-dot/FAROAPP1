# Estado oficial — CalculaAê (`netlify/teste-fechado`)

**Atualizado em:** 2026-08-03  
**Estado:** versão estável preservada; CI Universal Adaptativa instalada; testes locais completos aprovados.  
**Alteração em curso:** Netlify ainda precisa servir a fotografia atual para concluir a prova OIDC publicada.

## Estado atual

| Item | Estado |
|---|---|
| Repositório | `vitoohugo333/VETTA` |
| Branch | `netlify/teste-fechado` |
| Papel | versão estável dos testadores |
| Site | `https://calculaae.netlify.app/` |
| Branch UX separada | `netlify/teste-fechado-ux` |
| Referência histórica | `migration/vetta-clean-3-5-1` |

## O que mudou neste bloco

Somente infraestrutura de engenharia:

- regras canônicas sincronizadas com a `main`;
- workflow autônomo da branch;
- política de ambiente em `ci/branch-policy.json`;
- Playwright adaptado a Chromium, Firefox e WebKit;
- teste publicado genérico;
- autenticação temporária OIDC do GitHub Actions;
- metadado de deploy com commit e branch;
- testes determinísticos do contrato OIDC.

## O que permaneceu intocado

- interface;
- cálculos;
- registros e armazenamento local;
- manifesto, service worker, cache e ícones;
- senhas dos testadores;
- fluxo normal de instalação e abertura;
- branch UX, `main` como aplicativo e PR #1.

## Acesso do robô

O caminho `/__vetta-oidc-access` aceita somente identidade temporária assinada pelo GitHub e vinculada a:

- repositório imutável do VETTA;
- proprietário autorizado;
- motor canônico da `main`;
- executor hospedado pelo GitHub;
- evento permitido;
- audiência exclusiva.

A sessão dura 15 minutos. A rota antiga por senha permanece temporariamente apenas como retorno seguro até a primeira prova OIDC passar.

## Evidência atual

A execução `30866370117` comprovou na fotografia `eb48f2d8c0a89663efd073b89c6f49eeb0b51635`:

- governança, sintaxe, JSON e todos os testes Node: aprovados;
- Chromium móvel e desktop: aprovados;
- Firefox: aprovado;
- WebKit: aprovado;
- artefato de falha: criado corretamente quando necessário.

A prova publicada foi corretamente recusada porque, durante a execução, o Netlify ainda servia a fotografia intermediária `05de0909e007428527bd989a16d866e8697c03ce`, que não continha a rota OIDC final. Isso é divergência de publicação, não defeito confirmado do aplicativo nem do token.

## Validação física

Nenhuma mudança visual ou de PWA foi feita neste bloco. Nova validação física não é necessária para a infraestrutura, salvo se a prova publicada revelar comportamento diferente no aplicativo.

## Aprendizado

**Aprendizado fechado:** a automação deve pertencer à branch e ao risco, não a um provedor de hospedagem específico. A CI deve recusar um ambiente que serve fotografia diferente, mesmo quando ele responde normalmente.

## Próximo passo único

Aguardar o deploy automático desta fotografia e executar novamente a prova publicada. Somente depois de OIDC e commit servido passarem, remover a rota e a variável antigas baseadas em senha.
