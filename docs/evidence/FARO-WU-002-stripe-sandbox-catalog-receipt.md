# FARO-WU-002 — Stripe Sandbox Catalog Receipt

Date: 2026-08-30

`FARO_WU002_STRIPE_SANDBOX_CATALOG=PASS`

## Target

- Stripe account owner: Brasko Agency
- Stripe context: `acct_1UAESjLsq19Xe9NB`
- environment: sandbox / `livemode=false`
- production Stripe account was not mutated

## Canonical sandbox objects

- product: `prod_VAaBVl0x3tqg2l` — FARO Financeiro
- monthly price: `price_1UAF1HLsq19Xe9NBVCt4sSwN` — BRL 2299 / month
- coupon: `VPBhfe03` — Ratão, BRL 800 off, repeating 5 months
- promotion code: `promo_1UAF1tLsq19Xe9NBzv8mYQFP` — `RATAO`

## Fresh verification

- active product list: exactly 1 FARO product
- active price list: exactly 1 FARO monthly price
- coupon list: exactly 1 coupon
- active promotion-code list: exactly 1 promotion code
- invoice preview subtotal: 2299
- invoice preview discount: 800
- invoice preview total / amount_due: 1499
- automatic tax in preview: disabled
- persistent subscriptions after preview: 0
- persistent customers after preview: 0

## Guards preserved

- `billingEnabled=false` remains fail-closed
- no production deployment
- no live-mode Stripe mutation
- no secret was written to Git, frontend, evidence, or logs
- Stripe Tax remains disabled until registrations/tax posture are explicitly confirmed

## Verdict

B5 provider catalog = PROVEN in the Brasko Agency sandbox.
B9 `RATAO` commercial math = PROVEN in the Stripe invoice engine.

Next: B2/B3 Vercel target/runtime configuration, then B4 server-side secrets and B6–B8 authenticated commercial E2E.
