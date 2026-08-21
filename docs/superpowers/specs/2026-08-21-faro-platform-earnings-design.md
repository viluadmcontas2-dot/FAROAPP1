# FARO — Registro diário por plataforma e ganhos extras

**Issue:** VIT-196  
**Projeto:** FARO  
**Status:** Design aprovado pelo owner; aguardando revisão da spec  
**Data:** 2026-08-21

## Objetivo

Tornar o fechamento diário mais didático para motoristas que trabalham em múltiplos aplicativos, permitindo registrar o faturamento por origem e deixando o FARO somar automaticamente o bruto do dia.

O motorista informa valores por **Uber**, **99**, **inDrive** e **Extras/Outros**. O total dessas origens alimenta o mesmo `gross` diário já consumido pelo motor financeiro canônico. Não existe uma segunda fórmula financeira.

## Problema humano

O fluxo atual exige um único valor bruto. Isso obriga o motorista a somar mentalmente ou fora do FARO tudo o que recebeu em diferentes plataformas e fontes extras antes de fechar o dia.

O novo fluxo deve inverter essa carga cognitiva: o motorista informa o que recebeu em cada origem, e o FARO apresenta o total imediatamente.

## Escopo funcional

### Registro de ganhos

A tela **Registrar** passa a ter uma seção intitulada **“De onde veio seu faturamento?”** com quatro origens:

- Uber
- 99
- inDrive
- Extras/Outros

A apresentação padrão é uma grade mobile 2×2. Cada item mostra logo/ícone e nome. Tocar em uma origem ativa seu campo de valor. Plataformas sem uso não exigem preenchimento.

O total é atualizado em tempo real e mostrado de forma explícita como **“Total do dia”**.

### Regra canônica de totalização

Quando o registro usa detalhamento por origem:

```text
gross = uber + ninetyNine + indrive + extras
```

`gross` continua sendo o único valor bruto diário consumido pelo motor financeiro existente.

Nenhum consumidor financeiro deve recalcular o total a partir das origens. As origens existem como metadado explicativo do registro; o motor continua lendo `record.gross`.

### Estrutura de dados

Registros novos que utilizarem o detalhamento recebem:

```js
{
  gross: 410,
  earningsBySource: {
    uber: 180,
    ninetyNine: 120,
    indrive: 70,
    extras: 40
  }
}
```

Regras:

- valores ausentes equivalem a `0`;
- valores negativos não são permitidos;
- ao menos uma origem deve ser maior que `0` para um novo registro;
- `gross` salvo deve ser exatamente a soma normalizada de `earningsBySource`;
- o campo `earningsBySource` é opcional para compatibilidade com registros antigos.

## Compatibilidade com registros antigos

Nenhum registro existente será migrado artificialmente para uma plataforma.

Se um registro antigo possui apenas `gross`, ele continua válido e aparece como **“Faturamento sem origem detalhada”**.

Ao editar um registro antigo, o motorista pode:

1. manter o total bruto legado sem detalhar origens; ou
2. distribuir o valor entre Uber, 99, inDrive e Extras/Outros.

Se optar por distribuir, o novo `gross` passa a ser derivado da soma das origens no salvamento.

## Ownership e integração com o fluxo existente

`faro-register.js` deve ser o owner da experiência de detalhamento por origem.

O core legado continua responsável por:

- `recordDraft()`;
- persistência do registro diário;
- cálculo financeiro baseado em `gross`;
- edição por data;
- histórico e cálculos mensais já existentes.

A integração deve ocorrer sem criar um segundo writer financeiro. O fluxo FARO calcula o total das origens, sincroniza o valor canônico de `recordGross` e persiste `earningsBySource` no mesmo registro diário.

## UX e estados

### Estado inicial

As quatro origens aparecem compactas. Nenhum campo precisa ocupar espaço antes de o motorista selecionar a origem.

### Origem ativa

Ao tocar em uma origem:

- o card ganha estado visual ativo;
- o campo monetário daquela origem aparece ou recebe foco;
- o valor entra imediatamente no total;
- o motorista pode ativar várias origens no mesmo dia.

### Extras/Outros

`Extras/Outros` usa ícone neutro do FARO e serve para gorjetas, corridas particulares, bônus, entregas ou outras receitas não representadas pelas três plataformas principais.

Não haverá categorização adicional de extras nesta primeira versão.

### Total do dia

O total fica visualmente abaixo da grade e deve ser atualizado a cada alteração. Ele é apenas leitura; o motorista não precisa digitar o bruto manualmente quando estiver usando detalhamento por origem.

### Validação

O botão de salvar deve bloquear quando:

- todas as origens estão em `0` no modo detalhado;
- quilômetros obrigatórios continuam inválidos segundo a regra atual;
- algum valor informado é inválido.

A mensagem deve explicar o campo humano que falta, sem expor estrutura interna.

## Histórico e aprendizado

Nesta entrega, Histórico deve continuar funcionando mesmo sem consumir `earningsBySource`.

Quando houver detalhamento disponível, o registro pode exibir um resumo simples das origens, desde que isso não altere cálculos existentes.

Comparativos como “qual plataforma rendeu mais na semana” ficam fora desta implementação inicial. Eles só entram em trabalho posterior usando os dados já armazenados.

## Contrato dos assets de marca

Os assets aprovados para a feature são:

- `faro-platform-99.svg` — SHA-256 `d10212afb5788d77f617dcea0efcb85145c42dfca4641c0d8cf04dbc44b5e51b`
- `faro-platform-indrive.svg` — SHA-256 `9d045ddec23b41327e27e0d056469b3596279976bc3b0fb6b8e24198889c2794`
- `faro-platform-uber.svg` — SHA-256 `e1b09c8e1a04c3acbd508dc27cf6e248e62895dde72f03332529720245df9329`

Requisitos obrigatórios:

- SVG/XML válido;
- sem `<image>`;
- sem `data:image`;
- sem bitmap/base64 embutido;
- proporção preservada;
- `viewBox` coerente;
- renderização com `object-fit: contain` ou equivalente;
- nenhuma distorção, recoloração arbitrária ou substituição por aproximação tipográfica.

`Extras/Outros` não usa marca de terceiros.

## Build e PWA

Quando os assets entrarem no repositório, o build e o service worker devem copiar/cachear a mesma geração usada pelo shell final.

A alteração da feature só deve renovar a geração PWA se isso for necessário para garantir que o app instalado receba o novo JS/asset sem continuar servindo a versão anterior.

## Tratamento de falhas

A edição dos valores por origem não deve escrever estado financeiro a cada tecla. O estado temporário pertence ao formulário.

No salvamento:

1. normalizar valores;
2. calcular o total;
3. validar o mesmo total que será persistido;
4. salvar o registro pelo writer canônico;
5. anexar/preservar `earningsBySource` no mesmo registro;
6. só então limpar o rascunho visual.

Se o pós-save visual falhar, o registro não pode ser duplicado por um novo toque. A idempotência de `saveDay` já exigida pelo fluxo atual deve ser preservada.

## Testes obrigatórios

### Contratos de dados

- soma das quatro origens resulta exatamente em `gross`;
- ausência de `earningsBySource` preserva registros legados;
- edição de registro legado sem detalhamento não altera o `gross` original;
- edição com detalhamento novo substitui `gross` pela soma das origens;
- valores negativos são rejeitados;
- plataformas não utilizadas podem permanecer em zero.

### Contratos de UI

- grade 2×2 em mobile;
- cada origem ativa seu próprio valor;
- total atualiza em tempo real;
- Uber, 99 e inDrive usam os SVGs aprovados;
- teste rejeita assets com `<image>`, `data:image` ou `base64`;
- Extras/Outros usa ícone FARO neutro;
- o total não vira um segundo campo manual no modo detalhado.

### Regressão

- `record.gross` continua alimentando os cálculos existentes;
- histórico continua abrindo registros antigos;
- edição por data continua funcionando;
- rascunho do registro preserva também os valores por origem;
- duplo toque em salvar não cria registros duplicados;
- fluxo continua funcional sem rede.

### Validação física

Em aparelho real:

- logos permanecem nítidos em densidade alta;
- cards e campos não estouram em telas estreitas;
- teclado numérico não encobre o total/ação principal;
- ativar duas ou mais plataformas é compreensível sem instrução externa;
- motorista consegue fechar o dia sem fazer soma manual.

## Fora de escopo desta entrega

- integração automática com APIs de Uber, 99 ou inDrive;
- importação de extratos;
- ranking automático de plataformas;
- recomendação de qual app usar;
- estatística avançada por plataforma;
- novas categorias dentro de Extras/Outros;
- alteração do motor financeiro canônico.

## Critério de aceite

A feature está funcionalmente pronta quando um motorista consegue registrar valores em uma ou mais origens, visualizar o total automaticamente, salvar o dia uma única vez e reencontrar o mesmo total no histórico, sem quebrar registros antigos e sem mudar a matemática financeira existente.
