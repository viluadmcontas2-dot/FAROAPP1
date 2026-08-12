# VETTA Product UX

## Finalidade
Esta skill governa diagnósticos, propostas, desenhos, revisões e alterações de experiência do VETTA. Priorize tarefa real do motorista, fluxo completo, segurança dos dados e clareza dos números antes da aparência.

## Uso obrigatório
1. Leia `AGENTS.md`, `SKILLS.md`, `TESTING_RULES.md`, regras especializadas e `PROJECT_STATE.md` da branch-alvo.
2. Confirme branch, fotografia, ambiente, PR e CI aplicáveis.
3. Identifique tarefa, resultado esperado, informação principal, telas secundárias, comportamento ao salvar/voltar/cancelar/interromper e estados de erro.
4. Preserve cálculos, dados, armazenamento, PWA e identidade visual fora do contrato.

## Estrutura obrigatória
Toda proposta deve declarar tarefa, entrada, ação principal, sucesso, edição, cancelamento, voltar, estados vazio/carregando/salvando/sucesso/erro/indisponível, dados e cálculos afetados ou preservados, riscos e testes.

## Navegação canônica
`Agora | Registrar | Resultados | Custos | Mais`

- Agora: situação atual e próxima ação.
- Registrar: entrada rápida, resultado imediato e salvamento seguro.
- Resultados: interpretação, histórico e comparação.
- Custos: impacto financeiro de combustível, contas e reservas.
- Mais: planejamento, aplicativo, dados e funções secundárias.

## Proteções
É proibido apagar campos ao trocar de tela, substituir ou duplicar registros silenciosamente, salvar dados incompletos sem aviso, alterar cálculos como efeito visual, esconder ação principal, validar matemática apenas pelo texto da tela, forçar tarefa longa durante condução ou mudar estética/PWA/armazenamento/navegação fora do contrato.

## Mobile
Considere tela pequena, retrato, uma mão, teclado aberto, botão voltar do Android, barra inferior, área segura, toque impreciso, interrupção, retomada e retorno pelo ícone do PWA.

## Clareza dos números
Informe significado, origem, período, natureza real/média/projetada, motivo da mudança e ação possível.

## Aceite
Fluxos principal e de erro exercitados; dados preservados; cálculos com teste determinístico independente; navegadores e ambiente publicado verificados quando aplicável; interface/PWA aguardam validação física no celular.

## Limite
Esta skill orienta UX. Não autoriza alteração, commit, merge, publicação, mudança em `main`, cálculo, armazenamento, PWA ou identidade visual sem autorização aplicável.
