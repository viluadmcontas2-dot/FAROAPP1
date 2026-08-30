# FARO-WU-001 — Repo-first cutover, lineage consolidation e limpeza

## Objective

Converter o FARO do modelo legado Notion/Linear + branch de integração para uma governança repo-first/remote-first com GitHub Issues, Spec Kit, lineage única e verificações econômicas, preservando todo trabalho funcional já existente.

## Design

O cutover parte do SHA funcional preservado `3eb2b72283545a4a51aac5749ca102691ba294ec` e cria uma branch única de WorkUnit. O repo passa a carregar os arquivos de boot (`AGENTS.md`, `PROJECT.md`, `STATUS.md`), constituição/authority map, Spec Kit e workflows manuais. Depois disso, cada branch antiga é comparada à lineage canônica: redundantes são removidas; conteúdo único é preservado/absorvido antes de qualquer delete.

## Invariants

- remote GitHub = sole durable truth;
- Linear execution writer retired;
- Notion context only;
- one WU = one Issue = one branch = one PR;
- no hidden branch deletion;
- Actions-last;
- preserve Supabase/Stripe/product behavior;
- no production deploy during WU-001;
- Vercel cutover is WU-002.

## Deliverables

1. repo-first governance and boot files;
2. Spec Kit + Issue/PR templates;
3. manual/selective Actions policy;
4. provider-neutral build naming;
5. lineage inventory and evidence;
6. legacy PR retirement;
7. branch cleanup with remote proof;
8. single clean PR to `main`;
9. next WorkUnits encoded in STATUS.

## Non-goals

- production Vercel deploy;
- live billing activation;
- physical validation;
- rewriting product UI/UX.
