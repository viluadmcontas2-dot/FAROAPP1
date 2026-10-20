# Onboarding de 3 perguntas (F5)

Data: 2026-10-20. Branch: `claude/onboarding-3-perguntas`. Base: `docs/auditorias/fluxos-2026-10-20.md` (achado 2, fatia F5) e a tela 2 ("3 perguntas") de `docs/design/mockups-v3-aprovado.html`.

**Aprovação do dono**: mockup v3 aprovado em 2026-10-20, com o princípio de mínimo atrito. Esta aprovação é a justificativa para mudar o `experienceContract` de `ci/baseline-integrity.json`, que antes exigia o fluxo longo (etapas próprias de aluguel/parcela, custos, reserva e "Farejando" de ~4 s).

## Antes x depois
- Antes: 7 a 8 etapas, ~15 toques, 10 a 15 telas até o Início, 4 s de espera e tour de 5 passos (que trocava de tela).
- Agora: 3 perguntas + 1 toque em "Ir para o Início" = **4 toques** (carro próprio). Financiado/alugado: **5 toques** (o valor aparece pré-preenchido e pede 1 "Continuar"). Sem espera: o plano aparece na hora. Tour com **3 passos**, todos no Início.

## As 3 perguntas
1. **Seu carro é...** Próprio / Financiado / Alugado. Financiado e alugado mostram 1 campo pré-preenchido (parcela R$ 1.100/mês, aluguel R$ 650/semana), marcado "estimativa".
2. **Quanto quer sobrar por mês?** R$ 3.000 / R$ 4.000 / R$ 5.000 / Outro valor (abre o número + slider; limite 500 a 50.000, igual a antes).
3. **Qual combustível?** Gasolina / Etanol / Flex / GNV / Elétrico. Flex grava como gasolina (pior caso do custo); a escolha original fica em `onboardingProfile.energyChoice`.

Divergência do mockup: o mockup perguntava "dias por semana" em vez de combustível. Combustível muda mais o lucro real (custo por km); dias fica em 6 (estimado) e é ajustável em Planejar.

## Valores estimados (defaults documentados)
| Campo gravado | Valor | Origem |
|---|---|---|
| `workWeekdays` | 6 dias (`app.weekdaysForCount(6)`) | default |
| `revenueKm` | R$ 2,25/km | mesmo default de antes |
| `fuel.price/efficiency` | presets do núcleo (GNV 4,79/13,2; gasolina 6,19/10,5; etanol 4,29/7,4) | mesmos de antes |
| elétrico | R$ 0,95/kWh, bateria 45 kWh, autonomia 280 km (≈6,2 km/kWh) | novo default (antes era obrigatório digitar) |
| "Parcela do carro" | R$ 1.100/mês, vence dia 10 | estimativa editável |
| "Aluguel do carro" | R$ 650/semana, vence segunda | estimativa editável |
| custos adicionais, reserva inicial, manutenção/km | nenhum | ficam para "Completar meu perfil" |

Tudo isso vai marcado em `onboardingProfile.estimated` (versão 3 do perfil).

## Matemática e gravação: o que NÃO mudou
- O commit grava os mesmos campos do núcleo: `targetProfit`, `workWeekdays`, `fuel {type,label,unit,price,efficiency}`, `revenueKm`, `costs`, `onboardingProfile`, `onboardingComplete`. Só muda de onde vêm os valores.
- Custos são reconstruídos (sem `push` no estado): retomar ou tocar duas vezes não duplica nada.
- `onboardingComplete = true` só no gesto final, que agora tem **um único dono**: `faro-onboarding-commit.js` (o listener duplicado que existia em `faro-onboarding.js` foi removido; o achado 2 apontava essa fragilidade).
- `app.js`, `legacy-shell.html` e as funções do núcleo (hashes em `ci/baseline-integrity.json`) não foram tocados.
- Rascunho continua em `faro-onboarding-draft-v2` (campo `version: 3`); rascunhos antigos (versão 2) recomeçam da pergunta 1.

## "Completar meu perfil"
Cartão discreto no fim do Início (`#faroCompleteProfile`), criado por `faro-onboarding.js`, só quando o perfil tem estimativas. "Completar meu perfil" abre Planejar > operação (`FaroPlanning.openOperation`); "Agora não" esconde (preferência local `faro-profile-card-v1`, não toca o estado financeiro).

## Tour
3 passos (Hoje, Registrar, Planejar), sem trocar de tela. Passo cujo alvo está oculto é pulado (antes escondia o tour inteiro).

## Sem prova / pendente
- `CORE_CACHE` não foi subido: quem já tem o app instalado já passou do onboarding; instalações novas baixam o arquivo novo. Se quiser forçar, subir para `faro-v1-core-27` numa fatia que possa editar `sw.js`.
- Uma lista de pendências mais rica no Início (parcela, combustível real, contas) fica para quem é dono de `faro-home-r2.js`.

## Prova
`tests/onboarding-3-perguntas-browser.test.cjs` (Chrome real): primeiro acesso -> 3 perguntas -> Início com "Registrar dia" em 4 toques; estado sem NaN/undefined; recarregar no meio retoma; tour <= 3 passos visíveis; financiado gera "Parcela do carro".
