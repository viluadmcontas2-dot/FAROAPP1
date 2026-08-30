# FARO — HUMAN STATUS

## Authority

**REMOTE_FIRST = ALWAYS**  
**SOLE_DURABLE_PROJECT_TRUTH = GitHub remote**  
**LINEAR_EXECUTION_WRITER = RETIRED**  
**NOTION_ENGINEERING_AUTHORITY = NO**

## Onde estamos

**Governance V2 repo-first/remote-first: CUTOVER IN PROGRESS**

- WorkUnit ativa: `FARO-WU-001 — Repo-first cutover, lineage consolidation e limpeza`.
- GitHub Issue: #13.
- Branch: `wu/faro-wu-001-repo-first-cutover`.
- Draft PR: #14 → `main`; fresh remote readback: `mergeable=true`.
- Functional source preserved: `3eb2b72283545a4a51aac5749ca102691ba294ec`.
- Current verified-by-readback structural head before this status checkpoint: `d4678811ce7450b8abbd45ecdcad7696b792cccd`.
- Legacy PR #12: CLOSED / SUPERSEDED / UNMERGED.
- History anchor: `archive/pre-repo-first-lineages-20260830` at `9b8c268a2d29423efc40ee3e2b5cd44bc62cf250`.
- All pre-cutover branch tips are remotely anchored before deletion.
- Active build: `scripts/build-static-site.mjs` → `_site`.
- Active `netlify.toml`: absent; legacy config archived under `docs/archive/`.
- Actions policy: manual/selective only.
- Exact current-SHA runtime verification: PENDING because Remote Desktop is offline and ephemeral runtime cannot resolve GitHub DNS.
- Legacy branch ref deletion: PENDING because current GitHub connector has no delete-ref operation and Remote Desktop is offline.

## Produto preservado

- N0–N5 historical product gates remain preserved by source lineage; they are not being re-derived from Linear.
- N6: Stripe provider behavior historically demonstrated, but FARO app commercial E2E remains unproven and `billingEnabled=false` stays fail-closed.
- N7: physical validation not proven.

## Estado comercial preservado

- Stripe test product: `prod_V7X491xOMU0wYI`.
- monthly price: `price_1U7I0FGsvVKn86yrJ6wbfTG3` = R$ 22,99.
- coupon Ratão: `bYPTFkFb` = R$ 8,00 off por 5 meses.
- promotion code: `RATAO` / `promo_1U7IbeGsvVKn86yr6hSy2dHY`.
- Supabase project: `mjbyqhreptllilkggiri`.
- Commercial Edge Functions remain installed/fail-closed until official secret store + Portal + E2E are complete.

## next_unproven_item

1. `FARO-WU-001 / A8`: execute exact-current-SHA contracts + build + built-artifact audit.
2. `FARO-WU-001 / A7`: delete branches classified `ARCHIVED_DELETE` and read back remote branch list.
3. Reconcile WorkUnit evidence, merge PR #14 to `main`, delete WU branch, then open `FARO-WU-002 — Vercel cutover + commercial completion`.
4. After WU-002, execute `FARO-WU-003 — Release/physical closure`.

## Não fazer agora

- não consultar Linear para decidir trabalho atual;
- não usar Notion como boot técnico;
- não apagar o archive branch;
- não promover billing;
- não fazer production deploy;
- não alegar teste físico sem dispositivo real.
