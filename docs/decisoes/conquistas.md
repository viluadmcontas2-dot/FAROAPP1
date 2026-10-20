# Conquistas na medida (2026-10-20)

- Sem aba nova: 1 linha no Início ("Próxima conquista: Reserva IPVA 78%") abre uma folha inferior com a lista.
- Só dinheiro real, tudo derivado do estado (registros, meta, reservas, sequência do Início via `FaroHome.streak`). Nada financeiro novo é salvo; no aparelho fica só `faro-achievements-seen-v1` (id -> data em que foi vista).
- Conquistas: Primeiro dia registrado, Mês no azul (mês FECHADO com lucro > 0), Meta batida (conta meses fechados), Reserva X 100% (cada reserva com objetivo; data = aporte que completou), Semana de 7 dias, Custo do km sob controle (7 dias recentes vs 30 anteriores, queda >= 5%; só aparece com >= 2 e >= 3 dias de dados).
- Meta dos meses passados usa a meta atual (não há histórico de meta no estado). Limitação conhecida.
- Celebração: aviso único "Conquista nova: X" (status/aria-live), selo âmbar, sem animação além de opacidade; respeita prefers-reduced-motion. Primeira abertura num aparelho com histórico entra em silêncio (sem festa por conquistas antigas).
- Vazio: "Registre 1 dia para destravar sua primeira conquista" (o pedido dizia 3 dias, mas "Primeiro dia registrado" destrava com 1; o texto precisa ser verdadeiro).
- Não usamos `FaroInteractions.showUndo` para celebrar: ele sempre mostra "Desfazer", que não faz sentido aqui.
- Sem compartilhamento (nunca valores em R$ em imagem).
