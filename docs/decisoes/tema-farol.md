# Decisões — Tema global "Farol" (branch claude/tema-farol)

Objetivo: levar a identidade aprovada (`docs/design/mockups-v3-aprovado.html`) do Início/Registrar para o app inteiro, sem mexer em lógica.

## O que foi feito
- **`faro-theme.css` = fonte única das cores** (`:root`): preto `#15130E`, papel `#F6F1E4`, âmbar `#F2B705`, lucro `#0A7A47`, perda `#B3261E`, neutros quentes (`--faro-muted #5B5648`, `--faro-line #D9D0B8`, `--faro-faint #8A8371`), versões `-rgb` para `rgba()` e os nomes antigos (`--faro-text`, `--faro-positive`, `--faro-risk`, `--faro-action`...) apontando para a marca. `styles.css` e `faro-home-r2.js` deixaram de definir cores (o Início só tem apelidos `--faro-home-*` → tokens globais; o modo escuro dele, já existente, ficou como estava).
- **Carregado por último**: entra no `app-shell.html` logo depois de `vendor/tailwind.css` (tabela `VENDOR_SWAPS`), pré-cache no `sw.js` (`./faro-theme.css?v=1`), copiado pelo build. Hash do inline mudou → `npm run headers:sync`. Cache `faro-v1-core-25` (testes que travavam o 24 atualizados).
- **Módulos que não podiam ser editados** (núcleo por SHA e os módulos em edição paralela pelo Codex): o azul deles é vestido por seletor no tema, com `!important` e escopo `:root:not([data-faro-car="on"])`. Isso vale para classes Tailwind do legado (`bg-blue-600` → âmbar com texto preto; `bg-blue-50` → âmbar suave; `text-blue-*` → `#7A5200`; `bg-vetta-900` → preto), e para os `<style>` injetados (portão de instalação, diálogos, Planejar, Compromissos/Reservas, onboarding, tour, update-banner, toasts).
- **Editados direto** (permitidos): `styles.css`, `faro-register.js`, `faro-navigation.js`, `faro-brand-r2.js`, `faro-home-r2.js` passaram a usar tokens.
- **Barra inferior**: segue o mockup v3 (superfície clara, borda quente), item ativo com fundo âmbar suave + traço âmbar no topo, rótulo em preto; inativos `#5B5648` (AA 7:1); alvos 56px; rótulos 12px.
- **Topo**: papel translúcido com linha quente; chip INSTALAR vira botão âmbar 48px.
- **Botões primários**: âmbar com texto preto (contraste 10:1). Botões verdes de ação (aporte, salvar reserva) viram âmbar: verde fica só para dinheiro positivo.
- **Neutros frios** do legado (`text-slate-400/500/600`, `bg-slate-50/100`) viram neutros quentes, para manter AA sobre o papel.
- **Modo carro** (`faro-pwa.js` + `styles.css`): tema não vaza (escopo). Azul do modo carro trocado por âmbar noturno (`#FFC21A`): switch, cartão de ação, ações do legado, item ativo da barra. Corrigido também o Início no modo carro (os tokens `--faro-home-*` viram preto/branco/âmbar; antes o Início ficava claro no modo carro).

## Allowlist justificada (contrato `tests/theme-contract.test.mjs`)
- `--faro-focus: #1D4ED8` em `faro-theme.css`: anel de foco do mockup aprovado (acessibilidade, não é cor de marca).
- `faro-home-r2.js` `classList.remove(... 'bg-blue-600' ...)`: remove a classe azul do legado.
- `app.js` cores do Chart.js: desenhadas no `<canvas>`, sem CSS; núcleo protegido por SHA. Fica azul no gráfico do relatório (Central) — pendente para quando o núcleo puder mudar.
- `legacy-shell.html` `theme-color #0B1121` e config do Tailwind CDN: trocados/removidos em runtime pelo app-shell.
- `faro-r3b.js` acentos `'37,99,235'`/`'30,64,175'` passados por JS como variável inline: sobrescritos por `!important` no tema.

## Provas
- `tests/theme-contract.test.mjs` (estático, no `check`): tokens únicos; tema carregado por último/pré-cacheado/copiado; nenhum azul antigo nos arquivos editáveis; todo azul dos módulos travados tem override com seletor exato; regras do tema escopadas fora do modo carro.
- `tests/theme-browser.test.cjs` (Chrome real 390x844, no `check`): portão de instalação + 6 telas (Início, Registrar, Histórico, Planejar, Reservas, Central/Conta) + modo carro. Em cada tela: nenhum elemento visível com azul antigo no estilo computado (lista + detecção por matiz), todo texto com contraste AA (fundo real, incluindo gradiente e transparência), primário âmbar com texto AA, fundo papel; barra inferior com alvos >=48px, rótulos >=12px, ativo em âmbar. Capturas em `docs/evidence/tema/`.

## Limites (sem prova)
- Gráficos Chart.js (canvas) continuam azuis. Onboarding e tour só cobertos pelo contrato estático (o tour foi olhado em captura local, não versionada).
- Não testado em aparelho real (iOS/Android), nem com `prefers-color-scheme: dark` além do que o Início já tinha.
- `theme_color`/`background_color` do manifest e a cor de status do `faro-pwa.js` continuam `#FFFFFF` (travados por testes de instalação; `faro-pwa.js` fora do escopo de edição).
