# Retomada do Faro 2.0 (leia isto primeiro após compactar a conversa)

**Estado:** leia `STATUS.md`. É a única fonte; aqui não repito números.
**Objetivo:** app do motorista (lucro de verdade), só instalado, 7 dias de teste com cartão na entrada, R$ 22,99/mês. Beta PAGO desde o primeiro dia (decisão `docs/decisions/0006-beta-pago-desde-o-primeiro-dia.md`). Nada do app antigo.
**Onde:** branch `claude/faro-2-0` (viluadmcontas2-dot/FAROAPP1), tarefa mãe issue 21. Painel: https://claude.ai/artifact/DCK5CYRBnmQVcdhgLAJaio (fonte `docs/painel/painel-faro-2-0.html`). Tarefas do dono: Todoist, projeto "Faro 2.0".
**Hospedagem:** Cloudflare. Link: https://faroapp1.hugovitorslipknot.workers.dev (público). Publicação automática: cada commit na `claude/faro-2-0` publica sozinho (Workers Builds). O Claude controla a Cloudflare pelo conector oficial; nada de token no chat. Antes de cobrar clientes, trocar a branch observada para `main`.
**Caminho crítico:** a cobrança liga na abertura, só com tudo pronto: termos, privacidade, suporte, excluir minha conta, aviso de fim do teste, segredos do Stripe no Supabase, teste ponta a ponta no Stripe de teste, conferência do Stripe real, tela de assinatura revisada.
**Decisões do dono:** estado v2 sem migrar o antigo; dia vira às 04:00; Cloudflare; só funciona instalado; beta pago; segurança já varrida (nossos ataques e Strix).
**Regras de trabalho:** português simples; citar o nome do que foi feito, nunca código de versão; idempotência; teste antes do código; atualizar painel e Todoist só em marcos; nenhum segredo no chat nem no repositório.
**Armadilhas:** a ferramenta do Supabase estoura em 60 s com migrations grandes (aplicar em lotes de até 3 comandos); o usuário das migrations não é dono de `auth.users`; `npm run check` leva vários minutos (rodar em segundo plano).
**Plano da semana (Todoist, no máximo 3 tarefas por dia):** as datas dependem da lista do caminho crítico, não de uma data fixa de início.
- 21/10: ligar o repositório ao Worker (link de prévia); decidir fechar o dia em 1 tela ou 3.
- 22/10: segredos do Stripe no Supabase; testar no Android e no iPhone.
- 23/10: assinatura de ponta a ponta no Stripe de teste; cupom; Lembretes.
- 26/10: domínio e e-mail próprio; rascunho de termos e privacidade.
- 27/10: excluir conta, aviso de fim do teste, suporte, plano do Supabase.
- 28/10: conferir o Stripe real; revisar a tela de assinatura.
- Abertura: só quando todos os itens do caminho crítico estiverem prontos. Aí liga a cobrança e convida os primeiros assinantes (meta de avaliação: 6 de 10 fecham o dia 3 dias seguidos).
**Sessão:** compactar em fronteira de etapa. Strix só em marcos. Marketing e produto em sessão separada, trocando arquivos em `docs/produto/` e `docs/marketing/`.
**Mapa do código:** `graphify query` antes de ler arquivos grandes.
