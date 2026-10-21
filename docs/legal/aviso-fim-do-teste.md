# Aviso de fim do teste

> RASCUNHO. Tom: claro, sem pressão. Verbo + objeto nos botões. A mesma palavra no botão e no aviso.
> Para cada aviso, o canal é [CONFIRMAR COM O DONO: e-mail, aviso dentro do app ou os dois]. O Stripe já emite um evento 3 dias antes do fim do teste (`customer.subscription.trial_will_end`); hoje o webhook só o registra, não envia nada. Ligar o envio é trabalho de código, fora deste rascunho.
> `{data}` = dia da primeira cobrança. `{valor}` = R$ 22,99 (ou R$ 14,99 com RATAO).

## 1. Três dias antes (dia 5 do teste)
**Título:** Seu teste termina em 3 dias
**Texto:** Seu teste grátis do Faro termina em {data}. Nesse dia cobramos {valor} no cartão cadastrado. Se não quiser continuar, cancele antes e não paga nada.
**Botões:** [Gerenciar assinatura] [Cancelar assinatura]

## 2. Um dia antes (dia 7 do teste)
**Título:** Amanhã o teste termina
**Texto:** Amanhã, {data}, cobramos {valor} no cartão. Quer continuar? Não precisa fazer nada. Prefere parar? Cancele hoje e não paga nada.
**Botões:** [Cancelar assinatura] [Gerenciar assinatura]

## 3. No dia (dia 8)
**Título:** Seu teste terminou hoje
**Texto:** Hoje começa sua assinatura do Faro: {valor} por mês no cartão cadastrado. Você pode cancelar quando quiser.
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
