# AGENTS.md — Faro 2.0

Leia nesta ordem: `README.md` → `PROJECT.md` → `STATUS.md` → `specs/active/faro-2-0/sprint.md` → issue #21 e filhas.

## Regras
1. **Repositório remoto é a verdade.** Branch `claude/faro-2-0`; trabalho commitado e enviado, não acumulado local.
2. **Idempotência.** Todo script, build, migration e função pode rodar duas vezes com o mesmo resultado.
3. **Teste antes do código** (RED, depois GREEN). Só diga "feito" com a saída do teste. `npm run check` e `npm run build` precisam estar verdes antes de PR.
4. **Sem deploy automático.** CI só verifica em pull request. Publicar em produção é manual e só com ok do dono.
5. **Cobrança desligada** até termos, privacidade, suporte, exclusão de conta, aviso de fim do teste e teste ponta a ponta existirem (`governance/constitution.md`).
6. **Sem legado.** Nada do app antigo volta; `design/` é só referência.
7. **Segredos nunca no repositório.** IDs do Stripe: `docs/evidence/faro-2-0/stripe-cupom-e-preco.md`.
8. Não inventar comportamento de provedor, valor financeiro ou sucesso de deploy; sem prova, diga "não provado".
9. Apagar branch, force-push, gasto e publicação pedem confirmação do dono.
10. **Mapa do código primeiro.** Antes de buscar em arquivos, rode `graphify query "pergunta"`. O gancho `.claude/hooks/graphify-gate.sh` barra TODA busca sem consulta recente ao mapa (modo estrito; saída de emergência: criar `graphify-out/.sem-trava`) e registra o uso em `graphify-out/uso.log`.

## Retomar
Issue #21 lista as tarefas; o estado real está em `STATUS.md` e `sprint.md`. Decisões em `docs/decisions/`.
