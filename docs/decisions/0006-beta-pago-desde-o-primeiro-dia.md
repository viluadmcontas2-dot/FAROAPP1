# 0006 — Beta pago desde o primeiro dia
**Decisão (21/10/2026, do dono):** não haverá beta grátis. O beta já nasce pago e em produção: as pessoas assinam para usar. Ficam os 7 dias de teste com cartão pedido na entrada (primeira cobrança no dia 8) e o cupom `RATAO`.
**Por quê:** o dono quer testar o produto com a mesma regra do produto final, inclusive a cobrança.
**Condição (não é opcional):** a cobrança (`FARO_BILLING_ENABLED`) liga na abertura, mas só com tudo pronto: termos de uso, privacidade, suporte, excluir minha conta, aviso de fim do teste, segredos do Stripe no Supabase, teste de ponta a ponta no modo de teste do Stripe, conferência do modo real (live) do Stripe e tela de assinatura revisada.
**Motivo da condição:** cobrar de verdade sem isso é risco jurídico. O direito de arrependimento de 7 dias do Código de Defesa do Consumidor e a LGPD (dados pessoais e exclusão) exigem esses itens antes da primeira cobrança.
**Consequência:** esses itens viram o caminho crítico do projeto. As datas do plano da semana dependem deles, não de uma data fixa de "começo do beta". Substitui a ideia anterior de beta grátis com cobrança desligada. Estado atual em `STATUS.md`.

> Atualização 22/10: o teste passou a 2 dias e sem cartão obrigatório (decisão 0010). O resto desta decisão (beta pago, textos legais antes de cobrar) continua valendo.
