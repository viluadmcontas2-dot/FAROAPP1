# Branch Policy — FARO

- `main` será a linha canônica estável após o cutover.
- Uma WorkUnit material usa uma branch `wu/<workunit-id>-<slug>` criada da `main` canônica ou da lineage de cutover explicitamente documentada.
- Uma WorkUnit = uma Issue = uma branch = um PR.
- Proibido criar branches `audit/*`, `snapshot/*`, `test/*` ou genealogias paralelas como mecanismo permanente de verificação.
- Auditoria usa commits/evidence, não branches descartáveis.
- Branch de WorkUnit deve ser removida após merge e readback do commit integrado.
- Branch antiga só pode ser removida quando uma das condições for provada remotamente:
  1. tip é ancestor da lineage canônica; ou
  2. compare mostra zero conteúdo/commits únicos relevantes; ou
  3. conteúdo único foi absorvido e verificado em commit canônico.
- Branch com conteúdo único desconhecido fica `QUARANTINED_NOT_DELETED` até reconciliação.
- `main` não recebe force-push durante o cutover.
