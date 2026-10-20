# Checkpoint FARO — retomar daqui (2026-10-20)

## Como retomar
1. Ler este arquivo. 2. `cd /home/user/FAROAPP1 && git status && git log -3`. 3. Seguir a lista na ordem. Não perguntar "posso continuar?".

## Regras fixas do dono
- NÃO existe modo carro. App único. Nunca reintroduzir.
- NÃO implementar UI nova antes de ele aprovar 1 dos 5 mockups.
- Sem beta, sem "continuar no navegador" (instala antes). Custo de infra zero. R$22,99/mês, cupom PRAGAS R$14,90, trial 7 dias.
- Português simples, curto, celular. Começa com "Entendi:". Final: FEITO / COMPROVADO / PENDENTE / PRÓXIMO PASSO (um só).
- Push sem force só em `claude/*`. Pedir antes: force-push, apagar branch, gastar, segredo.
- Não editar núcleo protegido: app.js, legacy-shell.html, faro-mark.svg, icon.svg.

## Estado verificado
- Branch `claude/pwa-driver-production-fm0kk9`, PR #20 (rascunho). Último commit ac6a6a2 (código sem modo carro). main = 5baf435.
- Verde: `npm run check` (9 ok), `node tests/theme-browser.test.cjs`.
- NÃO rodado ainda após a remoção: `npm run build`, `npm run qa:ui`.

## A fazer (ordem)
1. Limpar "modo carro" dos docs (grep estrito = 0):
   - PLANO.md:24 (tirar ", modo carro")
   - docs/design/mockups-v3-aprovado.html: CSS `.car-top` (l.285-287), l.364 "8 telas"→"7 telas" sem a parte do Modo carro, l.527 item "Modo carro", tela 8 inteira (l.581+)
   - docs/auditorias/produto-2026-10-20.md:49; fluxos-2026-10-20.md:213,215
   - docs/decisoes: registrar-em-20s:15, refino-fluxo:17, pwa-base:29,33, tema-farol:8,14,24,25, marca-e-design:5
   - docs/estrategia/estrategia-produto-2026-10-20.md:17
   - grep: `data-faro-car|faroCar|faro-car-(card|copy)|CarMode|CAR_KEY|CAR_THEME|car-mode|[Mm]odo carro|MODO CARRO|faro-switch|wakeLock|Wake Lock|mountCarCard|faroCarToggle|car-top` (não usar "faro-car": pega faro-card)
2. Rodar UMA vez: `npm run check`, `npm run build`, `node tests/theme-browser.test.cjs`, `npm run qa:ui`; depois `git checkout -- docs/evidence`. Se mudar app-shell: `npm run headers:sync`. Não enfraquecer testes.
3. Commit + push sem force (rodapé Co-Authored-By e Claude-Session).
4. Mockups (em /tmp/claude-0/-home-user/74814dd2-244c-5afe-bad8-fe13c2338a4b/scratchpad/mockups/ v1..v5.html): em v3 renomear função `top`→`topN` (erro `top is not a function`); corrigir conta 612+156≠768 em v3/v5; checar contraste/alvos em v2 e v5; rodar `scratchpad/check.cjs`; apagar `shots3/`; entregar os 5 ao dono (Artifact com índice). Persona Carlos: bruto 214, combustível 58,40, líquido 155,60, 9 corridas, meta semanal R$900.
5. Deploy: Worker https://faroapp1.hugovitorslipknot.workers.dev mostra "Hello world" porque `wrangler.jsonc` só existe na branch do PR #20. Só abrir/mergear para main se o dono mandar. Depois: conferir `_headers`, `sw.js`, manifest. Atualizar docs/deploy/cloudflare-pages.md (trocar faro-motorista.pages.dev pela URL workers.dev), `FARO_APP_URL` e Supabase Site URL.
6. Segundo plano (sem mexer em tela): desempenho em 4G fraco (tela em branco ~7,4 s: splash+preload, chart.js sob demanda, FontAwesome subset); Esc/Voltar no tour; feedback nos botões da Central (faro-account.js, faro-r3b.js); toast "VETTA configurado" (app.js:609, protegido: ver alternativa); `faro_track` 404 (migrations não aplicadas); textos técnicos; P0-1 portão de instalação vs index.html.
7. Antes do PR final: suíte completa, `graphify update .`, disparar `manual-faro-verify.yml` com novo `gate`, atualizar PR #20.

## Só o dono pode
- `git push origin --delete claude/refino-fluxo ccr-35eb8125-a4zjh3 wu/faro-wu-002-vercel-commercial wu/faro-wu-002b-product-hardening` e `git fetch --prune`.
- Revisão jurídica/LGPD; aplicar migrations Supabase 20261020150000 e 20261020170000; limpeza pg_cron 90 dias.
- Stripe: +eventos trial_will_end e charge.dispute.created, duração do PRAGAS, preço fundador, ligar cobrança (`billingEnabled`).
- Teste em aparelho real (iOS/Android), Stripe ponta a ponta, e-mail de contato real, página de exclusão de dados, suporte, monitoramento, SEO/OG, landing, backup.

## Sem prova (UNKNOWN)
iOS/Android reais, Stripe E2E, Edge Functions com Stripe real, exclusão de conta real, sync entre aparelhos, `_headers` no Cloudflare, template de e-mail Supabase `{{ .Token }}`, CORS em runtime, desempenho com 365 dias.
