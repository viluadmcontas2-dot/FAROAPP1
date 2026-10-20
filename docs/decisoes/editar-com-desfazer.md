# Editar com desfazer (fatia F6)

Origem: auditoria `docs/auditorias/fluxos-2026-10-20.md`, J5 e J7.

## Decisões

1. **Um editor só para contas e reservas.** Todo "Editar" chama `FaroEdit.editCost(id)` (faro-finance.js), que abre o editor completo `costModal` (nome, finalidade, cobrança, valor, vencimento). A reserva é uma conta com finalidade "reserva", então usa o mesmo editor. A lista antiga continua lá, mas deixa de ser o único lugar.
2. **"Editar" à vista em cada item.** Na Central de Compromissos, cada conta tem um botão "Editar" na própria linha, sem precisar abrir nada antes. A nova seção "Suas contas a pagar" lista TODAS as contas, inclusive as sem vencimento (antes só existiam na lista escondida), cada uma com "Editar" e "Excluir".
3. **Reserva: ações separadas.** Na reserva há "Editar reserva" e "Excluir reserva"; dentro dos detalhes, cada depósito tem "Remover aporte" (antes era só "Remover", e não ficava claro o que saía).
4. **Sem confirm()/alert() do navegador.** Um ouvinte em faro-finance.js intercepta os botões de excluir do app (dia, conta, reserva, aporte, alerta) e "Restaurar parâmetros", e mostra uma folha inferior com a marca (`FaroInteractions.ask`). Com o "sim", o FARO roda a ação ORIGINAL do app (mesmo caminho de gravação, `app.save()`), sem tocar app.js nem a matemática.
5. **Desfazer por 8 s.** Antes de excluir ou salvar uma alteração, o FARO guarda uma cópia do estado. A barra "Desfazer" (`FaroInteractions.showUndo`) devolve só as partes que mudaram e grava pelo mesmo `app.save()`.
6. **Modal atrás da Central: provado e corrigido.** No Chrome, tocar "Editar" na lista antiga abria o `costModal` (div com z-index) enquanto a Central estava aberta como `<dialog>` modal (camada superior): o ponto central do editor caía na Central, ou seja, invisível. Correção geral em faro-interactions.js: quando um modal antigo aparece com uma folha aberta, a folha sai de cena e volta sozinha quando o modal fecha. A barra "Desfazer" fica dentro da folha do topo, porque com um `<dialog>` modal aberto o resto da página fica inerte.

## Vocabulário

Escolha: **"conta a pagar"** para cada item que sai do bolso (aluguel, seguro, parcela); **"compromisso"** só para o conjunto (a Central "Compromissos" junta contas a pagar e reservas); **"reserva"** para dinheiro guardado e **"aporte"** para cada depósito numa reserva.

Palavras trocadas nesta fatia (a F7 de vocabulário pode reaproveitar):

| Antes | Agora |
| --- | --- |
| "Custo atualizado e meta recalculada." | "Conta atualizada. A meta foi recalculada." |
| "Custo adicionado e meta recalculada." | "Conta adicionada. A meta foi recalculada." |
| "+ Adicionar conta" | "+ Adicionar conta a pagar" |
| "Remover" (aporte) | "Remover aporte" |
| confirm "Excluir este registro?" | folha "Excluir este dia?" / "Excluir dia" |
| confirm "Excluir “X”?" | folha "Excluir a conta “X”?" / "Excluir conta" ou "Excluir reserva" |
| confirm "Excluir este item do radar local?" | folha "Excluir este alerta?" / "Excluir alerta" |
| confirm "Restaurar meta, agenda…?" | folha "Restaurar parâmetros?" / "Restaurar parâmetros" |

Ainda com o termo antigo (fora do escopo desta fatia, para a F7): título do `costModal` "Editar custo"/"Adicionar custo" e botões "EDITAR"/"EXCLUIR" da lista antiga (gerados por app.js, imutável); "+ CRIAR UMA RESERVA" em faro-reserves.js na área oculta.

## Prova

`tests/edit-undo-browser.test.cjs` (Chrome real, no `npm run check`): editar conta sem vencimento, editor visível (não atrás da Central) pelos dois caminhos, excluir + desfazer, editar/excluir reserva, remover aporte + desfazer, excluir dia + desfazer, nenhum confirm()/alert() nativo chamado.
