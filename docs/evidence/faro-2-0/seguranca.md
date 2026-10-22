# Segurança Faro 2.0: relatório do ataque (red team local)

Escopo: app construído (`_site/`) servido com os cabeçalhos reais de `_site/_headers`, Postgres temporário (stub do auth + todas as migrações), Supabase falso por rota interceptada no Chromium, leitura estática das Edge Functions. Nada foi enviado ao Supabase, Stripe ou Cloudflare reais. Do Supabase real só foram lidos `get_advisors` (security) e `list_tables`.

Reexecutar tudo: `node --test tests/seguranca-*.test.mjs` (58 testes, todos passam; conferido em 21/10/2026). O Strix, autorizado pelo dono, rodou 2 varreduras: ver `strix-faro-2-0.md`.

## Resultado por ataque

| # | Ataque | Resultado |
|---|---|---|
| 1 | XSS e injeção via backup importado (`<img onerror>`, `javascript:`, aspas, 200 mil caracteres, `__proto__`/`constructor`, CSS injection) | PASSOU: vira texto, nenhuma execução, zero violação de CSP, protótipo intacto |
| 1 | Mesmos payloads vindos da nuvem (login, conflito, "manter a nuvem") | PASSOU |
| 1 | Ícone com classes arbitrárias | Aceito pelo regex, mas inerte: o CSS só tem `.ph*`, `.fscroll`, `.hscroll` (todo 1.1b, baixa) |
| 2 | CSP: script, estilo, imagem, iframe, fonte, fetch, XHR, WebSocket, form, `<base>`, worker, import externos | PASSOU: tudo bloqueado, a origem atacante recebeu 0 pedidos |
| 2 | `eval`, `new Function`, `setTimeout(string)`, AsyncFunction, WebAssembly (até de script same-origin) | PASSOU: bloqueados |
| 2 | Clickjacking (`frame-ancestors 'none'`) | PASSOU |
| 2 | Cabeçalhos (CSP, HSTS, nosniff, referrer, permissions) em 20 rotas, incluindo 404, SPA fallback, `sw.js`, fontes | PASSOU |
| 3 | SW não cacheia API, Authorization, POST, outra origem; querystring não envenena; cache só tem o pre-cache | PASSOU |
| 3 | Atualização do SW só por mensagem (`skipWaiting` fora do install) | PASSOU |
| 3 | Offline: sair da conta sem internet remove token e estado | PASSOU, mas ver falha M1 |
| 4 | Senha nunca gravada; segredo no aparelho | PASSOU. O token do Supabase fica em localStorage (padrão do supabase-js): um XSS roubaria o `refresh_token`. Mitigado pela CSP sem `unsafe-*` |
| 4 | Logout limpa tudo | FALHOU (M1) |
| 4 | Troca de conta (A, sair, B) e duas abas | PASSOU: nada de A sobe para B |
| 4 | `faro-v2-state` adulterado (negativos, enormes, tipos trocados, texto, JSON quebrado, 5 MB) e metadados do sync forjados | PASSOU: sem erro, sem NaN, nuvem recebe estado normalizado |
| 5 | A lê ou escreve em B (4 tabelas), `anon` sem acesso, INSERT/UPDATE direto em `faro_state` revogado | PASSOU |
| 5 | `faro_save_state`: revisão errada, replay, `user_id` forjado, schema errado, 10 MB, ids gigantes, sem login | PASSOU |
| 5 | Auto-concessão de assinatura, RPCs de serviço, `faro_billing_settings`/`trials_used`/`webhook_events` | PASSOU: negado |
| 5 | SECURITY DEFINER com `search_path` vazio, nenhuma executável por `anon`, `authenticated` só executa 3 | PASSOU |
| 5 | `faro_has_access` não escala (A não consulta B) e respeita vencida/past_due | PASSOU |
| 5 | Aparelhos de push sem teto por usuário | FALHOU (B1) |
| 6 | Webhook: assinatura sobre corpo cru, 405, 400 sem detalhe, 503 sem segredo, duplicado/velho/órfão no banco | PASSOU |
| 6 | Webhook: corpo grande só limitado pelo Content-Length | todo (B2) |
| 6 | Checkout: JWT obrigatório, corpo ignorado (`user_id`, `price`, `trial_period_days`), URLs fixas, sem open redirect, anônimo barrado | PASSOU |
| 7 | Segredos no repo, `_site`, histórico git, `strix_runs/` e `graphify-out/` | PASSOU: só `sb_publishable_` (pública por desenho). `sb_secret` no bundle é só o código do supabase-js que recusa essa chave |
| 8 | `npm audit --omit=dev` e completo | 0 vulnerabilidades. Só 3 dependências, lockfile com integridade, zero CDN/fonte externa |
| 9 | Paywall pelo cliente | Contornável no cliente, como esperado (`billingEnabled` vem da config compilada) |
| 9 | Servidor exige direito? | NÃO: `faro_save_state` e as tabelas não chamam `faro_has_access` (decisão D1) |
| 9 | Enumeração (`signUp`, `resetPassword`, login) | PASSOU: respostas iguais |
| 9 | Farm de trial | Alias gmail (ponto, `+x`, googlemail) e `+` em qualquer domínio normalizados; histórico sobrevive à exclusão da conta. Sem cartão no início desde o ADR 0009 (21/10/2026): contas com e-mails realmente distintos, inclusive descartáveis, ganham um trial cada (risco aceito pelo dono). Limites conhecidos: variantes do mesmo Gmail em sessões simultâneas ganham testes simultâneos (o histórico só é gravado quando o webhook vê `trialing`); CAPTCHA exige código no cadastro (CSP e token), não só o painel. Compensação recomendada, ainda não feita: CAPTCHA no cadastro antes de trocar o SMTP padrão |

## Falhas reais

**M1. Média/baixa (privacidade). O logout deixa os dados da conta em texto puro no aparelho.**
Reprodução: entrar como A (nuvem com dados), sair da conta. `localStorage["faro-sync-stash-v2:<uid>"]` guarda o estado inteiro (finanças, nomes). Vale também ao sair offline.
Causa: `stashIfDirty` em `src/data/sync.js` grava a cópia quando há dado, mesmo sem pendência. E `handleSignIn` só usa essa cópia se `meta.dirty`, então a cópia limpa nunca é usada.
Correção mínima: em `stashIfDirty`, `if (!getMeta(owner).dirty) return;`. Se houver pendência, avisar na saída (já há o `confirm`) ou cifrar.
Correções M1 e B1 já feitas: os testes `3.4` e `4.2` (`tests/seguranca-sw-estado.test.mjs`) agora passam.

**B1. Baixa. Sem teto de aparelhos de push por usuário.**
Reprodução: como usuário logado, `insert into faro_push_devices select ... from generate_series(1,500)` passa (cada linha até 8 KB, `device_id` livre).
Correção mínima: trigger ou check que limita (por exemplo 10) linhas por `user_id`.
Teste que falha: `5.11` (`tests/seguranca-banco.test.mjs`).

## Decisões do dono (testes `todo`)

- **D1. Paywall só no cliente.** Com `enforce_paywall = true` um usuário sem assinatura ainda grava na nuvem (`faro_save_state` não chama `faro_has_access`). Hoje a cobrança está desligada. Decidir se grava só com direito. Teste `9.1` (todo).
- **D2. Sem limite de frequência em `faro_save_state`** (30 de 30 gravações seguidas aceitas; teto de 512 KB por gravação). O `faro_state_rate_limit` do remoto ficou fora do repo. Teste `5.12` (todo).
- **B2. Webhook** só limita o corpo pelo cabeçalho Content-Length (chunked passa). Baixa: assinatura é exigida e a plataforma limita. Teste `6.3` (todo).
- **Endurecimento 1.1b.** Restringir `icon()` a classes Phosphor (`^(ph(-[a-z]+)? )?ph-[a-z0-9-]+$`).
- Manter `faro-sub-cache-v1` (status da assinatura por uid) no logout é baixo risco (só é lido para o mesmo uid).

## Achados do Supabase real (somente leitura)

- Advisors de segurança: só `faro_has_access` e `faro_my_trial_ends_at` executáveis por `authenticated` (aceito, documentado) e 3 tabelas com RLS sem política (`faro_billing_settings`, `faro_trials_used`, `faro_webhook_events`; equivale a negar tudo).
- O projeto remoto está atrás das migrações do repo: `faro_save_state` não aparece entre as funções executáveis e as políticas "FARO negar cliente" não existem. As migrações `20261021000100` e `20261021000200` precisam ser aplicadas, depois repetir `tests/sql` num branch.

## Observações

- Os testes de ataque entram no `npm run check` e no CI. Os de navegador e banco pulam sozinhos sem Chromium ou Postgres.
- Fora de escopo e não testável aqui: o Deno executando as funções, CORS real do `@supabase/server`, rate limits do GoTrue e a política de senha e confirmação de e-mail no painel do Supabase.
