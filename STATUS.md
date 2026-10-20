# FARO — STATUS

**REMOTE_FIRST = ALWAYS** · **SOLE_DURABLE_PROJECT_TRUTH = GitHub remote** · Linear aposentado · Notion não é autoridade.

## Onde estamos (2026-10-20)
- Linha canônica: `claude/pwa-driver-production-fm0kk9` (integra WU-004 poda, WU-002B correção do salvar dia, WU-002 docs comerciais).
- `npm run check` e `npm run build`: PASS nesta linha.
- Plano de lançamento em 4 dias: `PLANO.md`.
- Billing: `billingEnabled=false` (fail-closed) até E2E Stripe/Supabase passar.
- Prova em aparelho real: UNKNOWN.

WorkUnits ativas: FARO-WU-002 (comercial) e FARO-WU-002B (endurecimento).

## Comercial (sandbox)
- Preço R$ 22,99/mês; cupom `RATAO` = R$ 8 off por 5 meses (R$ 14,99).
- Supabase `mjbyqhreptllilkggiri`. Segredos de servidor (B4) pendentes com o dono.

## next_unproven_item
Dia 1 do `PLANO.md`: paywall no servidor + correção do webhook + segredos B4.

## Não fazer
Deploy de produção fora do gate; habilitar billing antes do E2E; apagar branch de arquivo; alegar teste físico sem aparelho.
