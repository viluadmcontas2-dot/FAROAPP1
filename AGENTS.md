<!-- VETTA_GOVERNANCE_VERSION: 2026-08-03.2 -->
# VETTA — regras obrigatórias do projeto

O VETTA é um PWA financeiro para motoristas de aplicativo. Deve permanecer simples no celular, confiável nos números, local-first e seguro para os dados existentes.

## Comece sempre por esta sequência

Antes de qualquer diagnóstico, contrato, alteração ou conclusão técnica, leia nesta ordem **na branch que será realmente afetada**:

1. `AGENTS.md`;
2. `SKILLS.md`;
3. `TESTING_RULES.md`;
4. arquivos especializados aplicáveis, como `PWA_RULES.md`;
5. `LEARNING_RULES.md` quando houver defeito, quase falha ou aprendizado reutilizável;
6. `PROJECT_STATE.md`;
7. fontes vivas atuais: GitHub, PR, CI, Netlify, GitHub Pages e conteúdo servido.

Os arquivos pertencem à branch onde estão. A cópia da `main` é o padrão canônico, mas nunca substitui a leitura da branch-alvo. A CI compara os arquivos canônicos e falha se uma branch ativa ficar sem as regras obrigatórias ou divergir sem decisão explícita.

## Fontes de verdade

1. ordem explícita mais recente do proprietário;
2. `AGENTS.md`, `SKILLS.md`, `TESTING_RULES.md` e regras especializadas da branch-alvo;
3. fontes vivas atuais;
4. `PROJECT_STATE.md` da branch-alvo;
5. memória, resumos e capturas apenas como contexto auxiliar.

Todo fato que pode mudar exige fonte atual, momento da checagem e validade. Se não puder ser confirmado, declare **não confirmado**, explique o impacto e não complete a lacuna com suposição.

## Ferramentas obrigatórias

- Use o conector GitHub como fonte remota primária para repositório, branches, commits, PRs, CI e publicação.
- Use `code-verification` do Codex Engineering Guardrails em diagnóstico, auditoria e revisão sem alteração.
- Use `code-work` do contrato até a verificação final em qualquer mudança autorizada.
- Ferramentas locais só podem preencher lacunas reais do conector e devem permanecer alinhadas ao remoto.

## Apuração antes de decidir

Antes de alterar:

1. confirme repositório, branch, fotografia atual e relação com o ambiente servido;
2. leia o PR relacionado, base, cabeça, estado, diff e CI, quando existir;
3. leia o `PROJECT_STATE.md` atual e separe registro histórico de confirmação fresca;
4. verifique arquivos consumidores, configurações, testes e workflows afetados;
5. identifique riscos para dados, cálculos, interface, navegação, PWA, build, CI e publicação;
6. confirme alterações locais preexistentes quando houver cópia Git local;
7. apresente o caminho completo até a prova final e aguarde autorização quando ela ainda for necessária.

Arquivos soltos nunca provam o estado do GitHub. Divergência que impeça identificar o conteúdo correto bloqueia commit, push, PR, merge e publicação até decisão do proprietário.

## Autoridade e blocos de ação

Uma autorização para um bloco cobre as etapas previsíveis e diretamente necessárias para entregar o resultado aprovado, incluindo:

- investigação proporcional;
- edição dos arquivos previstos;
- testes e ampliação de testes necessários;
- pequenas correções indispensáveis ao mesmo objetivo;
- fotografia salva e sincronização na branch remota autorizada;
- deploy automático já conhecido da branch de validação;
- atualização documental e checkpoint do próprio bloco.

Não peça autorização separada para executar testes. O agente é responsável por escolher, executar, interpretar e ampliar a verificação necessária.

Continuam exigindo autorização explícita separada: mudança de objetivo, área fora do contrato, alteração em `main` não citada, merge, tag, release, mudança do alvo de produção, deploy manual fora do fluxo conhecido, alteração destrutiva, exclusão de dados ou credenciais não previstas.

## Responsabilidade autônoma pelos testes

Teste não é uma opção oferecida ao proprietário. É parte da engenharia.

O agente deve:

1. classificar o risco real da mudança;
2. executar a cobertura mais forte que produza evidência útil;
3. usar executores padrão gratuitos do repositório público quando disponíveis;
4. escalar de testes determinísticos para navegador, múltiplos navegadores, ambiente publicado e validação física conforme o risco;
5. investigar falhas até classificá-las corretamente;
6. não declarar sucesso com testes ausentes, antigos ou que não exercitam o comportamento alterado.

Não executar testes irrelevantes não é economia: é evitar ruído. Porém, quando um teste acrescenta prova material e usa infraestrutura padrão gratuita, a preferência é executá-lo.

A política completa está em `TESTING_RULES.md`.

## CI Universal Adaptativa

A `main` mantém o motor canônico em `.github/workflows/ci-engine.yml`. Branches ativas carregam apenas o chamador `.github/workflows/ci-autonomous.yml`.

O motor:

- testa a fotografia exata da branch escolhida;
- descobre os testes presentes naquela branch;
- verifica sintaxe, JSON, contratos e testes determinísticos;
- executa navegador local;
- amplia para Chromium, Firefox e WebKit quando interface, navegação, armazenamento, cálculos ou PWA forem afetados;
- prova o ambiente publicado quando a branch declarar um alvo e isso acrescentar evidência;
- cancela execução ultrapassada da mesma branch;
- guarda artefatos somente quando úteis, principalmente em falha;
- nunca faz commit, merge, alteração de dados ou publicação manual.

O issue #2 é a console do agente para testes adicionais de qualquer branch. Somente comandos fechados do proprietário são aceitos.

## Branches e ambientes

- `main`: governança, regras canônicas e orquestração; não é a fonte atual do aplicativo.
- `netlify/teste-fechado`: versão estável dos testadores e fonte de `calculaae.netlify.app`.
- `netlify/teste-fechado-ux`: desenvolvimento e validação manual da reorganização de interface; GitHub Pages é o ambiente publicado aplicável.
- `migration/vetta-clean-3-5-1`: referência histórica permanente e cabeça da PR #1; não reutilizar para desenvolvimento.
- branches antigas e temporárias não devem ser reutilizadas sem apuração e ordem explícita.

Uma branch nova deve nascer de uma branch ativa apropriada e herdar, antes da primeira mudança funcional, os arquivos canônicos, `ci/branch-policy.json` e o workflow autônomo. A CI deve falhar se essa preparação estiver ausente.

Nenhuma mudança da branch UX pode ser levada à branch estável, à `main` ou ao Netlify sem autorização específica posterior.

## Regras de escopo e segurança

- Uma mudança observável por vez.
- Sem refatoração, limpeza ou modernização paralela.
- Nunca sobrescreva, descarte ou incorpore trabalho preexistente sem ordem explícita.
- Nunca exponha senha, token ou segredo em código, comentário, artefato ou log.
- Valores financeiros exigem testes determinísticos independentes da interface.
- Atualizações não podem apagar registros existentes.
- Mudanças de interface ou PWA exigem validação física no celular depois da prova automatizada.
- No máximo quatro branches remotas devem permanecer como estrutura planejada; branches excedentes existentes precisam de limpeza autorizada, não de reutilização.

## Evidência

Nunca diga “corrigido”, “funcionando”, “CI passou”, “publicado” ou “site igual à branch” sem evidência fresca e identificável.

Conforme o caso, cite:

- branch e fotografia salva;
- comandos e resultados dos testes;
- execução da CI;
- URL e conteúdo servido;
- commit efetivamente publicado;
- validação física do proprietário.

Deploy pronto prova que uma fotografia foi servida; não substitui teste funcional. CI verde prova somente o que foi exercitado.

## Aprendizado fechado

Defeito, quase falha ou descoberta reutilizável deve seguir `LEARNING_RULES.md` e terminar como:

- `Nenhum aprendizado permanente novo`;
- `Aprendizado fechado`;
- `Aprendizado pendente`.

## Comunicação

Fale com o proprietário como leigo em programação: didático, direto e curto.

Explique sempre:

- onde está cada estado;
- qual é o mais novo;
- o que mudou;
- o efeito prático;
- o que permaneceu intocado;
- a evidência real;
- o próximo passo único.

Commit é uma **fotografia salva do projeto**, não um número de versão crescente.

## Formato final obrigatório para trabalho técnico

- Modo executado:
- Objetivo aprovado:
- Repositório, branch e commit:
- Estado explicado:
- Arquivos alterados:
- Evidência e testes:
- SHA do site de validação:
- Ainda não validado no celular:
- `main` e publicação foram alterados?:
- Próximo passo único:
