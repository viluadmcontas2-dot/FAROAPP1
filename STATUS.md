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
- `billingEnabled=false` freshly revalidated and remains fail-closed until commercial E2E passes.

## Vercel — estado atual

- GitHub/Vercel status identified the imported project context as `faroapp-1-mddh`.
- GitHub repository homepage records the stable app URL as `https://faroapp-1.vercel.app`.
- The real Vercel build cloned `viluadmcontas2-dot/FAROAPP1`, branch `main`, commit `360fc66743bef4d1aff46ee4b13d82b8f2ed9fb3`.
- That build proved `npm run build` itself succeeds and produces `_site`.
- Failure root cause: the old `main` Vercel config did not declare `outputDirectory`, so Vercel looked for default `public`.
- Candidate fix: `d3f0c4303d61a18caf51adbacd212a07bb38e1df`.
- Verification run `33346078602`: exact SHA + Vercel config + full contracts + build + artifact audit = PASS.
- Verified fix promoted to `main` at `5baf4356d6d63561be94cca48a44525b10e04fa3`.
- `vercel.json` now preserves `git.deploymentEnabled=false`, `buildCommand=npm run build`, `outputDirectory=_site`, SPA fallback, PWA headers and security headers.
- No automatic Vercel deployment was triggered by the hotfix, as intended.
- A successful Vercel runtime redeploy of the updated `main` remains UNPROVEN until explicitly invoked as a preview/material gate.
- Direct Vercel MCP readback of the newly imported project/deployment still returns 404 even though GitHub status proves the import context; do not duplicate the project.
- Evidence: `docs/evidence/FARO-WU-002-vercel-output-hotfix-receipt.md`.

## Stripe — Brasko Agency sandbox

- account context: `acct_1UAESjLsq19Xe9NB` (`livemode=false`).
- product: `prod_VAaBVl0x3tqg2l` — FARO Financeiro.
- monthly price: `price_1UAF1HLsq19Xe9NBVCt4sSwN` = BRL 2299/month.
- coupon: `VPBhfe03` — Ratão, BRL 800 off, repeating 5 months.
- promotion code: `RATAO` / `promo_1UAF1tLsq19Xe9NBzv8mYQFP`.
- invoice-engine proof: subtotal 2299 − discount 800 = total 1499.
- webhook endpoint: `we_1UAFofLsq19Xe9NBk4gSh2tW` → Supabase `stripe-webhook-faro`.
- fresh readback: webhook `enabled`, sandbox-only, with exactly six required webhook events.
- webhook signing secret intentionally absent from Git/evidence/chat.
- Stripe API exposes no operation to create/export restricted API keys.
- fresh Billing Portal readback: active configurations = 0; connected Stripe API exposes no create operation.
- `automatic_tax=false`; no tax collection enabled.

## Supabase

- project: `faro-financeiro` / `mjbyqhreptllilkggiri` / `sa-east-1` / `ACTIVE_HEALTHY`.
- commercial Edge Functions ACTIVE: `criar-checkout-faro`, `abrir-portal-faro`, `stripe-webhook-faro`.
- fresh runtime readback matches the WU-002 source in all material commercial behavior; no Git↔runtime drift found.
- all three remain fail-closed when required runtime values are absent.
- B4 canonical config:
  - `STRIPE_SECRET_KEY` = private restricted Brasko sandbox backend key;
  - `STRIPE_WEBHOOK_SECRET` = private signing secret for `we_1UAFofLsq19Xe9NBk4gSh2tW`;
  - `STRIPE_FARO_MONTHLY_PRICE_ID=price_1UAF1HLsq19Xe9NBVCt4sSwN`;
  - `FARO_APP_URL=https://faroapp-1.vercel.app`.
- Edge Function Secrets management is not exposed by the connected Supabase tool.
- `n5-auth-smoke` is inert HTTP 410.
- `n6-stripe-preflight` is inert HTTP 410.
- `n6-billing-return` was retired in this WU and is now inert HTTP 410 (version 2); the temporary HTML return surface is gone.
- Supabase connector exposes no Edge Function delete operation, so retired tombstones remain listed but non-operational.
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
