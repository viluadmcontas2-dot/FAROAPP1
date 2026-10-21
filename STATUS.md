# Estado — Faro 2.0

Branch `claude/faro-2-0` · épico #21 e issues filhas · tarefas em `specs/active/faro-2-0/sprint.md`.

## Pronto (provado por teste)
- Interface do design compilada para produção, sem eval (#22).
- Banco e funções endurecidos; `faro_save_state` (#25); conta e sincronização (#24).
- Núcleo (dinheiro, datas, estado v2, ações); dia vira às 04:00 (#23).
- Telas ligadas ao núcleo e à nuvem, em tela cheia, com fluxo E2E (commit `dcdd6b5`).
- Nuvem protegida no sync, histórico imutável, valores absurdos, dia retroativo, virada do mês (commit `4e5b4a4`).
- App antigo apagado; hospedagem Cloudflare; CI só em pull request.

## Falta
- Aplicar a migration `faro_save_state` no Supabase remoto.
- Tela Conta completa, instalação/offline/CSP revisados (#27, #28).
- Segurança: ataques reais e advisors (#30); Strix (#31) depende de chave de IA paga, aprovada pelo dono.
- Stripe ponta a ponta em modo teste (#34); preview na Cloudflare (#33).
- Cobrança continua desligada.

## Stripe (sandbox)
Preço R$ 22,99 e cupom `RATAO`: IDs reais em `docs/evidence/faro-2-0/stripe-cupom-e-preco.md` (IDs antigos citados antes não existem). O cupom ainda não tem trava de uso; modo live não foi conferido.

## Próximo passo
Fechar #26 a #28 e seguir a ordem do `sprint.md`.
