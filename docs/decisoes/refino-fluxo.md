# Refino do fluxo (branch claude/refino-fluxo)

Objetivo: deixar a jornada do motorista novo "redonda" para publicar, sem refatorar. Percurso medido no Chrome real 390x844 (harness `scripts/lib/faro-browser.cjs`): instalação, 3 perguntas, 1º dia, Início, editar dia, Planejar (meta, contas a pagar), Reservas, Conquistas, Central/Plano, Histórico. Capturas olhadas uma a uma.

## Antes / depois (toques e telas)

| Jornada | Antes | Depois |
| --- | --- | --- |
| Primeiro acesso até o Início | 4 toques, 3 perguntas + "plano pronto"; 2 avisos seguidos ("Seu FARO está pronto" e depois o do tour) | 4 toques, mesmas telas; 1 aviso só |
| Registrar o 1º dia | Início > Registrar dia > teclado > Adicionar > Salvar dia (4 toques de botão); faixa do topo ocupava ~208 px e empurrava o teclado | mesmos 4 toques; faixa de ~124 px, uma linha de texto a menos |
| Depois de salvar | "Dia salvo / Desfazer / Editar dia" ficava até 8 s por cima de Planejar e Central, cobrindo cartões | só aparece no Início e no Histórico; some ao trocar de tela |
| Avisos rápidos (toasts) | cobriam as teclas 1 a 3 e seguravam o toque | continuam visíveis, mas o toque passa para o que está embaixo |
| Editar dia | Início > Editar dia (1 toque, campos já preenchidos) | igual (já estava bom) |
| iPhone fora do app instalado | tela de instalação sem saída (trava total), 4 passos, um deles condicional | tutorial "Compartilhar > Tela de Início" em 3 passos + botão "Continuar no navegador" (1 toque, vale na visita) |
| Aviso do teste | só dentro da Central > Plano | faixa no Início no dia 6 e no fim do teste, com "Ver plano" (1 toque) e "Agora não" (some por hoje) |
| Modo leitura | texto na Central, mas "Salvar dia" seguia gravando | com `data-faro-read-only` o "Salvar dia" é barrado e explica ("assine na Central"); hoje não ocorre (cobrança desligada) |
| Central | cartão "Modo carro" ficava antes do título; ícone do título era um quadrado vazio (`fa-grid-2` não existe no pacote) | título primeiro; ícone de reticências |
| Início, marcador "ritmo" | rótulo cortado na borda esquerda quando o ritmo está perto de 0 | encosta na borda, sem sair da tela |
| Atualização do PWA | existia, sem teste | testado: "Nova versão disponível" > Atualizar manda `FARO_ACTIVATE_WHEN_SAFE` e trava o botão |

Cache do app: `faro-v1-core-32` (e `npm run headers:sync`).

## Provas (extensões dos testes de navegador existentes)
- `tests/plans-browser.test.cjs`: aviso do teste (sem aviso com 5 dias, aviso com 2 dias, dispensar, fim), modo leitura barra "Salvar dia" (e cobrança desligada não barra), aviso de nova versão.
- `tests/register-20s-browser.test.cjs`: retorno "Dia salvo" some em Planejar; toast não bloqueia toque.
- `tests/theme-browser.test.cjs`: faixa de Registrar < 130 px, Central com título primeiro e ícone válido, "ritmo" dentro da tela, iPhone com tutorial e "Continuar no navegador" que libera o app.
- `tests/onboarding-3-perguntas-browser.test.cjs`: sem aviso duplicado ao concluir.

## Ficou de fora (de propósito)
- Formulário antigo "Adicionar conta a pagar" (núcleo imutável) tem dois campos parecidos ("O que você quer adicionar" e "Finalidade"); o caminho principal de Planejar já usa o fluxo novo.
- Botão "Editar dia" aparece no retorno e no Início ao mesmo tempo (útil, não confunde na prática).
- Chip "Instalar" no topo e cartão "Instalar" na Central: só aparecem fora do app instalado.
- Gráficos Chart.js continuam azuis (núcleo por SHA). Nada testado em aparelho real iOS/Android.
- Subir a opção "Continuar no navegador" para Android/computador: não pedido; o portão segue obrigatório fora do iPhone.
