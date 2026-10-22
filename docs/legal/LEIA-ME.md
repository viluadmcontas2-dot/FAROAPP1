# Documentos legais do Faro: leia primeiro

**ATENÇÃO: tudo nesta pasta é RASCUNHO escrito por IA, não é aconselhamento jurídico.**
**Um advogado precisa revisar tudo antes da primeira cobrança de verdade.** Cobrar sem isso é risco jurídico (CDC e LGPD), como diz `docs/decisions/0006-beta-pago-desde-o-primeiro-dia.md` e a regra 4 de `governance/constitution.md`.

## Já respondido pelo dono (22/10/2026)
- Responsável: 53.362.776 Vitor Hugo de Souza da Costa (MEI), CNPJ 53.362.776/0001-18 (ativo, consultado na base pública), Camaçari/BA.
- Suporte principal: WhatsApp (71) 93300-8720.
- Reembolso: até 7 dias depois da cobrança (valor integral).
- Endereço nos textos: o do cartão MEI (Rua Mairi, 3, Nova Abrantes, Camaçari/BA, CEP 42826-600), decisão do dono em 22/10.
- Atividade (CNAE): o dono escolheu seguir com "promoção de vendas" (7319-0/02), já no certificado. Ela não é de software/assinatura de aplicativo: ainda vale perguntar ao contador.
- Cupons: PRAGAS R$ 14,97, RATAO R$ 14,99 e FARODONO R$ 0 (teste), todos só na primeira compra.

## Arquivos
- `termos-de-uso.md`
- `politica-de-privacidade.md`
- `suporte-e-contato.md`
- `aviso-fim-do-teste.md`

Os textos só afirmam o que o código faz hoje (por exemplo, a exclusão de conta em `supabase/functions/excluir-conta-faro`). Tudo que não deu para confirmar está marcado [CONFIRMAR COM O DONO].

## O que você precisa decidir ou preencher
1. Quem é o responsável: nome ou razão social, CPF/CNPJ, endereço, cidade do foro.
2. Encarregado de dados (DPO): nome e e-mail.
3. E-mail e WhatsApp de suporte, horário e prazo de resposta.
4. Reembolso: aceita pedido até 7 dias depois da cobrança? Em quantos dias devolve?
5. Cancelamento: o acesso vai até o fim do mês pago? (conferir a configuração do portal do Stripe)
6. Cupom RATAO: quem pode usar, limite de usos e validade (hoje o cupom no Stripe não tem trava).
7. Mudança de preço: quantos dias de aviso.
8. Tolerância se a cobrança falhar.
9. Dados: região do Supabase, por quanto tempo guardar a marca do teste (hash do e-mail), backups, e se apaga o cliente no Stripe a pedido (a exclusão do app cancela a assinatura, mas não remove o cliente no Stripe).
10. Caminho exato da tela "Excluir minha conta" no app.
11. Canal e momento de envio dos avisos de fim do teste. O envio ainda precisa ser feito em código.
12. Data de publicação e onde ficam os links (dentro do app e na tela de assinatura).

## Antes de cobrar
Siga a lista da constituição: termos, privacidade, suporte, exclusão de conta, aviso de fim do teste, segredos do Stripe, teste ponta a ponta no Stripe de teste e conferência do modo real.
