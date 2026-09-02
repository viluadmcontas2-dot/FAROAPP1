# FARO-WU-002 — B4 runtime parity + bootstrap gate

## Verdict

`B4 = CODE_AND_RUNTIME_READY / PRIVATE_CONFIG_BLOCKED`

The commercial implementation is ready to exercise. The remaining blocker is provider-side private configuration; it is not a source-code defect.

## Runtime parity

Fresh readback of the deployed Supabase Edge Functions matches the canonical WU-002 source in all material behavior:

- `criar-checkout-faro` — authenticated user context, fail-closed on missing config, server-side Stripe customer, subscription Checkout, promotion codes enabled, FARO metadata, `FARO_APP_URL` return paths.
- `abrir-portal-faro` — authenticated user context, server-owned `stripe_customer_id`, fail-closed, Billing Portal session, `FARO_APP_URL` return path.
- `stripe-webhook-faro` — raw-body Stripe signature verification, idempotency ledger, current-subscription retrieval, stale-delete guard, entitlement writes, retry-safe 500 on processing failure.

No retired Stripe price/webhook IDs and no `n6-billing-return` URL were found in the active repository search.

## Canonical sandbox values

These values are not secrets and are safe to record:

- Supabase project: `mjbyqhreptllilkggiri`
- Stripe sandbox context: `acct_1UAESjLsq19Xe9NB`
- Stripe monthly price: `price_1UAF1HLsq19Xe9NBVCt4sSwN`
- Stable FARO app URL: `https://faroapp-1.vercel.app`
- Stripe webhook endpoint: `we_1UAFofLsq19Xe9NBk4gSh2tW`
- Webhook URL: `https://mjbyqhreptllilkggiri.supabase.co/functions/v1/stripe-webhook-faro`

Fresh Stripe readback: webhook is enabled, sandbox-only, and subscribes exactly to:

1. `checkout.session.completed`
2. `customer.subscription.created`
3. `customer.subscription.updated`
4. `customer.subscription.deleted`
5. `invoice.paid`
6. `invoice.payment_failed`

Fresh Billing Portal readback: active configuration count = `0`.

## Supabase Edge Function Secrets/config gate

Install directly in Supabase Edge Function Secrets. Never paste secret values into GitHub, chat, frontend code, logs, or evidence.

- `STRIPE_SECRET_KEY` = private restricted backend key from **Brasko Agency sandbox**
- `STRIPE_WEBHOOK_SECRET` = private signing secret for `we_1UAFofLsq19Xe9NBk4gSh2tW`
- `STRIPE_FARO_MONTHLY_PRICE_ID` = `price_1UAF1HLsq19Xe9NBVCt4sSwN`
- `FARO_APP_URL` = `https://faroapp-1.vercel.app`

The connected Stripe API does not expose restricted API-key creation/export. The connected Supabase API does not expose Edge Function Secret mutation. This is therefore a legitimate owner/provider UI boundary, not an automation omission.

## 2026-09-02 probe hygiene

A temporary `n6-stripe-preflight` v5 was deployed with `verify_jwt=false` and a response limited to non-secret diagnostics: boolean secret presence plus non-secret price/app URL fields. No available HTTP executor in this session could invoke the function, so **no secret state was inferred** from that probe.

The temporary surface was immediately retired again:

- `n6-stripe-preflight` current version: `6`;
- `verify_jwt=true`;
- body restored to the inert HTTP 410 tombstone.

A metadata-only Supabase SQL readback was also attempted without selecting decrypted secret material, but the connector terminated on connection timeout. Repeated SQL retries were stopped per recovery policy.

No secret value was written to or read from GitHub, chat, logs, or evidence.

## Billing Portal gate

Create one sandbox Billing Portal configuration with:

- payment-method update enabled;
- subscription cancellation enabled;
- cancellation effective at the end of the paid period.

Do not enable live-mode configuration yet.

## Verification after provider config

No secret-value readback is required or allowed. Verification is behavioral:

1. invoke authenticated `criar-checkout-faro` and receive a Stripe Checkout URL;
2. complete sandbox Checkout with `RATAO`;
3. observe signed webhook delivery returning 2xx;
4. prove exactly-once `faro_webhook_events` ledger behavior;
5. prove `faro_subscriptions` entitlement for the same authenticated user;
6. invoke `abrir-portal-faro` and prove Portal session/cancel-at-period-end behavior;
7. clean all synthetic auth/customer/subscription rows;
8. only after B6–B8 PASS consider `billingEnabled=true`.

## Guards

- `billingEnabled=false` remains mandatory.
- Production Vercel deploy remains denied until the release gate.
- Stripe live mutation remains denied until sandbox E2E passes.
- Secrets never enter repository evidence.
