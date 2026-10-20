# Início com 1 número herói e 1 ação (F4)

Data: 2026-10-20. Branch: `claude/inicio-um-numero`. Base: `docs/auditorias/fluxos-2026-10-20.md` (achado 4, fatia F4) e a tela 3 de `docs/design/mockups-v3-aprovado.html`.

## Problema
O Início tinha 6 blocos e cerca de 12 números. O número grande era o faturamento necessário por dia (bruto), não o que sobrou. Duas ações disputavam atenção.

## O que o motorista vê agora (de cima para baixo)
1. **Saudação** ("Bom dia/Boa tarde/Boa noite" + data). Não há nome salvo no estado, então não inventamos um.
2. **Herói único** (`#faroHomeHero`, `data-faro-hero`, `data-faro-tour="today"`):
   - Hoje registrado: "Lucro real de hoje" + número grande verde + "Entrou R$ X · saiu R$ Y com combustível, taxas e reservas". Prejuízo: "Prejuízo real de hoje" em vermelho.
   - Nenhum registro: "Registre seu primeiro dia".
   - Já tem histórico, mas não hoje: "Registre o dia de hoje" + "Para ficar no ritmo, hoje precisa sobrar R$ X" (`dailyNet` do núcleo).
3. **Meta do mês** (`#faroHomeGoal`, um `<button>`): "Meta de outubro", "2.971 / 4.000", barra com marcador "ritmo", selo "R$ X à frente" / "R$ X atrás do ritmo" / "No ritmo" e a frase "Faltam R$ X. Sobrando R$ Y por dia nos N dias que restam, você fecha." Tocar abre Planejar já na folha "Ajustar meta" (`FaroPlanning.openMeta`).
4. **Sequência** (`#faroHomeStreak`): "12 dias seguidos · 1 folga livre" + barrinhas dos últimos 7 dias. Some quando é 0.
5. **Próximo compromisso** (`#faroHomeAttention`): sem mudança; só aparece quando uma conta vence em até 3 dias. Ficou visível porque é risco de dinheiro.
6. **1 ação primária**: o botão que já existia (`[data-view="day"]`, agora `data-faro-primary`), "Registrar dia" ou, com hoje salvo, "Editar dia" (mesma palavra do aviso do F2).
7. **"Detalhes"** recolhido (`<details id="faroHomeDetails">`): meta de faturamento por dia (o antigo herói), semana em bruto, situação do mês, "Leitura do FARO" e o link "Ver histórico".

## Decisões
1. **Só apresenta, não calcula**: lucro do dia = `app.recordNumbers(registro, app.monthContext(...)).net`, a mesma conta do aviso de salvar (F2) e do Histórico. Meta e ritmo vêm de `app.calculations()` (`actualNet`, `expectedNetToDate`, `paceDelta`, `dailyNet`, `remainingDays`). Nenhuma escrita em `app.state`.
2. **"Saiu" = entrou − lucro** (combustível + custo por km + taxas % + parte das contas e reservas do dia). Por isso a frase cita "combustível, taxas e reservas".
3. **Sequência derivada, nada salvo**: conta dias com registro para trás a partir de hoje. Hoje ainda sem registro não quebra (começa de ontem). Cada semana (segunda a domingo) tem 1 folga livre; o segundo dia sem registro na mesma semana quebra. Folgas não contam como dia. Função pura exposta em `window.FaroHome.streak(datas, hoje)` para teste. Nenhuma chave nova no aparelho.
4. **Sem dia registrado no mês, sem veredito de ritmo**: o selo "atrás do ritmo" não aparece para quem acabou de começar (era desanimador e injusto). O marcador continua.
5. **Nada sumiu**: os nós antigos continuam no DOM (o `app.render()` do núcleo escreve neles por ID; tirar quebraria). Foram movidos para "Detalhes". IDs preservados: `kpiGrossDaily`, `heroStatus`, `weekStatusTitle`, `monthStatusTitle`, `insightTitle`, `faroHomeAttention`, `faroHomeFoundation`, `[data-view="day"]`.
6. **Tour**: o passo "Hoje" (`data-faro-tour="today"`) passa a apontar o herói. Antes, `faro-planning.js` marcava `dashboard.firstElementChild`, que era o marcador oculto; o marcador agora vai para o fim.
7. **Identidade como tokens**: `--faro-black #15130E`, `--faro-paper #F6F1E4`, `--faro-amber #F2B705`, `--faro-profit #0A7A47`, noite `--faro-night #0C0D0F`, `--faro-night-surface #17191D`, `--faro-amber-night #FFC21A`, `--faro-profit-night #4BE3A0`, mais os semânticos `--faro-home-*`. Injetados por `faro-home-r2.js` (styles.css não foi tocado). Nomes novos para não colidir com `--faro-bg/--faro-surface/--faro-text` que já existem.
8. **Escuro só no Início**: o resto do app ainda declara `color-scheme: light`. Com o celular no escuro, o Início fica escuro e as outras telas, claras. Aceito nesta fatia; o escuro do app inteiro é outra fatia.
9. **Fundo papel na página toda** quando o Início está aberto: `body:has(#view-dashboard:not(.hidden))`.
10. **Acessibilidade**: fonte mínima 12px (testado no navegador), botões ≥ 48px (o principal tem 56px), foco visível com contorno de 3px, `prefers-reduced-motion` desliga transições, números com `tabular-nums`, `[hidden]` forçado a sumir dentro do Início (um `display` do CSS estava ressuscitando o convite sob o lucro; o teste agora pega isso).
11. **Cache do PWA não foi versionado** (`faro-home-r2.js?v=2` em app-shell.html/sw.js): sw/build/manifest são de outra trilha. Ao juntar, subir para `?v=3` junto com o `CORE_CACHE` e os contratos que conferem essa string, senão o aparelho instalado continua com o Início antigo.

## Testes
- `tests/home-one-number-browser.test.cjs` (novo, no `check`): Chrome real. 1 herói e 1 ação primária visíveis; lucro igual ao `recordNumbers`; "Entrou/saiu"; nenhum "bruto" fora de Detalhes; texto ≥ 12px; botão ≥ 48px; meta com marcador e frase; tocar na meta abre "Ajustar meta"; regras da sequência (folga não quebra, 2 faltas na semana quebram, hoje pendente não quebra); nada novo salvo; Detalhes recolhido com os blocos antigos.
- Ajustes em testes antigos, só onde travavam a cópia antiga do botão: `home-contract` ("Hoje já está registrado"/"Registrar meu dia" → "Editar dia"/"Registrar dia"), `finance-v1-unified-experience-contract` ("Registrar meu dia" → "Registrar dia"), `day-edit-safety-browser` ("Revisar meu dia" → "Editar dia").
- `scripts/lib/faro-browser.cjs` passou a devolver também `command` (DevTools), usado para a captura de tela.
- Evidência visual: `docs/evidence/F4-inicio.png` (390×844, dados de exemplo: 12 dias, hoje R$ 312 de entrada).

## Sem prova
- Nada testado em aparelho real. A captura é Chrome headless com o portão de instalação removido na mão.
- O modo escuro foi só olhado na captura, sem teste automático.
- A regra "1 folga por semana" é a leitura do pedido; dias fora da agenda (`workWeekdays`) não viram folga extra.
