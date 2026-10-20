# FARO-WU-002 — Vercel cutover + commercial completion

## Objective

Partir exclusivamente da `main` repo-first consolidada e levar o FARO até um estado comercial E2E comprovado, com Vercel como hosting alvo, Stripe/Supabase server-side seguros e billing ainda fail-closed até a prova completa.

## Base

- base `main`: `f1beb92b6811e15f57449f4be9e92910b6d73571`
- Issue: #15
- branch: `wu/faro-wu-002-vercel-commercial`
- predecessor: FARO-WU-001 / PR #14

## Design

A execução começa por preflight **read-only** dos três providers relevantes: Vercel, Stripe e Supabase. Nenhuma configuração antiga é assumida como atual. Primeiro identificamos o target real, o estado de secrets/config e os objetos comerciais existentes. Depois fazemos somente as mutações necessárias, sempre server-side e sem production deploy prematuro.

O fluxo comercial a provar é:

`usuário FARO autenticado → Checkout Stripe → promoção RATAO → webhook assinado/idempotente → faro_subscriptions/entitlement server-side → Billing Portal`.

`billingEnabled=false` permanece como trava até esse fluxo passar integralmente.

## Invariants

- GitHub remoto é a única verdade durável de engenharia;
- Linear/Notion não são execution writers;
- Vercel é target de hosting; Netlify permanece histórico somente;
- secrets nunca entram no Git, frontend ou logs;
- FARO Corridas não pode ser reutilizado;
- billing só é habilitado após E2E completo;
- production deploy fica negado até gate explícito de release;
- teste físico pertence à FARO-WU-003.

## Deliverables

1. Vercel target/config identificado e compatível com o build provider-neutral;
2. Stripe product/price/promotion revalidados live;
3. runtime secrets comerciais instalados em store autorizada;
4. Checkout autenticado provado;
5. webhook assinado + idempotência + entitlement provados;
6. Billing Portal provado;
7. RATAO provado;
8. billing habilitado somente após regressão verde;
9. handoff explícito para FARO-WU-003.
