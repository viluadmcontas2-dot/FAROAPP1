# FARO-WU-002 — B4 webhook secret/configuration probe

Date: 2026-09-02
Environment: Brasko Agency sandbox only (`acct_1UAESjLsq19Xe9NB`, `livemode=false`)
Supabase project: `mjbyqhreptllilkggiri`
Webhook endpoint: `we_1UAFofLsq19Xe9NBk4gSh2tW` → `stripe-webhook-faro`

## Purpose

Prove B4 server-side Stripe configuration state by behavior without reading, logging, copying, or exposing any secret value.

The deployed webhook fails closed before signature verification when either `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` is missing. Therefore a real Stripe delivery returning HTTP 503 is direct evidence that the required secret configuration is not complete.

## Probe

A disposable sandbox customer and a one-day trial subscription were created with probe-only metadata and **without `faro_user_id`**. This guarantees the webhook cannot grant FARO entitlement to any user.

- probe customer: `cus_VBiIYq4C5BVzXH`
- probe subscription: `sub_1UBKrmLsq19Xe9NB6RxJWxJ4`
- price: `price_1UAF1HLsq19Xe9NBVCt4sSwN`
- subscription state at creation: `trialing`
- payment method: none
- real charge: none
- `automatic_tax=false`

## Result

Fresh Supabase Edge Function logs recorded two real Stripe deliveries to `stripe-webhook-faro`, both HTTP **503** on 2026-09-02.

This is consistent with the deployed fail-closed guard:

- missing `STRIPE_SECRET_KEY` **or**
- missing `STRIPE_WEBHOOK_SECRET`

No secret value was read or inferred individually. The result proves only that the pair is not fully configured.

## Hygiene

The synthetic subscription was canceled immediately with `invoice_now=false` and `prorate=false`; final state is `canceled`.

The connected Stripe API does not expose customer deletion. The synthetic customer therefore remains only as an explicitly marked disposed sandbox probe:

- description: `DISPOSED FARO B4 webhook configuration probe — no active subscription, no payment method`
- metadata `probe_state=disposed`
- metadata `active_subscription=false`
- no payment method
- no active subscription
- no financial effect

## B4 verdict

`B4 = BLOCKED_PRIVATE_PROVIDER_CONFIG`

Still required in private provider UI, never via chat/Git:

1. Create/retrieve Brasko sandbox restricted backend API key and install directly in Supabase Edge Function Secrets as `STRIPE_SECRET_KEY`.
2. Reveal the signing secret for webhook `we_1UAFofLsq19Xe9NBk4gSh2tW` and transfer directly to Supabase as `STRIPE_WEBHOOK_SECRET`.
3. Set `STRIPE_FARO_MONTHLY_PRICE_ID=price_1UAF1HLsq19Xe9NBVCt4sSwN`.
4. Set `FARO_APP_URL=https://faroapp-1.vercel.app`.
5. Create one active sandbox Billing Portal configuration with payment-method update enabled and subscription cancellation at period end.

After this gate, resume B6–B8 authenticated E2E without secret-value readback.
