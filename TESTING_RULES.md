<!-- VETTA_GOVERNANCE_VERSION: 2026-08-03.2 -->
# VETTA — regras permanentes de testes e CI

## Princípio

O proprietário autoriza objetivos; o agente responde pela prova técnica.

Testes fazem parte de qualquer bloco autorizado e não exigem autorização separada. O agente deve selecionar, executar, interpretar e ampliar a cobertura necessária até que a conclusão seja defensável.

## Máxima evidência útil

O repositório público pode usar executores padrão gratuitos do GitHub Actions. Isso elimina a necessidade de poupar minutos como objetivo de produto, mas não elimina limites técnicos, ruído ou risco de falsos alarmes.

A política é:

- executar todo teste que acrescente evidência material;
- evitar somente testes sem relação com a mudança;
- preferir paralelismo controlado quando reduzir o tempo sem reduzir a qualidade;
- nunca usar `larger runners`, serviços pagos, emuladores caros ou recursos externos cobrados sem decisão explícita.

## Camadas de prova

### 1. Integridade e sintaxe

Sempre que houver arquivos técnicos:

- validar JavaScript e módulos com o analisador do Node;
- validar JSON e manifestos;
- confirmar arquivos obrigatórios e regras canônicas;
- detectar segredo em texto claro e artefato gerado indevido;
- confirmar que a branch e a fotografia testadas são as esperadas.

### 2. Testes determinísticos

Executar todos os arquivos `tests/**/*.test.mjs` presentes na branch, não uma lista fixa mantida em outro lugar.

Mudanças financeiras, armazenamento, migração ou dados exigem casos independentes da interface e cobertura de valores extremos, ausência de dados e compatibilidade com registros antigos.

### 3. Navegador local

Para qualquer mudança funcional, teste de engenharia ou alteração de configuração que possa afetar execução:

- montar a cópia temporária da própria branch;
- abrir em Chromium móvel e desktop;
- verificar erros JavaScript, navegação, formulários e preservação de estado aplicáveis.

### 4. Múltiplos navegadores

Para interface, navegação, formulários, armazenamento, cálculos integrados, PWA ou comportamento geral do aplicativo, ampliar para:

- Chromium móvel;
- Chromium desktop;
- Firefox;
- WebKit.

Uma falha específica de navegador deve ser investigada, não ignorada automaticamente.

### 5. Ambiente publicado

Use quando a branch declarar um alvo em `ci/branch-policy.json` e a prova publicada acrescentar valor, especialmente em:

- interface e navegação;
- PWA, service worker, manifesto e cache;
- acesso e autenticação;
- configuração de hospedagem;
- regressão que só aparece no ambiente real.

A prova deve confirmar URL, branch, conteúdo relevante e comportamento. Netlify e GitHub Pages são adaptadores; não são o centro da estratégia.

### 6. Validação física

Automação não comprova instalação nativa, comportamento do sistema operacional, ergonomia real ou aparência final no aparelho.

Mudanças de interface e PWA permanecem **aguardando validação física** até o proprietário testar no celular.

## Classificação automática

O motor central classifica os arquivos alterados:

- `docs`: integridade e governança;
- `engineering`: integridade, testes determinísticos e Chromium;
- `ui`: suíte completa e matriz de navegadores;
- `critical`: cálculos, dados e armazenamento, com suíte completa e matriz;
- `pwa`: suíte completa, matriz, ambiente publicado e validação física;
- `full`: cobertura máxima quando a classificação é incerta ou o agente solicita prova total.

Incerteza aumenta a cobertura; não a reduz.

## Execução automática

Branches ativas possuem `.github/workflows/ci-autonomous.yml`, acionado por `push`, `pull_request` e execução manual.

O workflow chama o motor canônico da `main`, testa a fotografia exata da branch e cancela execuções ultrapassadas da mesma referência.

O agente também pode usar o issue #2 para solicitar uma execução adicional de qualquer branch. Esse acionamento é uma ferramenta do agente, não uma obrigação do proprietário.

## Segurança do orquestrador

- somente o issue #2 é aceito;
- somente autor com associação `OWNER` é aceito;
- comandos usam formato fechado;
- nome da branch passa por validação estrita;
- nenhum texto do comentário é executado como shell;
- o workflow possui permissões mínimas;
- não há commit, merge, publicação manual ou alteração de dados;
- identidade OIDC é temporária e limitada ao repositório e ao workflow canônico.

## Evidências e artefatos

- resumo e resultados devem aparecer no GitHub Actions;
- acionamentos pelo issue devolvem status e link no próprio issue;
- screenshots, traces e relatórios são guardados principalmente em falha;
- retenção deve ser curta, salvo quando a investigação exigir preservação maior;
- vídeo fica desligado por padrão e só é ligado quando for a melhor prova para um defeito específico.

## Falhas

O agente deve classificar cada falha como:

- defeito do produto;
- defeito do teste;
- problema do ambiente;
- instabilidade reproduzível ou não reproduzível;
- falha preexistente comprovada;
- resultado inconclusivo.

Não repetir silenciosamente até ficar verde. Não retirar teste válido apenas para liberar a CI.

## Critério de conclusão

Uma mudança só pode ser declarada concluída quando:

1. todos os critérios de aceite estão ligados a evidência;
2. a suíte proporcional passou ou a limitação foi explicitamente classificada;
3. a fotografia testada é a fotografia reportada;
4. ambiente publicado foi verificado quando necessário;
5. validação física está registrada ou claramente pendente.
