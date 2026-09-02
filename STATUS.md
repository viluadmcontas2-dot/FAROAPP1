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
- B4 server-side commercial config: **BLOCKED_PRIVATE_PROVIDER_CONFIG** — fresh probes prove all four required Supabase values are absent/not matching and Billing Portal config count remains 0.
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
- connected Stripe API exposes no operation to create/export restricted API keys.
- active sandbox Billing Portal configurations = 0; connected Stripe API discovery exposes reads but not the documented create operation.
- fresh disposable B4 probe subscription `sub_1UBKrmLsq19Xe9NB6RxJWxJ4` was created in trial with no card/no `faro_user_id`, then canceled immediately with no proration/final invoice.
- synthetic customer `cus_VBiIYq4C5BVzXH` has no payment method and no active subscription and is explicitly marked `probe_state=disposed`; customer deletion is not exposed by the connected Stripe API.
- `automatic_tax=false`; no tax collection enabled.
- No Stripe live object was touched.

## Supabase

- project: `faro-financeiro` / `mjbyqhreptllilkggiri` / `sa-east-1` / `ACTIVE_HEALTHY`.
- commercial Edge Functions ACTIVE: `criar-checkout-faro`, `abrir-portal-faro`, `stripe-webhook-faro`.
- deployed runtime matches the WU-002 source in material commercial behavior and remains fail-closed.
- Fresh real Stripe→Supabase probe produced **2 × HTTP 503** on `stripe-webhook-faro`; deployed code returns 503 before signature verification when the Stripe API key or webhook secret is absent.
- One-shot boolean preflight v7 then proved, without returning values:
  - `stripe_secret_present=false`;
  - `stripe_secret_can_read_expected_sandbox_price=false`;
  - `webhook_secret_present=false`;
  - `monthly_price_matches=false`;
  - `app_url_matches=false`.
- The one-shot probe was immediately retired. `n6-stripe-preflight` is now v8, `verify_jwt=true`, HTTP 410 retired.
- B4 canonical server config still required:
  - `STRIPE_SECRET_KEY` = private restricted Brasko sandbox backend key;
  - `STRIPE_WEBHOOK_SECRET` = private signing secret for `we_1UAFofLsq19Xe9NBk4gSh2tW`;
  - `STRIPE_FARO_MONTHLY_PRICE_ID=price_1UAF1HLsq19Xe9NBVCt4sSwN`;
  - `FARO_APP_URL=https://faroapp-1.vercel.app`.
- Edge Function Secrets mutation is not exposed by the connected Supabase tool.
- Supabase SQL metadata readback remains unavailable due connection timeout; repeated retries were stopped per recovery policy.
- `n5-auth-smoke` is inert HTTP 410.
- `n6-stripe-preflight` is inert HTTP 410.
- `n6-billing-return` is retired/inert HTTP 410; the temporary HTML return surface is gone.
- Evidence: `docs/evidence/FARO-WU-002-b4-runtime-parity-and-bootstrap.md` and `docs/evidence/FARO-WU-002-b4-webhook-secret-probe-20260902.md`.

## next_unproven_item

**B4 owner/provider UI gate only:**

1. In **Brasko Agency sandbox**, create/retrieve a restricted backend key and install it directly as `STRIPE_SECRET_KEY` in Supabase Edge Function Secrets.
2. Reveal the signing secret for webhook `we_1UAFofLsq19Xe9NBk4gSh2tW` and transfer it directly to Supabase as `STRIPE_WEBHOOK_SECRET`; never paste it into chat/Git.
3. In the same Supabase secret surface, set `STRIPE_FARO_MONTHLY_PRICE_ID=price_1UAF1HLsq19Xe9NBVCt4sSwN` and `FARO_APP_URL=https://faroapp-1.vercel.app`.
4. Create one Stripe sandbox Billing Portal configuration with payment-method update + cancellation enabled, cancellation at end of paid period.
5. Reply only `feito`; agent then resumes B6–B8 authenticated Checkout → signed/idempotent webhook → entitlement → Portal E2E without reading secret values.

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
