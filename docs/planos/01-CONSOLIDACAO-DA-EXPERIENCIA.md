# Plano 01 — Consolidação da experiência

**Estado:** ATIVO  
**Criado em:** 2026-08-03  
**Produto:** CalculaAê  
**Público principal:** motoristas de aplicativo  
**Princípio:** praticidade acima de quantidade de recursos

## 1. Objetivo observável

Transformar a base atual em uma experiência simples, coerente e rápida para o motorista usar todos os dias, sem perder a estética aprovada, os cálculos nem os dados existentes.

Ao concluir este plano, o motorista deve conseguir:

1. abrir o aplicativo e entender rapidamente quanto precisa faturar;
2. registrar o dia com poucos toques;
3. acompanhar o progresso do mês;
4. ajustar meta, agenda, combustível e custos sem se perder;
5. consultar ou corrigir registros antigos;
6. entender alertas e recomendações sem linguagem técnica.

## 2. O que permanece intocado

Este plano não autoriza alterar:

- fórmulas financeiras aprovadas;
- significado dos dados existentes;
- registros salvos;
- identidade visual atual;
- funcionamento local-first;
- login ou barreira de acesso;
- instalação, manifesto, service worker ou cache do PWA;
- `main`;
- contas, backend, sincronização, Stripe, webhooks ou assinatura.

Qualquer mudança nessas áreas exige contrato separado.

## 3. Direção da experiência

A interface deve responder primeiro:

> Quanto preciso fazer agora e qual é minha próxima ação?

A experiência deixa de ser organizada como um painel com vários cartões concorrentes e passa a ser organizada pela jornada real do motorista.

### Navegação-alvo

```text
Hoje | Histórico | Planejar | Mais
```

A ação `Registrar meu dia` deve ficar sempre acessível e não competir como uma quinta área de navegação.

### Hierarquia das ilhas

- **Ilha principal:** mostra o resultado ou ação mais importante da tela.
- **Ilha de ação:** conduz a uma ação clara.
- **Ilha de informação:** mostra detalhes sem competir com a prioridade.

Nem todo conteúdo deve aparecer ao mesmo tempo.

## 4. Blocos de execução

Cada bloco é uma mudança observável independente. Um bloco só começa depois do anterior estar verificado e, quando envolver interface, validado no celular.

### Bloco 0 — Referência e proteção da base

**Situação:** levantamento concluído em 2026-08-03. A separação operacional entre testadores e desenvolvimento depende de decisão antes do Bloco 1.  
**Relatório:** [`01-BLOCO-0-REFERENCIA-E-PROTECAO-DA-BASE.md`](./01-BLOCO-0-REFERENCIA-E-PROTECAO-DA-BASE.md)

Entregas:

- confirmar branch e fotografia funcional de referência;
- registrar telas e fluxos atuais;
- listar comportamentos que não podem regredir;
- separar a versão entregue aos testadores do bloco em desenvolvimento;
- confirmar testes aplicáveis e lacunas.

Critério de aceite:

- existe uma referência clara de antes e depois;
- nenhum trabalho depende apenas de memória ou captura antiga.

Resultado:

- referência, telas, fluxos, invariantes, branches, testes, lacunas e contrato do Bloco 1 foram registrados;
- nenhuma tela ou lógica do aplicativo foi alterada;
- foram encontradas seis branches remotas, quatro delas antigas ou temporárias e sem trabalho exclusivo mais novo;
- a limpeza dessas branches e a escolha do ambiente separado continuam fora do bloco concluído e exigem decisão do proprietário.

### Bloco 1 — Navegação e tela Hoje

**Situação:** não iniciado. Contrato proposto no relatório do Bloco 0; aguarda decisão de branches/ambientes e autorização específica.

Entregas:

- reorganizar a navegação para `Hoje | Histórico | Planejar | Mais`;
- manter `Registrar meu dia` sempre acessível;
- reduzir a tela Hoje a três prioridades:
  1. meta ou situação de hoje;
  2. progresso do mês;
  3. pendência ou recomendação contextual;
- mover configurações, relatórios, simuladores e análises detalhadas para suas áreas corretas.

Critério de aceite:

- um usuário entende em poucos segundos quanto precisa fazer e qual botão deve tocar;
- cálculos e dados não mudam.

### Bloco 2 — Registro diário

Entregas:

- mostrar primeiro faturamento e quilômetros;
- manter data preenchida automaticamente;
- deixar horas e combustível como opcionais recolhidos;
- mostrar prévia simples de bruto, custos e líquido;
- explicar o impacto na meta antes e depois de salvar;
- preservar edição, correção e navegação sem perder o formulário.

Critério de aceite:

- um motorista registra o dia sem ajuda;
- salvar, editar e corrigir produzem exatamente um registro correto.

### Bloco 3 — Planejamento

Entregas:

- reunir meta, agenda, folgas, combustível, receita por quilômetro, custos e reservas;
- apresentar primeiro resumos fechados;
- abrir detalhes somente quando o usuário decidir editar;
- usar campo numérico e atalhos para valores importantes;
- impedir alterações acidentais sem confirmação quando houver impacto relevante.

Critério de aceite:

- configurações relacionadas ficam juntas;
- a tela diária não funciona como tela de ajustes.

### Bloco 4 — Histórico

Entregas:

- separar `Dias` de `Análise`;
- priorizar lista, busca visual e correção de registros;
- mover gráficos, médias e tendências para a parte de análise;
- mostrar comparação simples com a meta do dia e do mês.

Critério de aceite:

- o usuário encontra e corrige rapidamente um dia específico;
- análises não atrapalham a consulta básica.

### Bloco 5 — Mais

Entregas:

- organizar funções pouco frequentes em:
  - ferramentas;
  - relatórios;
  - dados;
  - aplicativo;
- mover instalação e versão para a área do aplicativo;
- manter simuladores fora do fluxo diário.

Critério de aceite:

- recursos secundários continuam acessíveis, mas não disputam atenção com o uso principal.

### Bloco 6 — Onboarding e linguagem

Entregas:

- onboarding curto com meta, dias de trabalho e combustível;
- resumo final do primeiro plano;
- revisão de termos, unidades, mensagens, vazios, erros e confirmações;
- explicações curtas somente quando ajudam a decidir.

Critério de aceite:

- um usuário novo configura o aplicativo sem orientação externa.

### Bloco 7 — Acabamento e acessibilidade

Entregas:

- revisar tamanho de texto e toque;
- contraste e leitura de números;
- teclado correto para cada campo;
- rolagem, botão voltar, modais e telas pequenas;
- estados de carregamento, erro, vazio e sucesso;
- animações discretas;
- Android e iPhone.

Critério de aceite:

- a interface parece um único produto e permanece utilizável em aparelhos pequenos.

### Bloco 8 — Regressão e versão candidata

Entregas:

- testes dos cálculos principais;
- onboarding;
- criação, edição e exclusão de registros;
- custos e meta;
- histórico;
- importação e exportação;
- navegação e preservação de formulário;
- PWA, atualização e offline sem modificar suas regras neste plano;
- roteiro final para testadores.

Critério de aceite:

- testes automatizados aplicáveis passam;
- não existe regressão conhecida de dados ou cálculos;
- proprietário valida a experiência no celular;
- uma fotografia candidata é entregue aos testadores.

## 5. Trabalho paralelo aos testadores

Os testadores usam uma fotografia congelada. O desenvolvimento continua em outro bloco ou branch claramente identificado.

```text
fotografia congelada para teste
        ↓
feedback coletado e classificado
        ↓
bloco de desenvolvimento separado
        ↓
verificação automatizada
        ↓
validação do proprietário no celular
        ↓
nova fotografia para testadores
```

### Classificação do feedback

- **Bloqueador:** impede abrir, instalar, registrar, calcular ou preservar dados. Interrompe a prioridade atual.
- **Importante:** causa confusão séria, resultado incorreto ou dificuldade relevante. Entra no próximo bloco corretivo.
- **Melhoria:** preferência visual ou refinamento que não impede o uso. Fica na fila de acabamento.

Feedback isolado não altera o produto automaticamente. Primeiro deve ser reproduzido, classificado e relacionado ao bloco correto.

## 6. Riscos principais

| Risco | Prevenção |
|---|---|
| Mudança visual alterar cálculos | testes determinísticos independentes da interface |
| Perda de registros | teste com dados anteriores e cópia de segurança antes de migração |
| Tela apenas trocar excesso de lugar | limite de prioridade e conteúdo por tela |
| Testadores receberem versões instáveis diariamente | fotografias congeladas e ciclos definidos |
| Acumular correções sem conclusão | um bloco observável por vez |
| Misturar pagamento antes da estabilidade local | Plano 04 permanece congelado |

## 7. Critério de conclusão do plano

O Plano 01 só pode ser marcado como **CONCLUÍDO** quando:

- navegação e áreas principais estiverem consolidadas;
- o registro diário for rápido e compreensível;
- configurações estiverem reunidas em Planejar;
- Histórico separar consulta de análise;
- funções secundárias estiverem organizadas em Mais;
- onboarding puder ser concluído sem ajuda;
- linguagem, toque, contraste e telas pequenas estiverem revisados;
- cálculos e dados antigos permanecerem corretos;
- verificações automatizadas aplicáveis passarem;
- proprietário validar no celular;
- testadores receberem uma versão candidata estável.

## 8. Fora deste plano

Não implementar durante o Plano 01:

- conta de usuário;
- sincronização;
- banco remoto;
- Stripe;
- webhook;
- planos pagos;
- assinatura;
- recompensas;
- promoções;
- novos módulos experimentais.

Esses temas serão tratados somente em planos posteriores e separados.

## 9. Estado atual

- O Plano 01 permanece ativo.
- O Bloco 0 foi concluído como levantamento e contrato, sem alteração do aplicativo.
- A instalação e a abertura do PWA foram validadas no Android.
- O Bloco 1 não foi iniciado.
- Antes do Bloco 1, o proprietário deve decidir como limpar as branches antigas e separar a versão dos testadores do ambiente de desenvolvimento.

## 10. Próximo passo único

O proprietário deve escolher entre duas formas de trabalhar no Bloco 1:

1. **Separação recomendada:** autorizar a remoção das quatro branches antigas ou temporárias, manter `netlify/teste-fechado` congelada para os testadores e criar uma nova branch com endereço separado para desenvolver a nova navegação; ou
2. **Caminho simples:** desenvolver diretamente em `netlify/teste-fechado`, interrompendo temporariamente os testes externos porque `calculaae.netlify.app` mudará a cada commit.

Essa decisão ainda não autoriza o Bloco 1. Depois da escolha do ambiente, será apresentada a autorização específica para reorganizar `Hoje | Histórico | Planejar | Mais`, com testes de proteção dos cálculos e dos dados, sem alterar `main`, PWA, acesso ou fórmulas financeiras.