<!-- VETTA_GOVERNANCE_VERSION: 2026-08-03.2 -->
# Regras permanentes de aprendizado técnico

Um bloco que revelou defeito, quase falha ou conhecimento reutilizável deve deixar prevenção executável e contexto suficiente para o próximo agente.

## Ciclo obrigatório

1. sintoma;
2. causa imediata;
3. causa estrutural;
4. falha de detecção;
5. correção ou decisão;
6. prevenção permanente;
7. prova;
8. alcance do aprendizado.

## Onde registrar

- `docs/incidents/`: história completa e evidência;
- arquivo especializado: regra resumida da área;
- teste automatizado: prevenção executável;
- `SKILLS.md`: índice quando surgir uma nova área permanente;
- `PROJECT_STATE.md`: somente estado atual e pendência.

## Quando é obrigatório

Registre quando o problema afetou ou poderia afetar dados, cálculos, armazenamento, segurança, acesso, PWA, publicação, CI, branch, navegador específico, aparelho real ou consumiu investigação relevante.

Não transforme hipótese em regra. Não crie diário de comandos. Preserve somente tentativas que ensinem algo.

## Fechamento

Declare uma opção:

- `Nenhum aprendizado permanente novo`;
- `Aprendizado fechado`, citando regra e prova;
- `Aprendizado pendente`, explicando o que ainda não foi confirmado.
