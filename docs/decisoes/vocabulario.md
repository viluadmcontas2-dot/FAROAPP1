# Um vocabulário só (fatia F7)

Origem: auditoria `docs/auditorias/fluxos-2026-10-20.md`, itens 2.1 e 2.2; nomes aprovados no mockup v3; `docs/decisoes/editar-com-desfazer.md`.

## Tabela canônica

| Ideia | Termo único | Não usar na tela |
| --- | --- | --- |
| Quanto entra hoje | **Meta de hoje** | Meta de faturamento por dia |
| Quanto quer sobrar no mês | **Meta de <mês>** (ex.: "Meta de outubro") | Meta do mês, Meta líquida, Objetivo (mensal) líquido |
| Resultado | **Lucro** ("Lucro real de hoje", "Lucro do dia") | líquido, sobra, contribuição (só em Detalhes) |
| Dia lançado | **dia** / "dia registrado" | registro (como substantivo) |
| Ação de lançar | **Registrar dia** (abrir) e **Salvar dia** (gravar) | Fechamento diário, Fechamento rápido, Fim do dia, Fechar e salvar o dia |
| Fechamento | só o do mês: **Fechamento do mês** / "Salvar fechamento do mês" | Fechamento concluído |
| Saída fixa | **Conta a pagar** (plural "Contas a pagar"); o conjunto é "Compromissos" | custo, obrigação, conta ou obrigação |
| Custo do carro | **Custo por km** | Custo para rodar, Custo variável/km, Operação |
| Dinheiro guardado | **Reserva**; estado "guardado" | protegido, objetivo (use "meta da reserva") |
| Depósito | **Aporte**; verbo **Guardar aporte** | Aportar, Registrar aporte, Proteger este valor |
| Meta da reserva | **Meta da reserva** (botão curto "Ver meta") | Objetivo |

Botões e títulos: verbo + objeto, em frase ("Concluir cadastro", "Ver meta", "Desfazer alteração", "Editar conta"). Nada de CAIXA ALTA em botão: `faro-theme.css` zera `text-transform` em botões; caixa alta só em rótulos de seção (label, kicker, h2/h4).

## Como é aplicado

- **Módulos `faro-*.js`**: textos escritos direto no código já seguem a tabela onde era simples trocar.
- **Núcleo imutável (`app.js`, `legacy-shell.html`)**: o mapa único **`FaroCopy`** (dentro de `faro-brand-r2.js`, que já trocava VETTA por FARO em runtime) renomeia depois do load: textos exatos ("Editar custo", "EDITAR", "EXCLUIR", "CONCLUIR", "META", "DESFAZER"), frases ("2 REGISTROS", "líquido", "protegidos") e avisos (`app.toast`). Observa o DOM, então vale também para telas montadas depois. Nomes de contas digitadas pelo usuário (`.cost-row strong`) nunca são reescritos. IDs, data-attributes e matemática não mudam.
- Botões iguais com ação diferente ganham o objeto pelo contexto: "EDITAR" vira "Editar conta" na lista de contas, "Editar dia" no Histórico e "Editar alerta" na lista de alertas.

## Prova

- `tests/vocabulary-contract.test.mjs`: tabela e `FaroCopy` existem, CSS sem caixa alta em botão, nenhum botão gritando nos módulos.
- `tests/vocabulary-browser.test.cjs` (Chrome real): varre o texto visível das 6 telas, da Central de contas e reservas e do editor de conta; falha com qualquer termo da lista proibida (`tests/helpers/vocabulary.cjs`) ou botão em CAIXA ALTA.
- Cache do app sobe para `faro-v1-core-29` (o `faro-brand-r2.js` e o CSS mudaram).

## Fora desta fatia

Textos dentro de Detalhes fechados e comentários de código. Aba "Hoje/Registrar/Histórico/Planejar/Central" x "Início/Dia/Conquistas/Mais" do mockup é navegação, não vocabulário.
