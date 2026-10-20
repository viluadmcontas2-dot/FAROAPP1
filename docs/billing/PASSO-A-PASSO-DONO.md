# Passo a passo do dono — ligar a cobrança no modo teste

Tudo aqui é no **modo teste** (sandbox). Nenhum dinheiro de verdade.
Leva uns 20 minutos. Faça na ordem.

> Regra de ouro: **nunca** cole chave secreta em chat, print ou arquivo. Só dentro do Supabase.

---

## 1. Criar o cupom PRAGAS no Stripe

1. Entre em dashboard.stripe.com.
   *Print: no topo, um botão laranja escrito "Modo de teste" / "Sandbox". Ele precisa estar ligado.*
2. Menu da esquerda: **Catálogo de produtos** → aba **Cupons** → botão **+ Criar cupom**.
3. Preencha:
   - Tipo: **Desconto de valor fixo**
   - Valor: **8,09** · Moeda: **BRL**
   - Duração: **Vários meses** → **5**
   - Nome: **PRAGAS**
   *Print: formulário com "R$ 8,09", "Vários meses", "5".*
4. Mais abaixo, ligue **Usar códigos promocionais** e digite o código **PRAGAS**.
5. Clique **Criar cupom**.

Resultado: R$ 22,99 − R$ 8,09 = **R$ 14,90** nos 5 primeiros meses.

## 2. Criar o Portal de Cobrança

É a tela onde o cliente cancela ou troca o cartão sozinho.

1. Engrenagem (canto superior direito) → **Configurações** → **Billing** → **Portal do cliente**.
2. Ligue: **Cancelar assinaturas**, **Atualizar forma de pagamento**, **Ver faturas**.
3. Clique **Salvar** (ou **Ativar link de teste**).
   *Print: lista de chaves liga/desliga, todas verdes nas 3 opções.*

## 3. Criar o webhook (aviso do Stripe para o FARO)

1. Menu **Desenvolvedores** → **Webhooks** → **+ Adicionar destino**.
2. Endereço:
   `https://mjbyqhreptllilkggiri.supabase.co/functions/v1/stripe-webhook-faro`
3. Marque estes eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.dispute.created`
4. Salve. Na tela do webhook, clique **Revelar** em "Segredo de assinatura".
   Copie (começa com `whsec_`). Ele vai no passo 4, e só lá.
   *Print: página do webhook com o botão "Revelar".*

## 4. Colocar os 4 segredos no Supabase

1. Entre em supabase.com → projeto **mjbyqhreptllilkggiri**.
2. Menu **Edge Functions** → **Secrets** (Segredos).
   *Print: tabela "Name / Value" com botão "Add new secret".*
3. Adicione um por um (nome exatamente assim):

| Nome | De onde vem |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Desenvolvedores → Chaves de API → chave secreta de teste |
| `STRIPE_WEBHOOK_SECRET` | o segredo copiado no passo 3 |
| `STRIPE_FARO_MONTHLY_PRICE_ID` | Stripe → Catálogo → produto FARO → preço R$ 22,99 → ID (começa com `price_`) |
| `FARO_APP_URL` | o endereço do app (ex.: o link do site do FARO) |

4. Clique **Save**.

### Interruptor da cobrança: `FARO_BILLING_ENABLED`

É a trava do servidor. Sem ela, os botões **Assinar** e **Gerenciar assinatura** respondem "Cobrança ainda não aberta"
(mesmo que alguém force o app). **No beta, NÃO crie essa variável.** Só no dia de abrir a venda (ou para o teste com
cartão do passo 5), adicione o segredo `FARO_BILLING_ENABLED` com o valor `true`. Para fechar de novo, apague-o.

## 5. Testar com cartão de teste

1. Avise o Claude: "segredos instalados". Ele aplica a migration e liga o botão só no ambiente de teste.
2. No app, toque **Assinar FARO**.
3. Na tela do Stripe, use:
   - Cartão: **4242 4242 4242 4242**
   - Validade: qualquer data futura (ex.: 12/34)
   - CVC: qualquer 3 números · CEP: qualquer
   - Código promocional: **PRAGAS**
   *Print: total "R$ 14,90 hoje".*
4. Pague. O app deve mostrar **Assinatura ativa**.
5. Toque **Gerenciar assinatura**: deve abrir o Portal do passo 2.

Deu errado? Mande print da tela (sem chaves) para o Claude.

---

**Antes de vender de verdade** (não agora): repetir os passos no modo real e ligar a trava do servidor
(`enforce_paywall`) junto com o botão de assinar. O Claude faz essa parte.
