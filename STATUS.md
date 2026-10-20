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
- Preço: R$ 22,99/mês (decisão do dono 2026-10-20; o price existente fica). Cupom `PRAGAS` (R$ 8,09 off por 5 meses → R$ 14,90) substitui o antigo; criação no Stripe pendente com o dono (`docs/billing/PASSO-A-PASSO-DONO.md`).
- Infra a custo zero: Cloudflare Pages + Supabase Free (com despertador e backup) + Stripe sem mensalidade.
- Supabase `mjbyqhreptllilkggiri`. Segredos de servidor (B4) pendentes com o dono.

## next_unproven_item
Dia 1 do `PLANO.md`: código do paywall/webhook/trial pronto na branch `claude/cobranca-servidor` (aplicar migration no Supabase ainda não provado); segredos B4 + cupom `PRAGAS` + Portal com o dono.

## Não fazer
Deploy de produção fora do gate; habilitar billing antes do E2E; apagar branch de arquivo; alegar teste físico sem aparelho.
