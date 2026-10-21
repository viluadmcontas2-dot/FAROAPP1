#!/usr/bin/env bash
# Garante o uso do mapa do código (Graphify) sem travar o trabalho.
#  PreToolUse  (Grep|Glob): MODO ESTRITO. Sem consulta ao mapa nos últimos 20 min, barra sempre, com a instrução.
#     Não há como ficar preso: a consulta é um comando Bash, que este gancho nunca bloqueia.
#     Saída de emergência: criar o arquivo graphify-out/.sem-trava.
#  PostToolUse (Bash, arg "mark"): se o comando foi graphify query/path/explain, libera por 20 min.
# Sem mapa construído, nunca barra. Qualquer erro aqui sai em silêncio (exit 0): o gancho nunca derruba a sessão.
# Registro de uso: graphify-out/uso.log (uma linha por consulta e por lembrete), para medir quanto o mapa é usado.
modo="${1:-pre}"
raiz="${CLAUDE_PROJECT_DIR:-$PWD}"
saida="$raiz/graphify-out"
marca="$saida/.consultado"
janela=1200
entrada=$(cat 2>/dev/null) || exit 0
[ -f "$saida/graph.json" ] || exit 0
[ -f "$saida/.sem-trava" ] && exit 0
printf '%s' "$entrada" | python3 -c 'import json,sys; json.loads(sys.stdin.read())' 2>/dev/null || exit 0  # entrada quebrada: silêncio

campo() { python3 -c 'import json,sys
try:
    d=json.loads(sys.stdin.read()); print(d.get("tool_input",{}).get(sys.argv[1],"") or "")
except Exception:
    pass' "$1" <<<"$entrada" 2>/dev/null; }
registra() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$saida/uso.log" 2>/dev/null; }

if [ "$modo" = "mark" ]; then
  cmd=$(campo command)
  if printf '%s' "$cmd" | grep -Eq '(^|[;&| ])graphify +(query|path|explain)( |$)'; then
    touch "$marca" 2>/dev/null; registra "consulta"
  fi
  exit 0
fi

if [ -f "$marca" ]; then
  idade=$(( $(date +%s) - $(stat -c %Y "$marca" 2>/dev/null || echo 0) ))
  [ "$idade" -lt "$janela" ] && exit 0
fi
registra "lembrete"
python3 - <<'PY'
import json
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
  "permissionDecisionReason": "Antes de varrer arquivos, consulte o mapa do código (economiza tokens): graphify query \"sua pergunta em português\" (ou graphify explain \"nome\"). Depois repita esta busca, que será liberada por 20 minutos. O mapa guia, o código é a prova."}}))
PY
exit 0
