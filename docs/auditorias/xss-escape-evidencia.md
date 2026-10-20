# Registrar escape central

Base local `394aa02`, branch existente `claude/escape-html-central`, 2026-10-20. Sem push, deploy ou alteração nos arquivos bloqueados. Referência de contexto: FARO-WU-002B, Issue #17; leitura remota bloqueada pelo sandbox (`socket: operation not permitted`). Não constitui evidência remota durável.

## Decisões

- Criar `window.FaroSafe.esc`, `html` e `raw`. Escapar os cinco caracteres em texto e atributos entre aspas. `raw` usa marca privada em WeakSet; só composição local revisada pode dispensar escape. Não é sanitizador de URL, CSS ou JavaScript.
- Escapar nomes, IDs, rótulos e valores renderizados nos seis módulos com templates dinâmicos: finance, reserves, planning, r3b, platform, onboarding. Os demais módulos autorizados só usam HTML estático ou APIs de texto; nenhum HTML estático ou cálculo foi alterado.
- Manter `faro-v1-core-23`: baseline/install/update/planning/platform-earnings travam essa geração. Adicionar `faro-safe.js?v=1` primeiro na cadeia faro-*, no build e pré-cache. Preservar as versões existentes.
- Ressincronizar os hashes CSP de `vercel.json` porque o script inline do shell mudou. Isso não dispara deploy.
- Acrescentar os dois testes no fim de `check`. Nenhum teste antigo precisou de alteração. O contrato lexical balanceia templates aninhados, verifica interpolações e restringe caminhos dos sinks e composições raw por allowlist explícita.

## Resultados locais reais

- RED: `node tests/xss-escape-contract.test.mjs` falhou antes da implementação, apontando interpolações sem escape central, inclusive `item.id` em atributos de finance.
- GREEN: o mesmo comando passou após implementação. Inclui contrato da API, cinco caracteres, null/undefined/zero, raw explícito, objeto não confiável e ordem shell/build/SW. Casos negativos verificam HTML direto, raw arbitrário, concatenação após esc e aliases não revisados.
- `npm run build`: exit 0; hashes do núcleo verificados pelo build.
- `npm run check`: exit 1. Todos os contratos anteriores ao teste de edição do dia passaram (SQL informa seu SKIP preexistente); `day-edit-safety-browser` falha ao abrir servidor local: `listen EPERM 127.0.0.1`.
- `node tests/xss-escape-browser.test.cjs`: bloqueado no mesmo servidor, antes de carregar a página. NÃO há RED/GREEN de comportamento no Chromium nesta sessão. O teste inclui controle positivo de execução, nomes preservados como texto, quatro telas, atributos de IDs importados e aportes. Não usa SKIP para ocultar a falta de navegador.
- `node tests/cloudflare-pages-contract.test.mjs`: bloqueado por `spawnSync /opt/node22/bin/node EPERM`. O build direto passou; não equivale à execução desse contrato.
- `git diff --check`: exit 0. Tentativa de `git add` recusada: `/home/user/FAROAPP1/.git/worktrees/wt-escape-html/index.lock`, filesystem somente leitura. Nenhum commit criado.

## Retomar

Rodar `npm run check` e `npm run build` em ambiente que permita o servidor do harness e subprocessos. Só então registrar prova do navegador. Ver limites de cobertura e inventário em `xss-pendente.md`; não declarar XSS global resolvido. Criar commit local quando o índice estiver gravável (sem push), com mensagem curta em português e estes trailers:

```
Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CPX7m46cRthfLWuFdbhywq
```
