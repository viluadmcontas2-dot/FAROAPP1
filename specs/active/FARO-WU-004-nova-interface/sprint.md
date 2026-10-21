# Sprint — FARO-WU-004 Nova interface + backend ligado

**Meta (1 frase):** o app roda só com a interface do design novo, ligada a login, sincronização e assinatura reais, sem código legado e com testes de ataque passando.
**Datas:** 2026-10-21 → 2026-10-22 | **Equipe:** dono + agentes (subagent-driven) | **Rastro:** 1 Issue por história, evidência em `docs/evidence/WU-004/`.
**Regra:** nenhuma história fecha sem teste RED→GREEN e linha de evidência. Mudança remota (migration/deploy/Stripe) só com ok do dono.

| ID | P | História | Dono | Depende | Evidência de pronto |
|----|---|----------|------|---------|---------------------|
| S1 | P0 | Compilar template do design em React puro (sem eval), build esbuild, fontes/ícones locais | Agente A | — | teste do compilador + bundle sem `eval/new Function` |
| S2 | P0 | Núcleo `src/core` (datas reais, estado v2, cálculo, ações) com paridade ao protótipo | Agente B | — | `node --test tests/core-*` |
| S3 | P0 | Store local + persistência + backup | Agente B | S2 | idem |
| S4 | P0 | Cliente backend: auth, sync com revisão/conflito, assinatura | Agente C | — | `node --test tests/backend-*` |
| S5 | P0 | Revisão de segurança servidor: RLS, grants, Edge Functions, migration `faro_save_state` | Agente C | — | achados + SQL de teste (aplicar = decisão do dono) |
| S6 | P0 | Integração: UI ligada ao store e ao backend (todas as telas do design) | integração | S1,S3,S4 | teste E2E Playwright fluxo onboarding→fechar dia→conta |
| S7 | P0 | Tela Conta (login, nuvem, assinatura, backup) no padrão visual do design | integração | S4,S6 | E2E + captura |
| S8 | P1 | PWA: manifest, service worker novo, CSP estrita, ícones | integração | S6 | auditoria do build |
| S9 | P1 | Poda: remover legado (app.js, 25 camadas faro-*.js, Tailwind, testes e build antigos) | poda | S6,S7,S8 | `git diff --stat` + build/check verdes |
| S10 | P1 | Segurança: ataque (XSS, import malicioso, RLS cruzada, webhook forjado, CSP, segredos) + advisors Supabase | segurança | S6,S9 | relatório `docs/evidence/WU-004/seguranca.md` |
| S11 | P1 | Strix (varredura com IA) — BLOQUEADO: exige chave de IA paga | dono | S10 | decisão do dono |
| S12 | P2 | Docs: STATUS.md, PROJECT.md, AGENTS.md, ADRs, verification-policy atualizados | integração | S9 | docs sem referência ao legado |

## Riscos
| Risco | Mitigação |
|-------|-----------|
| Design diverge do modelo de dados (dia fixo no mock) | S2 migra para datas ISO + teste de paridade |
| Perder dados v1 de testadores | decisão registrada: v1 ignorado (billing off); dono confirma |
| Migration remota quebrar produção | só arquivo no repo; aplicar com ok do dono |
| Billing ligado por engano | `billingEnabled=false` mantido, teste cobre |

## Definition of Done
- [ ] Teste do bloco verde (evidência colada na Issue)
- [ ] Sem referência a código legado
- [ ] Doc atualizada e Issue fechada com link do commit
