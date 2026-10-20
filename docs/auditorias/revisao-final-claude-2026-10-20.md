# Revisão final adversarial — FARO (branch claude/pwa-driver-production-fm0kk9) — 2026-10-20

Escopo lido: migrations 20261020*, 4 Edge Functions, sw.js, faro-account.js (sync/billing/exclusão), grep de innerHTML, testes com SKIP, workflows, hash do app.js. NÃO revisado a fundo: matemática do onboarding de 3 perguntas, faro-state.js (importação), CSP.

## Achados

1. **Alta — teste do paywall SQL nunca roda no CI.** tests/billing-sql-behavior.test.mjs:9-12 sai com exit 0 ("SKIP") sem FARO_TEST_PGHOST; .github/workflows/*.yml não define essa variável (e os workflows são só manuais). Cenário: alguém quebra a policy de RLS e tudo fica verde. Correção: no CI, subir Postgres (service container) e definir FARO_TEST_PGHOST; ou falhar quando `CI=true` e a variável faltar. Mesmo padrão (exit 0 sem Chrome) em ~9 testes de navegador (edit-undo, import-xss, onboarding-3-perguntas, plans, etc.): exigir Chrome quando CI=true.

2. **Média — sobrescrita entre dois aparelhos (perda de dado).** faro-account.js:339 faz `upsert` sem condição de revisão; a checagem de revisão (l.391) acontece antes, em outra requisição. Cenário: celular A e B editam offline, voltam juntos; ambos leem revision=N e ambos gravam; o último apaga o do outro sem abrir o modal de conflito. Correção mínima: update com `.eq('revision', meta.remoteRevision)` (ou RPC com compare-and-swap) e abrir conflito se 0 linhas.

3. **Média (só no go-live) — trial vencido vira "tentaremos de novo" para sempre.** Com enforce_paywall=true, RLS nega insert/update; syncNow (faro-account.js:407-409) mostra "Salvo no aparelho; tentaremos a conta novamente" e repete. Usuário acha que está salvo na nuvem. Correção: tratar erro 42501/RLS mostrando "Assine para voltar a salvar na conta".

4. **Média — trial concedido antes de confirmar o e-mail.** Trigger faro_on_auth_user_created (migration 20261020120000) concede trial no insert em auth.users, mesmo sem confirmação. Com e-mails descartáveis, trials infinitos (o hash só barra repetição do mesmo e-mail). Aceitável no beta; antes de cobrar, conceder no `email_confirmed_at` (trigger on update).

5. **Baixa — idempotência do webhook não é atômica.** stripe-webhook-faro/index.ts:38-43 (select) e :111-114 (insert no fim). Duas entregas simultâneas processam as duas; como é upsert com checagem de evento velho, dano é baixo. Correção: inserir o event_id primeiro (ON CONFLICT DO NOTHING) e só processar se inseriu.

6. **Baixa — webhook após "Excluir conta".** Depois de deleteUser, eventos da assinatura cancelada tentam upsert com user_id inexistente (FK) -> 500 -> Stripe reenvia por dias. Correção: se o usuário não existe, marcar evento como processado e responder 200.

7. **Baixa — billingEnabled é só no cliente.** criar-checkout-faro não lê nenhuma trava de servidor; se os segredos Stripe estiverem configurados, quem chamar a função direto cria checkout. Não há cobrança acidental (o usuário paga por vontade própria), mas para beta fechado: não configure STRIPE_SECRET_KEY ainda, ou a função checar faro_billing_settings.

8. **Baixa — innerHTML fora do FaroSafe.** faro-r3-routing.js:55-111, faro-r3b.js:251/400: só templates estáticos e app.todayKey(); não achei dado do usuário interpolado. faro-r3b.js:400 usa reserveMarkup() — conferir se escapa o nome da reserva (não verificado nesta revisão). Há cópias em _site/ (artefato de build) que também aparecem no grep.

## O que está bem (verificado)
- app.js inalterado: sha256 bate com ci/baseline-integrity.json (9a8511e8…).
- enforce_paywall nasce false; faro_has_access retorna true com trava desligada; anônimo fora das policies; ler/excluir sempre livres (LGPD).
- faro_has_access restrito ao próprio usuário (migration 130000).
- Exclusão de conta: exige "EXCLUIR", cancela Stripe antes, falha fechado, CASCADE.
- Service worker: só GET, mesma origem; EXTERNAL_HOSTS vazio, então respostas do Supabase (autenticadas) não são cacheadas. HTML rede-primeiro com fallback offline; skipWaiting só por mensagem (sem troca no meio do uso).
- Webhook valida assinatura Stripe e ignora eventos velhos.

## Pode lançar beta fechado para o grupo?
**Sim**, com cobrança desligada (billingEnabled=false, enforce_paywall=false, sem STRIPE_SECRET_KEY em produção). Nenhum achado causa perda de dinheiro ou vazamento no beta; o risco real é o item 2 (dois aparelhos) — avise o grupo para usar um aparelho só. Antes de LIGAR a cobrança: corrigir 1, 3, 4 e 5.

## Falta provar em aparelho real
- iPhone (Safari, "Adicionar à Tela de Início"): instalação, offline após fechar o app, dados persistem após 7+ dias (ITP do iOS apaga storage de sites não usados).
- Atualização do SW (core-29 -> próxima) sem perder dado não sincronizado.
- Android Chrome: instalar, usar offline, voltar online e sincronizar.
- Dois aparelhos na mesma conta (item 2) e o modal de conflito.
- "Excluir minha conta" ponta a ponta no Supabase real.
- Onboarding de 3 perguntas com números reais de um motorista (estimativas não auditadas aqui).
