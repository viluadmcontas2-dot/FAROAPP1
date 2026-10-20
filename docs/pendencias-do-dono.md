# Pendências que só o dono resolve (atualizado a cada fase)

1. Segredos das Edge Functions no painel do Supabase (valor digitado por ele, nunca no chat): `STRIPE_SECRET_KEY` (chave restrita), `STRIPE_WEBHOOK_SECRET`, `STRIPE_FARO_MONTHLY_PRICE_ID`, `FARO_APP_URL`.
2. Permissões no `.claude/settings.json` (GitHub, lápis): `mcp__Supabase__deploy_edge_function`, `mcp__Supabase__create_edge_function_secret`, `mcp__Stripe__stripe_api_write`.
3. Webhook Stripe `we_1UAFofLsq19Xe9NBk4gSh2tW`: adicionar eventos `customer.subscription.trial_will_end` e `charge.dispute.created` (ou liberar a permissão acima).
4. Testar em iPhone e Android reais (instalar, usar 2 dias).
5. Cloudflare Pages: criar conta e conectar o repositório (guia em `docs/deploy/cloudflare-pages.md`).
6. Decidir: duração do cupom PRAGAS (hoje 5 meses), desenho do trial, mudar o onboarding (contrato do baseline).
7. Governança: `governance/hosting-policy.md` ainda diz HOSTING_TARGET=VERCEL (teste de governança exige). Decidir/autorizar alinhar para Cloudflare Pages (mudança de regra, não aplicada pelo agente).
8. Decidir: preço de fundador travado (R$ 14,90 para os 100–150 primeiros) em vez do cupom de 5 meses; plano anual R$ 179; trial sem cartão para todos (já assumido).
9. Confirmar CNPJ/MEI e nota fiscal com contador; combinar por escrito com o admin do grupo Pragas na Pista.
10. Páginas legais: textos prontos (genéricos; prazos assumidos: hash do teste 12 meses, backup 30 dias, logs 6 meses, cobrança 5 anos — revise com advogado). Falta só trocar `contato@FARO_DOMINIO_A_DEFINIR` por e-mail real e, se quiser, nome/CNPJ do responsável.
11. Privacidade: definir prazos reais de backups, logs e retenções de cobrança; avaliar e documentar base legal e prazo do hash antiabuso em `faro_trials_used` (hoje não há expiração automática). Validar informações de fornecedores/transferências e canal de direitos antes de publicar as páginas como definitivas.
12. Exclusão de conta: publicar `excluir-conta-faro` somente no gate autorizado; conferir segredos de Supabase/Stripe e permissões de leitura/cancelamento de assinaturas. Provar E2E sandbox, cascatas, repetição após falha e ausência de cobrança futura. Não houve deploy nesta trilha.
13. Porta de instalação só no navegador: o bloqueio vive no app (service worker + `faro-platform.js`). Na primeira visita, antes do service worker instalar, quem digitar `/legacy-shell.html` à mão vê o miolo. Fechar na borda: regra do Cloudflare Pages (redirecionar `/legacy-shell.html` para `/` quando o pedido for de navegação, `Sec-Fetch-Mode: navigate`) ao criar o site (item 5).
14. (FUTURO, não bloqueia o lançamento) APK na Play Store: só quando decidirem. Exigirá conta Google Play (~US$ 25), chave de assinatura e política de cobrança. Hoje o lançamento é só PWA.
15. Decisão do dono: trocar o hash SHA-256 sem sal de `faro_trials_used` por HMAC com segredo (pepper) guardado no servidor. Não foi feito por agente: mudar o hash invalida as linhas já gravadas (quem apagou a conta poderia refazer o trial) e exige criar o segredo no painel do Supabase (`app.faro_pepper`) e migrar os dados. Se decidir fazer, planejar migração em duas etapas (gravar os dois hashes, depois remover o antigo) e definir o prazo de retenção (item 11).
