# Authority Map — FARO

## Sole durable authority

`viluadmcontas2-dot/FAROAPP1` remoto é a única verdade durável.

Boot:
`AGENTS.md → PROJECT.md → STATUS.md → specs/active/<WU>/workunit.json → Issue → branch → PR → evidence`.

## Repository owns

- WorkUnit ativa e `next_unproven_item`;
- source, specs, acceptance, ADRs e non-goals;
- branch/PR lineage;
- testes, evidence e release status;
- contratos de hosting/backend/billing necessários para retomada.

## External surfaces

- **GitHub Issues/PRs:** execution ledger.
- **Remote Desktop:** executor local do SHA remoto exato; não é autoridade.
- **Vercel:** hosting/runtime/evidence; não é autoridade.
- **Supabase:** backend/runtime/evidence; não é autoridade.
- **Stripe:** billing provider/evidence; não é autoridade.
- **Notion:** estratégia/histórico contextual somente.
- **Linear:** histórico legado somente; execution writer aposentado.
- **BRASKO/chat:** coordenação somente.

## Supersession

Este mapa substitui qualquer regra anterior que faça Notion ou Linear autoridade operacional do FARO.
