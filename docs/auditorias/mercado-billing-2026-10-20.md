# FARO Financeiro - pesquisa de mercado, PWA, cobranca e seguranca (2026-10-20)
Legenda: [CONFIRMADO] = fonte oficial lida. [FONTE FRACA] = blog/terceiro. [NAO VERIFICADO] = nao achei prova.

## A) Concorrentes e diferenciacao
- GigU (BR): diz se a corrida compensa (semaforo de cores, minimo por km/min/hora) para Uber/99/inDrive. Plano ~R$12,90/mes [FONTE FRACA: Portal Tela]. Uber processou por concorrencia desleal; TJSP derrubou liminar (risco juridico do segmento "aceitar/recusar corrida"). Faturou ~R$12,3 mi em 2025, breakeven jun/2025 [FONTE FRACA]. Prova de que motorista BR paga assinatura ~R$13.
- FinDriver (BR, App Store): gratis; registra corridas, ganhos, despesas, metas, lucro liquido; Uber/99/inDrive. Sem dados de plano pago.
- 99Pay (controle de despesas, credito R$500-10 mil) e Uber Conta/Digio: apps das proprias plataformas; vendem credito.
- Mobills/Organizze: financas pessoais genericas; nao entendem custo por km, combustivel, depreciacao (lacuna do mercado). Nao achei avaliacoes especificas para motorista.
- Gridwise (EUA): gratis + Premium US$9,99/mes ou US$107,99/ano [FONTE: site deles]. Elogio: rastreio automatico e agregacao de ganhos. Reclamacao: milhagem imprecisa e falhas de sincronizacao [FONTE FRACA, 49 avaliacoes].
- Everlance (EUA): US$8,99/mes ou US$69,99/ano; gratis limita 30 viagens/mes.
- Stride (EUA): gratis (promete nunca cobrar); milhagem automatica + impostos.
- Driver's Seat (EUA): cooperativa de motoristas, vende dados agregados, repassa receita. Nao achei precos atuais.
- "Para Motoristas": nao achei nada identificavel.
Licoes: (1) preco BR de referencia R$13-23; seu R$22,99 e ~78% acima do GigU - precisa de motivo claro (lucro real, nao so calculadora). (2) Reclamacao tipica = captura automatica falha. Registro manual rapido e confiavel e vantagem, nao fraqueza. (3) Limite: nao dependa de ler tela de Uber/99 (risco juridico e PWA nao consegue).

### 5 ideias de diferenciacao
1. "Lucro de verdade por hora" do dia: ganho bruto - combustivel - taxa - desgaste (custo/km do carro) - tempo parado. Uma unica tela, um numero grande.
2. Custo por km personalizado do carro (consumo, manutencao, IPVA/seguro rateados) - o que Mobills nao faz.
3. Reserva automatica de "carro parado": quanto separar por dia para manutencao, IPVA, MEI/INSS e ferias; barra mostra se esta em dia.
4. Modo "fim do turno em 20 segundos": 3 toques (ganho Uber, 99, inDrive) + km/combustivel; funciona offline e sincroniza.
5. Comunidade local (Pragas na Pista/Salvador): comparativo anonimo "motoristas da sua cidade fazem R$X/hora nesse horario" (so com consentimento, agregado - LGPD).
Extra: relatorio mensal em PDF/PIX-friendly para MEI, comprovante de renda para financiar carro/aluguel.

### Gamificacao "na medida"
- Sequencia (streak) de registro com "folga": 1 dia de perdao por semana, sem punir. Mostrar "dias registrados no mes: 22/26".
- Metas ligadas a dinheiro real: "meta semanal de lucro R$X" com ritmo ("faltam R$180, ~2h30 no seu ritmo").
- Conquistas so de fato util: "Primeira semana completa", "Reserva do IPVA 100%", "Mes no azul", "Custo por km abaixo da sua media".
- Sem ranking publico, sem confete exagerado, sem notificar culpa. Mostrar o ganho de dinheiro (ex.: "voce poupou R$312 evitando corridas abaixo do seu minimo") e nao pontos.
- Regra: toda recompensa precisa mudar uma decisao financeira, senao e enfeite.

## B) PWA iOS vs Android (2026)
- Instalacao: Android/Chrome: instalar via prompt (beforeinstallprompt) e vira WebAPK. iOS: so "Compartilhar > Adicionar a Tela de Inicio" (manual; nao ha prompt automatico). Mitigacao: tela de ensino com passo a passo ilustrado para iOS, detectada por user-agent.
- Push: iOS 16.4+ so funciona se o app estiver instalado na tela inicial e o usuario tocar num botao para permitir; aba do Safari nao recebe [FONTE FRACA: MagicBell/OneSignal/MoEngage]. Safari 18.4 adicionou Declarative Web Push [FONTE FRACA]. Relatos de push que para sem aviso no iOS [anedotico]. Mitigacao: nao depender de push para nada critico; mostrar lembretes dentro do app; email/WhatsApp opcional como reserva.
- Badge (icone com numero): suportado em iOS 16.4+ instalado e Android Chrome; so funciona junto da permissao de notificacao no iOS.
- Armazenamento: WebKit limita a 7 dias sem uso o armazenamento de scripts (IndexedDB, localStorage, Service Worker) em sites no Safari, mas apps da Tela de Inicio tem contagem propria e WebKit diz nao esperar apagamento [CONFIRMADO: webkit.org/blog/10218]. Perda ainda e possivel por falta de espaco/LRU. Mitigacao: dados importantes sempre no Supabase (ja ha faro_state), pedir navigator.storage.persist(), banner "instale para guardar seus dados", exportar backup.
- Nao ha loja: sem presenca no App Store/Play. Alternativa barata futura: TWA (Android, Play US$25 unico) e Capacitor para iOS (US$99/ano) - so se o crescimento exigir.
- Background: iOS nao roda em segundo plano; sem GPS continuo para rastrear km. Mitigacao: km manual/odometro, nao prometer rastreio automatico.
- NAO VERIFICADO nesta pesquisa: mudancas do iOS 26 (ex.: "abrir como web app" padrao). Teste em iPhone real antes de prometer.

## C) Cobranca
- Taxas Stripe Brasil [CONFIRMADO: stripe.com/br/pricing]: cartao domestico 3,99% + R$0,39; cartao internacional +2%; Pix 1,19% (so por convite); boleto R$3,45; Billing (assinaturas) +0,7% do volume recorrente. Em R$22,99: cartao ~R$1,31 (5,7%) + Billing ~R$0,16 = ~R$1,47 (6,4%). Com cupom RATAO (R$14,99): ~R$0,99+0,10.
- Pix recorrente: Pix Automatico NAO esta disponivel para empresas com sede no Brasil na Stripe [CONFIRMADO: docs.stripe.com/payments/pix]; so para empresa estrangeira (e ai cobra IOF 3,5% do cliente). Pix avulso funciona na Stripe BR, mas e por convite e nao e recorrente (mes a mes o motorista teria de pagar de novo). Boleto recorrente: inviavel/ruim (R$3,45 fixo = 15% do preco, atraso, compensacao lenta).
- Alternativas para Pix recorrente real: Asaas, Pagar.me, EBANX, Mercado Pago, Iugu (Pix Automatico em BR) - exigem outra integracao; avaliar so se cartao converter mal. Motorista de app tem muito cartao de debito/sem limite: considerar plano de 3 meses/anual com Pix avulso (um pagamento) como segunda via manual.
- Trial: Stripe Checkout permite trial sem cartao (payment_method_collection=if_required + trial_settings.end_behavior.missing_payment_method=cancel/pause) [CONFIRMADO]. Sem cartao: mais cadastros, mais abuso, conversao menor; com cartao: menos cadastros, conversao melhor, e a impressao digital do cartao ajuda anti-abuso. Para o publico seed (confianca na comunidade) recomendo: 7 dias sem cartao SO para o grupo seed via cupom/convite; publico geral com cartao.
- Anti-abuso "um teste por pessoa": (1) hoje o codigo NAO tem trial algum (sem trial_period_days) - decidir onde nasce o trial: no Stripe (preferivel). (2) Chave unica: telefone verificado por SMS/WhatsApp OTP (ja e credencial) + guardar hash do telefone num registro "trial_usado" que sobrevive a exclusao de conta; (3) cartao: Stripe Radar / checar card.fingerprint no webhook e negar segundo trial; (4) cupom com first_time_transaction e max_redemptions; (5) nao conceder trial por email descartavel.
- Cupom RATAO: criar com duration=repeating, duration_in_months=5, amount_off=800 (centavos), currency=brl, `restrictions.first_time_transaction=true`, `max_redemptions`, `redeem_by`. Atencao: amount_off e fixo - R$8 de desconto em R$22,99 = R$14,99 por 5 meses, depois 22,99.
- Supabase [CONFIRMADO: supabase.com/pricing]: Free = pausa apos 1 semana de inatividade (projeto fica offline ate alguem retomar), 500MB banco, 50 mil MAU, sem backup. Pro = US$25/mes, nunca pausa, 8GB, backup diario 7 dias, credito US$10 de compute. Recomendacao: Free so em teste privado; ANTES de cobrar qualquer centavo, migrar para Pro (cobrar sem backup/pausa e risco de dano ao cliente e passivo LGPD). Custo ~US$25/mes (~R$140).
- Vercel [CONFIRMADO: vercel.com/docs/limits/fair-use-guidelines, atualizado 2026-09-14]: Hobby = so uso pessoal nao comercial; "qualquer metodo de pedir ou processar pagamento de visitantes" e uso comercial. FARO cobra assinatura -> precisa de Vercel Pro (US$20/usuario/mes [NAO VERIFICADO nesta pesquisa]) ou hospedar o PWA estatico em alternativa sem essa restricao (Cloudflare Pages/Netlify - conferir termos deles). Rodar cobranca no Hobby arrisca suspensao.
- Ponto de equilibrio aproximado: custos fixos ~US$45/mes (~R$250) + Stripe ~6,4% => precisa ~14 assinantes a R$22,99 (ou ~20 com RATAO).
- Nota fiscal/CNPJ: Stripe BR exige conta empresarial (CNPJ/MEI). MEI pode vender software? Confirmar com contador (CNAE).

## D) Seguranca - achados concretos (codigo lido: 3 Edge Functions + 3 migrations; nenhum segredo impresso)
ALTA
- D1. Paywall so no cliente. Nao ha entitlement no servidor: RLS de faro_state/faro_profiles/faro_push_devices deixa qualquer usuario autenticado ler/gravar sem checar faro_subscriptions. billingEnabled=false e fail-closed so no front; quem chamar a API Supabase direto (anon key e publica) usa o app de graca. Correcao: funcao SQL `faro_has_access()` (security definer, search_path vazio, le faro_subscriptions: status in active/trialing, ou past_due com carencia) e usa-la nas policies de INSERT/UPDATE de faro_state (leitura pode ficar liberada para o usuario exportar dados). Testar RED/GREEN.
- D2. current_period_end sempre nulo. Webhook le `subscription.current_period_end`; desde a API 2025-03-31 (basil) esse campo saiu da assinatura e fica em `items.data[0].current_period_end` [CONFIRMADO: changelog Stripe]. O SDK stripe@22 usa API bem mais nova -> campo undefined -> gravamos null. Quem usa data de fim (carencia, "renova em") fica sem dado. Correcao: `subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end`.
MEDIA
- D3. Assinatura duplicada / cobranca dupla. criar-checkout-faro nao confere se o usuario ja tem assinatura active/trialing/past_due; quem abrir dois checkouts paga duas vezes. Alem disso o webhook faz upsert por user_id, entao uma segunda assinatura SOBRESCREVE a primeira (a primeira continua cobrando na Stripe, invisivel). Correcao: recusar (409) se status em active/trialing/past_due/unpaid e mandar para o portal; no webhook, se ja ha outro stripe_subscription_id ativo, nao sobrescrever (hoje so deleted tem essa guarda "staleDelete"). Eventos antigos (checkout.session.completed de assinatura velha reprocessado) tambem podem ressuscitar assinatura cancelada.
- D4. Idempotencia fraca (check-then-act): le o evento, processa, so depois grava event_id. Dois entregues ao mesmo tempo processam duas vezes (efeito e idempotente por upsert, entao dano baixo), mas eventos fora de ordem sao tratados lendo estado atual da Stripe (bom). Melhorar: gravar o evento no inicio (insert on conflict) com status processing/done, e apagar/marcar falha em erro para a Stripe reentregar.
- D5. Sem trial nem limite de teste por pessoa no codigo (ver C). Qualquer trial futuro precisa de tabela "trial_usado" persistente (sobrevive a delete cascade de auth.users: hoje on delete cascade apaga faro_subscriptions e o historico, entao excluir conta e recriar reabre trial).
- D6. Corrida na criacao do customer: dois cliques simultaneos criam dois customers Stripe; um fica orfao. Correcao: idempotency key `faro-customer-${userId}` e INSERT ... on conflict antes.
- D7. Sem limite de tamanho/formato em faro_state.state (jsonb), device_id, subscription (push). Usuario autenticado pode gravar centenas de MB (abuso de armazenamento, estoura 500MB do Free). Correcao: check (pg_column_size(state) < 1MB) e limite de linhas de push por usuario.
- D8. Usuarios anonimos: policies `to authenticated` incluem login anonimo do Supabase se habilitado. Confirmar que Anonymous Sign-ins esta desligado; senao exigir (auth.jwt()->>'is_anonymous')::boolean is not true.
BAIXA
- D9. Verificacao de assinatura do webhook: correta (constructEvent com corpo bruto via req.text(), segredo da env, tolerancia padrao 5 min, 400 se invalida). Risco menor: em Deno o recomendado e `constructEventAsync` (SubtleCrypto); com npm:stripe usa crypto do Node e costuma funcionar, mas teste de ponta a ponta com `stripe trigger` antes de ligar. Nao ha auth do Supabase (verify_jwt=false + auth:'none'), o que e correto para webhook.
- D10. Erros nao tratados: portal e checkout nao fazem try/catch em chamadas Stripe; falha vira 500 generico (sem vazar detalhe - ok), mas sem mensagem amigavel. Webhook loga `error` inteiro no console (pode incluir dados do cliente nos logs).
- D11. Eventos sem userId resolvido (ex.: assinatura sem metadata) sao marcados como processados e perdidos em silencio; log de aviso ajudaria. Eventos nao tratados: charge.dispute.created, customer.subscription.trial_will_end, invoice.payment_action_required, checkout.session.async_payment_*.
- D12. CORS: nao ha cabecalho manual; @supabase/server trata CORS por padrao (usa cabecalhos do supabase-js) [FONTE: README do pacote]. Confirmar que nao fica `*` em producao para as funcoes de usuario ou restringir a origem do app via opcao cors do withSupabase. Risco pratico baixo porque exige JWT no cabecalho, nao cookie.
- D13. verify_jwt=false nas duas funcoes de usuario: seguro SE withSupabase({auth:'user'}) valida o JWT (documentado). Manter teste que chama sem token e espera 401.
- D14. Redirect: success_url/cancel_url/return_url vem de env FARO_APP_URL (nao do cliente) - sem open redirect. Bom. allow_promotion_codes=true sem restricoes no cupom (ver C).
BOM (verificado)
- RLS ligada nas 4 tabelas com `(select auth.uid()) = user_id`; faro_subscriptions so SELECT para o usuario (nao consegue se dar acesso); faro_webhook_events sem grants/policies (so service_role); search_path fixo nos triggers; revoke explicito de anon. Trigger de revisao impede cliente de forjar `revision` em UPDATE (em INSERT o cliente escolhe revision/server_updated_at).
- Nenhum segredo no codigo (todos por Deno.env).

## Fontes principais
Stripe Pix: https://docs.stripe.com/payments/pix.md | Stripe BR precos: https://stripe.com/br/pricing | Trials: https://docs.stripe.com/payments/checkout/free-trials | Basil: https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end | Supabase: https://supabase.com/pricing.md | Vercel: https://vercel.com/docs/limits/fair-use-guidelines | WebKit: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ | @supabase/server: https://jsr.io/@supabase/server | Gridwise vs Everlance: https://gridwise.io/blog/gridwise-vs-everlance-vs-stride | GigU: Portal Tela (abr/2026), Tribuna de Minas, Rideshare Guy | FinDriver: https://apps.apple.com/br/app/findriver/id6748662034
