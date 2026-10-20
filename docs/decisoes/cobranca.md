# Decisões — cobrança no servidor (2026-10-20)

Branch: `claude/cobranca-servidor`. Cada item diz o que foi decidido, por quê e se é revisável.

1. **Preço R$ 22,99/mês** (decisão do dono). O price existente no Stripe fica.
2. **Cupom `PRAGAS` substitui o anterior**: `amount_off` 809 centavos BRL → R$ 14,90.
   **Duração `repeating` por 5 meses é suposição do orquestrador — REVISÁVEL pelo dono** (pode virar `once` ou `forever`
   sem mudar código, só no Stripe). O checkout já aceita códigos (`allow_promotion_codes: true`).
3. **Trava do paywall nasce desligada** (`faro_billing_settings.enforce_paywall = false`). Motivo: o app ainda não vende
   (`billingEnabled=false`). Se a trava nascesse ligada, quem passasse dos 7 dias de teste perderia a sincronização sem
   ter como assinar. No go-live: ligar a trava **junto** com `billingEnabled=true`
   (`update public.faro_billing_settings set enforce_paywall = true;`). Revisável.
4. **Paywall por RLS**: gravar (`insert`/`update`) em `faro_state`, `faro_profiles`, `faro_push_devices` exige
   `faro_has_access(uid)`: assinatura `active`/`trialing`/`past_due` com `current_period_end > now()`, ou trial vigente.
   Ler e **excluir** os próprios dados continuam livres (exportar e LGPD).
5. **Anônimos fora**: todas as policies `to authenticated` exigem `faro_is_real_user()` (claim `is_anonymous` falso).
   Checkout e portal também recusam token anônimo (403).
6. **Trial de 7 dias no servidor, sem cartão**: gatilho `after insert on auth.users` concede o trial uma única vez por
   e-mail normalizado (minúsculo, sem `+tag`, Gmail sem pontos). A chave é o SHA-256 do e-mail em `faro_trials_used`,
   **sem FK**, então sobrevive à exclusão da conta. Base legal: prevenção de abuso (legítimo interesse); guardamos só o hash.
   Limite conhecido: SHA-256 de e-mail sem "sal" pode ser revertido por dicionário — aceitável para anti-abuso; revisável.
   Usuários criados antes desta migration **não** ganham trial automático (sem e-mail novo no gatilho); com a trava
   desligada isso não afeta ninguém. Decidir no go-live se recebem trial (ex.: `select public.faro_grant_trial(email) from auth.users`).
7. **Trial Stripe não é usado**: o teste é do servidor; o Checkout cobra direto. Mais simples e sem cartão no teste.
8. **Snapshot**: `CHECK (octet_length(state::text) <= 524288)` como `NOT VALID` (vale para gravações novas sem travar a
   migration por linha antiga). Rate-limit: 1 gravação por segundo por usuário, só para o papel `authenticated`
   (o app grava a cada ~2,5 s; service_role não é limitado). Erro `P0429` → o app fica "pendente" e tenta de novo.
9. **Webhook**: período de `items.data[0].current_period_end` (fallback para o campo antigo); assinatura da invoice
   via `parent.subscription_details.subscription` (API nova). Guarda de evento velho em todos os eventos de assinatura:
   pula se `event.created` < último aplicado (`last_event_created`) ou se o usuário já está em outra assinatura válida
   e esta não está. Leitura e escrita não são atômicas (corrida rara entre dois eventos simultâneos) — aceitável; o
   próximo evento corrige porque sempre reconsulta a Stripe.
10. **Eventos novos**: `customer.subscription.trial_will_end` e `invoice.payment_failed` reconsultam e atualizam o status;
    `charge.dispute.created` só registra `last_dispute_at` (não corta acesso sozinho). Assinar estes 3 eventos no webhook.
11. **Checkout**: quem já tem assinatura `active`/`trialing`/`past_due` é levado ao Portal (sem 2ª assinatura);
    `idempotencyKey: faro-customer-<uid>` na criação do customer; erros Stripe viram resposta limpa (402/502/500) sem detalhes.
12. **Regras puras** em `supabase/functions/_shared/faro-billing.js` (JS sem dependências) para testar no Node.

## 2026-10-20 — migrations aplicadas no Supabase real (`mjbyqhreptllilkggiri`)
- `20261020120000_faro_server_paywall.sql` (colada no SQL Editor pelo dono) e `20261020130000_faro_has_access_own_only.sql` (apply_migration).
- Conferido: 7 tabelas, 5 funções, 13 policies, 2 gatilhos; `enforce_paywall=false` (liga no go-live).
- Advisors de segurança: 3 INFO "RLS sem policy" são intencionais (tabelas só do servidor); WARN de SECURITY DEFINER tratado limitando `faro_has_access` ao próprio usuário.
- Pendente: deploy das 3 Edge Functions novas, 4 segredos (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_FARO_MONTHLY_PRICE_ID, FARO_APP_URL), webhook com +2 eventos (customer.subscription.trial_will_end, charge.dispute.created).

## 2026-10-20 — Edge Functions publicadas (versão 2) no Supabase
- criar-checkout-faro, abrir-portal-faro, stripe-webhook-faro (verify_jwt=false; autenticação feita por `withSupabase`).
- Webhook passa a usar `constructEventAsync` (Deno); teste de contrato exige a versão async.
- A cópia publicada de `_shared/faro-billing.js` está SEM comentários (só texto); lógica idêntica ao repositório.
- Fumaça sem credenciais: checkout/portal = 401; webhook = 503 "não configurado" (faltam os 4 segredos).

## 2026-10-20 — excluir-conta-faro publicada (v1)
- Exclusão LGPD não depende da cobrança: Stripe só é exigido quando o usuário tem cliente/assinatura (teste em tests/legal-pages-contract.test.mjs).
- Preserva `faro_trials_used` (anti-abuso). Sem login → 401. Sem os segredos de Stripe, quem tem assinatura recebe 503 com a conta mantida.
