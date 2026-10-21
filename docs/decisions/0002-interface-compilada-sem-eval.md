# 0002 — Interface compilada, sem eval
**Decisão:** o design (`design/`) é compilado em build por `tools/compile-template.mjs` para React puro. Sem runtime dc, sem `eval`/`new Function`.
**Por quê:** permite CSP estrita (`script-src 'self'`), reduz superfície de ataque e mantém o visual do design.
**Consequência:** `src/ui/view.gen.js` é gerado (o build regenera); `design/logic.dc.js` fica só como referência e para o teste de paridade.
