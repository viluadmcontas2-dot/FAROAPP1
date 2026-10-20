# FARO-WU-001 — Repo-first cutover, lineage consolidation e limpeza

## Objective

Converter o FARO do modelo legado Notion/Linear + branch de integração para uma governança repo-first/remote-first com GitHub Issues, Spec Kit, lineage única e verificações econômicas, preservando todo trabalho funcional já existente.

## Design

O cutover partiu do SHA funcional preservado `3eb2b72283545a4a51aac5749ca102691ba294ec` e consolidou uma branch única de WorkUnit. O repo passou a carregar boot repo-first, constituição/authority map, Spec Kit e workflows manuais. Branches antigas foram ancoradas antes de qualquer exclusão.

## Final state

- PR #14 merged into `main` at `f1beb92b6811e15f57449f4be9e92910b6d73571`.
- Verified runtime/source SHA: `c9f43b48c3d3f3a2c09d02f718e7a30111951d8f`.
- Verification run: `33329606755` SUCCESS.
- Legacy branch cleanup: PASS.
- Deploy: NONE.

## Invariants established

- remote GitHub = sole durable truth;
- Linear execution writer retired;
- Notion context only;
- one WU = one Issue = one branch = one PR;
- Actions-last;
- hosting build provider-neutral;
- no production deploy during WU-001.
