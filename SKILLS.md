<!-- VETTA_GOVERNANCE_VERSION: 2026-08-06.2 -->
# VETTA — índice técnico obrigatório

Este arquivo é o mapa de leitura para qualquer agente. Ele deve ser lido depois de `AGENTS.md` e antes de `PROJECT_STATE.md`.

## Sequência obrigatória
1. `AGENTS.md`;
2. `SKILLS.md`;
3. `TESTING_RULES.md`;
4. skill ou regra especializada aplicável;
5. `LEARNING_RULES.md`;
6. `PROJECT_STATE.md`;
7. fontes vivas relevantes.

## Arquivos operacionais
| Área | Arquivo | Aplicação |
|---|---|---|
| UX de produto e fluxos mobile | `.skills/vetta-product-ux/SKILL.md` | obrigatória em diagnóstico, proposta, revisão ou mudança de experiência |
| Testes e CI | `TESTING_RULES.md` | cobertura proporcional ao risco |
| PWA | `PWA_RULES.md` | instalação, cache e ambiente publicado |
| Aprendizado | `LEARNING_RULES.md` | incidentes e lições permanentes |
| Estado vivo | `PROJECT_STATE.md` | branch, commit, CI, deploy e validação física |

## Consistência
`AGENTS.md`, `SKILLS.md`, `TESTING_RULES.md`, `PWA_RULES.md`, `LEARNING_RULES.md` e `.skills/vetta-product-ux/SKILL.md` são canônicos na `main` e devem permanecer iguais nas branches operacionais.

Não criar branch nova quando a branch atual comportar o trabalho com segurança. Branch temporária ou histórica continua com esse papel mesmo recebendo arquivos canônicos.
