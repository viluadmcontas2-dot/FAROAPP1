# FARO — HUMAN STATUS

## Authority

**REMOTE_FIRST = ALWAYS**  
**SOLE_DURABLE_PROJECT_TRUTH = GitHub remote**  
**LINEAR_EXECUTION_WRITER = RETIRED**  
**NOTION_ENGINEERING_AUTHORITY = NO**

## Onde estamos

**FARO-WU-002 — Vercel cutover + commercial completion: ACTIVE**

- Canonical `main`: `f1beb92b6811e15f57449f4be9e92910b6d73571`.
- Active Issue: #15.
- Active branch: `wu/faro-wu-002-vercel-commercial`.
- Predecessor WU-001: COMPLETED / PR #14 MERGED.
- Historical genealogy anchor: `archive/pre-repo-first-lineages-20260830` at `9b8c268a2d29423efc40ee3e2b5cd44bc62cf250`.
- Branch model: `main` + archive + exactly one active `wu/*`.
- Active build: `scripts/build-static-site.mjs` → `_site`.
- Hosting target: Vercel.
- Netlify active coupling: RETIRED.
- Production deploy: DENIED until release gate.
- `billingEnabled=false` remains fail-closed until commercial E2E passes.

## Commercial state to revalidate live

- Stripe product candidate: `prod_V7X491xOMU0wYI`.
- Monthly price candidate: `price_1U7I0FGsvVKn86yrJ6wbfTG3` = R$ 22,99.
- Coupon candidate: `bYPTFkFb`.
- Promotion candidate: `RATAO` / `promo_1U7IbeGsvVKn86yr6hSy2dHY`.
- Supabase FARO Financeiro candidate: `mjbyqhreptllilkggiri`.

These are preserved references, not substitutes for live provider readback.

## next_unproven_item

1. Complete B1 by opening the WU-002 draft PR to `main` and recording it in the Spec Kit.
2. B2: perform read-only Vercel preflight and identify the canonical project/runtime target without deploying.
3. In parallel read-only preflight: verify live Stripe objects and Supabase commercial runtime state.
4. Mutate only what is proven missing; keep secrets server-side and billing disabled.
5. Prove Checkout → RATAO → webhook → entitlement → Portal.
6. Only after full E2E + regression: enable billing and prepare FARO-WU-003.

## Não fazer agora

- não consultar Linear para decidir trabalho atual;
- não usar Notion as execution writer;
- não tocar no archive branch;
- não reutilizar FARO Corridas;
- não colocar secrets no repo/frontend/logs;
- não habilitar billing antes do E2E;
- não fazer production deploy;
- não alegar teste físico.
