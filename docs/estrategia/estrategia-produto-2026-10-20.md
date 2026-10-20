# FARO Financeiro: estratégia de produto (CEO/Head de Produto)

Data: 2026-10-20. Base: PLANO.md, docs/auditorias/*.md, docs/decisoes/*.md, mockups v3 aprovados + pesquisa na web.
Legenda: **[FONTE]** = link lido · **[FONTE FRACA]** = blog/terceiro/vendedor · **[SUPOSIÇÃO]** = palpite meu, sem prova; validar com dados.

---

## 1. Posicionamento e promessa

**Promessa em 1 frase:** "O FARO mostra quanto você lucrou de verdade hoje, depois do combustível, do desgaste e das contas do carro, em 20 segundos no fim do turno."

Para quem: motorista de Uber, 99 e inDrive em Salvador que roda todo dia, olha só o "bruto" do app e não sabe se está pagando para trabalhar.
Contra quem: o caderninho, a planilha, o Mobills (genérico, não entende km e carro) e o GigU (decide corrida a corrida, mas não fecha o mês).

**3 pilares**
1. **Lucro real, não faturamento.** Um número herói: lucro de hoje e lucro por hora, com custo do km do SEU carro. Tudo o mais fica em "Detalhes".
2. **Rápido no carro.** Fechar o dia em ~20 s, modo carro com botões grandes, funciona sem internet. Nada de ler tela da Uber (é o que evita o risco jurídico que o GigU sofreu).
3. **Da pista, para a pista.** Marca e voz do Pragas na Pista: o mascote, as palavras do motorista, conquistas que valem dinheiro (IPVA guardado, mês no azul), nunca pontos vazios.

Por que isso se sustenta: o IBGE contou cerca de 824 mil motoristas de app no Brasil em 2024, com renda média de R$ 2.766 e 45,9 h por semana; renda por hora é menor que a de quem não usa plataforma [FONTE: https://borainvestir.b3.com.br/noticias/17-milhao-de-brasileiros-ja-trabalham-por-meio-de-aplicativos-e-tem-renda-maior-que-a-media/ e https://mercadoeconsumo.com.br/17/10/2025/economia/numero-de-trabalhadores-por-aplicativo-cresce-25-e-chega-a-17-milhao/]. A dor "trabalho muito e não sei se sobra" é real e mensurável.

---

## 2. Estudo de referências (copiar / não copiar / versão FARO)

**GigU (BR)** – semáforo que diz se a corrida compensa. Cerca de R$ 950 mil/mês de receita em jun/2025, saiu da comissão para assinatura direta [FONTE: https://startupi.com.br/gigu-atinge-breakeven-receita-mensal-de-2-milhoes/]. Preço ~R$ 12,90/mês [FONTE FRACA, via auditoria de mercado]. Uber processou em 2023 (então StopClub) alegando captura de dados do app; a Justiça deixou funcionar [FONTE FRACA: https://www.businessinsider.nl/an-app-that-says-it-can-help-uber-drivers-pick-profitable-rides-has-arrived-in-the-us-uber-has-fought-against-it-before].
- Copiar: a ideia de "seu mínimo por km". Prova que motorista BR paga assinatura.
- Não copiar: ler a tela da Uber/99 (sobreposição, acessibilidade). Risco jurídico e de conta bloqueada; PWA nem consegue.
- Versão FARO: "Corrida mínima": o FARO calcula, com o custo do seu carro, o valor mínimo por km e por minuto. O motorista decide sozinho. Zero leitura de tela.

**Gridwise (EUA)** – grátis + Premium ~US$ 9,99/mês ou US$ 107,99/ano (preços divergentes entre fontes) [FONTE: https://gridwise.io/blog/gridwise-vs-everlance-vs-stride]. Reclamação típica: rastreio automático impreciso.
- Copiar: "lucro por hora" como métrica-mãe; plano anual com desconto forte (~10% abaixo de 12 mensalidades).
- Não copiar: prometer rastreio automático de km (iOS PWA não roda em segundo plano).
- Versão FARO: km pelo odômetro no fim do turno, com conferência simples ("hoje: 180 km?").

**Stride (EUA)** – 100% grátis, foco em imposto/milhagem [FONTE FRACA: https://www.everlance.com/alternatives/gridwise].
- Copiar: linguagem de "dinheiro que você deixa de perder".
- Não copiar: modelo grátis bancado por parceiros/seguros (sem escala em Salvador).
- Versão FARO: "Reserva do leão/MEI/INSS" só como reserva, sem prometer consultoria fiscal.

**Everlance (EUA)** – ~US$ 8-12/mês, ~US$ 60-90/ano; grátis limitado a 30 viagens/mês [FONTE FRACA: mesma página acima].
- Copiar: relatório mensal pronto para provar renda.
- Não copiar: plano grátis limitado por contagem (gera atrito e suporte).
- Versão FARO: "Comprovante do mês" em PDF (para alugar casa, financiar carro). Recurso pago, que puxa renovação mensal.

**Mobills (BR)** – finanças pessoais genéricas; anual ~R$ 159,90 em 2024 [FONTE FRACA: blog Mobills 2024, https://www.mobills.com.br/?p=121834].
- Copiar: categorias claras e o hábito de "anotar e ver".
- Não copiar: dezenas de categorias, contas, cartões. Carga cognitiva alta para quem está no carro.
- Versão FARO: 3 campos por app (Uber, 99, inDrive) + km + combustível. Fim.

**Nubank** – confiança, roxo forte, "caixinhas" com objetivo.
- Copiar: linguagem humana, transparência ("nada é cobrado sozinho"), reservas com nome.
- Não copiar: parecer banco (o FARO não guarda dinheiro; prometer isso confunde e vira risco regulatório).
- Versão FARO: "Reservas" nomeadas (IPVA, pneus, férias, MEI) com barra "em dia/atrasada". O dinheiro fica onde o motorista quiser.

**Revolut** – painel de gastos rico, muitas funções.
- Copiar: gráfico semanal limpo; notificação útil e instantânea.
- Não copiar: o "superapp". Cada aba nova dilui o número herói.
- Versão FARO: uma tela de Histórico com a semana em barras; o resto em "Detalhes".

**Cash App** – marca forte, atitude, $cashtag compartilhável.
- Copiar: identidade ousada e simples (preto + âmbar + mascote), tom de rua.
- Não copiar: P2P/pagamentos (outro negócio, regulado).
- Versão FARO: o mascote e a frase "Corrida boa é a que sobra" em tudo que sai do app (imagem do resumo, convite).

**Duolingo (sequência)** – quem chega a 7 dias de sequência tem 2,4x mais chance de voltar no dia seguinte (correlação) [FONTE: https://blog.duolingo.com/how-duolingo-streak-builds-habit]. Permitir 2 "protetores" aumentou ativos diários em +0,38% [FONTE: https://blog.duolingo.com/improving-the-streak].
- Copiar: sequência com proteção ("folga") e marco dos 7 dias.
- Não copiar: culpa, mascote chorando, notificação insistente, ligas/ranking. Motorista cansado no fim do turno não precisa de chantagem.
- Versão FARO: "Semana no controle": 5 de 7 dias registrados conta como semana completa (folga embutida, porque motorista folga). Marco: "4 semanas no controle".

**Strava (comunidade)** – crescimento muito ligado a compartilhar atividades e grupos (números da empresa, sem medição isolada do efeito do cartão) [FONTE FRACA: https://www.bikeradar.com/news/strava-year-in-sport-2021/].
- Copiar: cartão bonito para compartilhar e o "clube".
- Não copiar: feed social, curtidas, ranking público (expõe renda, gera inveja e risco LGPD).
- Versão FARO: "Resumo da semana" em imagem SEM valores em R$ (só % da meta, dias no controle, "lucro/hora subiu 12%") + "Clube Pragas" agregado no futuro.

---

## 3. North Star e 5 métricas (meta para a 1ª coorte de 100)

**North Star: "Motoristas no controle por semana"** = usuários que registraram 3 ou mais dias na semana. Mede o hábito que gera o valor (saber o lucro). Receita vem depois disso.

Metas [SUPOSIÇÃO: comunidade engajada, sem histórico próprio; revisar após 30 dias]:
1. **Ativação em 24 h** (registrou o 1º dia até 24 h após criar conta): meta 60%. Abaixo de 40% = onboarding ou instalação está travando.
2. **Retenção D7** (registrou algo no dia 7 ±1) ≥ 45%; **D30** ≥ 30%. Duolingo diz que os 7 primeiros dias são os mais frágeis [FONTE: https://blog.duolingo.com/how-duolingo-streak-builds-habit].
3. **Dias registrados por semana** (mediana dos ativos): ≥ 4.
4. **Conversão teste → pago**: meta 25% sem cartão (seed da comunidade). Referência externa: teste "com escolha" converte ~18% e teste "cobra se não cancelar" ~49% [FONTE FRACA: https://apppricinglab.com/playbook/free-trial-conversion]; teste mais longo converte mais [FONTE: https://www.revenuecat.com/blog/growth/free-trial-length.md].
5. **Churn mensal pago**: ≤ 8% nos meses 1-5. Vigiar o mês 6 (fim do cupom).

Conta de bolso: 100 contas × 25% = 25 pagantes × R$ 14,90 ≈ R$ 372/mês bruto, menos ~6,4% Stripe. Paga custos atuais (zero) e quase um Supabase Pro (~US$ 25). Ponto de equilíbrio com infra paga: ~14-20 assinantes (auditoria de mercado).

**Pré-requisito que hoje NÃO existe:** medir. Não há telemetria (auditoria de produto, item 10). Sugestão custo zero e simples para LGPD: uma tabela `faro_events` no próprio Supabase (evento, data, id do usuário), sem ferramenta de terceiros. 6 eventos bastam: conta_criada, dia_registrado, app_instalado, teste_terminou, assinou, cancelou.

---

## 4. Loops de retenção e crescimento

**Loop 1 – Hábito (retenção):** fim do turno → lembrete → registra em 20 s → vê o lucro real → sequência/semana no controle sobe → amanhã de novo.
- Lembrete na hora que o próprio motorista escolhe ("termino umas 22h"). Push só funciona no iPhone com o app instalado (iOS 16.4+) [FONTE FRACA, ver auditoria]. iOS é ~25% dos celulares no Brasil (StatCounter, ago/2026) [FONTE: https://gs.statcounter.com/os-market-share/mobile/brazil/2025]; motorista de app provavelmente usa mais Android [SUPOSIÇÃO]. Reserva: selo no ícone e cartão dentro do app.
- Regra: 1 lembrete por dia, nunca depois de registrado, nunca na folga marcada.

**Loop 2 – Convite Pragas na Pista (aquisição):** admin do grupo posta vídeo de 60 s → link com código PRAGAS → boas-vindas com a marca do grupo → teste de 7 dias → resultado no grupo ("semana no controle") → novos entram.
- Código curto digitável (PRAGAS), porque no iPhone o Safari e o app instalado não dividem dados (auditoria de fluxos, J1).

**Loop 3 – Indique um parceiro:** quem indica e quem entra ganham 1 mês grátis quando o indicado pagar a 1ª mensalidade (não no cadastro: evita fraude).
- Teto: 6 meses grátis por pessoa. Código pessoal = apelido (ex.: MARCOS10), fácil de falar no ponto de espera.
- Via Stripe: crédito na fatura (customer balance) ou cupom de 100% "once" [SUPOSIÇÃO técnica: conferir no Stripe antes].

**Loop 4 – Resumo semanal compartilhável:** domingo à noite, imagem 1080×1920 com mascote: "Semana no controle: 6 de 7 dias · 92% da meta · lucro/hora +12%" + "faro.app/pragas". Nunca mostrar R$ (segurança e vergonha/inveja). Botão "Compartilhar no WhatsApp" (Web Share API). Opção "esconder até os %".

**Loop 5 – Mensal (retenção do pagante):** dia 1 do mês, "Comprovante do mês" + "Mês no azul?" → motivo concreto para não cancelar.

---

## 5. Precificação

**Comparativo (mensal):** GigU ~R$ 12,90 [FONTE FRACA] · Mobills ~R$ 13/mês no anual (2024) [FONTE FRACA] · Gridwise ~US$ 9,99 (~R$ 55) · Everlance ~US$ 8-12 · Stride grátis.
Leitura: R$ 22,99 está ~78% acima do GigU. O GigU entrega valor a cada corrida; o FARO entrega no fim do dia. Para cobrar mais, o FARO precisa mostrar dinheiro achado logo na 1ª semana ("você estava aceitando corrida que pagava R$ 0,90/km com custo de R$ 0,78/km").

**Recomendação de preço**
1. **Manter R$ 22,99/mês como preço de tabela** (âncora).
2. **Anual: R$ 179/ano (= R$ 14,92/mês, ~35% off).** Para o motorista, "pague 1 vez e esqueça" resolve o problema de não ter Pix recorrente na Stripe BR (auditoria de mercado). Parcelamento de cartão na Stripe BR parece NÃO existir [FONTE FRACA: https://community.shopify.com/t/utilizar-a-stripe-para-pagamentos-recorrentes/368562]; então anual é cobrança única: limite do cartão pode ser barreira [SUPOSIÇÃO]. Testar como 2ª opção, não principal.
3. **Plano "Fundador Pragas" (troca o cupom de 5 meses):** R$ 14,90/mês **travado enquanto a assinatura estiver ativa**, só para os primeiros 100 a 150 pagantes, até data fixa (ex.: 30 dias após o lançamento).
   - Por quê: o cupom de 5 meses cria um "degrau" de +54% no mês 6. Degrau de preço é gatilho clássico de cancelamento [SUPOSIÇÃO baseada em prática de mercado]. Com 100 usuários, a receita perdida é pequena (~R$ 800/mês no máximo) e a lealdade e o boca a boca valem mais.
   - No Stripe: cupom `duration=forever`, `max_redemptions=150`, `redeem_by=<data>`. Já é revisável sem código (decisões/cobranca.md, item 2).
   - Escassez honesta: "Vagas de fundador: 63 de 150".
4. **Direito de arrependimento:** compra online tem 7 dias para desistir (CDC art. 49) [FONTE: https://www.peticoesonline.com.br/art-49-cdc]. Se renovação automática abre novo prazo ainda é disputado [FONTE FRACA]. Política simples: "Se cobrou e você não quis, devolvemos em até 7 dias, sem perguntas." Custa pouco e gera confiança.

**Teste sem cartão x com cartão (o ponto que o dono ainda vai decidir)**
- Sem cartão. Prós: mais cadastros; confiança (motorista desconfia de "grátis" que pede cartão); muitos usam débito ou cartão com pouco limite [SUPOSIÇÃO]. Contras: conversão menor (~18% como referência fraca) e precisa de "modo leitura" no app para converter.
- Com cartão. Prós: conversão alta (~49% como referência fraca), receita previsível, o cartão ajuda contra abuso. Contras: menos gente começa; risco de reclamação "cobraram sem eu querer" (Reclame Aqui) num público que conversa muito entre si.
- **Recomendação: sem cartão para TODOS nos primeiros 100 (um caminho só).** Os 100 vêm do grupo (público de confiança). Aprender é mais importante que maximizar receita agora. Dois caminhos (convidado sem cartão, público geral com cartão), como propõe a auditoria de fluxos, dobram o código de cobrança, os testes e as telas, sem público geral para justificar. Reabrir a decisão quando houver aquisição fora do grupo. O servidor já dá teste sem cartão no cadastro (gatilho existente), então é o caminho mais barato.
- Para converter sem cartão: aviso no dia 6, tela única no dia 8 ("Assinar com PRAGAS" / "Agora não") e modo leitura com exportação (auditoria de fluxos, seção 3).

---

## 6. Riscos de negócio e legais

1. **Disputa com Uber/99 (alto impacto, baixa probabilidade se seguir as regras).** O GigU/StopClub foi processado por suposta captura de dados do app da Uber [FONTE FRACA: link Business Insider acima]. A Uber desativa contas por uso de app de terceiro que altera GPS/tarifa [FONTE FRACA: https://diariodepernambuco.com.br/dpmais/uber-desativa-conta-de-todos-motoristas-do-aplicativo-e-proibe-circulacao-caso-eles-cometam-essas-violacoes/].
   Mitigação: nunca ler tela, sobrepor app, usar acessibilidade ou login da Uber. Nunca usar logo/ícone das plataformas (só o nome em texto). Termos do FARO: "não é afiliado a Uber, 99 ou inDrive".
2. **LGPD.** O FARO guarda renda e e-mail. Renda não é "dado sensível" na lei, mas é dado delicado.
   Mitigação: política de privacidade curta; excluir conta e dados no app (já planejado); exportar dados; nada de localização na v1. Pequenas empresas e startups têm regras simplificadas (Resolução CD/ANPD 2/2022), exceto em tratamento de alto risco [FONTE: https://www.migalhas.com.br/depeso/362499/resolucao-cd-anpd-2-22-analise-baseada-em-risco-e-alcance-da-norma]. "Melhor horário/região" com localização em larga escala pode virar alto risco: só com consentimento separado, agregado e com mínimo de 10 motoristas por célula [SUPOSIÇÃO de limite].
   Conferir: região do servidor Supabase (se fora do Brasil, é transferência internacional; citar na política) [NÃO VERIFICADO].
3. **"Não é consultoria financeira".** Os números são estimativas a partir do que o motorista digita. Texto fixo em Termos + uma linha em "Detalhes". Não recomendar investimento, empréstimo ou produto financeiro. O FARO não guarda dinheiro (não parecer banco).
4. **Cobrar sem backup (custo zero).** Supabase Free não tem backup e pausa após inatividade [FONTE: https://supabase.com/pricing]. Perder o histórico de um pagante é dano real e passivo.
   Mitigação custo zero: exportação automática diária (pg_dump por GitHub Actions ou Cloudflare, grátis) [SUPOSIÇÃO técnica]. Migrar para Pro (~US$ 25) ao chegar a ~20 pagantes.
5. **Fiscal.** Stripe BR exige CNPJ. MEI pode vender assinatura de software? Depende do CNAE; NFS-e e ISS se aplicam. Confirmar com contador ANTES de ligar a cobrança.
6. **Dependência de um único canal (Pragas na Pista).** Se o admin do grupo sair ou brigar, a aquisição para.
   Mitigação: acordo simples por escrito (ex.: 20% da receita dos assinantes com código PRAGAS por 12 meses) [SUPOSIÇÃO de valor]; a marca do FARO deve ficar de pé sozinha.
7. **Regulação dos motoristas (PLP 12/2024).** Tramitação travada desde 2025; status atual não confirmado [FONTE FRACA: https://www.gazetasp.com.br/?p=79455]. Se aprovado, pode criar contribuição ao INSS: vira oportunidade ("reserva do INSS").
8. **Play Store (se virar APK).** O Google aceita cobrança alternativa no Brasil [FONTE: https://support.google.com/googleplay/answer/11174377], mas as regras e taxas para assinatura via TWA não foram verificadas. Antes de publicar, ler a política de Pagamentos do Play. Pode haver taxa sobre a venda.

---

## 7. Plano "primeiros 100 usuários" em 30 dias

Funil necessário [SUPOSIÇÃO]: ~350 cliques no link → ~200 abrem → ~140 instalam → ~100 criam conta → ~60 ativam em 24 h → ~25 pagam.

**Semana 0 (antes de abrir): beta fechado com 10 motoristas**
- Escolhidos com o admin do grupo: 7 Android + 3 iPhone.
- Usar 5 dias reais. Passar 15 min com cada um (WhatsApp de vídeo) vendo-os instalar e registrar. Corrigir só o que travar.
- Critério para abrir: 8 de 10 registraram 3+ dias; zero perda de dado; cobrança E2E provada no sandbox.

**Semana 1: lançamento no grupo**
- Vídeo de 60 s do admin no carro: "Quanto sobrou hoje? Eu achei que era R$ 250, era R$ 140."
- Link + código PRAGAS. Vagas de fundador visíveis.
- Meta: 50 contas.

**Semana 2: "Desafio 7 dias no controle"**
- Quem fecha 5 de 7 dias ganha o selo Fundador + entra no sorteio de uma troca de óleo (prêmio físico barato, local) [SUPOSIÇÃO: conferir regras de promoção/sorteio comercial].
- Postagens diárias no grupo com o resumo-imagem (sem valores).
- Meta: 80 contas, D7 ≥ 45%.

**Semana 3: indicação**
- Liga o "Indique um parceiro". Depoimentos de 3 fundadores (com permissão).
- Meta: 100 contas.

**Semana 4: medir e decidir**
- 10 entrevistas de 10 min com quem assinou e quem não assinou.
- Painel dos 6 eventos. Decisão: preço, teste, próximo canal (outros grupos de Salvador, pontos de espera no aeroporto e na rodoviária).

O que o dono faz: relação com o admin, entrevistas, testes no celular real. O que o produto precisa ter: instalação sem portão, registro em 20 s, lembrete, resumo-imagem, tela de Plano, eventos.

---

## 8. Backlog de 10 ideias com identidade (esforço × impacto)

Ordem = prioridade. Esforço B/M/A = baixo/médio/alto.

1. **Custo real do km do seu carro** (combustível + manutenção + IPVA/seguro rateados). Esforço B · Impacto ALTO. É o coração do "lucro real"; parte já existe.
2. **Corrida mínima** ("abaixo de R$ X/km você paga para rodar"), calculada com o custo do km. Esforço B · Impacto ALTO. Entrega o valor do GigU sem o risco jurídico.
3. **Lembrete de fim de turno + fechar em 20 s.** Esforço M · Impacto ALTO. Hábito diário = North Star.
4. **Meta do IPVA** (e reservas nomeadas: pneus, óleo, MEI/INSS) com "em dia/atrasada". Esforço B · Impacto ALTO. Conquista com dinheiro real; dor sazonal forte (IPVA no começo do ano).
5. **Resumo semanal em imagem, sem R$.** Esforço M · Impacto ALTO (crescimento).
6. **Comprovante do mês em PDF** (renda para alugar e financiar). Esforço M · Impacto ALTO. Motivo para pagar todo mês.
7. **Álcool ou gasolina hoje?** (regra dos 70% com o preço que ele digita + consumo real do carro dele). Esforço B · Impacto MÉDIO. Uso extra diário, muito "da pista".
8. **Manutenção pelo km** ("troca de óleo em ~800 km"). Esforço B · Impacto MÉDIO.
9. **Semana no controle** (5/7 dias, folga embutida; selo de 4 semanas). Esforço B · Impacto MÉDIO.
10. **Melhor horário pessoal**, a partir dos turnos do próprio motorista (lucro/hora por faixa de horário, sem GPS) → v2: "Clube Pragas" agregado por bairro, com consentimento. Esforço M (pessoal) / A (comunidade) · Impacto ALTO. Risco LGPD no agregado.

Fora: ranking público, moedas/pontos, chat, feed social, rastreio de km por GPS.

---

## 9. Críticas duras ao plano atual

1. **Portão de instalação obrigatório antes de qualquer valor** (`INSTALL_GATE_ENFORCED = true`). É o maior assassino de ativação: no iPhone são ~5 toques fora do app antes de ver uma tela útil.
   Proposta: boas-vindas com promessa e cupom → no Android, onboarding no navegador e convite para instalar após o 1º dia salvo. No iPhone, instalar após a tela de boas-vindas, por causa dos dados separados.
2. **Dois caminhos de teste** (convidado sem cartão, público com cartão) para 100 pessoas que vêm todas do mesmo grupo é complexidade sem retorno. Um caminho só.
3. **Cupom de 5 meses = degrau de preço no mês 6.** Troque por preço de fundador travado.
4. **Plano de 4 dias com cobrança, PWA, marca, gamificação e qualidade** é otimista, e nada foi provado em celular real (STATUS/auditoria). Cobrança E2E + celular real + eventos são o caminho crítico; marca e conquistas podem ir na semana seguinte. Vender antes de medir é voar sem painel.
5. **"Custo zero" cobrando dinheiro, sem backup.** Economia errada: o barato aqui é um backup automático grátis já, e Pro com ~20 pagantes.
6. **Arquitetura de remendos.** `legacy-shell` imutável + `document.write` + ~23 módulos que embrulham `saveDay`/`render`. Cada recurso novo custa o dobro e quebra por ordem de carga (auditoria de produto).
   Não reescrever agora. Mas decidir: após os 100 primeiros, um "núcleo novo" para Início + Registrar. Sem isso, o APK e as melhorias de "quase nativo" vão emperrar.
7. **"Conquistas" como aba da barra inferior** (fatia F9) dá peso demais à gamificação. Opinião: conquistas cabem dentro do Início (sequência) e de Mais. A barra deveria ser Início, Registrar, Histórico, Mais.
8. **Push como peça central de retenção** é aposta frágil no iPhone (só instalado, relatos de falha). Selo no ícone + cartão no app + horário escolhido pelo motorista devem funcionar sem push.
9. **APK na Play "se bombar"** não é urgente: PWA instalada no Android já vira WebAPK. Play só traz descoberta e confiança, com custo de política de pagamento ainda não verificado.
10. **R$ 22,99 sem prova de valor na 1ª semana.** Se o motorista não vir "dinheiro achado" até o dia 6, não paga. O aviso do dia 6 deve mostrar uma descoberta ("você gastou R$ 0,81/km; 4 corridas pagaram menos que isso"), não só "seu teste acaba".

---

## Skills úteis encontradas (npx skills find; não instaladas)

Fonte confiável e mais de 1K instalações. O repositório coreyhaines31/marketingskills é o mais completo e consistente:
- `coreyhaines31/marketingskills@pricing-strategy` (61K) e `@pricing` (76K): preço, âncora, anual.
- `@paywalls` (68K) e `@paywall-upgrade-cro` (51K): tela de Plano e dia 8.
- `@onboarding` (71K) e `@signup-flow-cro` (52K): ativação em 24 h.
- `@referral-program` (52K) e `@referrals` (69K): indique um parceiro.
- `@churn-prevention` (118K): cancelamento e degrau de preço.
- `@community-marketing` (87K): Pragas na Pista.
- `@aso` (73K): só se/quando for para a Play.
- `@copywriting` (230K) e `@marketing-psychology` (161K): copy da boas-vindas e do aviso do dia 6.
- `emilkowalski/skills@mobile-native` (72K): já disponível nesta sessão.
- `alinaqi/maggy@pwa-development` (4K): PWA; fonte menos conhecida, avaliar antes.

LGPD: nenhuma skill passou de 1K instalações (a maior, `sushegaad/...@lgpd`, tem 354). Não recomendo; usar advogado ou modelo revisado.
Gamificação: `wondelai/skills@drive-motivation` (5K) é teórica; dispensável.

## Fontes principais
- IBGE via B3/Mercado&Consumo: https://borainvestir.b3.com.br/noticias/17-milhao-de-brasileiros-ja-trabalham-por-meio-de-aplicativos-e-tem-renda-maior-que-a-media/
- GigU: https://startupi.com.br/gigu-atinge-breakeven-receita-mensal-de-2-milhoes/ · https://www.businessinsider.nl/an-app-that-says-it-can-help-uber-drivers-pick-profitable-rides-has-arrived-in-the-us-uber-has-fought-against-it-before
- Gridwise/Everlance/Stride: https://gridwise.io/blog/gridwise-vs-everlance-vs-stride · https://www.everlance.com/alternatives/gridwise
- Duolingo: https://blog.duolingo.com/how-duolingo-streak-builds-habit · https://blog.duolingo.com/improving-the-streak
- Testes: https://www.revenuecat.com/blog/growth/free-trial-length.md · https://apppricinglab.com/playbook/free-trial-conversion
- CDC 49: https://www.peticoesonline.com.br/art-49-cdc
- ANPD pequeno porte: https://www.migalhas.com.br/depeso/362499/resolucao-cd-anpd-2-22-analise-baseada-em-risco-e-alcance-da-norma
- StatCounter BR: https://gs.statcounter.com/os-market-share/mobile/brazil/2025
- Google Play cobrança alternativa: https://support.google.com/googleplay/answer/11174377
- PLP 12/2024: https://www.gazetasp.com.br/?p=79455
- Supabase preços: https://supabase.com/pricing
