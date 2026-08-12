# VETTA — Plano Completo de Implementação e Evolução

> **Status:** documento oficial de direção técnica e de produto  
> **Versão do plano:** 2.0  
> **Data:** 1 de agosto de 2026  
> **Escopo atual:** PWA local-first, sem login obrigatório e sem backend permanente  
> **Objetivo:** construir o máximo de valor, estabilidade e diferenciação antes de adicionar complexidade operacional, regulatória e financeira

---

## 1. Finalidade deste documento

Este documento é a fonte principal para orientar a evolução do VETTA no longo prazo.

Ele deve impedir que o projeto seja conduzido apenas por necessidades imediatas, ideias isoladas, alterações sem contexto ou decisões que depois não possam ser reencontradas. Toda implementação relevante deve ser comparada com este plano antes de ser iniciada.

Este plano responde:

- qual problema o produto resolve;
- qual etapa tem prioridade;
- o que pertence ao núcleo do aplicativo;
- o que deve ser um módulo opcional;
- como testar funções que podem não permanecer;
- como remover experiências sem deixar resíduos;
- como preservar dados existentes;
- como preparar pagamentos, webhooks e acesso premium;
- como separar módulos regulados, como promoções e sorteios;
- como evitar dependência excessiva de GitHub, Netlify ou qualquer fornecedor;
- quando login, backend e sincronização realmente passam a ser necessários;
- como manter custo, manutenção e risco proporcionais ao estágio do projeto.

Mudanças estruturais devem atualizar este arquivo e, quando necessário, gerar um registro de decisão arquitetural em `docs/ADR/`.

---

# Parte I — Visão de produto

## 2. Objetivo geral

Transformar o VETTA em uma plataforma financeira e operacional completa para motoristas, começando por um aplicativo local-first e evoluindo, de forma controlada, para módulos conectados.

O VETTA deve oferecer:

- funcionamento offline;
- instalação no Android e iPhone;
- linguagem didática;
- cálculos financeiros transparentes;
- metas diárias, semanais e mensais;
- controle de custos;
- histórico;
- manutenção;
- relatórios;
- backups;
- análises e inteligência local;
- arquitetura modular;
- experimentação segura;
- baixo custo operacional;
- preservação dos dados;
- independência de fornecedores;
- preparação para contas, pagamentos e sincronização futura;
- isolamento de funções reguladas.

A primeira grande meta é alcançar uma versão local completa, útil e confiável sem exigir conta.

---

## 3. Princípios permanentes

### 3.1 Clareza antes de sofisticação

Nenhum campo deve depender de conhecimento técnico do usuário.

Termos como:

- rendimento;
- eficiência;
- receita por quilômetro;
- custo variável;
- projeção;
- líquido estimado;
- depreciação;
- reserva;
- margem;

precisam ter unidade, exemplo, explicação e contexto.

Quando uma pessoa pergunta algo que parecia óbvio para quem desenvolveu, isso é evidência de melhoria da interface.

### 3.2 Dados do usuário são patrimônio

Nenhuma alteração pode apagar, corromper ou reinterpretar silenciosamente:

- registros diários;
- custos;
- configurações;
- combustível;
- metas;
- histórico;
- manutenção;
- relatórios;
- backups antigos compatíveis.

Toda mudança de estrutura deve possuir:

- versão;
- migração;
- validação;
- teste;
- snapshot anterior;
- recuperação em caso de falha.

### 3.3 O núcleo deve permanecer simples

O aplicativo não deve depender de backend, conta, serviço externo ou biblioteca pesada para:

- abrir;
- calcular metas;
- registrar o dia;
- consultar histórico;
- editar custos;
- exportar backup.

Serviços externos entram apenas quando forem necessários.

### 3.4 Modularidade é requisito de produto

Uma funcionalidade deve poder ser:

- adicionada;
- ativada;
- desativada;
- testada;
- substituída;
- promovida;
- removida;

sem exigir reescrever o aplicativo inteiro.

### 3.5 Produção não é laboratório

O fluxo padrão será:

```text
branch
  ↓
Pull Request
  ↓
testes automatizados
  ↓
Deploy Preview
  ↓
teste em aparelhos reais
  ↓
registro de evidência
  ↓
aprovação
  ↓
merge na main
  ↓
deploy de produção
```

### 3.6 Longo prazo sem superengenharia

Pensar no futuro não significa construir agora tudo o que talvez seja usado.

Significa:

- definir limites claros;
- usar contratos simples;
- evitar acoplamento;
- registrar decisões;
- manter dados portáveis;
- criar caminhos de migração;
- evitar dependências irreversíveis.

### 3.7 Toda função precisa justificar seu custo

Cada recurso deve ser avaliado por:

- valor para o usuário;
- frequência de uso;
- risco de erro;
- custo de manutenção;
- impacto no desempenho;
- impacto nos dados;
- complexidade operacional;
- possibilidade de remoção;
- dependência externa;
- risco jurídico ou regulatório.

---

# Parte II — Arquitetura de longo prazo

## 4. Modelo arquitetural

O VETTA será dividido em cinco camadas conceituais:

1. **Núcleo local**
2. **Módulos oficiais**
3. **Módulos opcionais**
4. **Experimentos**
5. **Serviços conectados e módulos regulados**

```text
VETTA
├── Núcleo local
│   ├── inicialização
│   ├── registro de módulos
│   ├── armazenamento
│   ├── eventos
│   ├── navegação
│   ├── versionamento
│   └── PWA
│
├── Módulos oficiais
│   ├── metas
│   ├── custos
│   ├── combustível
│   ├── registros diários
│   ├── histórico
│   ├── onboarding
│   └── relatórios
│
├── Módulos opcionais
│   ├── manutenção
│   ├── depreciação
│   ├── insights
│   ├── radar
│   └── comparadores
│
├── Experimentos
│   ├── dashboards alternativos
│   ├── gamificação
│   ├── novos gráficos
│   └── novas recomendações
│
└── Camada conectada
    ├── identidade
    ├── sincronização
    ├── billing
    ├── entitlements
    ├── membership
    ├── rewards
    ├── webhooks
    └── promotions
```

---

## 5. Estrutura de diretórios desejada

```text
src/
  app/
    bootstrap.js
    registry.js
    router.js
    events.js
    feature-flags.js
    permissions.js
    diagnostics.js
    version.js

  core/
    contracts/
    validation/
    formatting/
    errors/
    time/
    ids/
    security/

  modules/
    dashboard/
      manifest.js
      index.js
      domain/
      application/
      infrastructure/
      views/
      tests/

    onboarding/
    daily-records/
    goals/
    costs/
    fuel/
    history/
    reports/
    maintenance/
    insights/
    rewards/
    experiments/

  storage/
    database.js
    repositories/
    migrations/
    snapshots/
    backup/
    validation/

  integrations/
    payments/
    notifications/
    analytics/
    sync/

  pwa/
    install.js
    updates.js
    offline.js
    cache-policy.js
    recovery.js

  ui/
    components/
    layouts/
    forms/
    feedback/
    accessibility/
    icons/

  styles/
    tokens.css
    reset.css
    app.css
    components/

server/
  webhooks/
  billing/
  entitlements/
  membership/
  promotions/
  audit/
  repositories/

public/
  manifest.webmanifest
  sw.js
  icons/

tests/
  unit/
  contracts/
  migrations/
  integration/
  e2e/
  security/
  fixtures/

docs/
  PLANO-DE-APLICACAO.md
  ADR/
  MODULES.md
  DATA-MODEL.md
  SECURITY.md
  RELEASES.md
```

Essa estrutura é uma direção. A migração deve ser gradual.

---

## 6. Contrato mínimo de módulo

Cada módulo terá um manifesto.

```js
export const moduleManifest = {
  id: 'maintenance',
  version: '1.0.0',
  category: 'optional',
  status: 'stable',
  defaultEnabled: false,
  dataVersion: 1,
  dependencies: ['daily-records'],
  capabilities: ['read:records', 'write:maintenance'],
  navigation: {
    label: 'Manutenção',
    order: 60,
  },
};
```

O manifesto deve declarar:

- ID estável;
- versão;
- categoria;
- estado;
- dependências;
- permissões;
- versão dos dados;
- rotas;
- entrada de navegação;
- ativação padrão;
- requisitos de backend;
- requisitos jurídicos, quando aplicável.

### Estados de módulo

- `core`: obrigatório;
- `stable`: oficial e ativo;
- `optional`: oficial e removível;
- `experimental`: em teste;
- `regulated`: exige validações adicionais;
- `deprecated`: em retirada;
- `removed`: não executa mais.

---

## 7. Registro de módulos

O núcleo terá um registro responsável por:

- validar manifestos;
- impedir IDs duplicados;
- verificar dependências;
- ordenar módulos;
- ativar somente módulos compatíveis;
- registrar rotas;
- registrar comandos;
- isolar falhas;
- expor diagnóstico;
- controlar versão;
- impedir módulo regulado sem liberação.

O registro não executará regras financeiras.

---

## 8. Comunicação entre módulos

### 8.1 Serviços públicos

Exemplos:

```js
recordsRepository.list()
goalsService.calculate()
costsService.monthlyTotal()
reportsService.buildMonthlyReport()
entitlementsService.can('reports.advanced')
```

Módulos não devem importar arquivos internos de outros módulos.

### 8.2 Eventos internos

Exemplos:

```text
record.created
record.updated
cost.changed
goal.recalculated
backup.imported
app.updated
payment.confirmed
entitlement.granted
membership.expired
```

Regras:

- nomes estáveis;
- payload validado;
- versão quando necessário;
- falha de um observador não interrompe o evento principal;
- eventos críticos possuem testes de integração;
- eventos não substituem a fonte oficial de dados.

---

## 9. Feature flags

Feature flags serão usadas para testar recursos.

```js
export const featureFlags = {
  newOnboarding: false,
  maintenanceModule: false,
  experimentalInsights: false,
  connectedAccount: false,
};
```

Toda flag deve ter:

- propósito;
- responsável;
- data de revisão;
- condição de promoção;
- condição de remoção;
- estratégia de dados.

Flags não podem permanecer indefinidamente.

---

## 10. Laboratório de experimentos

Cada experiência deve possuir:

1. hipótese;
2. público;
3. problema;
4. critério de sucesso;
5. riscos;
6. duração;
7. implementação isolada;
8. Deploy Preview;
9. teste real;
10. decisão final.

Resultados possíveis:

- promovido;
- revisado;
- descartado.

Ao descartar:

- remover código;
- remover flag;
- remover estilos;
- remover rotas;
- remover dados temporários;
- atualizar documentação.

Experimentos financeiros nunca alteram registros oficiais sem confirmação explícita.

---

## 11. Isolamento de dados

Namespaces recomendados:

```text
vetta/core/settings
vetta/core/records
vetta/modules/maintenance
vetta/modules/reports
vetta/experiments/new-dashboard
vetta/connected/account-cache
```

Regras:

- dados experimentais separados;
- módulos removidos não podem quebrar o carregamento;
- dados derivados devem ser recalculáveis;
- cada módulo possui versão de schema;
- importações devem validar o namespace;
- recursos conectados devem manter cache local não autoritativo.

---

# Parte III — Experiência didática

## 12. Revisão de linguagem

### Campo de combustível

Evitar somente “Rendimento”.

Usar:

**Quantos quilômetros o veículo faz com 1 litro?**

Unidade:

```text
km/L
```

Para GNV:

**Quantos quilômetros o veículo faz com 1 m³ de GNV?**

Unidade:

```text
km/m³
```

Ajuda:

> Exemplo: se o carro percorre aproximadamente 10 km usando 1 litro, informe 10.

Resultado calculado:

**Custo de combustível por quilômetro**

> É quanto você gasta de combustível para percorrer 1 km.

### Dicionário de produto

| Termo técnico | Texto recomendado |
|---|---|
| Rendimento | Quantos km faz com 1 litro ou m³ |
| Eficiência | Consumo do veículo |
| Receita por km | Quanto você recebe por km rodado |
| Custo por km | Quanto cada km custa |
| Meta líquida | Quanto você quer que sobre |
| Faturamento bruto | Total recebido antes dos custos |
| Líquido | Valor que sobra após os custos |
| Custos fixos | Contas que existem mesmo sem trabalhar |
| Custos variáveis | Gastos que aumentam quando você roda |
| Projeção | Estimativa para o final do período |
| Reserva | Dinheiro separado para gastos futuros |
| Depreciação | Perda estimada de valor do veículo |

Todo campo importante deve ter:

- label;
- unidade;
- exemplo;
- texto auxiliar;
- validação;
- valor sugerido identificado como estimativa.

---

## 13. Onboarding

### Etapa 1 — apresentação

Explicar:

- o que o VETTA faz;
- que os dados ficam no aparelho;
- que conta não é obrigatória;
- que tudo pode ser alterado depois.

### Etapa 2 — rotina

Perguntar:

- dias de trabalho;
- folgas;
- horas médias opcionais.

### Etapa 3 — combustível

Perguntar:

- tipo;
- preço;
- km por litro ou m³.

Mostrar imediatamente o custo por km.

### Etapa 4 — receita

Perguntar:

**Em média, quanto você recebe por quilômetro rodado?**

Explicar:

```text
R$ 240 ÷ 120 km = R$ 2,00 por km
```

Permitir “Ainda não sei”.

### Etapa 5 — custos

Sugestões:

- financiamento;
- aluguel;
- seguro;
- internet;
- lavagem;
- manutenção;
- pneus;
- documentação;
- alimentação;
- reserva;
- outros.

### Etapa 6 — objetivo

Perguntar:

**Quanto você quer que sobre no mês depois dos custos?**

### Etapa 7 — resultado

Mostrar:

- faturamento mensal;
- faturamento diário;
- km estimados;
- custo de combustível;
- líquido esperado;
- dias usados no cálculo.

### Etapa 8 — primeira ação

Levar para:

**Registrar meu primeiro dia**

Requisitos:

- voltar;
- pular opcionais;
- salvar progresso;
- refazer sem apagar registros;
- não bloquear uso.

---

# Parte IV — Funcionalidades locais

## 14. Dashboard

Mostrar primeiro:

- meta de faturamento do dia;
- líquido esperado;
- progresso mensal;
- quanto falta;
- dias restantes;
- média necessária;
- custos principais.

Cada cartão deve responder:

- o que é;
- como foi calculado;
- qual período usa.

Estados vazios devem orientar.

---

## 15. Fechamento diário

### Essenciais

- data;
- faturamento;
- quilômetros.

### Opcionais

- horas;
- combustível;
- quantidade abastecida;
- preço;
- pedágio;
- estacionamento;
- alimentação;
- lavagem;
- outros gastos;
- observação.

### Cálculos

- faturamento por km;
- faturamento por hora;
- combustível;
- custo variável;
- custo fixo diário;
- líquido;
- diferença para meta;
- comparação com média.

Feedback deve orientar, não julgar.

---

## 16. Histórico e gráficos

Filtros:

- semana;
- mês;
- período;
- dia da semana;
- combustível.

Gráficos:

- faturamento;
- líquido;
- custo por km;
- receita por km;
- quilômetros;
- horas;
- líquido por hora;
- progresso;
- custos.

Comparações:

- semana anterior;
- mês anterior;
- melhor dia;
- pior dia;
- média recente;
- média histórica.

---

## 17. Custos e manutenção

Custos:

- mensais;
- semanais;
- pontuais;
- por quilômetro.

Manutenção:

- óleo;
- filtros;
- pneus;
- freios;
- alinhamento;
- correias;
- revisão;
- personalizados.

Controle por:

- quilometragem;
- data;
- ambos.

---

## 18. Inteligência local

Insights possíveis:

- melhor dia;
- pior dia;
- tendência de consumo;
- queda de receita por km;
- aumento de custo;
- risco de meta;
- impacto de folga;
- impacto de combustível;
- impacto de custo novo.

Regras:

- base explicada;
- quantidade mínima de dados;
- não afirmar causalidade;
- evitar incentivo a jornadas perigosas;
- permitir dispensar.

---

## 19. Relatórios e exportações

Relatório mensal:

- faturamento;
- custos;
- líquido;
- km;
- horas;
- médias;
- progresso;
- principais custos;
- comparação.

Formatos:

- PDF;
- CSV;
- JSON;
- imagem resumida.

Privacidade:

- ocultar valores;
- ocultar observações;
- ocultar identificação;
- selecionar campos.

---

# Parte V — Dados e PWA

## 20. Armazenamento

Evolução:

```text
localStorage
    ↓
camada de repositório
    ↓
IndexedDB
```

Proteções:

- snapshot;
- validação;
- escrita atômica quando possível;
- migração versionada;
- recuperação;
- backup automático local;
- importação pré-visualizada.

---

## 21. PWA

### Android

- `beforeinstallprompt`;
- botão contextual;
- detectar instalado;
- instrução alternativa.

### iPhone

- detectar iOS;
- instruções para Safari;
- Compartilhar;
- Adicionar à Tela de Início;
- não mostrar botão quebrado.

### Atualizações

- verificar versão;
- avisar;
- atualizar com segurança;
- evitar loop;
- preservar dados;
- diagnóstico de cache.

### Offline

- abrir;
- registrar;
- consultar;
- configurar;
- exportar.

---

# Parte VI — Camada conectada

## 22. Quando adicionar backend

Backend só entra quando houver necessidade comprovada de:

- sincronizar aparelhos;
- recuperar conta;
- vender acesso;
- processar pagamentos;
- receber webhooks;
- enviar notificações;
- administrar membros;
- compartilhar dados privados;
- operar promoções autorizadas.

---

## 23. Identidade

A identidade futura deve ser mínima no início.

Opções:

- e-mail com link;
- código de ativação;
- telefone;
- login tradicional.

O núcleo local não deve depender da autenticação para abrir.

Dados conectados devem ser complementares.

---

## 24. Billing

O módulo `billing` cuidará de:

- planos;
- preços;
- cobranças;
- pagamentos;
- reembolsos;
- assinaturas;
- conciliação.

Ele não libera telas diretamente.

---

## 25. Entitlements

O módulo `entitlements` decide o que o usuário pode usar.

Exemplos:

```text
reports.basic
reports.advanced
maintenance
sync
multiple-vehicles
premium-insights
```

Fluxo:

```text
pagamento confirmado
       ↓
evento interno
       ↓
entitlement concedido
       ↓
aplicativo atualiza capacidades
```

---

## 26. Membership

Responsável por:

- situação do membro;
- data de entrada;
- renovação;
- cancelamento;
- benefícios;
- categoria;
- histórico.

---

## 27. Webhooks

Webhooks nunca devem chegar diretamente ao navegador.

Fluxo:

```text
gateway
   ↓
endpoint no servidor
   ↓
verificação de assinatura
   ↓
idempotência
   ↓
registro do evento
   ↓
normalização
   ↓
serviço de negócio
   ↓
entitlement ou membership
```

Requisitos:

- assinatura validada;
- idempotência;
- replay seguro;
- logs;
- ambientes separados;
- segredo fora do código;
- valores confirmados no servidor;
- tratamento de falha;
- auditoria.

Eventos internos:

```text
payment.created
payment.confirmed
payment.failed
payment.refunded
membership.started
membership.renewed
membership.expired
entitlement.granted
entitlement.revoked
```

---

## 28. Adaptadores de pagamento

O domínio não deve conhecer o formato de um gateway.

```text
integrations/payments/provider-a
integrations/payments/provider-b
```

Cada adaptador traduz eventos externos para eventos internos.

Isso facilita trocar fornecedor.

---

# Parte VII — Recompensas, promoções e módulos regulados

## 29. Rewards

Recompensas não aleatórias podem incluir:

- dias premium;
- descontos;
- cashback permitido;
- conteúdo;
- pontos;
- benefícios definidos;
- recompensa por indicação;
- recompensa por uso consistente.

O usuário deve saber exatamente o que recebe.

---

## 30. Promotions

Promoções, sorteios, concursos e distribuição aleatória de prêmios devem ficar isolados.

Manifesto conceitual:

```js
{
  id: 'promotions',
  category: 'regulated',
  status: 'disabled',
  requiresBackend: true,
  requiresIdentity: true,
  requiresLegalApproval: true,
  requiresAuditLog: true,
  requiresProductionGate: true
}
```

Nenhum módulo regulado entra em produção apenas porque tecnicamente funciona.

---

## 31. Sorteios e participação paga

Modelos em que pessoas pagam para receber chance aleatória de prêmio possuem risco jurídico, financeiro e reputacional elevado.

Antes de qualquer implementação real:

- análise jurídica especializada;
- enquadramento legal;
- autorização quando exigida;
- regulamento;
- identidade dos participantes;
- auditoria;
- prevenção de fraude;
- prestação de contas;
- política de reembolso;
- política de menores;
- revisão dos termos do gateway;
- revisão da loja de aplicativos;
- segregação financeira.

Protótipos podem ser visuais e locais, mas devem permanecer desativados e sem dinheiro real.

---

# Parte VIII — Segurança e confiabilidade

## 32. Segurança local

- escapar conteúdo;
- validar importações;
- limitar tamanho de arquivos;
- evitar `eval` e `new Function`;
- não armazenar segredos no frontend;
- proteção contra corrupção;
- confirmação de ações destrutivas.

---

## 33. Segurança conectada

- autenticação;
- autorização;
- rate limiting;
- validação de webhook;
- idempotência;
- criptografia em trânsito;
- segredos no ambiente;
- logs sem dados sensíveis;
- rotação de chaves;
- princípio do menor privilégio;
- proteção contra abuso;
- trilha de auditoria.

---

## 34. Privacidade

Antes de contas:

- política de privacidade;
- finalidade dos dados;
- exportação;
- exclusão;
- retenção;
- consentimento;
- minimização;
- separação de dados financeiros e promocionais.

---

# Parte IX — Testes e entrega

## 35. Pirâmide de testes

### Unitários

- cálculos;
- validações;
- datas;
- custos;
- projeções.

### Contratos

- manifestos;
- eventos;
- repositórios;
- adaptadores.

### Migrações

- versões antigas;
- dados incompletos;
- rollback;
- backups.

### Integração

- custo altera meta;
- registro altera dashboard;
- importação preserva dados;
- módulo desativado não quebra núcleo.

### E2E

- onboarding;
- primeiro registro;
- histórico;
- backup;
- PWA;
- atualização;
- instalação;
- modo offline.

### Segurança

- segredos;
- inputs;
- importações;
- webhooks;
- permissões.

---

## 36. GitHub Actions

Em Pull Requests:

- instalação limpa;
- testes;
- verificação estrutural;
- build;
- inspeção de saída;
- manifesto;
- service worker;
- imports;
- segredos acidentais;
- Playwright;
- testes de migração.

A `main` só recebe mudanças verdes.

---

## 37. Netlify

Uso recomendado:

- Deploy Preview para testar;
- produção após aprovação;
- evitar testes repetidos na `main`;
- site estático enquanto possível;
- remover extensões sem uso;
- não ativar banco ou functions antes da necessidade.

---

## 38. Independência de fornecedores

O projeto deve poder migrar.

Regras:

- build padrão;
- pasta estática;
- variáveis documentadas;
- scripts locais;
- regras financeiras sem dependência de Netlify;
- dados exportáveis;
- adaptadores para integrações;
- documentação de migração.

---

# Parte X — Governança técnica

## 39. ADRs

Decisões importantes terão arquivos em `docs/ADR/`.

Exemplos:

```text
ADR-0001-usar-vite.md
ADR-0002-local-first.md
ADR-0003-registro-de-modulos.md
ADR-0004-indexeddb.md
ADR-0005-feature-flags.md
ADR-0006-backend-futuro.md
ADR-0007-pagamentos.md
```

---

## 40. Definition of Done

Uma tarefa só está concluída quando:

- requisito atendido;
- testes relevantes passam;
- build passa;
- dados preservados;
- acessibilidade revisada;
- linguagem revisada;
- Deploy Preview testado;
- documentação atualizada;
- flag possui destino;
- riscos registrados;
- nenhuma mudança fora de escopo.

---

# Parte XI — Plano de implementação

## Fase 0 — Estabilização

### Objetivo

Build, deploy e PWA previsíveis.

### Entregas

- Netlify estável;
- remoção de resíduos de senha;
- remoção de extensões desnecessárias;
- versão visível;
- diagnóstico;
- saída publicada validada;
- service worker confiável.

### Conclusão

O mesmo commit é identificável no GitHub, Netlify e aplicativo.

---

## Fase 1 — Fundação modular mínima

### Entregas

- `app/bootstrap`;
- registro de módulos;
- feature flags;
- eventos internos;
- contrato de manifesto;
- diagnóstico de módulos;
- módulo simples de prova.

### Prova

Um módulo pode ser ativado, desativado e removido sem alterar o núcleo.

---

## Fase 2 — Linguagem didática

### Entregas

- substituir “rendimento”;
- revisar termos;
- unidades;
- textos auxiliares;
- exemplos;
- erros humanos;
- glossário.

### Prova

Usuário novo preenche configuração sem ajuda.

---

## Fase 3 — Onboarding

### Entregas

- fluxo completo;
- salvar progresso;
- refazer;
- primeira meta;
- primeira ação;
- teste com usuário real.

---

## Fase 4 — Consolidação Vite

### Entregas

- domínio financeiro modular;
- armazenamento desacoplado;
- telas por módulo;
- build `dist`;
- paridade funcional;
- remoção gradual do legado.

---

## Fase 5 — Fechamento diário

### Entregas

- formulário melhor;
- custos opcionais;
- feedback;
- métricas;
- edição;
- validação.

---

## Fase 6 — Histórico e gráficos

### Entregas

- filtros;
- comparações;
- acessibilidade;
- gráficos;
- indicadores.

---

## Fase 7 — Custos e manutenção

### Entregas

- categorias;
- manutenção;
- reservas;
- simulações;
- alertas locais.

---

## Fase 8 — Relatórios e backup

### Entregas

- relatório mensal;
- PDF;
- CSV;
- JSON;
- importação segura;
- compartilhamento.

---

## Fase 9 — IndexedDB

### Entregas

- camada de repositório;
- migração;
- snapshots;
- recuperação;
- grandes volumes.

---

## Fase 10 — Inteligência local

### Entregas

- insights;
- tendências;
- projeções;
- explicabilidade;
- limites de segurança.

---

## Fase 11 — Laboratório de módulos

### Entregas

- catálogo experimental;
- flags;
- dados isolados;
- promoção e descarte;
- templates de experimento.

---

## Fase 12 — Acabamento

### Entregas

- acessibilidade;
- modo escuro;
- iPhone;
- desempenho;
- design;
- revisão de conteúdo.

---

## Fase 13 — Validação do produto local

### Critérios

- uso por vários meses;
- onboarding sem ajuda;
- PWA estável;
- backups confiáveis;
- dados preservados;
- relatórios úteis;
- valor confirmado por usuários.

---

## Fase 14 — Identidade e sincronização

Somente após validação.

### Entregas

- identidade mínima;
- conta opcional;
- sincronização;
- conflitos;
- recuperação;
- exclusão.

---

## Fase 15 — Pagamentos e acesso premium

### Entregas

- billing;
- webhooks;
- entitlements;
- membership;
- conciliação;
- auditoria;
- ambiente sandbox;
- planos.

---

## Fase 16 — Recompensas

### Entregas

- benefícios previsíveis;
- pontos;
- indicação;
- regras;
- antifraude;
- testes.

---

## Fase 17 — Promoções reguladas

Somente com aprovação jurídica e operacional.

### Entregas possíveis

- regulamento;
- elegibilidade;
- inscrições;
- auditoria;
- resultado;
- prestação de contas;
- bloqueios de produção.

---

# Parte XII — Prioridade imediata

## Ciclo 1

- estabilizar deploy;
- verificar extensão Neon;
- validar PWA;
- exibir versão;
- teste estrutural.

## Ciclo 2

- criar registro modular mínimo;
- manifesto;
- eventos;
- flags;
- diagnóstico.

## Ciclo 3

- revisar linguagem;
- combustível;
- custo por km;
- exemplos;
- mensagens.

## Ciclo 4

- onboarding.

## Ciclo 5

- iniciar migração modular Vite.

---

# Parte XIII — Riscos principais

| Risco | Mitigação |
|---|---|
| Perda de dados | migrações, snapshots, backups e testes |
| Aplicativo crescer acoplado | contratos, registro e eventos |
| Experimentos permanentes | data de revisão e remoção obrigatória |
| Custos de infraestrutura | local-first e Deploy Preview |
| Dependência de fornecedor | adaptadores e build portátil |
| Pagamento duplicado | idempotência |
| Webhook falso | assinatura e segredo |
| Recurso premium desbloqueado no frontend | confirmação no servidor |
| Sorteio irregular | gate jurídico e módulo desativado |
| Interface confusa | testes com usuários |
| Cache antigo | política de atualização e diagnóstico |
| Regressão financeira | testes determinísticos |

---

# Parte XIV — Critérios para considerar a versão local completa

- usuário novo entende o produto;
- onboarding funciona sem ajuda;
- termos são claros;
- cálculos são transparentes;
- dados sobrevivem a atualizações;
- PWA funciona offline;
- instalação é orientada;
- backup é confiável;
- relatórios são úteis;
- módulos são isolados;
- experimentos podem ser removidos;
- testes impedem regressões;
- desempenho permanece adequado;
- uso real confirma valor.

---

# Parte XV — Próxima decisão

A próxima implementação arquitetural deve provar a modularidade com baixo risco.

Entregar:

1. registro de módulos;
2. manifesto;
3. feature flag;
4. evento interno;
5. diagnóstico;
6. módulo de demonstração removível;
7. testes de ativação, desativação e remoção;
8. documentação em `docs/MODULES.md`.

Depois dessa fundação, iniciar a revisão didática e o onboarding.

---

## Regra final

O VETTA deve crescer como uma plataforma, mas continuar funcionando como um aplicativo simples.

Tecnologia deve reduzir risco, custo e confusão. Não deve existir apenas para parecer moderna.

Toda ideia futura deve poder entrar por um módulo, provar valor e sair sem destruir o restante do produto.
