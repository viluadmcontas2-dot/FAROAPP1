# Pendências que só o dono resolve (atualizado a cada fase)

1. Segredos das Edge Functions no painel do Supabase (valor digitado por ele, nunca no chat): `STRIPE_SECRET_KEY` (chave restrita), `STRIPE_WEBHOOK_SECRET`, `STRIPE_FARO_MONTHLY_PRICE_ID`, `FARO_APP_URL`.
2. Permissões no `.claude/settings.json` (GitHub, lápis): `mcp__Supabase__deploy_edge_function`, `mcp__Supabase__create_edge_function_secret`, `mcp__Stripe__stripe_api_write`.
3. Webhook Stripe `we_1UAFofLsq19Xe9NBk4gSh2tW`: adicionar eventos `customer.subscription.trial_will_end` e `charge.dispute.created` (ou liberar a permissão acima).
4. Testar em iPhone e Android reais (instalar, usar 2 dias).
5. Cloudflare Pages: criar conta e conectar o repositório (guia em `docs/deploy/cloudflare-pages.md`).
6. Decidir: duração do cupom PRAGAS (hoje 5 meses), desenho do trial, mudar o onboarding (contrato do baseline).
7. Governança: `governance/hosting-policy.md` ainda diz HOSTING_TARGET=VERCEL (teste de governança exige). Decidir/autorizar alinhar para Cloudflare Pages (mudança de regra, não aplicada pelo agente).
8. Páginas legais (`termos.html` e `privacidade.html`): preencher responsável/controlador, CNPJ se aplicável e endereço. Substituir `contato@FARO_DOMINIO_A_DEFINIR` por contato funcional antes do lançamento.
9. Privacidade: definir prazos reais de backups, logs e retenções de cobrança; avaliar e documentar base legal e prazo do hash antiabuso em `faro_trials_used` (hoje não há expiração automática). Validar informações de fornecedores/transferências e canal de direitos antes de publicar as páginas como definitivas.
10. Exclusão de conta: publicar `excluir-conta-faro` somente no gate autorizado; conferir segredos de Supabase/Stripe e permissões de leitura/cancelamento de assinaturas. Provar E2E sandbox, cascatas, repetição após falha e ausência de cobrança futura. Não houve deploy nesta trilha.
11. Validação desta trilha: executar `npm run check` em ambiente que permita servidor local/Chromium e subprocessos; o sandbox atual bloqueou `listen 127.0.0.1` e `spawnSync` com EPERM. Conferir páginas offline, CSP aplicada e diálogo em iPhone/Android reais.
12. Registrar commit desta trilha em ambiente com Git gravável: o diretório comum `/home/user/FAROAPP1/.git/worktrees/wt-legal-lgpd` está somente leitura neste sandbox. Usar os trailers solicitados; não houve push.
