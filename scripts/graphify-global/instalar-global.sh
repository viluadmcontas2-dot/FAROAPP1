#!/usr/bin/env bash
# Instalação autocontida: funciona também com curl | bash.
if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'Erro ao instalar Graphify: python3 não está disponível.'
  exit 0
fi
python3 - "${GRAPHIFY_GATE_HOME:-$HOME}" <<'PY_INSTALADOR'
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

GANCHO = '#!/usr/bin/env bash\n# Garante o uso do mapa do código (Graphify) sem travar o trabalho.\n#  PreToolUse  (Grep|Glob): MODO ESTRITO. Sem consulta ao mapa nos últimos 20 min, barra sempre, com a instrução.\n#     Não há como ficar preso: a consulta é um comando Bash, que este gancho nunca bloqueia.\n#     Saída de emergência: criar o arquivo graphify-out/.sem-trava.\n#  PostToolUse (Bash, arg "mark"): se o comando foi graphify query/path/explain, libera por 20 min.\n# Sem graphify no PATH ou sem mapa construído, nunca barra. Qualquer erro aqui sai em silêncio (exit 0): o gancho nunca derruba a sessão.\n# Registro de uso: graphify-out/uso.log (uma linha por consulta e por lembrete), para medir quanto o mapa é usado.\ncommand -v graphify >/dev/null 2>&1 || exit 0\nmodo="${1:-pre}"\nraiz="${CLAUDE_PROJECT_DIR:-$PWD}"\nsaida="$raiz/graphify-out"\nmarca="$saida/.consultado"\njanela=1200\nentrada=$(cat 2>/dev/null) || exit 0\n[ -f "$saida/graph.json" ] || exit 0\n[ -f "$saida/.sem-trava" ] && exit 0\nprintf \'%s\' "$entrada" | python3 -c \'import json,sys; json.loads(sys.stdin.read())\' 2>/dev/null || exit 0  # entrada quebrada: silêncio\n\ncampo() { python3 -c \'import json,sys\ntry:\n    d=json.loads(sys.stdin.read()); print(d.get("tool_input",{}).get(sys.argv[1],"") or "")\nexcept Exception:\n    pass\' "$1" <<<"$entrada" 2>/dev/null; }\nregistra() { printf \'%s %s\\n\' "$(date \'+%Y-%m-%d %H:%M:%S\')" "$1" >> "$saida/uso.log" 2>/dev/null; }\n\nif [ "$modo" = "mark" ]; then\n  cmd=$(campo command)\n  if printf \'%s\' "$cmd" | grep -Eq \'(^|[;&| ])graphify +(query|path|explain)( |$)\'; then\n    touch "$marca" 2>/dev/null; registra "consulta"\n  fi\n  exit 0\nfi\n\nif [ -f "$marca" ]; then\n  idade=$(( $(date +%s) - $(stat -c %Y "$marca" 2>/dev/null || echo 0) ))\n  [ "$idade" -lt "$janela" ] && exit 0\nfi\nregistra "lembrete"\npython3 - <<\'PY\'\nimport json\nprint(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",\n  "permissionDecisionReason": "Antes de varrer arquivos, consulte o mapa do código (economiza tokens): graphify query \\"sua pergunta em português\\" (ou graphify explain \\"nome\\"). Depois repita esta busca, que será liberada por 20 minutos. O mapa guia, o código é a prova."}}))\nPY\nexit 0\n'

def gravar(caminho, conteudo, modo):
    temporario = None
    try:
        with tempfile.NamedTemporaryFile(dir=caminho.parent, delete=False) as f:
            temporario = Path(f.name)
            f.write(conteudo)
        temporario.chmod(modo)
        if caminho.name == "settings.json":
            json.loads(temporario.read_text())
        os.replace(temporario, caminho)  # rename atômico, equivalente a mv
    finally:
        if temporario is not None:
            temporario.unlink(missing_ok=True)

try:
    pasta = Path(sys.argv[1]) / ".claude"
    pasta.mkdir(parents=True, exist_ok=True)
    settings = pasta / "settings.json"
    backup = pasta / "settings.json.bak-graphify"
    if settings.exists() and not backup.exists():
        shutil.copy2(settings, backup)
    try:
        dados = json.loads(settings.read_text()) if settings.exists() else {}
        if not isinstance(dados, dict):
            raise ValueError("a raiz deve ser um objeto")
        hooks = dados.setdefault("hooks", {})
        if not isinstance(hooks, dict):
            raise ValueError("hooks deve ser um objeto")
        mudou = not settings.exists()
        for evento, matcher, sufixo in [
            ("PreToolUse", "Grep|Glob", ""),
            ("PostToolUse", "Bash", " mark"),
        ]:
            comando = 'bash "$HOME/.claude/hooks/graphify-gate.sh"' + sufixo
            entradas = hooks.setdefault(evento, [])
            if not isinstance(entradas, list):
                raise ValueError(evento + " deve ser uma lista")
            if not any(h.get("command") == comando
                       for entrada in entradas for h in entrada.get("hooks", [])):
                entradas.append({"matcher": matcher, "hooks": [
                    {"type": "command", "command": comando}
                ]})
                mudou = True
        conteudo = (json.dumps(dados, ensure_ascii=False, indent=2) + "\n").encode()
        json.loads(conteudo)
    except (ValueError, TypeError, AttributeError) as erro:
        raise ValueError("JSON inválido ou estrutura incompatível: " + str(erro)) from erro

    destino = pasta / "hooks" / "graphify-gate.sh"
    destino.parent.mkdir(parents=True, exist_ok=True)
    bytes_gancho = GANCHO.encode()
    mudou_gancho = not destino.exists() or destino.read_bytes() != bytes_gancho or destino.stat().st_mode & 0o111 != 0o111
    if mudou_gancho:
        gravar(destino, bytes_gancho, 0o755)
    if mudou:
        gravar(settings, conteudo, settings.stat().st_mode & 0o777 if settings.exists() else 0o600)
    print("Graphify: gancho global instalado e configurações mescladas." if mudou or mudou_gancho else "Graphify: já instalado.")
except Exception as erro:
    print("Erro ao instalar Graphify: " + " ".join(str(erro).splitlines()), file=sys.stderr)
PY_INSTALADOR
resultado=$?
if [ "$resultado" -ne 0 ]; then
  printf '%s\n' 'Erro ao instalar Graphify: não foi possível executar o instalador.'
fi
exit 0
