# FARO-WU-002 Acceptance

- [x] B1 — Issue #15 + branch + Spec Kit + PR #16 partem da `main` `f1beb92b6811e15f57449f4be9e92910b6d73571`.
- [ ] B2 — Vercel target identificado/configurado sem production deploy prematuro.
- [ ] B3 — Build provider-neutral validado para o hosting/runtime alvo.
- [ ] B4 — Secrets/runtime commercial config existem somente em store server-side autorizada.
- [x] B5 — Stripe product/price/coupon/promotion verificados no sandbox canônico da Brasko Agency.
- [ ] B6 — Checkout nasce de usuário FARO autenticado e cria a subscription correta.
- [ ] B7 — Webhook assinado, idempotência e entitlement server-side provados.
- [ ] B8 — Billing Portal provado para a assinatura criada.
- [x] B9 — Código `RATAO` provado no motor de invoice do Stripe: 2299 − 800 = 1499, desconto recorrente por 5 meses.
- [ ] B10 — `billingEnabled=true` somente após B6–B9 e regressão verde.
- [ ] B11 — FARO-WU-003 definida como handoff; nenhuma validação física é inferida.

Evidence B5/B9: `docs/evidence/FARO-WU-002-stripe-sandbox-catalog-receipt.md`.
