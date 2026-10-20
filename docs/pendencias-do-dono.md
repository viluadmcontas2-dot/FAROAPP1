# Pendências que só o dono resolve (atualizado a cada fase)

1. Segredos das Edge Functions no painel do Supabase (valor digitado por ele, nunca no chat): `STRIPE_SECRET_KEY` (chave restrita), `STRIPE_WEBHOOK_SECRET`, `STRIPE_FARO_MONTHLY_PRICE_ID`, `FARO_APP_URL`.
2. Permissões no `.claude/settings.json` (GitHub, lápis): `mcp__Supabase__deploy_edge_function`, `mcp__Supabase__create_edge_function_secret`, `mcp__Stripe__stripe_api_write`.
3. Webhook Stripe `we_1UAFofLsq19Xe9NBk4gSh2tW`: adicionar eventos `customer.subscription.trial_will_end` e `charge.dispute.created` (ou liberar a permissão acima).
4. Testar em iPhone e Android reais (instalar, usar 2 dias).
5. Cloudflare Pages: criar conta e conectar o repositório (guia em `docs/deploy/cloudflare-pages.md`).
6. Decidir: duração do cupom PRAGAS (hoje 5 meses), desenho do trial, mudar o onboarding (contrato do baseline).
7. Governança: `governance/hosting-policy.md` ainda diz HOSTING_TARGET=VERCEL (teste de governança exige). Decidir/autorizar alinhar para Cloudflare Pages (mudança de regra, não aplicada pelo agente).
