# Stripe: cupons do dono (R$ 0) e PRAGAS (R$ 14,97)

Conta de teste `acct_1UAESjLsq19Xe9NB` (modo de teste, nada em modo real). Criados em 22/10/2026 a pedido do dono.

| Código | Cupom | Efeito | Travas |
|--------|-------|--------|--------|
| `FARODONO` | `faro-dono-zero` | 100% de desconto, para sempre (R$ 0 para o dono testar) | máximo 5 usos, vale até 21/11/2026, só primeira compra |
| `PRAGAS` | `faro-pragas-1497` | R$ 8,02 de desconto por 5 meses: 22,99 − 8,02 = **R$ 14,97** | só primeira compra, sem limite de usos e sem validade (decisão do dono pendente) |
| `RATAO` | `VPBhfe03` | R$ 8,00 por 5 meses = R$ 14,99 | sem travas (ver `stripe-cupom-e-preco.md`) |

## O que mudou no PRAGAS
Já existia um `PRAGAS` antigo (R$ 14,90, desconto de R$ 8,09, 0 usos). Valor de cupom não se edita no Stripe e a ferramenta conectada não desativa código promocional. Apaguei o cupom antigo `PRAGAS` (0 usos, sem assinatura afetada) e criei o código `PRAGAS` novo apontando para `faro-pragas-1497`.

## Decisões minhas (o dono não definiu) — ajustáveis
- Duração do PRAGAS: 5 meses, igual ao RATAO. Se o dono quiser "para sempre" ou outro prazo, cria-se outro cupom.
- FARODONO: 5 usos e 30 dias, porque cupom de R$ 0 sem trava é um buraco.
- PRAGAS sem limite de usos e sem data: é o cupom público. Recomendo travar (ex.: 100 usos).

## Não provado
Nenhum checkout foi feito com esses códigos (os segredos do Stripe ainda não estão no Supabase). Modo real (live) não foi tocado.
