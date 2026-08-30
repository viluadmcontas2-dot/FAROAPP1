# AGENTS.md — FARO_FINANCE_V1

1. **REMOTE_FIRST = ALWAYS.** O repositório remoto `viluadmcontas2-dot/FAROAPP1` é a única verdade durável de engenharia.
2. Boot técnico obrigatório: `AGENTS.md` → `PROJECT.md` → `STATUS.md` → WorkUnit ativa → GitHub Issue → branch → PR → evidence.
3. Uma WorkUnit material = uma Issue = uma branch = um PR = uma trilha de evidência. Não criar branches de auditoria/genealogias paralelas.
4. Continue sempre de `next_unproven_item`; não reinicie trabalho já provado sem evidência nova que o invalide.
5. Linear está aposentado como execution writer. Notion/Linear são somente contexto e histórico; nunca sobrepõem o repo remoto.
6. BRASKO, Vercel, Supabase, Stripe, Remote Desktop, chats e runtimes são superfícies de controle/execução/evidência, nunca fonte canônica.
7. Escrita de source: preferir GitHub remoto/API. Escrita material só é `DURABLE` após read-after-write do commit/ref remoto.
8. Testes: cheapest valid proof first. Remote Desktop/local executa o SHA remoto exato quando disponível; resultado local é candidate evidence até ser registrado no repo.
9. **ACTIONS_LAST = TRUE.** Workflows pesados são manuais/seletivos; mudanças documentais e writes comuns não devem disparar CI pesado.
10. Evidence before `PROVEN`. `BUILT`, `CONFIGURED`, `INFERRED`, `LOCAL_PASS` e `PROVEN` são estados diferentes.
11. Não inventar comportamento de provider, evidência física, valores financeiros, sucesso de deploy ou equivalência visual.
12. Hosting canônico alvo: **Vercel**. Netlify está aposentado como rota futura de release; recursos históricos ficam isolados e não são reutilizados.
13. Supabase dedicado do FARO Financeiro e Stripe são preservados; billing permanece fail-closed enquanto o E2E real não passar.
14. Branches só podem ser apagadas após prova remota de redundância/ancestralidade ou após conteúdo único ter sido absorvido.
15. Um agente limpo deve conseguir retomar o FARO apenas pelo GitHub remoto. Se não conseguir, o handoff está incompleto.

Detalhes: `governance/constitution.md`, `governance/authority-map.md`, `governance/branch-policy.md`, `governance/verification-policy.md`, `governance/hosting-policy.md`.
