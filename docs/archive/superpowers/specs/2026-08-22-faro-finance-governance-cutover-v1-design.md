# FARO Financeiro — Governance Cutover V1

**Projeto:** FARO  
**Architecture ID:** `FARO_FINANCE_V1`  
**Status:** Design aprovado em conversa; aguardando revisão da spec escrita  
**Data:** 2026-08-22  
**Coding:** `FROZEN_DURING_N0_N1`

## 1. Objetivo

Reorganizar o FARO Financeiro para operar com a mesma disciplina estrutural que tornou o FARO Corridas previsível e auditável, sem reescrever o produto por princípio e sem preservar legado apenas por inércia.

O cutover muda primeiro a **autoridade e a forma de execução**. O código existente é tratado como patrimônio a ser classificado. Nenhuma feature nova é desenvolvida em paralelo durante N0/N1.

## 2. Princípios

1. **Uma autoridade por preocupação.** Nenhum dado mutável tem dois writers.
2. **Notion governa; Linear executa; GitHub prova source; Ledger prova claims.**
3. **Uma arquitetura ativa.** `FARO_FINANCE_V1` substitui múltiplas direções concorrentes como norte executável.
4. **Reuse proven core, never inherit blindly.** Legado só entra após classificação explícita.
5. **Static PASS != Runtime PASS != Physical PASS.**
6. **Branch existe por workstream, não por conveniência.**
7. **Código não recomeça antes de contexto, contrato, ownership e evidência estarem resolvidos.**
8. **Owner-facing deve ser simples; complexidade fica nos contratos.**
9. **A governança global não é duplicada.** Este documento especializa o FARO; EntryPoint, Kernel e contratos globais continuam canônicos.

## 3. Modelo de autoridades

### 3.1 CEO / Strategic Brainstorming

**Papel:** pensar como negócio.

Inclui:
- problema do motorista;
- posicionamento e proposta de valor;
- monetização e preço;
- aquisição, retenção e lançamento;
- suporte, operação, marca, unit economics e hipóteses comerciais.

Contrato:

```text
AREA_ROLE=CEO_STRATEGY
AUTHORITY=ADVISORY_ONLY
EXECUTION_AUTHORITY=NONE
NO_LINEAR_WRITES=TRUE
NO_GITHUB_WRITES=TRUE
PROMOTION_TO_PRODUCT=EXPLICIT_DECISION_ONLY
```

Uma ideia não vira backlog automaticamente.

### 3.2 Product & Architecture Studio

**Papel:** transformar visão em produto e arquitetura coerentes.

Inclui:
- produto ponta a ponta;
- domínio financeiro;
- jornadas e UI/UX;
- arquitetura de frontend/backend;
- offline/sync/PWA/APK;
- segurança e privacidade;
- pagamentos e entitlement;
- analytics;
- quality gates e unknown unknowns.

Contrato:

```text
AREA_ROLE=PRODUCT_ARCHITECTURE
AUTHORITY=ADVISORY_ONLY
EXECUTION_AUTHORITY=NONE
NO_LINEAR_WRITES=TRUE
NO_GITHUB_WRITES=TRUE
HANDOFF_TO_EXECUTION=EXPLICIT_APPROVAL_ONLY
```

### 3.3 Coder / Execution Canonical

**Papel:** única superfície que governa implementação.

Autoridades:
- **Notion técnico:** requirements, arquitetura, contratos, decisões, bindings e conhecimento durável;
- **Linear:** current issue, prioridade, blocker, owner, workstream e next action;
- **GitHub remoto:** branch/ref/SHA/diff/source truth;
- **Ledger:** receipts, auditorias, invalidações e verdicts.

Nenhuma outra página ou sistema pode escolher o next action.

## 4. Boot canônico do FARO Financeiro

Este projeto **estende**, mas não substitui, o boot global. Antes de qualquer mutação material:

```text
GOVERNANCE ENTRYPOINT
-> GOVERNANCE KERNEL
-> PROJECT REGISTRY / FARO
-> FARO CENTRAL + START HERE
-> FARO_FINANCE_V1
-> CAPABILITY REGISTRY
-> CONTRACT REGISTRY
-> CONTRACT BINDING REGISTRY
-> FARO CONTRACT NOTEBOOK
-> LINEAR CURRENT
-> GITHUB SOURCE TOPOLOGY
-> WORKSTREAM RESOLUTION
-> BRANCH RESOLUTION
-> LEDGER / EVIDENCE ROUTE
-> EXECUTION
-> PROPORTIONAL RECHECK
-> AUDIT / META-AUDIT WHEN REQUIRED
-> VERDICT
```

Fail-closed quando houver:
- arquitetura ativa ambígua;
- issue/current gate ambíguo;
- branch sem workstream;
- source HEAD stale;
- ownership semântico conflitante;
- binding obrigatório ausente/stale;
- tentativa de executar feature durante N0/N1.

## 5. Anti-legado

Todo requisito, módulo, fluxo, documento e capacidade existente recebe exatamente uma classe:

- `KEEP_AS_PROVEN_CORE` — capacidade comprovada e compatível com o novo norte;
- `REBUILD_TO_NEW_CONTRACT` — ideia/capacidade útil, mas contrato, ownership, UX ou arquitetura precisam mudar;
- `RETIRE_FROM_NEW_DIRECTION` — conflita com o novo norte ou cria dívida desnecessária;
- `OUTSIDE_NEW_SCOPE` — não entra nesta versão.

Nada atravessa para `FARO_FINANCE_V1` apenas porque já existe.

A classificação deve cobrir no mínimo:
- estado financeiro canônico;
- registrar/fechamento diário;
- Home;
- Planejar;
- Histórico/Central;
- onboarding;
- custos/reservas/metas;
- persistência/offline/PWA;
- backend/auth/sync;
- pagamentos;
- testes e harnesses;
- documentos antigos de produto/UX.

## 6. Gates N0 -> N7

### N0 — Governance Cutover

Objetivo: tornar inequívoco quem decide o quê e por onde o trabalho flui.

Critérios:
- três áreas separadas e sem dual writer;
- `FARO_FINANCE_V1` registrado como única arquitetura ativa;
- START HERE apontando para a nova arquitetura;
- Linear reconciliado como único writer operacional;
- bindings resolvidos;
- source topology reconciliada;
- branches classificadas por lifecycle;
- coding freeze explícito;
- histórico preservado como reference, não execution authority.

### N1 — Product & Domain Contract

Objetivo: fechar o que o produto é antes de mexer no código.

Critérios:
- missão e proposta de valor únicas;
- jornada canônica do motorista;
- domínios e ownership definidos;
- modelo financeiro canônico definido;
- invariantes de dados e matemática definidas;
- anti-legado concluído por domínio;
- arquitetura de UI/UX e linguagem do produto fechadas;
- success criteria e falsificadores definidos.

### N2 — Core & State Integrity

Objetivo: provar uma única fonte de verdade para estado e matemática.

Abrange:
- registros;
- receitas;
- custos;
- reservas;
- metas;
- planejamento;
- persistência e compatibilidade legada.

Nenhum segundo writer ou cálculo paralelo é permitido.

### N3 — Unified Experience

Objetivo: fazer o app inteiro comunicar a mesma intenção.

Abrange:
- Home;
- Registrar;
- Planejar;
- Histórico;
- Central;
- onboarding e navegação.

Cada tela deve ter função dominante, hierarquia consistente, linguagem comum e relação explícita com o objetivo financeiro do motorista.

### N4 — Runtime & Reliability

Objetivo: provar integração real, não apenas contratos estáticos.

Abrange:
- bindings/listeners;
- idempotência;
- reload/reopen;
- offline;
- service worker/update;
- regressões;
- build/shell parity;
- runtime completo.

### N5 — Backend & Account

Objetivo: fechar identidade, conta, sincronização e recuperação com evidência real.

Abrange:
- auth;
- conta;
- sync;
- recuperação;
- segurança e privacidade;
- conflitos e reconciliação de dados.

### N6 — Commercial

Objetivo: ativar a camada comercial sem contaminar o domínio financeiro.

Abrange:
- Stripe/checkout;
- webhook-authoritative entitlement;
- assinatura;
- notificações;
- suporte;
- privacidade/termos;
- operação comercial.

### N7 — Physical Release

Objetivo: provar o produto completo no dispositivo alvo.

Abrange:
- instalação;
- fluxo ponta a ponta;
- testes físicos;
- regressão final;
- performance;
- atualização;
- release gate.

## 7. Regra de PASS

Cada capacidade material pode ter dimensões separadas:

```text
STATIC_VERDICT
RUNTIME_VERDICT
PHYSICAL_VERDICT
EXTERNAL_SERVICE_VERDICT
```

Regras:
- código existente não implica PASS;
- teste antigo não prova SHA novo;
- runtime verde não prova celular;
- celular verde não prova backend externo;
- `FINAL_PASS` exige todas as dimensões aplicáveis e evidence freshness atual.

## 8. Workstreams e branches

### 8.1 Política

O **orçamento alvo é de no máximo quatro branches remotas**, contando a linha estável. A forma desejada é:

```text
STABLE_LINE = linha integrada estável/release
CURRENT_WORKSTREAM = workstream atual
TEMP_WORKSTREAM_2 = somente quando justificado
TEMP_WORKSTREAM_3 = somente quando justificado
MAX_REMOTE_BRANCHES=4
```

O nome `main` **não é pressuposto** neste cutover. A `main` atual pertence a uma linhagem legada desconectada da linha moderna do produto e não pode virar trunk apenas por convenção de nome. N0 deve decidir, com evidence, se a linha estável futura será promovida/renomeada para `main` ou se outro ref será mantido durante a transição.

Projeto opera com `REUSE_OR_PROVE`.

Nova branch exige:
- `OBJECTIVE`;
- `WHY_EXISTING_BRANCHES_ARE_INSUFFICIENT`;
- `BASE_REF_AND_SHA`;
- `LINEAR_SCOPE`;
- `SEMANTIC_DOMAINS`;
- `EXPECTED_WRITE_SURFACES`;
- `MERGE_TARGET`;
- `MERGE_OR_RETIRE_PATH`;
- `DELETE_WHEN`.

Branch gerada pelo Linear não é autoridade.

### 8.2 Lifecycle

```text
PROPOSED
-> ACTIVE
-> INTEGRATING
-> MERGED
-> RETIREMENT_CHECK
-> READY_TO_DELETE
-> DELETED
```

Estados excepcionais:
- `BRANCH_RESOLUTION_REQUIRED`;
- `UNBOUND_BRANCH`;
- `OVERLAP_REVIEW`;
- `RETIREMENT_BLOCKED`;
- `BRANCH_BUDGET_FULL`.

### 8.3 Cutover da topologia atual

Durante N0:
- não criar nova branch por estética;
- preservar release comercial como baseline histórica até decisão de release;
- identificar a linha que contém o source moderno mais avançado;
- tratar `main` atual como lineage legada até reconciliação explícita;
- drenar conhecimento único de branches antigas;
- aposentar branches absorvidas/superseded apenas após retirement proof;
- ao fim do N0, reduzir a topologia ao menor conjunto seguro, idealmente `stable + current workstream`.

## 9. Ownership semântico

Cada workstream declara domínios e write surfaces.

Domínios iniciais do FARO Financeiro:
- `FINANCIAL_STATE`;
- `DAILY_RECORD`;
- `PLANNING`;
- `HOME_COCKPIT`;
- `HISTORY`;
- `ONBOARDING_NAV`;
- `PWA_RUNTIME`;
- `ACCOUNT_SYNC`;
- `COMMERCIAL_ENTITLEMENT`;
- `SHARED_UI`.

Path overlap é warning; conflito no mesmo domínio, writer, interface, schema, release ou estado canônico exige coordenação.

## 10. Linear

Linear permanece a única autoridade mutável de execução.

Cada workstream material deve expor:
- objetivo;
- owner;
- linked issues;
- branch;
- branch state;
- semantic domains;
- expected write surfaces;
- base ref/SHA snapshot;
- head SHA snapshot;
- dependencies;
- merge target;
- exit criteria;
- merge/retire path;
- source freshness;
- next gate.

Documentos antigos podem permanecer como evidence/reference, mas não escolher current issue.

## 11. Notion

O Notion do FARO deve ficar limpo e com três portas humanas:

1. `FARO — CEO / Strategy`;
2. `FARO — Product & Architecture Studio`;
3. `FARO — Central / Coder Execution`.

A Central técnica deve apontar apenas para:
- START HERE;
- arquitetura ativa;
- caderno de bindings;
- contrato executor/auditor;
- ledger;
- arquivos históricos/reference.

Não criar versões concorrentes de Central, Kernel, arquitetura ativa ou execution state.

## 12. Migração do produto atual

Depois de N0, N1 produz uma matriz por domínio. Os estados `a auditar` e `definir` abaixo são **valores iniciais deliberados da matriz de cutover**, não requisitos incompletos desta spec.

| Domínio | Estado inicial | Classe | Evidência exigida | Ação de N1 |
|---|---|---|---|---|
| Core financeiro | a auditar | KEEP/REBUILD/RETIRE/OUTSIDE | source + tests | classificar |
| Registrar | a auditar | idem | source + runtime | classificar |
| Home | a auditar | idem | source + runtime + físico | classificar |
| Planejar | a auditar | idem | source + runtime + físico | classificar |
| Histórico/Central | a auditar | idem | source + runtime | classificar |
| Onboarding/nav | a auditar | idem | source + runtime + físico | classificar |
| PWA | a auditar | idem | build/runtime/físico | classificar |
| Backend/comercial | a auditar | idem | serviço real | classificar |

A decisão de manter/reconstruir nunca é baseada apenas em quantidade de código já escrita.

## 13. Testing Operating System

Para toda implementação após N1:

1. resolver contrato e acceptance;
2. criar falsificador/RED quando aplicável;
3. menor mudança coerente;
4. focused GREEN;
5. regressão proporcional;
6. runtime integrado;
7. audit independente quando o gate exigir;
8. physical/external gate separado;
9. receipt no Ledger para claim material.

Preferir runtime efêmero no SHA remoto exato. CI remoto é fallback, não rotina.

## 14. Coding Freeze

Durante N0 e N1:

```text
FEATURE_CODING=DENIED
BUGFIX_CODING=DENIED_UNLESS_CUTOVER_BLOCKER
UI_POLISH=DENIED
NEW_PRODUCT_SCOPE=DENIED
GOVERNANCE_AND_DISCOVERY_ONLY=TRUE
```

Exceção: correção mínima necessária para impedir perda de source/evidence ou tornar o próprio cutover possível, com justificativa explícita.

## 15. Critérios de saída do N0

N0 só fecha quando:
- `FARO_FINANCE_V1` é a única arquitetura executável;
- as três áreas estão formalmente separadas;
- Linear/Notion/GitHub/Ledger concordam sobre authority chain;
- current execution anterior está congelado ou reclassificado;
- source topology está reconciliada;
- todas as branches remotas possuem destino explícito;
- nenhum documento legado consegue escolher next action;
- bindings obrigatórios estão atuais;
- existe um único próximo passo humano e técnico: iniciar N1.

## 16. Critérios de saída do N1

N1 só fecha quando:
- proposta de valor e jornada estão definidas;
- domínios/ownership e state writers estão definidos;
- arquitetura UI/UX única está definida;
- matriz anti-legado está completa;
- riscos e unknown unknowns estão classificados;
- gates N2-N7 têm acceptance suficiente para execução;
- o primeiro workstream de implementação pós-cutover pode ser escolhido sem adivinhação.

## 17. Não objetivos

Este cutover não:
- reescreve o app inteiro;
- apaga histórico;
- considera FARO Corridas a mesma aplicação;
- copia contratos específicos de mobilidade que não se aplicam ao domínio financeiro;
- ativa backend ou pagamentos;
- melhora UI durante N0/N1;
- declara o produto pronto.

## 18. Resultado esperado

Ao final de N1, qualquer agente deve conseguir responder em poucos segundos:

1. O que é o FARO Financeiro?
2. Qual arquitetura está ativa?
3. Qual gate está em execução?
4. Quem escolhe o next action?
5. Qual branch/workstream pode ser alterado?
6. Qual domínio e writer são afetados?
7. Que evidência concede PASS?
8. O que ainda falta para release?

Se qualquer resposta depender de memória do agente, busca semântica ou leitura de documentos concorrentes, o cutover ainda não está concluído.
