# Stripe — preço e cupom (leitura, sandbox `acct_1UAESjLsq19Xe9NB`, 2026-10-21)

| Item | Valor lido | Confere? |
|------|------------|----------|
| Preço mensal | `price_1UAF1HLsq19Xe9NBVCt4sSwN` · R$ 22,99 · BRL · mensal · `lookup_key=faro_finance_monthly_brl_2299` | sim |
| Cupom | `VPBhfe03` "Ratão" · R$ 8,00 de desconto · repetindo por 5 meses (22,99 − 8,00 = **R$ 14,99**) | sim |
| Código promocional | `RATAO` · `promo_1UAF1tLsq19Xe9NBzv8mYQFP` · ativo | sim |

## Achados
1. **IDs do repo estão velhos.** `STATUS.md` cita `price_1U7I0F…`, `bYPTFkFb`, `promo_1U7Ibe…`: não existem nesta conta. Os IDs reais são os da tabela. O segredo `STRIX/STRIPE_FARO_MONTHLY_PRICE_ID` do Supabase precisa apontar para o preço atual (não consegui ler segredos; conferir no painel).
2. **Cupom sem trava:** sem validade (`redeem_by`), sem limite de usos (`max_redemptions`) e `first_time_transaction=false`. Qualquer pessoa pode usar RATAO em qualquer assinatura, indefinidamente. Recomendado: `first_time_transaction=true`, `max_redemptions` e data de fim definidos pelo dono.
3. **Modo live não verificado** (só sandbox). Antes de cobrar de verdade, repetir esta conferência em live.
4. Nada foi alterado no Stripe.
