# Faro 2.0 — tarefas em ordem de prioridade

O estado real está em `STATUS.md` (fonte única). Aqui fica só a ordem de trabalho.

**Meta:** o app roda só com a interface nova, ligada a login, nuvem e assinatura reais, sem nenhum código do app antigo, e abre já como beta pago.
**Branch:** `claude/faro-2-0` · **Tarefa mãe:** issue #21 · **Evidência:** `docs/evidence/faro-2-0/`
**Regras:** tudo idempotente (rodar duas vezes dá o mesmo resultado); tarefa só fecha com teste e evidência; sem prova, "não provado". A cobrança só liga quando a lista de pré-requisitos do `STATUS.md` estiver pronta.

## Tarefas
| # | Tarefa | Estado |
|---|--------|--------|
| 1 | Interface do design sem `eval` | pronto |
| 2 | Servidor endurecido, aplicado no banco real, funções publicadas | pronto |
| 3 | Conta e nuvem: entrar, sincronizar, conflito | pronto |
| 4 | Núcleo: lucro, contas, metas, datas reais, dia vira às 04:00 | pronto |
| 5 | Telas ligadas aos dados e à nuvem, em tela cheia | pronto |
| 6 | Instalar o Faro (Android e iPhone) | pronto no navegador de teste; falta aparelho real |
| 7 | Tela Conta | parcial: falta assinar e backup completos |
| 8 | App instalável e offline, CSP estrita | parcial: falta aparelho real |
| 9 | Limpeza do app antigo | pronto |
| 10 | Segurança: 57 testes de ataque e 2 varreduras Strix | pronto, nenhum alerta real alto |
| 11 | Documentação: estado, decisões, regras | pronto |
| 12 | Prévia na Cloudflare | a fazer; depende de o dono ligar o repositório ao Worker `faroapp1` |
| 13 | Assinatura Stripe de ponta a ponta (modo teste) | a fazer; depende dos segredos do Stripe no Supabase |
| 14 | Termos, privacidade, suporte, excluir conta, aviso de fim do teste | a fazer |
| 15 | Conferência do Stripe no modo real e tela de assinatura revisada | a fazer |
| 16 | Lembretes: enviar avisos ou esconder a tela | a fazer |
| 17 | Decisão do dono: fechar o dia em 1 tela ou 3 | a decidir |
| 18 | Abrir o beta pago e ligar a cobrança | só com as tarefas 12 a 15 prontas |

## Decisões registradas
Estado v2; servidor só salva por `faro_save_state`; interface compilada sem `eval`; dia vira às 04:00; CSP estrita; Cloudflare com preview igual à produção; só funciona instalado; beta pago desde o primeiro dia. Detalhes em `docs/decisions/`.

## Riscos
| Risco | Mitigação |
|-------|-----------|
| Cobrar de verdade sem textos legais (direito de arrependimento de 7 dias, LGPD) | cobrança só liga com a lista completa do `STATUS.md` |
| Cobrança ligada por engano | `billingEnabled=false` até a abertura, coberto por teste |
| Perda de dados no sync | revisão atômica, conflito exposto, teste de troca de conta |
| Sem link de prévia | o dono liga o repositório ao Worker na Cloudflare |

## Definição de pronto
- [ ] Teste do bloco verde, saída colada na evidência
- [x] Sem referência ao app antigo (teste `governanca-faro-2-0`)
- [ ] Issue fechada com link da evidência
