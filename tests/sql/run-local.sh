#!/usr/bin/env bash
# Roda migrações + testes num Postgres temporário (precisa de postgresql instalado; usa usuário 'postgres' se for root).
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); D=$(mktemp -d); PORT=54999
chmod 777 "$D"; RUN() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
RUN "$BIN/initdb -D $D/data -A trust >/dev/null"
RUN "$BIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log -w start >/dev/null"
trap 'RUN "$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
P="psql -v ON_ERROR_STOP=1 -q -h $D -p $PORT -U postgres -d postgres"
RUN "$P -f tests/sql/stub-auth.sql"
for f in supabase/migrations/*.sql; do RUN "$P -f $f"; done
RUN "$P -f supabase/migrations/20261021000200_faro_acesso_e_trial.sql"  # reaplicar: idempotente
RUN "$P -f tests/sql/acesso-trial.test.sql"
RUN "$P -f tests/sql/rls.test.sql"
