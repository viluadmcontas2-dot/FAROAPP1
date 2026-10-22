# Aviso de fim do teste

> RASCUNHO. Tom: claro, sem pressão. Verbo + objeto nos botões. A mesma palavra no botão e no aviso.
> Para cada aviso, o canal é [CONFIRMAR COM O DONO: e-mail, aviso dentro do app ou os dois]. O Stripe já emite um evento 3 dias antes do fim do teste (`customer.subscription.trial_will_end`); hoje o webhook só o registra, não envia nada. Ligar o envio é trabalho de código, fora deste rascunho.
> O teste não pede cartão (decisão `docs/decisions/0009-teste-sem-cartao.md`). Cada texto vale para quem cadastrou pagamento e para quem não cadastrou: sem pagamento ao fim do teste a assinatura é cancelada e nada é cobrado.
> O aviso aparece só dentro do app, nos últimos 3 dias do teste, e só para quem abrir o app. Aviso por e-mail perto do fim ainda não existe: o lembrete do Stripe sai 7 dias antes do fim, ou seja, ao começar o teste.
> `{data}` = dia em que o teste termina (com pagamento cadastrado, também o dia da primeira cobrança). `{valor}` = R$ 22,99 (ou R$ 14,99 com RATAO).

## 1. Três dias antes (dia 5 do teste)
**Título:** Seu teste termina em 3 dias
**Texto:** Seu teste grátis do Faro termina em {data}. Para continuar, cadastre o pagamento em Gerenciar assinatura (se já cadastrou, está tudo certo): nesse dia cobramos {valor}. Se não quiser continuar, cancele antes ou não cadastre nada: o acesso termina no fim do teste e você não paga nada.
**Botões:** [Gerenciar assinatura] [Cancelar assinatura]

## 2. Um dia antes (dia 7 do teste)
**Título:** Amanhã o teste termina
**Texto:** Amanhã, {data}, termina seu teste. Para continuar, cadastre o pagamento em Gerenciar assinatura (se já cadastrou, está tudo certo) e cobramos {valor} no dia. Prefere parar? Cancele hoje ou não cadastre nada: o acesso termina amanhã e você não paga nada.
**Botões:** [Cancelar assinatura] [Gerenciar assinatura]

## 3. No dia (dia 8)
**Título:** Seu teste termina hoje
**Texto:** Hoje termina seu teste. Para continuar, cadastre o pagamento em Gerenciar assinatura (se já cadastrou, está tudo certo): a assinatura do Faro começa hoje, {valor} por mês, e você cancela quando quiser. Sem pagamento cadastrado, o acesso termina hoje e você não paga nada.
**Botões:** [Gerenciar assinatura] [Cancelar assinatura]

## 4. Depois da cobrança
**Título:** Cobrança feita: {valor}
**Texto:** Sua assinatura do Faro está ativa. Próxima cobrança em {data}. Foi cobrado e se arrependeu? Você tem 7 dias para pedir o dinheiro de volta.
**Botões:** [Gerenciar assinatura] [Pedir reembolso]  (o segundo abre `suporte-e-contato.md`)

## 5. Se a cobrança falhar (extra)
**Título:** Não conseguimos cobrar seu cartão
**Texto:** O pagamento de {valor} não passou. Atualize o cartão para continuar usando o Faro.
**Botão:** [Atualizar cartão] (leva ao portal do Stripe, o mesmo de "Gerenciar assinatura")

## Regras de texto
- Sempre dizer o valor e o dia.
- Sempre mostrar o jeito de cancelar, na mesma tela.
- Nunca usar urgência falsa nem culpa ("não perca", "última chance").
- Com o cupom RATAO: no texto 4, avisar o valor com desconto e que ele volta a R$ 22,99 depois de 5 meses. [CONFIRMAR COM O DONO: se avisaremos também 1 mês antes do desconto acabar.]
