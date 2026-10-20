# FARO — Plano único de lançamento (4 dias)

Fonte única do plano. Painel ao vivo: ver link no STATUS.md. Atualizado a cada fase.
Linha canônica: branch `claude/pwa-driver-production-fm0kk9` (contém WU-004 poda + WU-002B correção + WU-002 docs).

## Princípios
- Algoritmo complexo, app simples. 1 número herói + 1 ação por tela.
- Dinheiro e cobrança: RED→GREEN, prova antes de dizer "feito". `billingEnabled=false` até E2E passar.
- Segredos nunca em Git/chat. Só o dono instala segredos no painel dos provedores.
- Prova em aparelho real é do dono; fica UNKNOWN até existir.

## Dia 1 — Cobrança segura (o que bloqueia vender)
- [x] Decisão do dono (2026-10-20): custo zero de infraestrutura (planos grátis) e preço abaixo de R$19,90/mês.
- [ ] Hospedagem: Cloudflare Pages grátis (Vercel Hobby proíbe uso comercial). Supabase Free + despertador semanal + backup periódico; migrar p/ Pro quando houver assinantes.
- [ ] Dono: criar novo preço no Stripe (sandbox) para R$19,90 e revisar cupom RATAO (19,90−8,00=11,90).
- [ ] Dono: instalar 4 segredos no Supabase + criar Portal de Cobrança (guia passo a passo será entregue).
- [ ] Código: paywall no servidor (`faro_has_access()` nas policies de escrita).
- [ ] Código: webhook lê `items.data[0].current_period_end`; guarda contra evento velho; 1 assinatura por usuário; idempotency key no customer.
- [ ] Código: trial 7 dias no servidor + tabela "trial usado" que sobrevive à exclusão de conta; limite de tamanho do estado.
- [ ] Testes de função sem token = 401; `stripe trigger` no sandbox.

## Dia 2 — Base PWA e legibilidade
- [ ] Ícones PNG (maskable 512, 192, apple-touch 180) + screenshots no manifest.
- [ ] Fonte mínima 12px, alvos 48px, contraste AA, modo carro.
- [ ] Tailwind/Chart.js/FontAwesome/fontes locais (offline na 1ª abertura); build minificado.
- [ ] Escape central de HTML, CSP, headers de cache; remover VETTA/document.write do shell.
- [ ] Consolidar `saveDay`/`exportData` em um único contrato.

## Dia 3 — Marca, retenção e confiança
- [ ] Voz e identidade "Pragas na Pista" (copy, nome de conquistas, tela de boas-vindas por convite).
- [ ] Onboarding em 3 perguntas; fechar o turno em ~20s.
- [ ] Gamificação na medida: sequência com 1 folga/semana, meta com ritmo, conquistas ligadas a dinheiro real (reserva IPVA, mês no azul). Sem ranking/confete.
- [ ] Tela de planos + trial + cupom RATAO; termos, privacidade, excluir conta (LGPD); tutorial de instalação no iPhone.

## Dia 4 — Qualidade e lançamento
- [ ] Playwright 320/390/768, axe, Lighthouse; orçamento de desempenho.
- [ ] E2E Stripe sandbox (checkout, webhook, portal, RATAO) e regressão.
- [ ] Dono: teste em iPhone e Android reais (2 dias de uso).
- [ ] Preview Vercel manual; só então `billingEnabled=true` e deploy de produção (gate manual).

## Fora do escopo (decidido)
APK/Play Billing, ranking público, comparativo da cidade (v2), Pix recorrente (exige outro gateway; avaliar depois), rastreio de km em segundo plano.

## Governança enxuta
Manter: hashes de núcleo financeiro, fail-closed do billing, deploy manual, branch de arquivo intocada. Dispensar para o resto: recibo por sondagem e estados BUILT/LOCAL_PASS em tudo que não for dinheiro.
