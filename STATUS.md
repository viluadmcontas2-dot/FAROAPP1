# FARO — HUMAN STATUS

## Authority

**REMOTE_FIRST = ALWAYS**  
**SOLE_DURABLE_PROJECT_TRUTH = GitHub remote**  
**LINEAR_EXECUTION_WRITER = RETIRED**  
**NOTION_ENGINEERING_AUTHORITY = NO**

## Onde estamos

Governance cutover ativo.

- WorkUnit ativa: `FARO-WU-001 — Repo-first cutover, lineage consolidation e limpeza`
- GitHub Issue: #13
- Branch: `wu/faro-wu-001-repo-first-cutover`
- Base funcional preservada: `3eb2b72283545a4a51aac5749ca102691ba294ec`
- PR legado #12: ainda aberto/draft; será aposentado/superseded após lineage reconciliation.
- Produto: N0–N5 historicamente concluídos; N6 software/provider behavior parcialmente provado; billing ainda fail-closed; N7 físico não provado.
- Hosting futuro: Vercel.
- Netlify: aposentado para novos releases.

## Estado comercial preservado

- Stripe test product: `prod_V7X491xOMU0wYI`.
- preço mensal: `price_1U7I0FGsvVKn86yrJ6wbfTG3` = R$ 22,99.
- cupom Ratão: `bYPTFkFb` = R$ 8,00 off por 5 meses.
- promotion code: `RATAO` / `promo_1U7IbeGsvVKn86yr6hSy2dHY`.
- provider proof histórico: R$ 14,99 calculado; pagamento aprovado; recusa; cancelamento.
- Supabase commercial Edge Functions instaladas e fail-closed sem secrets completos.
- `billingEnabled=false` permanece obrigatório até E2E app → Checkout → signed webhook → entitlement → Portal.

## next_unproven_item

`FARO-WU-001 / A1`: materializar e provar a governança repo-first/Spec Kit no remote; depois auditar a lineage e limpar branches com prova.

Após FARO-WU-001, criar `FARO-WU-002 — Vercel cutover + commercial completion`.
Depois, `FARO-WU-003 — Release/physical closure`.

## Não fazer agora

- não puxar estado de execução do Linear;
- não usar Notion como boot técnico;
- não apagar branch sem prova remota;
- não promover billing;
- não fazer deploy de produção;
- não alegar teste físico sem dispositivo real.
