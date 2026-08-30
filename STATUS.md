# FARO — HUMAN STATUS

## Authority

**REMOTE_FIRST = ALWAYS**  
**SOLE_DURABLE_PROJECT_TRUTH = GitHub remote**  
**LINEAR_EXECUTION_WRITER = RETIRED**  
**NOTION_ENGINEERING_AUTHORITY = NO**

## Onde estamos

**FARO-WU-002 — Vercel cutover + commercial completion: ACTIVE**

- Canonical `main`: `360fc66743bef4d1aff46ee4b13d82b8f2ed9fb3`.
- Active Issue: #15.
- Active branch: `wu/faro-wu-002-vercel-commercial`.
- Active draft PR: #16 → `main`.
- B1 repo-first boot: PROVEN.
- B2 Vercel project identity: IN_PROGRESS — manual project reported, exact provider scope/project ID not yet observable.
- B3 Vercel static runtime contract: PROVEN.
- B4 server-side commercial config: IN_PROGRESS.
- B5 Stripe sandbox catalog: PROVEN.
- B9 `RATAO` commercial math: PROVEN.
- WU-002 reconciled with the four newer `main` governance commits at merge `16168685ec7bc69721346db787695996382fcfb2`.
- PR conflict caused by main drift was resolved; branch became 0 behind `main` and mergeable again.
- Automatic Vercel Git deployments: FALSE.
- Production deploy: DENIED until release gate.
- `billingEnabled=false` remains fail-closed until commercial E2E passes.

## Vercel runtime contract

- `vercel.json`: PRESENT and contract-tested.
- `git.deploymentEnabled=false`: preserved from current `main` governance.
- build command: `npm run build`.
- output directory: `_site`.
- SPA fallback: `/(.*) -> /index.html`.
- PWA cache/service-worker headers: PRESERVED.
- security headers: PRESERVED.
- exact source SHA previously verified: `34450b6db77b31211820ea9a365b55f38fa54d89`.
- full verification run: `33333535649` SUCCESS (`npm run check` + build + `_site` audit).
- evidence: `docs/evidence/FARO-WU-002-vercel-runtime-contract-receipt.md`.

## Vercel provider identity

- connected team: `team_HECWodzpFDWJQCxmo9ZUwmv5` / `vitoohugo333s-projects` / Hobby.
- user reports that the FARO project was created manually.
- GitHub repository homepage now points to `https://faroapp-1.vercel.app`.
- connected Vercel provider still lists only `brasko`.
- direct lookups `faro-financeiro`, `faroapp1`, `faro`, `faroapp-1` return 404 in the connected scope.
- likely condition: the project was created under a different Vercel scope/account than the connected MCP scope.
- agent did NOT create a duplicate and did NOT trigger a deploy.
- B2 closes only after exact Vercel Project ID (`prj_...`) or project identity is read back.

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

1. B2: obtain/read back the exact Vercel Project ID (`prj_...`) or dashboard project identity for the manually-created FARO project.
2. Use its Vercel URL as sandbox `FARO_APP_URL`.
3. B4: install the Brasko sandbox restricted Stripe key + current price ID + webhook signing secret directly in Supabase Edge Function Secrets, and configure sandbox Billing Portal.
4. B6–B8: prove authenticated Checkout → subscription → signed/idempotent webhook → entitlement → Billing Portal.
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
