# Adiciona páginas legais e exclusão de conta — evidência local

Data: 2026-10-20. Branch existente: `claude/legal-lgpd`. Base local: `394aa02`.
Escopo do pedido: Dia 3 do PLANO. Sem push, deploy, habilitação de billing ou alteração do núcleo protegido.
Esta entrega é candidata local: nenhuma durabilidade remota ou vínculo novo de Issue/PR foi provado.

## RED e GREEN
- Antes da implementação: `node tests/legal-pages-contract.test.mjs`: 0/5 passaram, 5 falharam (páginas, links e função ausentes). Log da execução em `/tmp/faro-legal-red.log`.
- Após implementação: mesmo contrato ampliado com execução do handler e dependências falsas: 8/8 passaram.
- `node tests/legal-account-runtime.test.mjs`: 2/2 passaram. Cliente executado em VM com DOM/SDK falsos: duas etapas, cancelamento, requisição única, erro, resposta sem confirmação, sucesso, limpeza, cópia exportável, offline e preservação de cópia anterior.
- `npm run build`: exit 0; núcleo validado pelos hashes do build. Páginas e CSS copiados para `_site`.
- `npm run check`: NÃO PASSOU. Contratos até edição do dia passaram; o teste de navegador existente parou com `listen EPERM 127.0.0.1`. O teste novo de navegador também foi bloqueado nessa abertura, antes dos cenários. Não foi ignorado ou substituído por PASS.
- `tests/cloudflare-pages-contract.test.mjs` isolado: bloqueado por `spawnSync ... node EPERM`. SQL comportamental existente imprime SKIP sem Postgres configurado.
- Os testes novos estão no fim de `check`. O script de navegador usa SDK falso e não exclui contas reais.

## Decisões
- Páginas sem JavaScript, CSS próprio preto/âmbar, logo original, safe-area e zoom permitido. CSP existente permite os recursos; nenhum hash novo ou relaxamento de política.
- Exclusão usa apenas o `sub` autenticado, recusa anônimo e exige confirmação. Segredos ausentes retornam 503. Stripe é consultada e assinaturas abertas são canceladas antes de `deleteUser`.
- A exclusão de `auth.users` usa as quatro FKs `ON DELETE CASCADE` existentes (perfil, estado, assinatura, push), evitando exclusão parcial manual. `faro_trials_used` permanece. Sem migration nova.
- Se Stripe falha, a conta é mantida. Se deleteUser falha após cancelar, a resposta informa essa possibilidade; repetir consulta o estado atual da Stripe.
- Cliente pausa sync durante a exclusão; recusa iniciar durante sync em curso. Preserva uma cópia local antes de chamar a função e só limpa após `deleted:true`. Reutiliza `app.exportData`, inclusive para exportar a cópia sem recolocá-la no estado ativo. O usuário pode apagar a cópia explicitamente.
- Reload remove estado em memória; rascunho gravado pelo Registro em pagehide é removido depois. Outros aparelhos e exports não são apagados remotamente.

## Sem prova
Navegador/offline/CSP aplicada, hardware, middleware/JWT real, configuração/segredos reais, Stripe/Supabase E2E, cascatas no banco remoto e concorrência com checkout/webhook. Não há transação distribuída entre Stripe e Auth; o E2E deve incluir tentativas simultâneas de cobrança. Textos têm pendências explícitas do dono; não constituem revisão jurídica final.

Referências consultadas: [direitos dos titulares, ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares), [deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [cancelamento Stripe](https://docs.stripe.com/api/subscriptions/cancel), [middleware Supabase](https://supabase.com/docs/reference/server/usage-examples).

## Commit bloqueado
`git add` falhou antes de indexar: `Unable to create '/home/user/FAROAPP1/.git/worktrees/wt-legal-lgpd/index.lock': Read-only file system`. Nenhum commit foi criado; arquivos permanecem no worktree. Não foi tentado contorno da restrição. Mensagem preparada: `Adiciona páginas legais e exclusão de conta`, com os trailers solicitados pelo dono.
