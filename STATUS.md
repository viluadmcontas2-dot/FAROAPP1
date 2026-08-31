# FARO — HUMAN STATUS

## Authority

**REMOTE_FIRST = ALWAYS**  
**SOLE_DURABLE_PROJECT_TRUTH = GitHub remote**  
**LINEAR_EXECUTION_WRITER = RETIRED**  
**NOTION_ENGINEERING_AUTHORITY = NO**

## Onde estamos

**FARO-WU-002 — Vercel cutover + commercial completion: ACTIVE**

- Canonical `main`: `5baf4356d6d63561be94cca48a44525b10e04fa3`.
- Active Issue: #15.
- Active branch: `wu/faro-wu-002-vercel-commercial`.
- Active draft PR: #16 → `main`.
- B1 repo-first boot: PROVEN.
- B2 Vercel project/import identity: PROVEN.
- B3 Vercel static runtime contract: PROVEN.
- B4 server-side commercial config: IN_PROGRESS.
- B5 Stripe sandbox catalog: PROVEN.
- B9 `RATAO` commercial math: PROVEN.
- Automatic Vercel Git deployments: FALSE.
- Production deploy: DENIED until release gate.
- `billingEnabled=false` remains fail-closed until commercial E2E passes.

## Vercel — estado atual

- GitHub/Vercel status identified the imported project context as `faroapp-1-mddh`.
- The real Vercel build cloned `viluadmcontas2-dot/FAROAPP1`, branch `main`, commit `360fc66743bef4d1aff46ee4b13d82b8f2ed9fb3`.
- That build proved `npm run build` itself succeeds and produces `_site`.
- Failure root cause: the old `main` Vercel config did not declare `outputDirectory`, so Vercel looked for default `public`.
- Candidate fix: `d3f0c4303d61a18caf51adbacd212a07bb38e1df`.
- Verification run `33346078602`: exact SHA + Vercel config + full contracts + build + artifact audit = PASS.
- Verified fix promoted to `main` at `5baf4356d6d63561be94cca48a44525b10e04fa3`.
- `vercel.json` now preserves `git.deploymentEnabled=false`, `buildCommand=npm run build`, `outputDirectory=_site`, SPA fallback, PWA headers and security headers.
- No automatic Vercel deployment was triggered by the hotfix.
- A successful Vercel runtime redeploy of the updated `main` remains UNPROVEN until explicitly invoked.
- Evidence: `docs/evidence/FARO-WU-002-vercel-output-hotfix-receipt.md`.

## Stripe — Brasko Agency sandbox

- account context: `acct_1UAESjLsq19Xe9NB` (`livemode=false`).
- product: `prod_VAaBVl0x3tqg2l` — FARO Financeiro.
- monthly price: `price_1UAF1HLsq19Xe9NBVCt4sSwN` = BRL 2299/month.
- coupon: `VPBhfe03` — Ratão, BRL 800 off, repeating 5 months.
- promotion code: `RATAO` / `promo_1UAF1tLsq19Xe9NBzv8mYQFP`.
- invoice-engine proof: subtotal 2299 − discount 800 = total 1499.
- webhook endpoint: `we_1UAFofLsq19Xe9NBk4gSh2tW` → Supabase `stripe-webhook-faro`.
- exactly six required webhook events enabled.
- webhook signing secret intentionally absent from Git/evidence/chat.
- Stripe API exposes no operation to create/export restricted API keys.
- Billing Portal configurations in sandbox: 0; connected API exposes no create operation.
- `automatic_tax=false`; no tax collection enabled.

## Supabase

- project: `faro-financeiro` / `mjbyqhreptllilkggiri` / `sa-east-1` / `ACTIVE_HEALTHY`.
- commercial Edge Functions ACTIVE: `criar-checkout-faro`, `abrir-portal-faro`, `stripe-webhook-faro`.
- all three remain fail-closed when required runtime values are absent.
- required B4 server-side variables: `STRIPE_SECRET_KEY`, `STRIPE_FARO_MONTHLY_PRICE_ID`, `FARO_APP_URL`, `STRIPE_WEBHOOK_SECRET`.
- Edge Function Secrets management is not exposed by the connected Supabase tool.
- attempted secure Vault backup of the new webhook secret hit a Postgres connection timeout; no secret was persisted to Git/evidence.
- `n5-auth-smoke` and `n6-stripe-preflight` remain inert; temporary `n6-billing-return` is cleanup debt.

## next_unproven_item

1. B4: complete sandbox server-side commercial config: restricted Stripe backend key + current price ID + FARO_APP_URL + webhook signing secret in Supabase Edge Function Secrets, and configure Stripe Billing Portal.
2. Explicitly redeploy updated `main` on Vercel when using the real Vercel URL as `FARO_APP_URL`.
3. B6–B8: prove authenticated Checkout → subscription → signed/idempotent webhook → entitlement → Billing Portal.
4. Only after full E2E + regression: enable billing and prepare FARO-WU-003.

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
