# Mesa do motorista raiz (Faro 2.0)

Fonte: 13 capturas celular-*.png, template.body.html e derive.js. Só leitura.

## 1. O que ele entende em 5 segundos

**Entende:**
- Início com dia fechado: "Lucro líquido de hoje R$ 30,50".
- Lançar ganho: escolhe o app, digita o valor, "Salvar ganho".
- Contas: "Paguei" ao lado de cada conta.

**Não entende:**
- Início vazio: "Lucro líquido estimado R$ 0,00". Estimado de quê?
- Botão dourado central da barra (bandeira): não diz que é "Fechar dia".
- Plano: "1% da meta" e "Atrás · projeção R$ 305". Está bem ou mal? O que faço?
- Jornada: "Índice Faro · Atenção 10". Não sabe o que é nem como subir.
- Fechar dia, resumo: "Sugestão do Faro" soma R$ 202 (118 + 84), mas o bruto é R$ 230 e o lucro R$ 30,50. Ele não confere a conta.

## 2. Jargão e a palavra certa

- Bruto → "Quanto entrou" (Início Mês, Fechar dia)
- Custos → "Gastos" (Início Mês)
- Lucro líquido → "Lucro de verdade" (todas as telas)
- Índice Faro, Constância, Ritmo da meta, Lucro líquido por km → "Sua nota", "Dias fechados", "No ritmo da meta", "Lucro por km" (Jornada)
- Projeção → "No ritmo, você chega a" (Plano, Início Mês)
- Faturar, Meta bruta do mês → "Quanto precisa ganhar" (Carro > Ajustar)
- Rende 11,0 km/L → "Faz 11 km por litro" (Carro)
- Carro fixo → "Aluguel por km" (Carro)
- Lançar / Lançar ganho → "Anotar ganho" (Início, Ganho)
- Prévia do lucro líquido → "Lucro deste dia" (Fechar dia 2)
- Farejar meu lucro → "Ver meu lucro de verdade" (Onboarding)
- Pronto · já recalculei tudo → "Pronto, meta atualizada" (Ajustar carro)
- XP, nível → cortar ou "pontos" (toasts, Jornada)

## 3. Toques, botões e texto

- Fechar dia leva 3 telas e 5 toques, mais digitação. Os avanços dizem "Continuar", "Fechar o dia" e "Concluir" (Fechar dia 1, 2 e resumo).
- Botão "Paguei" tem texto de 11 px e parece ter ~30 px de altura (Contas). Pequeno para o dedo e para o sol.
- Textos de 10 e 11 px são comuns no template (27 e 12 usos): nomes da barra de baixo, legendas do carro, "Paguei".
- Toast verde ("Dia fechado · +40 XP", "Conta paga") cobre título, botão voltar e logo (Início, Fechar dia 1, Contas, Jornada).
- Faixa "Entendi" fica sobre o conteúdo e a barra em 5 telas (Plano, Carro, Contas, Lembretes, Jornada). Ele precisa tocar para sumir.
- Chips "Casa R$ 186" cortados na borda (Contas).

## 4. Redundâncias (tela: o que repete > o que manter)

1. Início: "Fechar dia" aparece no botão do meio dos 3 e no botão central da barra. Manter o da barra, com o nome escrito.
2. Carro: "Editar" no topo e "Ajustar" no card "De onde vem o custo" abrem a mesma tela, e a faixa manda "Toque em Ajustar". Manter só "Editar".
3. Plano: "Editar plano" no topo e lápis em "Guardar" e "Pra gastar". Manter um caminho só.
4. Contas: "Paguei" em cada conta e a faixa "toque em Paguei". Apagar a faixa.
5. Fechar dia: três verbos para o mesmo gesto (Continuar, Fechar o dia, Concluir). Manter "Fechar o dia" uma vez.
6. Lembretes: "Você não precisa lembrar de nada." aparece no título e na faixa de baixo. Manter um.
7. Conta: "Dados só neste aparelho" e "Backup dos seus dados" falam do mesmo assunto. Juntar em um card.

## 5. O que falta para confiar e pagar

- Preço e teste grátis não aparecem em nenhuma tela. Busca no repositório: nem "22,99" nem "7 dias" no código de interface. Ele não paga o que não vê. Mostrar "7 dias grátis, depois R$ 22,99 por mês" antes do cadastro.
- Mostrar a conta na tela: bruto R$ 230 − gastos R$ 200 = lucro R$ 30,50.
- Dados só no aparelho e "Restaurar backup" como botão dourado principal (Conta). Quem troca de celular perde tudo. Restaurar deve ser secundário e o backup deve ser lembrado sem ele ter que pensar.
- Nas capturas de onboarding não aparece o aviso "só funciona instalado". Dizer antes de ele entrar.

## 6. As 5 mudanças de maior impacto, em ordem

1. ★ Fechar dia em uma tela só: apps, km e horas juntos, a conta visível (bruto − gastos = lucro) e um botão "Fechar dia". É o gesto que ele repete todo dia, e hoje são 3 telas.
2. Trocar o jargão pelas palavras dele (seção 2). Sem isso, a tela não se explica sozinha.
3. Uma porta por ação: tirar o "Fechar dia" duplicado do Início, o "Ajustar" do Carro, a faixa "toque em Paguei" e as faixas "Entendi".
4. Legibilidade de rua: texto mínimo de 14 px, botões de no mínimo 44 px, "Paguei" maior, nome embaixo do botão central e toasts fora do cabeçalho.
5. Confiança e pagamento: preço e 7 dias grátis na primeira tela; backup como aviso claro; "Restaurar" secundário.
