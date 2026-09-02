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
- B4 server-side commercial config: IN_PROGRESS — code/runtime ready, private provider config blocked.
- B5 Stripe sandbox catalog: PROVEN.
- B9 `RATAO` commercial math: PROVEN.
- Automatic Vercel Git deployments: FALSE.
- Production deploy: DENIED until release gate.
- `billingEnabled=false` remains fail-closed until commercial E2E passes.

## Vercel — estado atual

- Authenticated Vercel UI readback on 2026-09-02 proves project `faroapp-1-mddh` in team `vitoohugo333s-projects`.
- Project ID: `prj_iSR4C4eaSGiRs4B519tYYN8qxAsW`.
- GitHub repository homepage records stable app URL `https://faroapp-1.vercel.app`.
- The historical failed deployment hostname is `faroapp-1-mddh-pnkaqhn7p-vitoohugo333s-projects.vercel.app`.
- The real Vercel build cloned `viluadmcontas2-dot/FAROAPP1`, branch `main`, commit `360fc66743bef4d1aff46ee4b13d82b8f2ed9fb3`.
- That build proved `npm run build` succeeds and produces `_site`.
- Failure root cause: old `main` did not declare `outputDirectory`, so Vercel looked for default `public`.
- Candidate fix `d3f0c4303d61a18caf51adbacd212a07bb38e1df` passed verification run `33346078602`: exact SHA + Vercel config + full contracts + build + artifact audit.
- Verified fix promoted to `main@5baf4356d6d63561be94cca48a44525b10e04fa3`.
- `vercel.json` preserves `git.deploymentEnabled=false`, `buildCommand=npm run build`, `outputDirectory=_site`, SPA fallback, PWA headers and security headers.
- Authenticated Vercel project overview reports **No Production Deployment** and that the Production Domain is not serving traffic.
- The Deployments page shows only the historical failed pre-hotfix deployment.
- No automatic deployment was triggered by the hotfix, as intended.
- A successful post-hotfix Vercel Preview remains UNPROVEN and must be explicit/manual.
- Native Vercel MCP project/deployment reads still return 404 despite authenticated UI proof; do not create a duplicate project.
- Evidence: `docs/evidence/FARO-WU-002-vercel-output-hotfix-receipt.md`.

## Stripe — Brasko Agency sandbox

- account context: `acct_1UAESjLsq19Xe9NB` (`livemode=false`).
- product: `prod_VAaBVl0x3tqg2l` — FARO Financeiro.
- monthly price: `price_1UAF1HLsq19Xe9NBVCt4sSwN` = BRL 2299/month.
- coupon: `VPBhfe03` — Ratão, BRL 800 off, repeating 5 months.
- promotion code: `RATAO` / `promo_1UAF1tLsq19Xe9NBzv8mYQFP`.
- invoice-engine proof: subtotal 2299 − discount 800 = total 1499.
- webhook endpoint: `we_1UAFofLsq19Xe9NBk4gSh2tW` → Supabase `stripe-webhook-faro`.
- webhook is enabled, sandbox-only, with exactly six required commercial events.
- webhook signing secret intentionally absent from Git/evidence/chat.
- connected Stripe API exposes no operation to create/export restricted API keys.
- active sandbox Billing Portal configurations = 0; connected Stripe API exposes no create operation for the portal configuration.
- `automatic_tax=false`; no tax collection enabled.

## Supabase

- project: `faro-financeiro` / `mjbyqhreptllilkggiri` / `sa-east-1` / `ACTIVE_HEALTHY`.
- commercial Edge Functions ACTIVE: `criar-checkout-faro`, `abrir-portal-faro`, `stripe-webhook-faro`.
- deployed runtime matches the WU-002 source in material commercial behavior and remains fail-closed.
- B4 canonical server config:
  - `STRIPE_SECRET_KEY` = private restricted Brasko sandbox backend key;
  - `STRIPE_WEBHOOK_SECRET` = private signing secret for `we_1UAFofLsq19Xe9NBk4gSh2tW`;
  - `STRIPE_FARO_MONTHLY_PRICE_ID=price_1UAF1HLsq19Xe9NBVCt4sSwN`;
  - `FARO_APP_URL=https://faroapp-1.vercel.app`.
- Edge Function Secrets mutation is not exposed by the connected Supabase tool.
- A temporary boolean-only `n6-stripe-preflight` v5 was deployed on 2026-09-02, but no available HTTP executor could invoke it; no secret value was exposed or inferred.
- The preflight was immediately restored to v6, `verify_jwt=true`, HTTP 410 retired.
- Supabase SQL metadata readback remains unavailable due connection timeout; repeated retries were stopped per recovery policy.
- `n5-auth-smoke` is inert HTTP 410.
- `n6-stripe-preflight` is inert HTTP 410.
- `n6-billing-return` is retired/inert HTTP 410; the temporary HTML return surface is gone.
- Evidence: `docs/evidence/FARO-WU-002-b4-runtime-parity-and-bootstrap.md`.

## next_unproven_item

**B4 owner/provider UI gate only:**

1. Create/retrieve a restricted Stripe backend key in **Brasko Agency sandbox** and install it directly as `STRIPE_SECRET_KEY` in Supabase Edge Function Secrets.
2. Reveal the signing secret for webhook `we_1UAFofLsq19Xe9NBk4gSh2tW` and transfer it directly to Supabase as `STRIPE_WEBHOOK_SECRET`; never paste it into chat/Git.
3. Set `STRIPE_FARO_MONTHLY_PRICE_ID=price_1UAF1HLsq19Xe9NBVCt4sSwN` and `FARO_APP_URL=https://faroapp-1.vercel.app` in the same Supabase secret/config surface.
4. Create one Stripe sandbox Billing Portal configuration with payment-method update + cancellation enabled, cancellation at end of paid period.
5. After this gate, agent resumes B6–B8 authenticated Checkout → signed/idempotent webhook → entitlement → Portal E2E without reading secret values.

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
