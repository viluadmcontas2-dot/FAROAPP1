# Stripe em PRODUÇÃO (modo real): o que foi criado e o que falta (22/10/2026)

Decisão do dono: não testar em sandbox; ir direto para produção e testar com o cupom de R$ 0.

## Contas do Stripe (não confundir)
- **Produção (real):** `acct_1UAESZL57ISnOgzh`, "Brasko Agency", modo real (live). Esta é a conta de uso.
- Sandbox: `acct_1UAESjLsq19Xe9NB`. Fica só como histórico de testes.
- A chave `STRIPE_SECRET_KEY` que estava no Supabase era de TESTE da conta `acct_1UAESZL57ISnOgzh`, e por isso o checkout dava 502 (o preço de R$ 22,99 estava só na sandbox). Trocar pela chave REAL (sk_live ou rk_live).

## Criado na conta real (por API, sem cobrar nada)
| Item | Valor |
|------|-------|
| Produto | `prod_VU9iCYi4hYGNQz` "Faro - assinatura mensal" |
| Preço | `price_1UTBP6L57ISnOgzhv6Uwz6hW`, R$ 22,99 por mês, BRL |
| Cupom/código `FARODONO` | 100% de desconto, para sempre; máx. 5 usos; vale até 21/11/2026; só primeira compra |
| Cupom/código `PRAGAS` | R$ 8,02 por 5 meses = R$ 14,97; só primeira compra |
| Cupom/código `RATAO` | R$ 8,00 por 5 meses = R$ 14,99; só primeira compra |
| Portal do cliente | `bpc_1UTBPXL57ISnOgzh1KPg43pY` (cancelar no fim do período, trocar cartão, histórico) |

## Falta (só o dono, 3 valores no Supabase + 1 endpoint)
1. `STRIPE_SECRET_KEY` = chave secreta REAL da conta de produção.
2. `STRIPE_FARO_MONTHLY_PRICE_ID` = `price_1UTBP6L57ISnOgzhv6Uwz6hW`.
3. Endpoint de webhook REAL (Workbench > Webhooks > Add destination): URL `https://mjbyqhreptllilkggiri.supabase.co/functions/v1/stripe-webhook-faro`, eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. O segredo de assinatura dele vai em `STRIPE_WEBHOOK_SECRET`.

## Não provado
Checkout real com a página de pagamento, o webhook real, o aviso de fim do teste e a conta do Stripe aprovada para cobrar de verdade (o painel de teste mostrava o aviso "Verify your business"; confirmar se a conta real já está verificada).

## Prova em produção (22/10/2026, depois de o dono trocar os segredos)
- Endpoint de webhook REAL `we_1UTC6QL57ISnOgzhhztKS4yX` ativo, apontando para `.../functions/v1/stripe-webhook-faro` (inclui os 6 eventos que o servidor usa).
- Checkout com um usuário descartável: `criar-checkout-faro` respondeu **200** com `trialDays: 7` e uma página `checkout.stripe.com` em **modo real**.
- Sessão lida no Stripe real: modo assinatura, preço `price_1UTBP6L57ISnOgzhv6Uwz6hW` (R$ 22,99/mês), `allow_promotion_codes: true` (campo de cupom), cartão exigido (`payment_method_collection: always`), `success_url`/`cancel_url` no endereço do app, total hoje R$ 0 (7 dias de teste).
- Limpeza: `excluir-conta-faro` respondeu 200; a sessão ficou `expired`; o banco voltou a 0 usuários e 0 assinaturas. Sobrou 1 cliente vazio no Stripe real (`cus_VUATHZWw0VonAm`) que a ferramenta não apaga.

## Ainda NÃO provado
Pagar de verdade (cartão real, mesmo com o cupom `FARODONO` de R$ 0), a entrega do webhook real, e a conta do Stripe aprovada para cobrar. Isso exige o dono abrir o checkout e informar um cartão.
