# Faro 2.0 — produto e arquitetura

## Produto
App do motorista de aplicativo. Responde: "quanto sobrou de verdade?" (lucro real = ganhos − combustível − custos − contas do mês), com metas, reservas e histórico.
- Instalado na tela inicial; fora disso, só explica a instalação (ADR 0005).
- Teste grátis de 7 dias; depois R$ 22,99/mês (Stripe). Cupom `RATAO`: R$ 14,99 nos 5 primeiros meses.
- Cobrança está **desligada** (`billingEnabled=false`) até as condições em `governance/constitution.md`.

## Arquitetura
```
design/ (template + logic do design original, só leitura)
   │  tools/compile-template.mjs        (em build; sem eval, sem runtime dc)
   ▼
src/ui/view.gen.js ──► React (src/ui) ──► esbuild ──► _site/ (PWA: sw.js, manifest, _headers)
                          │                                   │
              src/core (puro, sem DOM)                Cloudflare Workers Static Assets
              dinheiro, datas, estado v2, cálculo     (preview = produção, mesmo build)
                          │
              src/data  store (local) · sync · backend · acesso
                          │
              Supabase (auth, tabela faro_state, RPC faro_save_state, RLS, Edge Functions) + Stripe
```
- `src/core`: funções puras e testáveis; nada de DOM, relógio ou rede.
- `src/data`: persistência local, sincronização com revisão atômica e conflito exposto, cliente do backend.
- `src/pwa`: service worker, cabeçalhos HTTP (fonte única `headers.mjs`), registro.
- `supabase/functions`: `criar-checkout-faro`, `abrir-portal-faro`, `stripe-webhook-faro` (idempotente).

## Mapa de pastas
| Pasta | Conteúdo |
|-------|----------|
| `design/` | referência do design original (o teste de paridade usa `design/logic.dc.js`) |
| `src/core`, `src/data`, `src/ui`, `src/pwa` | o app |
| `supabase/` | migrations e Edge Functions |
| `tools/`, `scripts/` | compilador do design, build, ícones, cabeçalhos, `security/strix-scan.sh` |
| `public/`, `assets/` | manifest, ícones, fontes e logos copiados para o build |
| `tests/` | testes (`app-*`, `core-*`, `backend-*`, governança); `tests/sql` roda contra Postgres local |
| `governance/`, `docs/decisions/` | regras e decisões |
| `docs/evidence/faro-2-0/` | provas (Stripe, Strix, mesas de revisão) |
| `specs/active/faro-2-0/` | plano e tarefas |

## Decisões
Ver `docs/decisions/`: estado v2 sem migração · interface compilada sem eval · dia vira às 04:00 · Cloudflare com preview igual à produção · só funciona instalado · beta pago desde o primeiro dia. Também: CSP estrita (`script-src 'self'`). Varredura de segurança: `scripts/security/strix-scan.sh` (custo cerca de US$ 1,4 por scan).
