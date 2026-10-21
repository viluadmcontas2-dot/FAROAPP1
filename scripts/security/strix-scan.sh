#!/usr/bin/env bash
# Uso: scripts/security/strix-scan.sh <URL_ALVO> [PASTA_CODIGO]
# Env opcionais: STRIX_LLM (padrao anthropic/claude-haiku-5-5), STRIX_MAX_TURNS (40),
#   STRIX_MAX_BUDGET_USD (1), STRIX_MODE (quick), LLM_API_BASE.
# Chave: LLM_API_KEY (ou ANTHROPIC_API_KEY) vem do AMBIENTE; nunca grave em arquivo.
set -euo pipefail
URL="${1:?informe a URL alvo}"; CODE="${2:-}"
export STRIX_LLM="${STRIX_LLM:-anthropic/claude-haiku-5-5}"
export LLM_API_KEY="${LLM_API_KEY:-${ANTHROPIC_API_KEY:-}}"
[ -n "$LLM_API_KEY" ] || { echo "ERRO: defina LLM_API_KEY (ou ANTHROPIC_API_KEY) no ambiente." >&2; exit 2; }
[ -n "${LLM_API_BASE:-}" ] && export LLM_API_BASE
command -v docker >/dev/null || { echo "ERRO: docker ausente" >&2; exit 2; }
docker info >/dev/null 2>&1 || { (dockerd >/tmp/dockerd.log 2>&1 &); sleep 8; docker info >/dev/null 2>&1 || { echo "ERRO: daemon docker nao sobe" >&2; exit 2; }; }
command -v strix >/dev/null || uv tool install strix-agent || pip install strix-agent
# Imagem fica no ghcr.io (Docker Hub da 429 aqui). Idempotente: so baixa se faltar.
IMG=ghcr.io/usestrix/strix-sandbox:1.3.0
docker image inspect "$IMG" >/dev/null 2>&1 || docker pull "$IMG"
ARGS=(-n -m "${STRIX_MODE:-quick}" --max-turns "${STRIX_MAX_TURNS:-40}" --max-budget "${STRIX_MAX_BUDGET_USD:-1}" -t "$URL")
[ -n "$CODE" ] && ARGS+=(-t "$(cd "$CODE" && pwd)")
exec strix "${ARGS[@]}"
