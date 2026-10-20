# Registro sem perda (F1) e retorno único ao salvar (F2)

Data: 2026-10-20. Branch: `claude/registro-sem-perda`. Base: `docs/auditorias/fluxos-2026-10-20.md` (J3, fatias F1 e F2).

## Problema
- "Revisar meu dia" abria o formulário vazio com "Atualizar este dia". O `saveDay` do núcleo junta o registro antigo com o novo e o novo vence: o que o motorista não redigitasse (outros apps, horas, combustível) virava zero.
- Trocar a data para um dia já registrado não carregava nada e sobrescrevia o dia antigo.
- Salvar dava três respostas (toast do núcleo, modal `#faroDailyResult`, troca de tela) e a frase do modal tinha dois escritores: faro-brand-r2.js ("faltam R$ X líquidos") e um observador em faro-register.js ("faltam R$ Y brutos na semana").

## Decisões
1. **Dono único**: `faro-register.js` é o único dono da edição do dia e do retorno depois de salvar. `faro-brand-r2.js` não embrulha mais `saveDay` e não cria modal. `faro-navigation.js` mantém só a regra de voltar ao Histórico.
2. **`loadedDate`**: o Registro guarda de qual dia salvo o formulário foi carregado. Só esse dia pode ser sobrescrito. `saveDay` recusa salvar (e mostra o aviso) quando a data tem registro e não foi aberta. Essa trava protege também caminhos que esquecermos.
3. **Abrir um dia salvo preenche tudo**: Uber/99/inDrive/Extras (ou o bruto, em registro antigo sem origem), km, horas e combustível. Aviso discreto "Editando 20/10". Botão vira "Salvar alterações".
4. **Troca de data**: se o formulário está vazio, o dia salvo é carregado direto (não há nada a perder). Se há valores digitados, aparece "Esse dia já tem registro. Abrir e editar?" com "Abrir e editar" (carrega o dia salvo; o que foi digitado para a outra data é descartado por escolha explícita) e "Escolher outra data" (volta à data anterior e mantém o que foi digitado).
5. **Rascunho**: guarda `editing` (o dia aberto). Rascunho mais velho que o registro salvo daquele dia é descartado e o registro é carregado, para não ressuscitar valor antigo.
6. **"Limpar formulário"** no dia aberto continua editando esse dia (limpar foi um pedido explícito). Em outra data, volta a ser dia novo.
7. **Retorno único (F2)**: aviso não bloqueante `#faroDaySaved` (role=status): "Dia salvo. Lucro de hoje: R$ X" (ou "Dia atualizado.", "Lucro do dia 18/10", "Prejuízo de hoje" se negativo), com "Editar dia" e "Ver Início" (este só aparece fora do Início). Some em 8 s. O toast do núcleo é segurado durante o salvar bem-sucedido; em falha, ele é mostrado normalmente. O valor é o líquido do dia (`recordNumbers(...).net`), a mesma conta do Histórico.
8. **Sem "Desfazer"** nesta fatia: o núcleo não guarda versão anterior; "Editar dia" cobre o arrependimento. Fica para F3.
9. **CSS**: classes novas mínimas injetadas no próprio `faro-register.js` (styles.css é de outra trilha).
10. **Cache do PWA não foi versionado** (`?v=` em app-shell.html/sw.js e `CORE_CACHE`): outra trilha mexe nesses arquivos. Ao juntar, subir `faro-register.js?v=4`, `faro-brand-r2.js?v=2` e `CORE_CACHE` (e os contratos que conferem essas strings), senão o aparelho instalado continua com o código antigo.

## Testes
- `tests/day-edit-safety-browser.test.cjs`: Chrome real (harness `scripts/lib/faro-browser.cjs`), cenários Revisar, troca de data, retorno único, Histórico/registro antigo. Sem Chrome imprime SKIP explícito.
- `tests/day-save-single-owner-contract.test.mjs`: contrato de dono único.
- `tests/register-contract.test.mjs`: a exigência da frase "brutos para o ritmo planejado" saiu (era o texto que misturava bruto e líquido).
- `scripts/verify-daily-save-browser.cjs`: passa a exigir modal ausente e aviso com o lucro.
