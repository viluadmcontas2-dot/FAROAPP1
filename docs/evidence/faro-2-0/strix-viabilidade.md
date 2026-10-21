# Strix: viabilidade (2026-10-21)

Resultado: PARCIAL. Instalacao e imagem sandbox OK. Scan fim a fim NAO executado: falta chave LLM.

## Comprovado
- `uv tool install strix-agent` -> `strix 1.7.0` (PyPI `strix-agent`; installer curl nao foi executado).
- Docker 29.9.1 instalado, daemon parado; sobe com `dockerd &` (cgroup v1, ok).
- Docker Hub da 429 (rate limit) pelo proxy; `ghcr.io` funciona:
  `docker pull ghcr.io/usestrix/strix-sandbox:1.3.0` (1,44 GB comprimido, 5,9 GB em disco).
- CLI tem `--max-turns N`, `--max-budget USD`, `-m quick|standard|deep`, `-n` (nao interativo).

## Teste fim a fim (chave `MEU_APP_CLAUDE_KEY` exportada como `LLM_API_KEY` so no processo)
- Chave validada: 1 token ao claude-haiku-5-5 -> HTTP 200.
- Alvo: servidor node local (porta 3999) refletindo `?q=` sem escape. Scan: modo quick, 25 turnos, teto US$0,50, host `host.docker.internal`.
- Achou: "Reflected XSS in search query parameter q on GET /" (medium). Funciona.
- Terminou com status `failed` apos ~3,6 min: erro da API "Invalid `signature` in `thinking` block" (blocos de raciocinio do haiku-5-5 via LiteLLM). Relatorio de achados ja tinha sido gerado.
- Uso: 70 requisicoes, 7,15M tokens de entrada (6,75M de cache lido, 0,40M de cache gravado), 43,8k de saida.
- Custo estimado (preco do haiku NAO confirmado; assumido US$1/M entrada, US$5/M saida, cache lido 0,1x, gravado 1,25x): ~US$1,4 por scan quick. O teto `--max-budget` NAO segurou: o prompt de sistema tem ~86k tokens por requisicao.
- Sem vazamento: grep da chave em strix_runs, scripts, docs e log = 0 ocorrencias.

## Pendencias / sugestoes
- Corrigir o erro de thinking: testar `STRIX_REASONING_EFFORT=low` (ou outro modelo, ex. sonnet) antes de depender do scan.
- Conferir custo real no painel de uso da Anthropic.
- Script corrigido para rodar da raiz (saida em `./strix_runs/<run>`); a primeira execucao gerou `strix_runs/strix_runs/` aninhado (ignorado pelo git).

## Comando final
```
export LLM_API_KEY="$MEU_APP_CLAUDE_KEY"   # so no ambiente
STRIX_MAX_BUDGET_USD=0.50 STRIX_MAX_TURNS=25 scripts/security/strix-scan.sh http://host.docker.internal:3999 [pasta_codigo]
```
