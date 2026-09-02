# FARO-WU-002 Acceptance

- [x] B1 — Issue #15 + branch + Spec Kit + PR #16 partem da `main` canônica.
- [x] B2 — target/import Vercel identificado e configuração de output corrigida sem production deploy automático.
- [x] B3 — build provider-neutral validado para o hosting/runtime alvo.
- [ ] B4 — secrets/runtime commercial config existem somente em store server-side autorizada.
- [x] B5 — Stripe product/price/coupon/promotion verificados no sandbox canônico da Brasko Agency.
- [ ] B6 — Checkout nasce de usuário FARO autenticado e cria a subscription correta.
- [ ] B7 — Webhook assinado, idempotência e entitlement server-side provados.
- [ ] B8 — Billing Portal provado para a assinatura criada.
- [x] B9 — Código `RATAO` provado no motor de invoice do Stripe: 2299 − 800 = 1499, desconto recorrente por 5 meses.
- [ ] B10 — `billingEnabled=true` somente após B6–B9 e regressão verde.
- [ ] B11 — FARO-WU-003 definida como handoff; nenhuma validação física é inferida.

Evidence B2/B3: `docs/evidence/FARO-WU-002-vercel-runtime-contract-receipt.md` e `docs/evidence/FARO-WU-002-vercel-output-hotfix-receipt.md`.
Evidence B5/B9: `docs/evidence/FARO-WU-002-stripe-sandbox-catalog-receipt.md`.
