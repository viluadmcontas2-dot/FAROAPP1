# 0001 — Estado v2, sem migração do app antigo
**Decisão:** o estado novo usa `schema_version = 2` na mesma tabela `faro_state`; dados do app antigo são ignorados, não migrados.
**Por quê:** cobrança sempre esteve desligada e não há usuários reais; migrar traria código legado para o app novo.
**Consequência:** o servidor só aceita salvar pela função `faro_save_state` (revisão atômica, até 512 KB, replay idempotente).
