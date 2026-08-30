# Verification Policy — FARO

## Ordem padrão

T0 — sintaxe/contratos rápidos no executor local do SHA remoto.  
T1 — testes afetados.  
T2 — suíte completa + build estático + built-artifact audit.  
T3 — GitHub Actions manual `Manual FARO Verify` somente quando prova remota é necessária.  
T4 — GitHub Actions manual `Manual FARO Release Verify` antes de merge/release.

## Regras

- `LOCAL_PASS` é candidate evidence; deve apontar para SHA remoto exato.
- Actions pesadas não rodam em todo push/PR.
- Docs-only não devem acionar build pesado.
- Não repetir full suite se não houve mudança relevante desde o SHA já provado, salvo gate de release.
- Workflows devem usar `workflow_dispatch`, concurrency cancelável e zero deploy implícito.
- Deploy é operação separada de verify.
