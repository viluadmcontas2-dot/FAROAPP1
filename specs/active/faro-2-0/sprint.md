# Faro 2.0 — tarefas em ordem de prioridade

**Meta:** o app roda só com a interface nova, ligada a login, nuvem e assinatura reais, sem nenhum código do app antigo, e passa nos testes de ataque.
**Branch:** `claude/faro-2-0` · **Épico:** issue #21 · **Evidência:** `docs/evidence/faro-2-0/<tarefa>.md`
**Regras:** tudo idempotente (rodar duas vezes dá o mesmo resultado); nome do arquivo e da tarefa diz o que faz; tarefa só fecha com teste e evidência; cobrança fica desligada até o teste ponta a ponta passar.

## Tarefas (ordem de execução)
| # | Tarefa | Issue | Estado | Depende de |
|---|--------|-------|--------|-----------|
| 1 | Interface: design vira código de produção, sem eval | #22 | feito (11 testes) | — |
| 2 | Servidor: segurança do banco e funções (migration `faro_save_state`) | #25 | escrito e testado local (28 testes + SQL); aplicar no remoto no fim | — |
| 3 | Conta e nuvem: login, sincronização, conflito | #24 | feito (28 testes) | 2 |
| 4 | Núcleo: lucro, contas, metas, datas reais, armazenamento local | #23 | feito (dia vira 04:00, dinheiro pt-BR, conta semanal; `485cfb7`, `4e5b4a4`) | — |
| 5 | Ligar todas as telas do design aos dados e à nuvem (tela cheia, sem moldura de celular) | #26 | feito, com fluxo E2E (`dcdd6b5`) | 1, 3, 4 |
| 6 | Tela Conta: entrar, nuvem, assinar, backup | #27 | parcial (telas ligadas em `dcdd6b5`); falta assinar e backup completos | 3, 5 |
| 7 | App instalável, offline, CSP estrita | #28 | parcial: build PWA, CSP e detector testados; falta revisão em aparelho real | 5 |
| 8 | Limpeza: apagar tudo do app antigo | #29 | feito no working tree (a commitar); configuração da hospedagem antiga removida | 5, 6, 7 |
| 9 | Segurança: ataques reais contra app e banco | #30 | a fazer | 8 |
| 10 | Assinatura Stripe de ponta a ponta (modo teste) | #34 | a fazer | 6, 2 aplicada |
| 11 | Publicar prévia na Cloudflare e conferir (preview = produção) | #33 | a fazer | 8, 9 |
| 12 | Documentação: estado, decisões, regras | #32 | feito (README, PROJECT, STATUS, AGENTS, governance, `docs/decisions/`) | 8 |
| — | Varredura Strix (`scripts/security/strix-scan.sh`, cerca de US$ 1,4 por scan; chave de IA paga, não autorizada) | #31 | bloqueada | 9 |

## Decisões registradas
- Estado v2 (`schema_version = 2`); dados do app antigo não migram.
- O servidor só aceita salvar estado pela função `faro_save_state` (revisão atômica, tamanho máximo 512 KB, replay idempotente).
- Interface compilada em build; nenhum `eval`/`new Function` em produção.
- Dia de trabalho vira às 04:00; CSP estrita; hospedagem Cloudflare com preview igual à produção; app só funciona instalado. Detalhes em `docs/decisions/`.
- Objetos do banco remoto fora do repo (`faro_billing_settings`, `faro_trials_used`, `faro_has_access`, `faro_my_trial_ends_at`) entram no repo ou saem do remoto na tarefa 2.

## Riscos
| Risco | Mitigação |
|-------|-----------|
| Aplicar migration no remoto antes da hora | aplicar só com a interface nova publicada em preview |
| Perda de dados no sync | revisão atômica + conflito exposto + teste de troca de conta |
| Cobrança ligada por engano | `billingEnabled=false` coberto por teste |

## Definição de pronto
- [ ] Teste do bloco verde, saída colada na evidência
- [x] Sem referência ao app antigo (teste `governanca-faro-2-0`)
- [ ] Issue fechada com link do commit
