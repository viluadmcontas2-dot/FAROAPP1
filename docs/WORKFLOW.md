# Fluxo de trabalho

## O que cada parte significa

- **`work/current`**: onde o código é alterado.
- **`preview/current`**: recebe somente o resultado pronto de `work/current` e alimenta o site de teste no celular.
- **`main`**: recebe uma alteração somente depois de teste e aprovação no celular.
- **tag**: etiqueta fixa de uma versão aprovada. Ela permite retornar exatamente àquele ponto sem manter dezenas de branches.

## Caminho de uma mudança

1. Ler `AGENTS.md` e `PROJECT_STATE.md`.
2. Registrar o contrato da mudança.
3. Alterar apenas o que foi aprovado em `work/current`.
4. Executar testes e publicar apenas no ambiente de validação autorizado.
5. O proprietário valida no celular.
6. Consolidar em `main` somente com autorização explícita e criar a tag estável autorizada.

## Regra de parada

Se for preciso mudar interface e cálculos no mesmo pedido, ou se uma alteração revelar uma segunda área relevante, parar após diagnosticar e pedir que o proprietário escolha o próximo recorte.
