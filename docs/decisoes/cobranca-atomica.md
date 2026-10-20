# Decisões — cobrança atômica (2026-10-20)

Branch: `claude/cobranca-atomica`. Responde às revisões finais (Claude #1, #3, #5, #7; Codex #4, #5, #6).
Migration nova: `supabase/migrations/20261020140000_faro_cobranca_atomica.sql` (**não aplicada**; as de 120000/130000
continuam intocadas). Edge Functions alteradas, **sem deploy**.

1. **Trial só com e-mail confirmado.** O gatilho de INSERT só concede se `email_confirmed_at` já vier preenchido
   (confirmação desligada/login social). Novo gatilho `after update of email_confirmed_at` concede quando passa de NULL
   para valor. Continua 1 vez por e-mail normalizado, `faro_trials_used` sem FK. `faro_has_access`/`faro_my_trial_ends_at`
   não mudam: sem confirmação não há linha de trial, então não há acesso por trial.
   Efeito colateral: conta criada e ainda não confirmada fica sem trial (com a trava desligada, ninguém sente).
2. **Webhook atômico.** `faro_apply_subscription_event(...)` (security definer, só `service_role`) faz numa transação,
   sob `pg_advisory_xact_lock(hashtext(user_id))`: registra o `event_id` (`on conflict do nothing` → `duplicate`),
   compara a ordem (`last_event_created`) e a regra "outra assinatura válida" (→ `stale`), e faz o upsert (→ `applied`).
   Usuário inexistente (conta excluída) → `orphan`: evento registrado, resposta 200 (a Stripe não reenvia por dias).
   Evento sem usuário/assinatura (disputa, tipos ignorados) → `recorded`. Se o upsert falhar, tudo volta (evento não
   fica marcado) e a Stripe reenvia. A regra JS `isStaleSubscriptionEvent` fica só como referência testada.
3. **Checkout único.** Colunas novas em `faro_subscriptions`: `checkout_session_id`, `checkout_url`,
   `checkout_expires_at`, `checkout_reserved_at`, `deleting_at`. `faro_reserve_checkout` decide sob trava:
   `deleting` (409) | `reuse` (devolve a mesma URL) | `busy` (outra criação em curso há < 60 s, 409) | `create`.
   A sessão nasce com `expires_at` fixo por janela de 30 min e `idempotencyKey: faro-checkout-<uid>-<janela>`, então
   duas chamadas na mesma janela recebem a mesma sessão da Stripe. Falha na Stripe libera a reserva.
4. **Exclusão de conta.** Ordem: `faro_begin_account_deletion` (marca `deleting_at`, bloqueia checkout por 15 min e
   devolve a sessão salva) → expira checkouts abertos (salvo + `checkout.sessions.list({customer, status:'open'})`)
   → cancela assinaturas → apaga o usuário. Se algo falhar, a marca expira sozinha em 15 min.
5. **Trava de servidor.** `criar-checkout-faro` e `abrir-portal-faro` exigem o segredo `FARO_BILLING_ENABLED=true`;
   sem ele, 503 "Cobrança ainda não aberta." (fail-closed). No beta a variável **não** é criada
   (docs/billing/PASSO-A-PASSO-DONO.md).
6. **CI não pula em silêncio.** Com `CI=true`, `tests/billing-sql-behavior.test.mjs` falha sem Postgres e
   `findChrome()` (scripts/lib/faro-browser.cjs) lança erro sem Chrome. Sem workflow novo (Actions é manual).
   Detalhes em docs/deploy/testes-ci.md. O teste SQL agora roda cada `tests/sql/*.scenario.sql` num banco novo.
7. **Stub SQL corrigido**: ganhou `auth.role()` e `email_confirmed_at`; sem isso a migration 130000 nem aplicava
   localmente (o teste SQL só passava porque era sempre pulado). O cenário do paywall passou a consultar
   `faro_has_access` de terceiros como `service_role`, como exige a 130000.
8. **Contratos antigos atualizados** (finance-v1-commercial-readiness e billing-server): exigiam a guarda não atômica
   literal (`isStaleSubscriptionEvent` no webhook); agora exigem a RPC.

Ao aplicar: rodar a migration 140000, publicar as 4 Edge Functions, conferir advisors. Revisável: janelas de 60 s
(busy), 15 min (deleting) e 30 min (sessão).
