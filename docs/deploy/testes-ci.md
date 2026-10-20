# Testes no CI: nada de "verde sem rodar"

Política do dono: GitHub Actions é manual; não há workflow automático neste repositório.
Quem rodar a suíte num CI (ou simular com `CI=true`) recebe FALHA, e não SKIP, quando falta infraestrutura:

- `tests/billing-sql-behavior.test.mjs`: precisa de Postgres local (`FARO_TEST_PGHOST` = host ou pasta do socket,
  `FARO_TEST_PGPORT`, opcional `FARO_TEST_PGUSER`). Roda cada `tests/sql/*.scenario.sql` num banco novo com o stub
  (`tests/sql/supabase-stub.sql`) e TODAS as migrations.
- Testes de navegador (`tests/*-browser.test.cjs`): `findChrome()` em `scripts/lib/faro-browser.cjs` lança erro com
  `CI=true` se não achar o Chrome (`FARO_CHROME_BIN` apontando para arquivo inexistente também conta como ausente).

Localmente (sem `CI=true`) os dois continuam fazendo SKIP com aviso.

Subir Postgres local descartável (Linux com postgresql-16):

```sh
D=/tmp/pgfaro; mkdir -p $D && chown postgres $D
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $D/data -U postgres -A trust && \
  /usr/lib/postgresql/16/bin/pg_ctl -D $D/data -o '-k $D -p 55432 -c listen_addresses=' -l $D/log start"
FARO_TEST_PGHOST=$D FARO_TEST_PGPORT=55432 node tests/billing-sql-behavior.test.mjs
```
