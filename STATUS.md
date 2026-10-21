# Estado do Faro 2.0

Esta é a ÚNICA fonte do estado. Os outros documentos (retomada, painel, sprint) apontam para cá e não repetem números.
Atualizado em 21/10/2026. Branch `claude/faro-2-0-beta-pago`. Tarefa mãe no GitHub: #21 (as tarefas filhas lá estão desatualizadas; vale este arquivo).

## Pronto, com prova
- Interface do design compilada para produção, sem `eval` (testes de compilação e de segurança do navegador).
- Núcleo: dinheiro, datas reais, estado v2, contas, metas; o dia vira às 04:00 (testes `core-*`).
- Conta e nuvem: entrar, sair, sincronizar, conflito sem perder dados (testes `backend-*`).
- Servidor endurecido e aplicado no banco real; funções do servidor publicadas (relatório `docs/evidence/faro-2-0/strix-faro-2-0.md`, seção do banco real, e testes `seguranca-banco`).
- Telas ligadas aos dados e à nuvem, com fluxo de ponta a ponta (testes `app-e2e-fluxo`, `app-conta-e2e`).
- Tela "Instalar o Faro" (Android e iPhone) e bloqueio fora do app instalado (testes `app-instalacao-*`). Provado só em navegador de teste, não em aparelho real.
- App antigo apagado; hospedagem Cloudflare; CI só em pull request, sem deploy automático (teste `governanca-faro-2-0`).
- Segurança: 58 testes de ataque nossos e 2 varreduras do Strix, nenhum alerta real alto (`docs/evidence/faro-2-0/seguranca.md` e `strix-faro-2-0.md`).
- Documentação e decisões em português (`docs/decisions/`).

## Parcial
- Tela Conta: entrar, criar conta, conflito e status funcionam; falta assinar e backup completos.
- Instalável e offline: build, CSP e detector testados; falta conferir em aparelho real.

## Falta
- Assinatura Stripe de ponta a ponta no modo de teste.
- Termos de uso, privacidade, suporte, excluir minha conta, aviso de fim do teste.
- Prévia na Cloudflare (ver "Bloqueado pelo dono").
- Lembretes: resolvido — a tela virou "Agenda" (só dentro do app, sem prometer aviso ao celular). Ver ADR 0007.
- Acabamento visual final.

## Bloqueado pelo dono
- **Link do app:** https://faroapp1.hugovitorslipknot.workers.dev — aberto ao público (o Cloudflare Access foi desligado em 21/10). Ligado ao GitHub: cada commit na branch `claude/faro-2-0-beta-pago` (fora docs/specs/.md) é construído e publicado sozinho pelo Cloudflare Workers Builds; build de teste passou. Falta conferir em celular real (#28, #33). O Claude controla a Cloudflare pelo conector oficial (API completa), sem token colado.
- **Decisão:** fechar o dia em 1 tela ou em 3.
- **Segredos do Stripe** no Supabase (o dono cadastra; nunca no chat).
- **Branches antigas:** foram copiadas para nomes `legado/...`; os nomes antigos continuam existindo porque o ambiente não apaga branch. O dono apaga na página Branches do GitHub. Os pedidos de junção rascunho antigos foram fechados. A branch `claude/hopeful-feynman-51q8b1` está inteira dentro desta; nada se perde.

## Beta pago desde o primeiro dia
Não haverá beta grátis. As pessoas assinam para usar: 7 dias de teste com cartão pedido na entrada (primeira cobrança no dia 8), preço R$ 22,99 por mês, cupom `RATAO`. Motivo e detalhes em `docs/decisions/0006-beta-pago-desde-o-primeiro-dia.md`.

A cobrança (`FARO_BILLING_ENABLED`) liga na abertura, mas só quando TODOS estes itens estiverem prontos:
1. termos de uso
2. política de privacidade
3. suporte
4. excluir minha conta
5. aviso de fim do teste
6. segredos do Stripe cadastrados no Supabase
7. teste de ponta a ponta no modo de teste do Stripe
8. conferência do modo real (live) do Stripe
9. tela de assinatura revisada

Hoje a cobrança está desligada porque esses itens ainda não existem. Esse é o caminho crítico.

## Stripe
Preço e cupom reais: `docs/evidence/faro-2-0/stripe-cupom-e-preco.md` (só modo de teste lido). O cupom ainda não tem trava de uso. Modo real não foi conferido.

## Próximo passo
O dono liga o repositório ao Worker `faroapp1` na Cloudflare para existir um link de prévia. Em paralelo, escrevemos os rascunhos de termos, privacidade, suporte, excluir conta e aviso de fim do teste.
