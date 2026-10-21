# 0003 — O dia de trabalho vira às 04:00
**Decisão:** um lançamento feito entre 00:00 e 03:59 conta no dia anterior.
**Por quê:** o motorista que roda de madrugada ainda está no mesmo turno; virar à meia-noite quebraria o lucro do dia.
**Consequência:** `src/core/dates.js` é a única fonte da regra; a virada do mês segue o mesmo corte; testes em `tests/core-dates-money.test.mjs`.
