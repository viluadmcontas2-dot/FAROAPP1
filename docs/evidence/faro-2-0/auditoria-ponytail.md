# Auditoria Ponytail: FARO 2.0

Branch: `claude/faro-2-0`. Data: 2026-10-21. Só leitura: nenhum código foi alterado. Único arquivo escrito: este relatório.

## O que este repositório faz

O FARO é um app de finanças para motorista de aplicativo. Ele guarda ganhos do dia, km rodados, contas, cofres e despesas, e mostra quanto sobra no mês. Cada motorista tem conta (Supabase) e a assinatura passa pelo Stripe, com 7 dias grátis. O app é um PWA (instalável no celular).

Carga assumida: um motorista usa um aparelho. No servidor, muitas contas ao mesmo tempo, cada uma gravando só a própria linha.

Escopo lido: `src/core`, `src/data`, `src/ui/logic.js`, `src/ui/main.js`, `src/ui/derive.js` (novo, lido porque usa o núcleo), `tools/`, `scripts/build-app.mjs`, `supabase/functions/*` (com `_shared`), migrations `20261021*`, testes `core-*`, `backend-*` e `app-*`.

Nota: outro agente mudou `criar-checkout-faro`, `stripe-webhook-faro` e a migration `20261021000200` durante a auditoria. Usei as versões de 15:29 a 15:30. Os achados de cobrança da primeira leitura (checkout duplicado, trial ausente, `constructEvent` síncrono) já não valem: o código novo trata isso. Não entram aqui.

## Achados

### Deve corrigir

1. **Aparelho novo com conta antiga cai em "conflito", e "usar este aparelho" apaga a nuvem** (`src/data/sync.js:20`, `:131`, `:151-154`)
   - **O que é:** ao entrar numa conta, o app compara o que tem no aparelho com o que tem na nuvem.
   - **Problema:** `hasData` considera qualquer objeto com chaves como "tem dado". O estado vazio de fábrica tem chaves. Então um celular novo vira "conflito". Se o motorista escolher "usar este aparelho", o vazio sobe e troca os dados da nuvem. Teste feito com Node: nuvem com 900 XP, aparelho vazio, status final `conflict`.
   - **Conserto:** `hasData` deve ser falso para o estado de fábrica (comparar com `defaultState()`). Uma linha.
   - **Se pular:** o motorista troca de celular, escolhe a opção errada e perde o histórico.
   - Obs.: a tela ainda não usa o sync (`src/ui/logic.js` não importa `src/data`). Corrigir antes de ligar.

2. **Duas abas do app no mesmo aparelho se sobrescrevem** (`src/data/store.js:36-41`; `src/data/persist.js:36-49`)
   - **O que é:** o app guarda tudo no localStorage do navegador.
   - **Problema:** não existe escuta do evento `storage`. Uma aba antiga grava o estado inteiro dela e apaga o que a outra aba salvou. Achado pelo código; não rodei em navegador.
   - **Conserto:** ouvir `storage` na chave `faro-v2-state` e recarregar o estado. Uns 6 linhas. Ou avisar "o app está aberto em outra aba".
   - **Se pular:** uma despesa lançada numa aba some sem aviso.

3. **Valor com ponto de milhar vira centavos na tela de fechar o dia** (`src/ui/logic.js:46`, usado em `:101`; também `src/core/money.js:11-12`)
   - **O que é:** o campo de valor aceita "1.200" ou "1,234.56".
   - **Problema:** a cópia da tela lê "1.200" como 1,2 (R$ 1,20). O núcleo lê "1.200" certo (1200), mas lê "1,234.56" como 1,23. Teste com Node confirmou os dois.
   - **Conserto:** apagar a cópia da tela e usar o `parseMoney` do núcleo. No núcleo, se houver vírgula e ponto, o último separador é o decimal.
   - **Se pular:** fechamento de dia com R$ 1.200 grava R$ 1,20. Erro de dinheiro silencioso.

4. **Duas contas de dinheiro (tela e núcleo) dão resultados diferentes** (`src/ui/logic.js:78-106`; `src/core/calc.js:26-30`, `:81-86`)
   - **O que é:** a tela tem o próprio `calc`, `eff`, `occ` e `targetFor`. O núcleo tem as mesmas regras, feitas de outro jeito.
   - **Problema:**
     - (a) `eff` da tela usa todos os dias fechados. O núcleo usa só os últimos 60. Depois do 61º dia, o km aprendido e o lucro mostrado mudam.
     - (b) A tela conta dias de 1 a 31 fixos (`MDAYS`). Em mês de 30 dias conta um dia que não existe; em fevereiro, três. A meta diária sai menor.
     - (c) O dia da semana é fixo em outubro de 2026 (`src/ui/logic.js:35`). Contas semanais caem no dia errado em outros meses.
   - **Conserto:** apagar `calc`, `eff`, `occ` e `targetFor` da tela e usar `src/core/calc.js` (já tem `core-calc-parity`). Corta cerca de 40 linhas.
   - **Se pular:** a tela mostra um número e o fechamento grava outro.

5. **Dia fechado de madrugada cai no dia seguinte** (`src/data/store.js:49`; `src/core/actions.js:45`, `:208`; `src/core/dates.js:41`)
   - **O que é:** o dia é o da hora do aparelho. Isso está certo: não há UTC no dinheiro, e `tests/core-dates-money.test.mjs:52-55` testa a hora local.
   - **Problema:** sábado 23:50 até 00:40, fecha o dia. Grava como domingo, que é folga (6 dias de pista). Sábado fica sem fechamento e a sequência quebra.
   - **Conserto (decisão do dono):** o dia de trabalho vira às 05:00. Trocar `todayISO(new Date(t))` por `todayISO(new Date(t - 5*3600e3))` em `store.js:49` e no fallback de `actions.js:208`. Uma linha.
   - **Se pular:** motorista de noite perde dias da semana e a sequência.

6. **Conta semanal volta a ser sábado ao salvar** (`src/core/actions.js:131`, `:141`; limite em `src/core/state.js:74`)
   - **O que é:** conta semanal guarda o dia da semana (0 = domingo a 6 = sábado).
   - **Problema:** `bill/create` aceita 0 a 31, e `bill/update` grava o que vier. Teste com Node: conta semanal com dia 10 salva como 6 (sábado). Sem aviso.
   - **Conserto:** escolher o limite pelo tipo: semanal 0 a 6, mensal 1 a 31. Duas linhas.
   - **Se pular:** a conta aparece em outro dia do que o motorista escolheu.

7. **A tela ainda mostra dados inventados e o dia 21** (`src/ui/logic.js:34`, `:41`, `:51`, `:56`)
   - **O que é:** a tela é um protótipo com registros e contas de mentira.
   - **Problema:** `TODAY=21` fixo. Dados digitados pelo usuário não entram.
   - **Conserto:** integrar ao núcleo e apagar os dados de mentira antes de qualquer teste com usuário. Item do checklist de lançamento.
   - **Se pular:** a tela inicial mostra números falsos.

8. **Paywall desligado por padrão** (`supabase/migrations/20261021000200_faro_acesso_e_trial.sql:25`)
   - **O que é:** `enforce_paywall` começa `false`, então ninguém é bloqueado. Está escrito assim de propósito (cabeçalho do arquivo).
   - **Problema:** não é bug de código. Se o lançamento não ligar a chave, todo mundo usa de graça.
   - **Conserto:** no checklist de lançamento, ligar `enforce_paywall` depois do teste E2E real.
   - **Se pular:** assinatura não é cobrada.

### Deveria corrigir

9. **Sair da conta pode travar a tela** (`src/data/sync.js:278-281`; pedidos em `:86-88`, `:99-104`)
   - **O que é:** antes de sair, o app espera o envio pendente terminar.
   - **Problema:** a espera é um laço sem limite de tempo, e nem o envio nem a leitura têm tempo limite. Sinal ruim no meio do envio: "Sair" gira para sempre.
   - **Conserto:** limite de 10 segundos no envio e na leitura (`Promise.race`). Depois, segue e deixa o pendente no aparelho (o stash já existe).
   - **Se pular:** o motorista fica preso ao sair num lugar com sinal ruim.

10. **Histórico some sem aviso** (`src/core/state.js:145`, `:151`; teto em `:11-14`)
    - **O que é:** o estado guarda no máximo 800 dias e 3000 despesas.
    - **Problema:** ao passar do teto, os dias e despesas mais antigos são cortados na próxima gravação. 800 dias fechados são uns 2 a 3 anos de pista.
    - **Conserto (decisão do dono):** avisar antes, ou arquivar. Mínimo: um aviso na tela de configurações.
    - **Se pular:** relatório de dois anos atrás aparece vazio, sem explicação.

11. **Cada alteração envia o histórico inteiro** (`src/data/sync.js:99-104`)
    - **O que é:** a cada gravação, o app manda o estado todo para a nuvem.
    - **Problema:** medido no teto de uso (800 dias, 3000 despesas): cerca de 460 KB de JSON. Com muitos usuários, cada alteração reescreve a linha inteira. Em teste com dados repetidos, compactou para 15 KB; dado real deve pesar mais.
    - **Conserto:** por agora, medir com usuários reais. Se pesar, enviar só o que mudou (fase 2).
    - **Se pular:** custo e tráfego crescem com o uso.

12. **Marca de "pendente" do store nunca é limpa** (`src/data/store.js:17`, `:30`, `:62-64`)
    - **O que é:** o store tem o próprio `dirty` e `markSynced`. O sync usa outro controle (`src/data/sync.js:79-84`).
    - **Problema:** ninguém chama `markSynced`. Depois de sincronizar, o store grava `dirty: true` para sempre. Se a tela usar `getMeta().dirty`, mostra "pendente" sem parar.
    - **Conserto:** apagar `dirty` e `markSynced` do store. O sync fica como única fonte. Corta cerca de 8 linhas.
    - **Se pular:** aviso de pendência falso.

13. **Funções iguais em lugares diferentes** (`src/ui/logic.js:35`, `:37-47`; `src/ui/derive.js:9`; `src/core/calc.js:41`)
    - **O que é:** `fmt`, `R`, `split`, `rideSum`, `parseMoney`, `SRC_CAT`, `wd` e `mi` existem na tela e no núcleo. `isWorkDay` (derive) repete `work` (calc).
    - **Problema:** quando uma muda e a outra não, o app mostra coisas diferentes (itens 3 e 4).
    - **Conserto:** manter só o núcleo. `derive.js` passa a usar `work`/`isWorkDay` do núcleo.
    - **Se pular:** cada correção precisa ser feita duas vezes.

14. **Testes que não pegariam os erros acima** (`tests/core-*`, `tests/backend-*`)
    - **O que é:** rodei `node --test` nos grupos core, backend e app: 124 de 124 passam.
    - **Problema:** nenhum teste cobre: conta semanal com dia 10; "1.200" e "1,234.56"; aparelho vazio com nuvem cheia; duas abas; virada às 00:40; mês de 30 dias na meta diária.
    - **Conserto:** um teste pequeno por caso, antes de cada correção (vermelho primeiro).
    - **Se pular:** os erros voltam sem aviso.

### Nice to have

15. **Link de pagamento já usado por até 60 minutos após cancelar** (migration `20261021000200`, linhas 225-226, `faro_reserve_checkout`)
    - **O que é:** se a sessão anterior ainda não venceu, o app devolve o mesmo link.
    - **Problema:** cancelou e quis assinar de novo na mesma hora: o link é de uma sessão já concluída.
    - **Conserto:** ao receber `checkout.session.completed`, limpar `checkout_session_id`.
    - **Se pular:** aborrecimento raro.

16. **Parâmetros de teste ficam em produção** (`src/ui/main.js:9-12`)
    - **O que é:** `?tela=`, `?tema=`, `?periodo=` e `?sheet=` escolhem telas pela URL.
    - **Problema:** não é falha de segurança (o React escapa o texto), mas é código de design em produção.
    - **Conserto:** manter só em build de desenvolvimento.

17. **Exportações sem uso** (`src/core/actions.js` `ACTION_TYPES`; `src/core/dates.js` `weekDates` e `monthName`; `src/core/money.js` `splitMoney`)
    - **Problema:** só são usadas em testes ou em nada.
    - **Conserto:** apagar o que a tela não vai usar. Uns 5 linhas.

## Veredito

Corrigir primeiro o item 1 (perda na nuvem) e o item 3 (dinheiro na tela). Depois 4 e 5. Não ligar o sync na tela antes de corrigir 1 e 2.

Lean: -60 linhas (aprox.), -0 dependências possíveis.

## Não verificado

- Não rodei o app em navegador. Duas abas e aparelho novo foram provados por leitura do código e por um teste com Node simulando o sync.
- Não rodei as funções Deno nem o SQL (sem banco). RLS de `faro_state` não revisado (fora do repositório e fora do escopo).
- `src/ui/logic.js` ainda muda (outro agente): lido na versão das 15:30. `src/ui/view.gen.js` (gerado) e `src/ui/count-up.js` não lidos.
- `src/pwa`, o app antigo e os `tests/` antigos ficaram fora do escopo.
- Fuso: testei a hora local do próprio aparelho; não testei aparelho em outro fuso.
