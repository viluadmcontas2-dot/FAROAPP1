# 0010. Teste de 2 dias, sem cartão obrigatório, com travas contra abuso
**Decisão (22/10/2026, do dono):** o pagamento é por cartão (o Stripe não oferece Pix no Brasil para este caso). O teste cai de 7 para 2 dias e NÃO exige cartão para começar. Substitui, no que for contrário, o "cartão na entrada" da decisão 0006.
**Travas contra abuso (todas no servidor):**
- O teste vale uma vez por pessoa: e-mail normalizado (sem pontos e `+tag` do Gmail) e histórico de assinatura.
- Só e-mail confirmado ganha teste.
- Domínios de e-mail descartável (lista no banco) não ganham teste: assinam pagando já, com cartão obrigatório.
- Quem não ganha teste vê o checkout com cartão obrigatório (`payment_method_collection: always`).
- Sem cartão ao fim do teste, o Stripe cancela a assinatura (`missing_payment_method: cancel`) e o acesso para. Nada é cobrado.
**Risco aceito:** sem cartão, a conversão tende a ser menor e há mais tentativas de abuso. O custo de um teste abusivo é baixo (2 dias de uso).
**Aviso:** `docs/legal/aviso-fim-do-teste.md` muda de "vamos cobrar" para "adicione um cartão para continuar".
