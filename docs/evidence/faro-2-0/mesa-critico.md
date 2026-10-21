# Mesa do Chato: achados do FARO 2.0 (branch claude/faro-2-0)

Papel: crítico adversarial. Somente leitura: nenhum arquivo do app foi alterado.
Atenção: a árvore de trabalho tem alterações não commitadas (logic.js, template.body.html, vals-secondary.js, view.gen.js, e os arquivos novos conta-actions.js e boot.js). A revisão usou a árvore como está. Os arquivos novos não foram auditados; o caso 15 foi conferido contra eles e continua válido.
Como foi feito: leitura de `src/ui/logic.js`, `vals*.js`, `derive.js`, `src/core/actions.js`, `calc.js`, `state.js`, `dates.js`, `catalog.js`, `src/data/store.js`, `sync.js`, `persist.js`, `backend.js`, `src/ui/main.js` e do template `template.body.html`.
Os casos marcados "reproduzido" rodaram o código real do núcleo (`src/core`) e a sincronização com uma nuvem falsa, a partir de scripts fora do repositório:
`/tmp/claude-0/-home-user/f00bba1b-1dfe-5280-8100-5acdaf884b86/scratchpad/` (repro.mjs, sync-repro.mjs, absurdo.mjs, feb.mjs).
Os casos marcados "lido" foram provados só pela leitura do código.

Severidade: ALTA = perde ou corrompe dinheiro/histórico do motorista; MÉDIA = número errado, ação silenciosa ou confusão; BAIXA = incômodo.

---

## 1. ALTA: sair da conta, usar sem conta e entrar de novo apaga os dias da nuvem (reproduzido)

**Caso:**
1. Aparelho logado na conta A, com 31 dias fechados na nuvem (revisão 50).
2. Sai da conta. O aparelho volta ao zero.
3. Sem conta, faz o onboarding de novo e fecha 1 dia.
4. Entra na conta A de novo.

**Resultado:** a nuvem fica com 1 dia (revisão 51) e o status diz "Tudo salvo na nuvem". Nenhum aviso de conflito.

**Por que:** quando a revisão da nuvem é igual à última conhecida e o aparelho não está marcado como pendente, o sync envia o aparelho por cima (`sendLocal`). As mudanças feitas sem conta não marcam pendência, porque `onLocalChange` sai cedo quando não há usuário.

**Onde:** `src/data/sync.js:164-169` (envio por cima), `sync.js:201-203` (ignora mudança sem usuário), `sync.js:229-249` (entrada, ramo `!owner`).

**Correção mínima:** nunca enviar sem conflito quando o aparelho tem dados e a nuvem tem dados. Guardar o estado do último sync e, se o local mudou desde então, abrir o conflito (`toConflict`) para o motorista escolher. Escrever primeiro um teste vermelho com este cenário.

---

## 2. ALTA: o histórico dos dias fechados muda sozinho (reproduzido)

**Caso:** 10 dias fechados em outubro. Lucro do mês: R$ 602,61.
- Muda o preço da gasolina de 6,29 para 7,29, sem tocar nos dias: lucro vai para R$ 493,52.
- Muda o carro de "alugado" para "dono": lucro vai para R$ 1.575,82. O aluguel sai do rateio de todos os dias do mês.

**Por que:** o lucro de dia fechado é recalculado a cada tela com preço, consumo, desgaste, rateio e metas atuais. O fechamento guarda só bruto, km e horas.

**Onde:** `src/core/calc.js:44` (fuelKm), `calc.js:47-50` (carFixed/carShare), `calc.js:57-59` (en, we, lucro), `calc.js:98-103` (sepAmounts). `src/core/actions.js:47-58` (day/close guarda só p, km, h).

**Correção mínima:** no `day/close`, gravar en, we, car e life no registro do dia. Quando `rec.closed`, o `calc` usa esses valores. Só o dia aberto é recalculado.

---

## 3. ALTA: um número digitado errado muda 60 dias de metas, sem aviso (reproduzido)

**Caso:** 59 dias de 120 km e R$ 260.
- Um dia digitado como R$ 99.999,99 (em vez de R$ 260,00): ganho aprendido por km sobe de 2,17 para 16,02. "Faturar por dia" cai de R$ 733 para R$ 109. "Rodar por dia" cai de 338 km para 7 km.
- Um dia com 1.200 km (em vez de 120): ganho por km cai de 2,17 para 1,70.

**Por que:** não há limite de plausibilidade (ganho por km, km por dia). O aprendizado usa média de 60 dias sem filtro.

**Onde:** `src/core/calc.js:26-34` (withEff). `src/ui/vals-forms.js:12` (MONEY_MAX_DIGITS = 7 aceita até R$ 99.999,99). `src/core/actions.js:49` (km aceito até 3.000).

**Correção mínima:** antes de salvar, pedir confirmação quando o ganho por km passar de R$ 6 ou o km passar de 800 ("Confirma R$ 99.999,99 num dia só?"). Aprender com mediana, não com média.

---

## 4. ALTA: só dá para lançar e fechar o dia de hoje; lançamento de outro dia fica preso (lido)

**Caso:** trabalhou ontem (20/10), esqueceu de fechar e de lançar um pedágio de R$ 40. Hoje (21/10):
- Não há campo de data. "Ganho", "Gasto" e "Fechar dia" gravam em 21/10.
- O dia 20 fica aberto: sem km, fora da meta e da constância. Aparece como atrasado no calendário, e não há como fechá-lo.
- O pedágio entra no lucro de hoje.
- Gastos de ontem não aparecem em lista nenhuma. A faixa "Já lançados hoje" e a lista do início só mostram hoje. Não há como editar nem apagar.

**Onde:** `src/ui/vals-forms.js:186` (todayExps), `vals-forms.js:276-279` (faixa), `src/ui/vals.js:90` e `vals.js:95` (lista só de hoje), `src/ui/logic.js:135` (closeDay sem data), `src/core/actions.js:16` (dateOf cai em hoje quando não vem date).

**Correção mínima:** o reducer já aceita `payload.date`. Falta a UI: campo "Dia" (hoje ou últimos 3 dias) na folha de lançamento e no fechamento, aviso "Dias por fechar" na início, e lista de lançamentos por dia com editar e apagar.

---

## 5. ALTA: a conta do mês anterior some na virada do mês; pilar "Contas em dia" dá zero sem conta atrasada (reproduzido)

**Caso:** Cartão de crédito vence em 28/10 e não é pago.
- Em 29/10: aparece como atrasado. Correto.
- Em 01/11: nenhuma conta pendente. O alerta, a lista de Contas e o aviso somem. A conta não aparece mais para pagar.
- Em 01/11 o pilar "Contas em dia" mostra 0 com a dica "nenhuma atrasada". Contradição. Nos primeiros dias de cada mês, esse pilar fica em zero.
- Aviso do aluguel de segunda (02/11), visto em 29/10: não aparece. Só aparece "Aluguel de casa atrasada".

**Por que:** `occ` só lista o mês de hoje. O pilar calcula `paidOn / max(1, due.length)`, então sem conta vencida dá zero.

**Onde:** `src/core/calc.js:15-16` (occ só do mês de today). `src/ui/derive.js:32` (due), `derive.js:35-37` (pilar), `derive.js:94-96` (aviso do aluguel depende de occ).

**Correção mínima:** `occ` deve incluir contas não pagas dos últimos 2 meses (desde onboardedAt) e as semanais que caem no mês seguinte. Pilar: se `due.length === 0`, a nota é 100.

---

## 6. MÉDIA: fechamento aberto na virada das 04:00 vai para o dia seguinte (reproduzido)

**Caso:** às 03:50 abre "Fechar o dia" (dia 20), digita 130 km e R$ 200 e deixa a tela aberta. Às 04:01 toca "Fechar o dia".
**Resultado:** o dia 21 fica fechado com 130 km. O dia 20 continua sem registro. O XP de +40 vai para o dia errado.

**Por que:** o fechamento vai sem data, e a data é lida no momento do toque.

**Onde:** `src/ui/logic.js:135-141` (closeDay), `src/ui/vals-forms.js:128` (payload sem date), `src/core/actions.js:16`.

**Correção mínima:** guardar a data no rascunho (`cl.date`), enviá-la em `closeDay({date, ...})` e avisar se a data mudou.

---

## 7. MÉDIA: XP sai de graça (reproduzido)

**Caso:**
- Paga a Luz (+10 XP), toca "Desfazer", paga de novo (+10). Três ciclos: 30 XP.
- Fecha o dia com 1 km e R$ 0,01: +40 XP.
- Backup editado à mão aceita XP de até 10 milhões.

**Onde:** `src/core/actions.js:115-125` (pagar e desfazer sem histórico), `actions.js:57` (XP do fechamento sem mínimo), `src/core/state.js:252` (XP aceito até 1e7).

**Correção mínima:** marcar por conta/mês que o XP de pagamento já foi dado. XP de fechamento só com ganho e km mínimos (ex.: 10 km e R$ 20).

---

## 8. MÉDIA: dia fechado não pode ser corrigido; turno que passa das 04:00 vira dois dias (lido)

**Caso:** às 23:50 fecha o dia com 120 km. Roda até 02:00 e faz mais 80 km.
- Não há onde lançar km. O botão "Fechar dia" some, e a tela do dia fechado só tem "Ver meu mês" e "Concluir".
- Ganhos lançados depois entram sem km, então o lucro por km fica errado.
- Se fechar às 04:10, o mesmo turno vira dois dias fechados: 2 x 40 XP e sequência +2.

**Onde:** `src/ui/logic.js:267` (fab leva ao resumo), `src/ui/template.body.html:370-390` (resumo sem edição), `src/core/actions.js:85` (ganho entra em dia fechado sem km).

**Correção mínima:** tela "Editar dia" para dia fechado (km, ganhos, horas). Virada de dia confirmada pelo motorista.

---

## 9. MÉDIA: km zero ou vazio: botão não faz nada e não avisa; km acima de 3.000 é cortado sem aviso (reproduzido)

**Caso:** digita os ganhos, apaga o km e toca "Fechar o dia". Nada muda e não há mensagem (o estado fica idêntico). Digita 3.500 km: grava 3.000, sem aviso.

**Onde:** `src/ui/vals-forms.js:154` (botão com 40% de opacidade, mas clicável), `src/ui/logic.js:135-141` (sem retorno quando não fecha), `src/core/actions.js:49-50`, `src/core/state.js:60`.

**Correção mínima:** botão desabilitado de verdade, com texto "Digite os km que você rodou". Aviso quando o km passar do limite.

---

## 10. MÉDIA: apagar lançamento é imediato, sem confirmação e sem desfazer (lido)

**Caso:** toca na lixeira de um gasto de R$ 300 (manutenção). Some na hora. O aviso diz "removido", sem botão de desfazer. O dia perde R$ 300 de gasto e só volta com backup.

**Onde:** `src/ui/logic.js:156-162` (removeEntry), `src/ui/vals.js:95` (onDel), `src/ui/vals-forms.js:284` (del).

**Correção mínima:** "Desfazer" no aviso por 5 segundos (guardar o item removido), ou confirmação.

---

## 11. MÉDIA: a "Sugestão do Faro" para os cofres não guarda nada (lido)

**Caso:** fecha o dia. A tela mostra "Carro R$ X, Reserva R$ Y, Livre R$ Z" e o texto "Não precisa anotar nada". Nenhum botão guarda esse valor. As ações `day/separate` e `pot/move` existem no núcleo, mas nenhuma tela as chama. Os cofres ficam sempre em zero.

**Onde:** `src/ui/template.body.html:380` (texto), `src/ui/vals-forms.js:121` (sepRows), `src/core/actions.js:61-77` (day/separate sem chamador).

**Correção mínima:** botão "Guardar sugestão" no resumo (chama `day/separate`). Ou trocar o texto para não prometer guardar.

---

## 12. MÉDIA: Contas e Plano mostram aluguel diferente (reproduzido)

**Caso:** aluguel semanal de R$ 650.
- Outubro/2026 (4 segundas): Contas mostra R$ 2.600.
- Novembro/2026 (5 segundas): Contas mostra R$ 3.250.
- O Plano usa média fixa de R$ 2.817 todo mês.
Os números da tela Contas e do Plano não batem.

**Onde:** `src/core/calc.js:45` (mon usa média), `calc.js:15-22` (occ conta segundas reais), `src/ui/vals-secondary.js:21` (total).

**Correção mínima:** escolher uma regra e mostrar a diferença. Por exemplo, Contas mostra o "lançado" de fato, e o Plano usa a média, com nota explicando.

---

## 13. MÉDIA: refazer o onboarding esconde contas atrasadas (lido, não reproduzido)

**Caso:** Luz vence em 25/10 e não é paga. Em 27/10 o motorista refaz o onboarding (ver caso 1). Ao concluir, `onboardedAt` vira 27/10 e o filtro esconde contas com data anterior. A Luz some da lista de pendentes, mas continua devida.

**Onde:** `src/ui/logic.js:242` (filtro por onboardedAt), `src/core/actions.js:27` (onboardedAt = hoje, sempre).

**Correção mínima:** gravar `onboardedAt` só na primeira vez (se já houver valor, manter).

---

## 14. MÉDIA: a tela Contas mostra "Outubro" em todos os meses (lido)

**Caso:** em novembro, a tela Contas ainda diz "Outubro · carro e vida". O texto é fixo.

**Onde:** `src/ui/template.body.html:398` e `src/ui/view.gen.js` (gerado a partir do template).

**Correção mínima:** trocar por `monthName(today)` no template e regenerar `view.gen.js`.

---

## 15. MÉDIA: não há como apagar os dados do aparelho (lido)

**Caso:** o motorista quer zerar o app (vai vender ou emprestar o celular). Na tela Conta só existem "Exportar backup" e "Importar backup". Sair da conta só zera quando há conta. Sem conta, os dados ficam no aparelho para sempre.

**Onde:** `src/ui/vals-secondary.js:110-121` (contaVals sem ação de apagar), `src/data/store.js:77-82` (replaceState só é usado pelo sync).

**Correção mínima:** botão "Apagar dados deste aparelho" com confirmação digitada. Chama `replaceState(null)` e remove as chaves locais do sync.

---

## Verificado e sem falha (para o dono não gastar tempo nisso)

- Conta paga duas vezes no mesmo mês: bloqueado pelo estado (`actions.js:117`). Lido. O problema real é o XP do caso 7.
- Ganho ou gasto negativo: não entra. `parseMoney` usa valor absoluto (`src/core/money.js:279-281`). Lido.
- Dois fechamentos do mesmo dia pela tela: não há caminho, porque o botão leva ao resumo. Lido.
- Mês de 28 dias: sem divisão por zero. Em fevereiro/2027 são 24 dias de pista. Testado só a contagem de dias.
- Trocar de conta com dados pendentes: o sync guarda uma cópia (`sync.js:211-214`) antes de limpar. Lido, não testado.
- Valores de exemplo (`src/core/catalog.js:35-46`) entram no plano como contas reais se o motorista não desligar. Soma de R$ 2.279 de contas da vida. Observação, não conta como achado.

---

## Ordem de correção sugerida

1. Caso 1 (apaga a nuvem): corrigir antes de qualquer lançamento de usuário.
2. Casos 2, 3 e 5 (histórico, número errado, contas que somem).
3. Caso 4 (data nos lançamentos e fechamento).
4. Casos 6 a 15, por ordem de frequência.
