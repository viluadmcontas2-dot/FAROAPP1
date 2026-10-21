# Strix no Faro 2.0 (2026-10-21)

Ferramenta: `strix 1.7.0` (sandbox `ghcr.io/usestrix/strix-sandbox:1.3.0`), modelo `anthropic/claude-haiku-5-5`, `STRIX_REASONING_EFFORT=low`. Chave do ambiente (`MEU_APP_CLAUDE_KEY` exportada como `LLM_API_KEY` so no processo; nada gravado).

## Alvo
`npm run build` e servidor node minimo (arquivo temporario fora do repo) que serve `_site/` com os cabecalhos REAIS de `_site/_headers` (mesmo parser de `tests/helpers/ataque-site.mjs`), em `0.0.0.0:4100`, acessado como `http://host.docker.internal:4100`. Backend: Supabase FALSO no mesmo servidor (`/auth/v1`, `/rest/v1`); o host real do Supabase foi trocado por esse servidor so na copia servida do `app.js` (nada vai ao Supabase real). Limites: `http://host.docker.internal` nao e contexto seguro, entao o service worker nao registra no scan (avaliado so por leitura de codigo e pelo teste `seguranca-sw-estado`). O fake nao aplica auth/RLS.

## Comandos (sem chave)
```
export LLM_API_KEY="$MEU_APP_CLAUDE_KEY" STRIX_LLM=anthropic/claude-haiku-5-5 STRIX_REASONING_EFFORT=low
strix -n -m quick    --max-turns 30 --max-budget 1.5 --instruction-file <instr1> -t http://host.docker.internal:4100 -t ./src
strix -n -m standard --max-turns 40 --max-budget 1.5 --instruction-file <instr2> -t http://host.docker.internal:4100 -t ./src
```
(`scripts/security/strix-scan.sh` nao aceita instrucao; chamei `strix` direto com os mesmos argumentos.) Instrucao 1: XSS, DOM XSS (import/localStorage), clickjacking, bypass de CSP, service worker, segredos no bundle, open redirect, prototype pollution, abuso de backup/importacao. Instrucao 2: so o cliente (fonte->sink), sem testar o backend falso.

## Custo (estimado; preco do haiku NAO confirmado: US$1/M entrada, US$5/M saida, cache lido 0,1x, gravado 1,25x)
- Scan 1 (quick, 55 req, 6,15M tokens de entrada, 26,6k de saida): ~US$1,08. Status `completed`; o erro de assinatura do raciocinio nao voltou com `STRIX_REASONING_EFFORT=low`.
- Scan 2 (standard, 54 req, 6,45M entrada, 23,4k saida): ~US$1,19. Status `completed`.
- Total ~US$2,27 (teto autorizado US$3). Conferir no painel da Anthropic.

## Achados
| # | Origem | Sev. Strix | Veredito |
|---|---|---|---|
| 1 | Scan 1: "leitura/escrita anonima de `faro_state` so com a chave publicavel" | HIGH | FALSO POSITIVO (artefato do meu backend falso) |
| 2 | Scan 2: cache local de assinatura `faro-sub-cache-v1` forjavel libera paywall offline | nao reportado (needs_follow_up) | REAL, mas BAIXO/informativo |

1. Falso positivo. O Strix testou o fake, que ignora JWT e `user_id`. Nas migrations reais: RLS ligada em `faro_state` com politicas `to authenticated using (auth.uid() = user_id)` (`supabase/migrations/20260814173000_faro_commercial_foundation.sql`), e `faro_save_state` com `revoke ... from public, anon` + `grant execute to authenticated` e `auth.uid()` dentro da funcao (`20261021000100`, `20261021000300`). Confirmado por leitura (nao testei contra um Supabase real). A chave publicavel no bundle e publica por desenho.
2. Confirmado por mim: `decideAccess({billingEnabled:true,user,subscription:{status:'active',currentPeriodEnd:'2099-01-01'}})` devolve `liberado`, e o cache e lido quando a busca da assinatura falha (`src/ui/conta-actions.js:33-36`). Quem edita o `localStorage` do proprio aparelho libera as telas. E inerente a qualquer paywall no cliente (o mesmo usuario poderia alterar o JS); nao afeta outros usuarios nem o servidor. Correcao minima (opcional): garantir no servidor/RLS que o dado de valor so sai com assinatura valida; nao tentar "proteger" o cache no cliente.

## O que o Strix descartou, e minha verificacao
- Reproduzi com os testes existentes: `node --test tests/seguranca-xss-csp.test.mjs` 11/11 e `tests/seguranca-sw-estado.test.mjs` 11/11 (XSS/`javascript:`/`__proto__` em importacao, localStorage e nuvem viram texto inerte; CSP sem unsafe-*; `frame-ancestors 'none'`; cabecalhos em todas as rotas, incluindo 404; sem script inline).
- `curl -I` no servidor confirmou CSP, nosniff, HSTS e Referrer-Policy servidos.
- Sem segredo no bundle alem da chave publicavel; sem open redirect nem `postMessage`/hash/URL como fonte (lido no codigo pelo Strix; o manifest nao tem `share_target`).
- Nao coberto: `postMessage`/CSP servida dinamicamente (o agente dinamico do scan 2 caiu antes), service worker em contexto seguro, backend real.

## Depende do dono
- Confirmar o custo real no painel da Anthropic.
- Para testar o backend real, apontar o Strix para um projeto Supabase de teste (nunca o de producao) com 2 usuarios.

## Conferência no banco real (coordenador, somente leitura, 2026-10-21)
O alerta "ALTO" do scan 1 (leitura/escrita anônima de `faro_state`) foi testado contra um Supabase falso. No projeto real
(`mjbyqhreptllilkggiri`, migrations aplicadas): as 8 tabelas `faro_*` têm RLS ligado; `anon` não lê nem grava em nenhuma;
`authenticated` não tem INSERT/UPDATE direto em `faro_state` (só `faro_save_state`). Falso positivo confirmado.
