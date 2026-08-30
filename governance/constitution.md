# FARO Governance Constitution

1. O GitHub remoto designado é a única verdade durável de engenharia.
2. Repo-first significa remote-first, não local-first com sync posterior.
3. Estado local, chat, cache, worktree e dashboards externos são scratch/contexto.
4. Material write só é durável após remote write + remote read-after-write.
5. Uma WorkUnit material possui uma única lineage: Issue → branch → PR → evidence → merge.
6. `PROVEN` exige evidência atual e falsifier proporcional ao risco.
7. `BUILT` e `PROVEN` são estados diferentes.
8. Actions-last: teste local/cheap proof primeiro; Actions manuais somente quando acrescentam evidência necessária.
9. Linear é histórico somente e não pode reabrir autoridade de execução.
10. Notion pode guardar estratégia/histórico, mas decisão necessária para reconstruir engenharia deve existir no repo.
11. Provider dashboards não são fonte de verdade do projeto; registrar evidência relevante no repo.
12. Branch deletion é destrutiva e exige prova de redundância ou absorção explícita do conteúdo único.
13. Hosting pode mudar; a autoridade remota do repo não muda com o hosting.
14. Netlify é retired hosting. Vercel é o target atual, com produção manual/gated.
15. Falha com repair path é loop input, não handoff ao owner.
16. Nenhuma evidência física ou financeira pode ser inferida de teste sintético.
17. Um agente limpo deve conseguir reconstruir o estado atual a partir do repo remoto sozinho.
