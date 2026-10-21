# Verificação

- Durante a edição: só o teste do que mudou.
- Ao fechar um bloco: `npm run check` (todos os testes) e `npm run build`.
- Banco: `tests/sql/run-local.sh` contra Postgres local.
- Segurança: `scripts/security/strix-scan.sh` (custo cerca de US$ 1,4 por scan; só com autorização do dono).
- A CI repete `check` e `build` em cada pull request, apenas verifica e nunca publica.
- Estados de prova: escrito, testado local, provado em preview, provado em produção. Não afirme o estado seguinte sem evidência.
