# Testes SQL do FARO

- Local (sem tocar o remoto): `bash tests/sql/run-local.sh` — sobe um Postgres temporário, aplica um stub do `auth`, todas as migrações em ordem e `rls.test.sql`. Termina com `RLS/RPC OK`.
- Cobre: faro_save_state (inserção, replay idempotente, conflito, schema != 2, não-objeto, > 512 KB), escrita direta bloqueada, isolamento entre usuários, assinatura sem escrita do cliente, `anon` sem acesso.
- Remoto (manual, só leitura): `get_advisors` security/performance no projeto; depois de aplicar a migração, repetir `rls.test.sql` num branch do Supabase (nunca em produção).
- Edge Functions: Deno não roda offline aqui; `tests/backend-edge-contract.test.mjs` trava as defesas no código-fonte.
