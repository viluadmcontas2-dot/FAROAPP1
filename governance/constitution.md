# Constituição do Faro 2.0

1. O produto é o app do motorista; a experiência vem antes da elegância do código.
2. Tudo é idempotente: rodar de novo não muda o resultado.
3. Nada vai a produção sem teste verde e prova registrada.
4. **Cobrança só liga** depois de existirem: termos de uso, política de privacidade, canal de suporte, exclusão de conta, aviso de fim do teste (2 dias), segredos do Stripe no Supabase, teste ponta a ponta no modo de teste do Stripe, conferência do modo real e tela de assinatura revisada. O beta é pago desde o primeiro dia (`docs/decisions/0006-beta-pago-desde-o-primeiro-dia.md`); a cobrança liga na abertura, com tudo isso pronto. Até lá `billingEnabled=false`, coberto por teste.
5. Preço e cupom: R$ 22,99/mês; `RATAO` (R$ 8,00 por 5 meses). IDs reais em `docs/evidence/faro-2-0/stripe-cupom-e-preco.md`.
6. Sem deploy automático de produção. Gastos, publicação e ações irreversíveis exigem ok do dono.
7. Segredos nunca entram no repositório.
8. Sem código legado: o que não é usado é apagado, não comentado.
