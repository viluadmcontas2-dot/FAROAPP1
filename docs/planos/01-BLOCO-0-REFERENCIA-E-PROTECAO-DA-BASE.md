# Plano 01 — Bloco 0: Referência e proteção da base

**Estado:** CONCLUÍDO COMO LEVANTAMENTO; decisão de separação pendente antes do Bloco 1  
**Data:** 2026-08-03  
**Produto:** CalculaAê  
**Tipo:** diagnóstico, referência e contrato; sem alteração do aplicativo

## 1. Resultado observável

Este documento congela uma referência verificável do CalculaAê antes de qualquer reorganização de interface.

Ele registra:

- qual branch e fotografia formam a base atual;
- quais telas e fluxos existem;
- quais comportamentos não podem regredir;
- quais testes já protegem a base;
- quais lacunas precisam ser tratadas antes ou durante o Bloco 1;
- quais branches e ambientes existem;
- o contrato proposto para o Bloco 1.

Nenhuma tela, cálculo, dado, navegação, instalação ou regra do PWA foi alterada neste bloco.

## 2. Referência confirmada

| Item | Referência |
|---|---|
| Repositório | `vitoohugo333/VETTA` |
| Branch ativa de validação | `netlify/teste-fechado` |
| Fotografia no início do levantamento | `6ed656cb2e1a9872d06f6da3a34e3beea414a8ac` |
| Última fotografia funcional do fluxo PWA | `0b3ff2da3ecad020abb2294dbb616df132b874ff` |
| Site de validação | `calculaae.netlify.app` |
| Deploy confirmado antes do registro | `6a710f5fc4b0c5000856f61c`, pronto e ligado a `6ed656cb2e1a9872d06f6da3a34e3beea414a8ac` |
| Versão declarada pelo aplicativo | `3.5.1` |
| Armazenamento principal | `localStorage`, chave `vetta-driver-intelligence-v3` |
| Estado normalizado atual | versão interna `10` |

A instalação e a abertura pelo ícone sem piscada foram validadas fisicamente no Android pelo proprietário.

## 3. Inventário atual da experiência

### Início

- meta bruta necessária por dia;
- líquido planejado e quilômetros estimados;
- ação destacada `Registrar meu dia`;
- objetivo mensal e quantidade de dias de trabalho;
- situação do mês e da semana;
- distribuição da meta e custos;
- leitura contextual do CalculaAê;
- acesso secundário ao planejamento.

### Planejamento secundário

- objetivo líquido;
- dias planejados;
- folgas extras;
- retorno para a área de origem preservando a navegação.

A edição ainda acontece em `Ajustes`.

### Registro do dia

- data;
- faturamento;
- quilômetros;
- horas e combustível opcionais;
- prévia de custo, líquido, receita por quilômetro e comparação;
- salvar ou limpar o formulário.

Existe no máximo um registro por data: salvar novamente a mesma data atualiza o registro existente.

### Histórico

- quantidade de dias;
- média de faturamento por quilômetro;
- líquido acumulado;
- gráfico de evolução;
- comparação entre dias;
- lista com edição e exclusão.

### Ajustes

- dias da semana e folgas extras;
- combustível, preço, rendimento e receita média por quilômetro;
- custos mensais, semanais, únicos, por quilômetro e percentuais;
- aprendizado local após registros suficientes;
- restauração dos valores padrão.

### Mais

- comparação Gasolina × GNV;
- relatório mensal;
- exportação e importação dos dados;
- radar local de eventos;
- instruções de instalação.

### Navegação atual

```text
Início | Dia | Histórico | Ajustes | Mais
```

Também existem modais para custo, evento, instalação e onboarding em três etapas.

## 4. Fluxos que não podem regredir

### Dados e armazenamento

- dados existentes continuam carregando pela mesma chave principal;
- atualizações não apagam registros, custos, eventos ou configurações;
- importação e exportação preservam o estado válido;
- um dia existente é atualizado, não duplicado;
- editar ou excluir um dia recalcula o mês;
- custos são criados uma única vez e podem ser editados, ativados ou removidos.

### Cálculos

- combustível por quilômetro continua sendo preço dividido pelo rendimento;
- custos mensais, semanais, únicos, por quilômetro e percentuais mantêm o significado atual;
- registros preservam fotografias dos custos usados no momento do fechamento;
- meta diária, projeção, progresso, líquido e distribuição de custos mantêm os mesmos resultados para os mesmos dados;
- o aprendizado local nunca altera parâmetros sem confirmação do usuário.

### Navegação e formulários

- o botão voltar do navegador ou Android retorna da tela secundária para a área correta;
- abrir Planejamento e voltar preserva o formulário diário ainda não salvo;
- `Registrar meu dia` permanece fácil de encontrar;
- modais fecham sem salvar acidentalmente.

### PWA e acesso

- navegador mostra a tela de instalação apropriada;
- aplicativo instalado abre diretamente a interface interna sem piscada;
- manifesto, service worker e ícones técnicos continuam fora da barreira de senha;
- páginas e dados do aplicativo continuam protegidos;
- cache do PWA não apaga dados locais.

### Aparência

- identidade visual atual, cores, tipografia, gradientes, sombras, cantos e densidade permanecem como referência;
- Bloco 1 reorganiza hierarquia e navegação, não autoriza redesenho estético paralelo.

## 5. Branches, PR e ambientes

Foram encontradas seis branches remotas, acima do limite permanente de quatro:

| Branch | Situação confirmada |
|---|---|
| `main` | produção protegida; divergiu da validação e permanece intocada |
| `netlify/teste-fechado` | branch atual e mais nova; alimenta o site de validação |
| `migration/vetta-clean-3-5-1` | ancestral da branch atual; não possui trabalho exclusivo mais novo |
| `feature/bloco-1-navegacao-secundaria` | ancestral da branch atual; não possui trabalho exclusivo mais novo |
| `tmp/pwa-gate-apply` | temporária, aponta para o mesmo ancestral antigo |
| `tmp/pwa-gate-apply-2` | temporária, aponta para o mesmo ancestral antigo |

A PR #1 permanece aberta em rascunho entre `migration/vetta-clean-3-5-1` e `main`. Sua cabeça é ancestral da branch atual e está superada pela validação atual.

Nenhuma branch foi removida e nenhuma PR foi fechada neste bloco. Essas ações exigem decisão explícita.

## 6. Testes existentes

### Cobertura presente

- sintaxe do JavaScript principal, service worker e Edge Function;
- contrato estático da versão protegida;
- sessão, expiração e comparação de credenciais;
- barreira do PWA e arquivos técnicos públicos;
- abertura standalone sem mostrar a instalação;
- modal de custos salvando exatamente uma entrada;
- navegação secundária, botão voltar e preservação do formulário;
- fluxo básico de instalação no navegador e modo standalone.

### Lacunas confirmadas

1. A branch de validação não recebe CI automaticamente em cada push; os workflows atuais são voltados principalmente para `main`, PR ou execução manual.
2. Não há testes determinísticos independentes da interface para todas as fórmulas financeiras principais.
3. Não há cobertura completa de criar, editar e excluir dias, importação, exportação, onboarding e recuperação de dados anteriores.
4. O teste E2E do gate do PWA contém textos de uma tela anterior e precisa ser executado e alinhado antes de servir como prova do Bloco 1.
5. `tests/README.md` ainda cita um nome antigo de cache.
6. Os workflows de publicação em `main` ainda apontam para o domínio antigo `vetta-driver-intelligence.netlify.app` e preparam um conjunto incompleto de arquivos em relação à arquitetura atual com `app-shell.html` e ícones PNG.
7. A interface depende de Tailwind, Chart.js, Font Awesome e fontes carregadas externamente; isso precisa ser considerado em testes offline e de primeira abertura.
8. `app.js` contém camadas sucessivas de sobrescrita de funções e versões internas. O Bloco 1 não pode aproveitar a reorganização visual para refatorar cálculos ou persistência.

Estas lacunas foram registradas, não corrigidas.

## 7. Separação entre testadores e desenvolvimento

A versão validada pode ser identificada pelo deploy imutável do Netlify, mas o endereço principal `calculaae.netlify.app` acompanha cada atualização da branch atual.

Para que testadores permaneçam numa fotografia congelada enquanto o Bloco 1 evolui, é necessário escolher uma estratégia antes da implementação:

### Opção recomendada

1. remover as quatro branches antigas ou temporárias, mantendo `main` e `netlify/teste-fechado`;
2. congelar `netlify/teste-fechado` como versão dos testadores;
3. criar uma nova branch de desenvolvimento para o Bloco 1;
4. associar essa branch a um endereço de validação separado;
5. só promover uma nova fotografia aos testadores depois dos testes e da validação física.

### Opção simples

Continuar o Bloco 1 na branch atual e interromper temporariamente os testes externos, aceitando que o endereço principal mudará a cada commit.

Nenhuma dessas opções foi executada neste bloco. A escolha afeta branches e ambiente e precisa de decisão do proprietário.

## 8. Contrato proposto do Bloco 1

### Objetivo observável

Reorganizar a navegação e a tela principal para que o motorista entenda rapidamente quanto precisa fazer e qual é a próxima ação.

Navegação pretendida:

```text
Hoje | Histórico | Planejar | Mais
```

`Registrar meu dia` permanece como ação sempre acessível, sem virar uma quinta área principal.

### Alterações previstas

- reorganizar a navegação inferior;
- transformar `Início` em `Hoje`;
- reunir planejamento e ajustes relacionados em `Planejar`;
- reduzir a tela Hoje às prioridades aprovadas;
- preservar acesso às funções secundárias em `Mais`;
- adaptar navegação, botão voltar e estados ativos;
- atualizar ou criar testes de navegação e preservação do formulário.

### Arquivos previstos

- `app-shell.html`;
- `app.js` apenas na lógica de navegação e apresentação necessária;
- `styles.css` apenas quando indispensável para a nova organização;
- testes E2E de navegação e fluxo diário;
- documentação e `PROJECT_STATE.md`.

### O que não pode mudar

- fórmulas financeiras;
- chave ou formato dos dados locais;
- registros, custos, eventos e configurações existentes;
- importação e exportação;
- lógica de aprendizado;
- instalação, manifesto, service worker, cache e barreira de acesso;
- onboarding, salvo ajuste estritamente necessário e previamente apresentado;
- `main`;
- identidade visual aprovada.

### Pré-requisitos antes da implementação

1. decidir a limpeza das branches antigas e a separação entre testadores e desenvolvimento;
2. criar testes de caracterização dos cálculos e do estado local que serão usados como proteção, sem mudar os resultados;
3. executar os testes existentes e alinhar apenas expectativas obsoletas;
4. confirmar o ambiente de desenvolvimento que receberá os commits do Bloco 1.

### Critérios de aceite

- o motorista identifica em poucos segundos a meta de hoje e a ação principal;
- a navegação possui quatro áreas principais;
- `Registrar meu dia` permanece sempre acessível;
- voltar preserva a área de origem e o formulário não salvo;
- resultados financeiros permanecem idênticos para os mesmos dados;
- dados existentes continuam abrindo sem perda;
- testes aplicáveis passam;
- proprietário valida a interface no Android antes de considerar o bloco concluído.

### Fora da autorização do Bloco 1

- refatorar cálculos ou armazenamento;
- corrigir workflows de produção;
- alterar PWA ou acesso;
- criar contas, servidor, sincronização ou pagamentos;
- fazer merge ou alterar `main`;
- entregar aos testadores sem validação física.

## 9. Conclusão do Bloco 0

A referência de antes está definida e os riscos foram mapeados. O aplicativo não foi alterado.

O Bloco 1 não deve começar até que o proprietário escolha como separar testadores e desenvolvimento e autorize o contrato acima. A limpeza das branches antigas também continua pendente de autorização expressa.

## 10. Aprendizado do bloco

**Nenhum aprendizado permanente novo.**

Este bloco aplicou regras já existentes de inventário, evidência, separação de ambientes e proteção contra regressões. As divergências encontradas são pendências atuais do projeto e foram registradas neste documento, sem formar um novo incidente técnico.