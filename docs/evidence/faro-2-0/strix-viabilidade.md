# Strix: viabilidade (2026-10-21)

Resultado: PARCIAL. Instalacao e imagem sandbox OK. Scan fim a fim NAO executado: falta chave LLM.

## Comprovado
- `uv tool install strix-agent` -> `strix 1.7.0` (PyPI `strix-agent`; installer curl nao foi executado).
- Docker 29.9.1 instalado, daemon parado; sobe com `dockerd &` (cgroup v1, ok).
- Docker Hub da 429 (rate limit) pelo proxy; `ghcr.io` funciona:
  `docker pull ghcr.io/usestrix/strix-sandbox:1.3.0` (1,44 GB comprimido, 5,9 GB em disco).
- CLI tem `--max-turns N`, `--max-budget USD`, `-m quick|standard|deep`, `-n` (nao interativo).

## Bloqueio (depende do dono)
- Ambiente tem `ANTHROPIC_BASE_URL=https://api.anthropic.com` e NAO tem `ANTHROPIC_API_KEY`.
- Teste de 1 token com x-api-key dummy: HTTP 401 `invalid x-api-key`. O proxy NAO autentica sozinho. Parei conforme instrucao.
- Existe a variavel `MEU_APP_CLAUDE_KEY` (nao usei: finalidade incerta, preciso de ok do dono).
- Nenhum gasto de API ate aqui (US$0).

## Configuracao
```
export STRIX_LLM=anthropic/claude-haiku-5-5
export LLM_API_KEY=<chave Anthropic>      # so no ambiente, nunca em arquivo
# LLM_API_BASE so se usar outra rota
scripts/security/strix-scan.sh http://localhost:3000 ./pasta-codigo
```
Teto padrao: 40 turnos, US$1, modo quick. Saida em `strix_runs/` (no .gitignore).

## Custo
Nao medido. Estimativa (nao comprovada): modo quick com Haiku, algumas dezenas de turnos: centavos a poucos dolares; o teto `--max-budget` limita.

## Proximo passo
Dono fornece chave Anthropic (ou autoriza usar MEU_APP_CLAUDE_KEY) -> rodar o scan de teste contra um servidor node local com XSS.
