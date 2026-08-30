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
- Active draft PR: #16 → `main`.
- B1 repo-first boot: PROVEN.
- B5 Stripe sandbox catalog: PROVEN.
- B9 `RATAO` commercial math: PROVEN.
- Predecessor WU-001: COMPLETED / PR #14 MERGED.
- Historical genealogy anchor: `archive/pre-repo-first-lineages-20260830` at `9b8c268a2d29423efc40ee3e2b5cd44bc62cf250`.
- Branch model: `main` + archive + exactly one active `wu/*`.
- Active build: `scripts/build-static-site.mjs` → `_site`.
- Hosting target: Vercel.
- Netlify active coupling: RETIRED.
- Production deploy: DENIED until release gate.
- `billingEnabled=false` remains fail-closed until commercial E2E passes.

## Stripe — Brasko Agency sandbox (canonical for WU-002)

- account context: `acct_1UAESjLsq19Xe9NB` (`livemode=false`).
- product: `prod_VAaBVl0x3tqg2l` — FARO Financeiro.
- monthly price: `price_1UAF1HLsq19Xe9NBVCt4sSwN` = BRL 2299/month.
- coupon: `VPBhfe03` — Ratão, BRL 800 off, repeating 5 months.
- promotion code: `RATAO` / `promo_1UAF1tLsq19Xe9NBzv8mYQFP`.
- invoice-engine proof: subtotal 2299 − discount 800 = total 1499.
- `automatic_tax=false` in the proof; no tax collection was enabled.
- post-preview hygiene: 0 persistent customers, 0 persistent subscriptions.
- evidence: `docs/evidence/FARO-WU-002-stripe-sandbox-catalog-receipt.md`.

## Supabase preserved target

- project: `faro-financeiro` / `mjbyqhreptllilkggiri` / `sa-east-1` / `ACTIVE_HEALTHY`.
- commercial Edge Functions are deployed and remain subject to B4/B6-B8 E2E verification.
- retired smoke functions are inert; temporary `n6-billing-return` remains cleanup debt until the Vercel return URL replaces it.

## Vercel state

- FARO project does not yet exist in the connected Vercel team.
- only existing project observed in preflight: `brasko`.
- no Vercel deployment was created during this preflight.

## next_unproven_item

1. B2/B3: establish the FARO Vercel project/runtime target and prove the provider-neutral `_site` build there without production promotion.
2. B4: install/verify only the missing server-side Stripe/Supabase configuration; never place secrets in Git/frontend/logs.
3. B6–B8: prove authenticated Checkout → subscription → signed/idempotent webhook → entitlement → Billing Portal.
4. Re-run B9 through the real Checkout path with `RATAO`.
5. Only after full E2E + regression: enable billing and prepare FARO-WU-003.

## Não fazer agora

- não consultar Linear para decidir trabalho atual;
- não usar Notion as execution writer;
- não tocar no archive branch;
- não reutilizar FARO Corridas;
- não colocar secrets no repo/frontend/logs;
- não habilitar billing antes do E2E;
- não mutar Stripe live antes do sandbox E2E;
- não fazer production deploy;
- não alegar teste físico.
