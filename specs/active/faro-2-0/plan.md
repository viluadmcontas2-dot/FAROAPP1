# Faro 2.0 — app novo, plano

Objetivo: trocar TODA a interface antiga (app.js + 25 camadas faro-*.js + Tailwind) pela interface do design
"Driver Finance App Prototype" e ligá-la ao backend existente (Supabase auth/sync/assinatura + Stripe), hospedado na Cloudflare.

## Decisões
- Design vira app real: `design/template.body.html` + `design/logic.dc.js` (fonte do design, só leitura) -> compilados
  em build para React puro (SEM runtime dc, SEM eval/new Function) -> CSP estrita.
- Estado novo `schema_version = 2` (mesma tabela `faro_state`). Dados v1 não migram (sem usuários reais) — v1 é ignorado.
- Datas reais (ISO `YYYY-MM-DD`); o design usava dia-do-mês fixo (TODAY=21) só para mock.
- Design não tem tela de Conta (login, sync, assinatura): criar no mesmo padrão visual (gap do design).
- Supabase JS empacotado no bundle (sem CDN). Fontes/ícones locais (sem Google Fonts em runtime).

## Layout
- `src/core/`   puro, sem DOM: dinheiro, datas, estado v2, cálculo (calc/occ/num/agg/sep), testes node:test.
- `src/data/`   store (localStorage + assinatura), backend (auth, sync, billing, push devices).
- `src/ui/`     view compilada + cola React + tela Conta.
- `tools/compile-template.mjs` template -> `src/ui/view.gen.js`.
- build: esbuild -> `_site/` (PWA: sw.js, manifest, ícones), servido pela Cloudflare (`wrangler.jsonc`).

## Fases
1. Fundação (feita): compilador e build, núcleo e armazenamento, cliente do servidor e endurecimento do banco.
2. Integração (feita): telas ligadas aos dados e à nuvem; PWA e service worker. Falta só a tela Conta completa.
3. Poda (feita): app antigo, testes obsoletos e governança antiga removidos.
4. Segurança (feita): testes de ataque nossos e 2 varreduras Strix.
5. Abertura (em andamento): prévia na Cloudflare, Stripe ponta a ponta, textos legais, depois abrir. O beta já nasce pago (decisão 0006); a cobrança liga só com a lista de pré-requisitos pronta. Estado real em `STATUS.md`.
