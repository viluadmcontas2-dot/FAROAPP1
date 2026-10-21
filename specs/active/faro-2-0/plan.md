# FARO-WU-004 — Nova interface + backend ligado (plano)

Objetivo: trocar TODA a interface antiga (app.js + 25 camadas faro-*.js + Tailwind) pela interface do design
"Driver Finance App Prototype" e ligá-la ao backend existente (Supabase auth/sync/assinatura + Stripe).

## Decisões
- Design vira app real: `design/template.body.html` + `design/logic.dc.js` (fonte do design, só leitura) -> compilados
  em build para React puro (SEM runtime dc, SEM eval/new Function) -> CSP estrita.
- Estado novo `schema_version = 2` (mesma tabela `faro_state`). Dados v1 não migram (billing off, sem usuários reais) — v1 é ignorado.
- Datas reais (ISO `YYYY-MM-DD`); o design usava dia-do-mês fixo (TODAY=21) só para mock.
- Design não tem tela de Conta (login, sync, assinatura): criar no mesmo padrão visual (gap do design).
- Supabase JS empacotado no bundle (sem CDN). Fontes/ícones locais (sem Google Fonts em runtime).

## Layout
- `src/core/`   puro, sem DOM: dinheiro, datas, estado v2, cálculo (calc/occ/num/agg/sep), testes node:test.
- `src/data/`   store (localStorage + assinatura), backend (auth, sync, billing, push devices).
- `src/ui/`     view compilada + cola React + tela Conta.
- `tools/compile-template.mjs` template -> `src/ui/view.gen.js`.
- build: esbuild -> `_site/` (PWA: sw.js, manifest, ícones).

## Fases
1. Paralelo: A compilador+build+assets | B core+store | C backend client + endurecimento SQL/Edge.
2. Integração: ligar store/backend ao componente; tela Conta; PWA/SW.
3. Poda (ponytail): remover legado, testes obsoletos, governança de build.
4. Segurança: Strix (se viável) + testes de ataque próprios + advisors Supabase.
5. Verificação completa + PR.
