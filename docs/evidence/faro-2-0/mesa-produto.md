# Mesa de produto: Faro 2.0 (do anúncio até pagar)

Data: 2026-10-21. Só leitura. Fontes: plano, sprint, textos da tela, derive.js, backend.js, função de checkout, capturas.

## Estado real (verificado no código)
- Existe: onboarding de 6 telas, fechamento do dia, Plano, Contas, Carro, Jornada, lembretes, backup local.
- Existe: checkout Stripe com 7 dias e cartão no início. O trial vem do banco e vale uma vez por pessoa. Cobrança desligada por padrão.
- Não existe: tela de instalação, assinatura na tela Conta, termos, privacidade, suporte, botão de excluir conta, eventos de métricas, aviso antes do fim do teste.
- Não achei no código o cupom RATAO nem o preço de R$ 22,99. O preço vem do Stripe (variável de ambiente). O checkout aceita qualquer código promocional do Stripe. Não conferi o RATAO no painel do Stripe.

## 1. Jornada e onde o usuário desiste
1. Anúncio e abertura. Desiste se não entende que precisa instalar. Fazer: tela de instalação com 2 passos com foto. No navegador comum, não deixar usar: só mostrar como instalar.
2. Onboarding (6 telas). Desiste pelo tamanho. Fazer: 3 perguntas (apps e carro, contas fixas, dias de pista). O resto em "Ajustar depois".
3. Primeiro dia fechado (aha). Fazer: 3 campos (ganho, km, horas). Gastos depois.
4. Conta (e-mail, senha, confirmar e-mail). Maior queda. Fazer: pedir só na hora de pagar.
5. 7 dias grátis com cartão. Desiste no cartão. Fazer: antes do checkout, escrever "R$ 0 hoje. Depois, R$ 22,99/mês. Cancele quando quiser."
6. Primeira semana. Desiste por esquecer de fechar o dia. Fazer: lembrete às 22h dentro do app. Push é bônus.
7. Dia 5 a 6. Hoje não há aviso. O Stripe avisa 3 dias antes do fim do teste (evento trial_will_end). Ligar isso.
8. Cobrança e cancelamento. Cancelar pelo portal do Stripe (função abrir-portal-faro já existe). Botão na tela Conta.

## 2. Momento aha e como encurtar
- Aha: fechar o primeiro dia e ver o lucro depois do carro e das contas. Na captura: bruto R$ 230, custos R$ 200, lucro R$ 30,50. É o que o motorista não sabe.
- Encurtar: abrir o fechamento logo depois do onboarding. Usar carro e contas já informados, sem perguntar de novo.
- Cuidado: na captura, o primeiro dia já aparece "R$ 357 abaixo da meta". Isso desanima. No primeiro dia, mostrar o número de hoje; a meta vira "para pagar tudo".
- Argumento de preço: R$ 22,99 por mês são R$ 0,77 por dia. Mostrar isso ao lado do lucro real.

## 3. O que a tela de instalação e o onboarding precisam dizer
- Instalação: "Instale o Faro na tela inicial. Ele abre como app e guarda seus dados."
- iPhone: "Toque em Compartilhar e depois em Adicionar à Tela de Início." Aviso: "Se você já usou pelo Safari, os dados ficam lá."
- Android: botão Instalar quando o navegador permitir; se não, o mesmo passo a passo.
- Onboarding: uma ideia por tela, falando do lucro, não de configuração.
- Anúncio: não prometer renda. Mostrar o app real.

## 4. Métricas mínimas (sem dado pessoal)
- Eventos, com nome, data, plataforma e etapa. Nunca nome, e-mail, valores, km ou placa: app_instalado, onboarding_passo_N, onboarding_concluido, primeiro_dia_fechado (só a marca), conta_criada, checkout_aberto, trial_iniciado, pagou_1a_cobranca, cancelou.
- Onde: tabela própria no Supabase, sem leitura pelo app, escrita só por função. Guardar 90 dias.
- O id do aparelho é pseudônimo. Pela LGPD, continua dado pessoal: dizer isso na política.
- Dinheiro: o Stripe é a fonte (teste para pago, cancelamento).
- Anúncio: utm no link, gravado no evento conta_criada.
- Não usar Google Analytics, pixel da Meta ou Hotjar: enviam dados a terceiros e pedem consentimento.

## 5. Para vender (em ordem de prioridade)
1. Termos de uso e política de privacidade (LGPD). Sem isso, não cobrar.
2. Excluir conta na tela Conta. O servidor já tem o caminho (deleting_at); falta o botão e o teste.
3. Suporte: e-mail visível e prazo de resposta. O Stripe exige contato e política de reembolso visíveis.
4. Assinatura na tela Conta: status, data do fim do teste, cancelar, reembolso.
5. Aviso antes da cobrança e texto claro no checkout.
6. Recibo: o Stripe envia por e-mail. Recibo não é nota fiscal; perguntar ao contador se precisa de NFS-e.
7. Cupom RATAO: conferir no Stripe e definir as regras.

## 6. Riscos de negócio no iPhone
- Instalar é o maior funil perdido: no iPhone, não existe botão automático.
- Dados do app instalado ficam separados dos do Safari. Quem usou no Safari antes perde o local. Conta e backup protegem.
- O link de confirmação do e-mail costuma abrir no Safari, e a sessão pode não chegar ao app instalado. Testar em iPhone real antes de anunciar.
- Notificação: só com app instalado, iOS 16.4 ou mais novo, e com permissão dada pelo usuário. Não prometer aviso no iPhone.
- O iOS pode apagar dados de site pouco usado que não está instalado. Instalado sofre menos.
- Sem loja: sem aprovação e sem 30% de comissão, mas sem vitrine. No Android, dá para publicar na Play Store.
- O que muda: a conta precisa vir cedo e o lembrete não pode depender de push.

## 7. Cinco decisões para o dono
1. Conta só no pagamento. Recomendo. O usuário começa sem e-mail, vê o lucro e cria a conta ao pagar. Risco: quem troca de celular sem backup perde dados. Mitigar com aviso e backup.
2. Hospedagem da prévia. Sua regra diz Cloudflare; o AGENTS.md e o sprint dizem Vercel. Recomendo Cloudflare, como você pediu, e atualizar os documentos antes de publicar.
3. Cupom RATAO. Recomendo: uso único por pessoa, validade, limite de usos e sem 100% de desconto (o teste de 7 dias já é o presente). Antes, confirmar no Stripe que ele existe e qual é o desconto.
4. Abrir a cobrança só depois de termos, privacidade, exclusão de conta, suporte e aviso de fim do teste. Recomendo, sem exceção. Hoje a cobrança está desligada; manter assim até lá.
5. Métricas só com eventos sem dado pessoal, 90 dias, sem ferramenta de terceiros. Recomendo. Assim dá para saber quanto vale um cadastro antes de gastar no anúncio.

PRÓXIMO PASSO: decidir as 5 e começar pela tela de instalação e pela exclusão de conta.
