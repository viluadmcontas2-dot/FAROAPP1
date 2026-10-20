# Decisões — sync seguro (2026-10-20)

Branch: `claude/sync-seguro`. Corrige os achados de `docs/auditorias/revisao-final-*-2026-10-20.md` sobre conta e importação.
Provas: `tests/sync-seguro-runtime.test.mjs` (Supabase falso em `tests/helpers/fake-supabase-account.mjs`, que imita RLS, gatilho de revisão, paywall e unicidade) e `tests/import-limits-runtime.test.mjs`. Ambos no `npm run check`; todos falharam (RED) no código anterior.

1. **Dados de uma conta nunca vão para outra (crítico).** Cada aba guarda em memória o dono dos dados locais (`boundUserId`), além de `meta.userId`. Antes de qualquer envio, `assertOwner` exige dono == usuário da sessão. Em toda troca de usuário (login, `onAuthStateChange`, sessão inicial, evento `storage` de outra aba mexendo na meta) o estado local da conta anterior é **isolado**: guardamos uma cópia exportável em `faro-account-switch-backup-v1` (estado + rascunho do Registro) e limpamos a tela. Se não houver espaço para a cópia, nada é limpo e nada é enviado (avisamos para exportar). Meta recriada por um salvamento herda o dono desta aba.
   - Dados já sincronizados e sem pendência não geram cópia (estão na nuvem).
   - Se a mesma conta entrar de novo com o aparelho vazio, a cópia volta e segue o fluxo normal (envia se a nuvem não mudou; senão, abre a escolha).
   - Em "Mais/Conta" aparece "Exportar cópia da outra conta" / "Apagar cópia da outra conta".
2. **Compare-and-set na nuvem (alta).** Sem `upsert` cego no estado: `UPDATE ... eq('user_id').eq('revision', esperada)` e checamos a linha devolvida; a primeira cópia é `INSERT` (único por usuário; `23505` = outro aparelho criou antes). Zero linhas: relemos; revisão diferente abre a janela de conflito existente; revisão igual = servidor recusou (tratado como paywall/RLS). "Usar dados deste aparelho" substitui exatamente a versão que o usuário viu. O gatilho `faro_advance_state_revision` do banco continua avançando a revisão (sem mudança em `supabase/`).
3. **Edição durante o envio (alta).** O retorno só limpa `dirty` se `lastMutationId` ainda é o do snapshot enviado; senão mantém pendente e agenda novo envio.
4. **Paywall (média).** `ensureProfile` não interrompe mais login nem recuperação (erro vira aviso no console). Erro `42501`/RLS/401/403 é distinto de rede: mostra "Assine para voltar a salvar na nuvem. Seus dados continuam neste aparelho." e para as tentativas automáticas até novo login/refresh de sessão. Erro de rede continua com "tentaremos novamente".
5. **Importação acima dos limites (média).** O arquivo inteiro é rejeitado antes de tocar no estado, com mensagem do tipo "Esse backup tem custos demais (201). O limite é 200. Seus dados atuais não foram alterados." O corte em `sanitizeState` permanece só como defesa para dados vindos da nuvem.
6. **Cache** `faro-v1-core-30` para entregar os scripts corrigidos.

Sem prova real: Supabase de verdade (RLS/trigger) e dois aparelhos físicos; o comportamento do supabase-js (`update().eq().select()` devolvendo lista) foi assumido pela documentação.
