#!/usr/bin/env sh
set -eu

required_files='AGENTS.md PROJECT_STATE.md README.md docs/CONTRACT_TEMPLATE.md docs/WORKFLOW.md'

for file in $required_files; do
  test -s "$file" || { echo "Arquivo obrigatório ausente ou vazio: $file" >&2; exit 1; }
done

grep -q 'Trabalho por blocos de ação' AGENTS.md
grep -q 'Hierarquia de verdade' AGENTS.md
grep -q 'Uso obrigatório do Codex Engineering Guardrails' AGENTS.md
grep -q 'Níveis de trabalho' AGENTS.md
grep -q 'Uma mudança observável por vez' AGENTS.md
grep -q 'No máximo quatro branches remotas ativas' AGENTS.md
grep -q 'Evidência e checkpoint' AGENTS.md
grep -q 'Ainda não validado no celular' AGENTS.md
grep -q 'Repositório e publicação' PROJECT_STATE.md
grep -q 'Autorização' docs/CONTRACT_TEMPLATE.md

echo 'Governança VETTA: OK'
