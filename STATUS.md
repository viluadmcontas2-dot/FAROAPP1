# FARO — HUMAN STATUS

## Authority

**REMOTE_FIRST = ALWAYS**  
**SOLE_DURABLE_PROJECT_TRUTH = GitHub remote**  
**LINEAR_EXECUTION_WRITER = RETIRED**  
**NOTION_ENGINEERING_AUTHORITY = NO**

## Onde estamos

**Governance V2 repo-first/remote-first: CUTOVER READY TO MERGE**

- WorkUnit de cutover: `FARO-WU-001 — Repo-first cutover, lineage consolidation e limpeza`.
- GitHub Issue: #13.
- PR canônico: #14 → `main`.
- Functional source preserved: `3eb2b72283545a4a51aac5749ca102691ba294ec`.
- Verified runtime/source SHA: `c9f43b48c3d3f3a2c09d02f718e7a30111951d8f`.
- Verification run: `33329606755` = SUCCESS (`npm run check` + build + built-artifact audit).
- Legacy branch cleanup: PASS; remote readback leaves only `main`, `archive/pre-repo-first-lineages-20260830`, and the WU branch before merge.
- History anchor: `archive/pre-repo-first-lineages-20260830` at `9b8c268a2d29423efc40ee3e2b5cd44bc62cf250`.
- Legacy PR #12: CLOSED / SUPERSEDED / UNMERGED.
- Active build: `scripts/build-static-site.mjs` → `_site`.
- Netlify active config: RETIRED; legacy files remain only under `docs/archive/`.
- Actions policy: manual/selective only.
- Deploy performed by WU-001: NONE.

## Produto preservado

- Historical product lineage is preserved without using Linear as execution authority.
- Billing stays fail-closed (`billingEnabled=false`) until commercial E2E is proven.
- Physical validation remains unproven and must not be inferred.

## Estado comercial preservado

- Stripe test product: `prod_V7X491xOMU0wYI`.
- Monthly price: `price_1U7I0FGsvVKn86yrJ6wbfTG3` = R$ 22,99.
- Coupon Ratão: `bYPTFkFb` = R$ 8,00 off por 5 meses.
- Promotion code: `RATAO` / `promo_1U7IbeGsvVKn86yr6hSy2dHY`.
- Supabase project: `mjbyqhreptllilkggiri`.

## next_unproven_item

1. Merge PR #14 to `main` with the verified lineage preserved.
2. Open `FARO-WU-002 — Vercel cutover + commercial completion` from merged `main`.
3. In WU-002: configure Vercel/runtime + finish Stripe/Supabase commercial E2E; only then enable billing.
4. After WU-002: execute `FARO-WU-003 — Release/physical closure`.

## Não fazer agora

- não consultar Linear para decidir trabalho atual;
- não usar Notion como boot técnico;
- não apagar o archive branch;
- não promover billing antes do E2E;
- não fazer production deploy fora da WorkUnit de release/hosting;
- não alegar teste físico sem dispositivo real.
