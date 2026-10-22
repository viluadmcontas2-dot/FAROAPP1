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

## Conferido em 21/10/2026 (só leitura, nada foi alterado no Stripe nem no Supabase)
- **Conta real não ativada:** `charges_enabled=false`, `details_submitted=false`, sem conta bancária e sem capabilities. Ativar antes de cobrar (só o dono). Isso responde o "não provado" acima.
- **ID do price com a letra O, não zero:** `price_1UTBP6L57ISnOgzhv6Uwz6hW`. A versão com zero devolve "No such price". Copiar e colar, não digitar.
- **Webhook real: nenhum.** O sandbox tem um ativo (`we_1UAFofLsq19Xe9NBk4gSh2tW`) para a mesma URL, com os mesmos 6 eventos: gera 500 hoje e vai gerar 400 depois da troca do segredo (a função confere um segredo só). Desativar.
- **Eventos:** o código trata 8, não 6. Assinar também `charge.dispute.created` (grava a contestação; a chave precisa de Charges: Read). `customer.subscription.trial_will_end` só vira log.
- **Chave restrita (mínimo, pelo código):** Checkout Sessions Write, Customers Write, Subscriptions Write, Customer portal Write, Charges Read, Prices Read; o resto None. Os rótulos exatos na tela do Stripe não foram conferidos; se der 502, o log do Workbench diz qual permissão falta.
- **Segredos lidos pelo código além dos 3:** `FARO_APP_URL` (https) e `FARO_BILLING_ENABLED` (exatamente `true`).
- **FARODONO:** 100% para sempre (`forever`), 5 usos, resgate até 21/11/2026 23:59:59 (BRT). O prazo só limita o resgate; quem usa fica grátis para sempre. Desativar o código depois do teste do dono.
- **Pix Automático:** não existe para conta domiciliada no Brasil (https://docs.stripe.com/payments/pix). Por isso o teste passou a ser sem cartão: `docs/decisions/0009-teste-sem-cartao.md`.
- **Logs:** o checkout e o webhook só registram o tipo do erro (`StripeInvalidRequestError`), sem `code` nem `param`; acrescentar `error.code` ajudaria a diagnosticar.
