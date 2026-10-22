# 0009 — Fechar o dia em uma tela só
**Decisão (22/10/2026, do dono):** "Uma tela, bem organizada." Fechar o dia deixa de ter 3 telas (conferir o que entrou, conferir os gastos, ver o lucro e confirmar) e passa a ser uma tela só.
**A tela, de cima para baixo:**
1. Lucro de verdade do dia em destaque, atualizado ao vivo conforme o que está na tela (entrou, gastos, km, horas).
2. "Quanto entrou hoje?": total e uma linha por plataforma (Uber, 99, inDrive e as outras), editável ali mesmo.
3. "Gastos do dia": cada gasto já anotado (corrigir ou remover) e botões de categoria para adicionar outro.
4. "Km rodados hoje" e as horas online.
5. Um único botão principal, "Fechar o dia", fixo no rodapé, com 56 px, sempre visível. Para um dia já fechado o mesmo botão se chama "Atualizar o dia".
6. Ações secundárias discretas: "Ver a conta do dia" (abre a conta e, no dia fechado, a sugestão do Faro), "Outra fonte", "Não sei o km", "Ver meu mês" e "Voltar ao início" (estes dois só depois de fechar).
**Decisões de detalhe:**
- Depois de fechar, a pessoa continua na mesma tela: o topo vira "Dia fechado · lucro de verdade" com a meta do dia. O botão do meio da barra ("Resumo") abre a mesma tela com tudo preenchido, inclusive os km e as horas gravados.
- Km e horas começam estimados pelo ganho médio por km e por hora (como antes, só que sem passo à parte). Mexer no campo tira a estimativa. Km vazio dá "Informe os km rodados" e leva o foco ao campo.
- Os gastos da tela são um rascunho. Só viram lançamentos no núcleo depois que o núcleo aceita o fechamento; assim um erro (`km_invalido`, `valor_improvavel`) não deixa gasto gravado pela metade, e sair sem fechar não grava nada. O lucro ao vivo aplica o rascunho a uma cópia do estado e lê o `calc`, sem gravar.
- Combustível continua só medindo consumo (o custo já entra pelos km), como na folha de gasto; a linha avisa "já descontado pelos km".
- Erros do núcleo seguem iguais e dizem o que fazer: `dia_vazio` ("Lance quanto entrou hoje"), `km_invalido` ("Informe os km rodados"), `valor_improvavel` (pergunta "Esse valor está certo?" com "Sim, confirmar" e "Corrigir", que volta ao campo) e `data_invalida` (aviso).
- Texto de no mínimo 14 px, alvos de toque de no mínimo 44 px, foco de teclado visível, sem rolagem horizontal. Em celular pequeno a lista rola na vertical e o botão e o lucro ficam fixos.
- Saiu da tela, por repetir informação: o placar de pontos e sequência (o aviso "Dia fechado · +N pontos" continua), os três cartões de lucro por km, por hora e km rodados (o lucro por km e por hora ficam sob o número do topo) e o botão "Informar km e horas".
**O que não mudou:** `src/core` (dia vira às 04:00, histórico fechado imutável pelo snapshot, fechamento retroativo até 35 dias, aprendizado de receita por km) e o teste de paridade com `design/logic.dc.js`.
**Consequência:** os testes do fluxo mudaram de propósito para o fluxo de uma tela (`app-e2e-fluxo`, `app-motorista`, `app-acabamento`); `app-motorista` ganhou dois testes novos (a tela única com lucro ao vivo e botão fixo; sair sem fechar não grava).
