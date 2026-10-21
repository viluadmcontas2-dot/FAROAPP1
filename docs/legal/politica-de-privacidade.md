# Política de Privacidade do Faro

> RASCUNHO. Não publicar nem cobrar antes de um advogado revisar (veja `LEIA-ME.md`).
> Última atualização: [CONFIRMAR COM O DONO: data de publicação]

Esta política explica, em palavras simples, o que o Faro guarda sobre você, para quê, e como você apaga tudo. Segue a LGPD (Lei 13.709/2018).

**Controlador (quem decide sobre os dados):** [CONFIRMAR COM O DONO: nome ou razão social, CPF/CNPJ].
**Encarregado (DPO):** [CONFIRMAR COM O DONO: nome] — [CONFIRMAR COM O DONO: e-mail].

## 1. Quais dados e para quê

| Dado | Para quê | Base legal (LGPD) |
|---|---|---|
| E-mail | Criar e proteger sua conta, entrar no app, falar com você sobre a assinatura | Execução do contrato (art. 7, V) |
| Dados financeiros que você digita (ganhos, km, contas, metas) | Calcular o seu lucro e guardar a cópia na nuvem | Execução do contrato (art. 7, V) |
| Perfil (nome de exibição, cidade, região, escolha de receber avisos) | Personalizar o app e os avisos | Execução do contrato; consentimento para avisos (art. 7, I) |
| Identificador do aparelho e dados de notificação | Sincronizar sem conflito entre aparelhos e enviar avisos, se você ligar | Execução do contrato; consentimento para avisos |
| Dados da assinatura (situação, data de renovação, códigos do Stripe) | Liberar o acesso e cobrar | Execução do contrato |
| Marca irreversível do seu e-mail (resumo criptográfico, "hash") e data do teste | Garantir que o teste de 7 dias valha uma vez por pessoa | Legítimo interesse (art. 7, IX), prevenção a fraude |
| Registros técnicos de segurança (ex.: limites de uso) | Proteger o serviço contra abuso | Legítimo interesse; segurança |

- **Cartão:** o pagamento fica só no Stripe. O Faro não vê nem guarda o número do cartão.
- **O Faro não vende seus dados** e não usa seus números financeiros para publicidade.
- **Você pode usar o app sem enviar dados à nuvem?** O app funciona offline com dados no aparelho, mas o acesso exige a assinatura e, por isso, a conta. [CONFIRMAR COM O DONO: descrever com precisão quando os dados vão à nuvem.]

## 2. Com quem compartilhamos
Só com empresas que fazem o serviço funcionar (operadores):
- **Supabase**: conta (login por e-mail) e banco de dados na nuvem. [CONFIRMAR COM O DONO: região do projeto Supabase.]
- **Stripe**: cobrança e pagamento. Recebe seu e-mail e os dados do cartão que você digita na página do Stripe.
- **Cloudflare**: hospeda e entrega o aplicativo; pode registrar dados técnicos de acesso (como IP).

Algumas dessas empresas ficam fora do Brasil, então seus dados podem ser tratados no exterior, com as garantias previstas na LGPD (art. 33). Também podemos informar dados se uma autoridade exigir por lei.

## 3. Por quanto tempo guardamos
- Enquanto sua conta existir, guardamos os dados para o app funcionar.
- Quando você exclui a conta, apagamos na hora: o acesso, o perfil, os dados financeiros na nuvem, os aparelhos e avisos cadastrados e a assinatura no Faro. A assinatura ativa é cancelada no Stripe antes disso.
- O que pode continuar depois da exclusão:
  - A marca irreversível do e-mail do teste (hash), para o teste não ser repetido. [CONFIRMAR COM O DONO: por quanto tempo manter, ou se aceita apagar a pedido.]
  - O histórico de pagamentos no Stripe, que ele e nós podemos precisar manter por obrigação legal e fiscal. [CONFIRMAR COM O DONO: prazo e se o cadastro do cliente no Stripe será apagado manualmente a pedido; a exclusão automática do app cancela a assinatura, mas não remove o cliente no Stripe.]
  - Cópias de segurança dos provedores, por um tempo curto. [CONFIRMAR COM O DONO: prazo do backup no Supabase.]
- O que está só no seu aparelho (dados offline) fica com você. Para apagar, desinstale o app ou limpe os dados dele.

## 4. Seus direitos
Você pode pedir, a qualquer momento e de graça:
- confirmar que tratamos seus dados e ter acesso a eles;
- corrigir dados errados;
- apagar seus dados (você mesmo faz no app, veja abaixo);
- levar seus dados a outro serviço (portabilidade);
- saber com quem compartilhamos;
- retirar um consentimento (por exemplo, desligar os avisos);
- reclamar à ANPD (Autoridade Nacional de Proteção de Dados).

Peça pelo contato do encarregado, no topo. Respondemos em até [CONFIRMAR COM O DONO: prazo; a LGPD pede resposta em prazo curto, sugerimos 15 dias].

## 5. Como excluir sua conta
No app: Perfil > "Excluir minha conta". Você digita EXCLUIR para confirmar. [CONFIRMAR COM O DONO: caminho exato da tela de exclusão no app.]
O que acontece, nesta ordem:
1. A conta é marcada como "em exclusão" e novos pagamentos são bloqueados.
2. Pagamentos (checkout) abertos e pendentes são encerrados e a assinatura é cancelada no Stripe.
3. Só então a conta e os dados ligados a ela são apagados.

Se o Stripe falhar no passo 2, **a conta é mantida** e você vê um erro para tentar de novo. Assim ninguém fica sem conta e ainda cobrado. A exclusão não tem volta.

## 6. Segurança
Os dados trafegam em conexão protegida. O acesso ao banco é restrito por regras que deixam cada pessoa ver só os próprios dados. Nenhum sistema é 100% seguro. Se houver um incidente que possa causar dano a você, avisaremos você e a ANPD, como a lei manda.

## 7. Crianças
O Faro é para maiores de 18 anos.

## 8. Mudanças nesta política
Se mudar algo importante, avisamos no app e por e-mail antes de valer.
