# Hospedar o FARO de graça na Cloudflare Pages

Custo: R$ 0. Tempo: uns 10 minutos. Faça uma vez só.

## 1. Criar a conta
1. Abra `dash.cloudflare.com/sign-up`.
2. Informe e-mail e senha, confirme o e-mail. Não pede cartão.

## 2. Criar o projeto
1. Menu da esquerda: **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**.
2. **Connect GitHub** e autorize. Escolha só o repositório **FAROAPP1**.
3. Clique em **Begin setup**.

## 3. Preencher a tela de build
| Campo | Valor |
|---|---|
| Project name | `faro` (vira `faro.pages.dev`) |
| Production branch | a branch de produção definida por você (ver passo 5) |
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `_site` |

Abra **Environment variables** e adicione: `NODE_VERSION` = `22`.
Clique em **Save and Deploy**.

## 4. Pegar o endereço
Ao terminar, aparece o endereço `https://faro.pages.dev` (o nome pode ter sufixo se estiver ocupado). Abra no celular: deve carregar o app.

## 5. Produção é manual (regra do projeto)
A política do projeto (`governance/hosting-policy.md`) exige um gate manual antes de produção: código no remoto provado, teste comercial provado e autorização do dono. Por isso:
- A **branch de produção** deve ser uma branch que só recebe código depois do seu ok (por exemplo `producao`). Nada vai ao ar sozinho a partir das branches `claude/*`.
- Para publicar: junte (merge) a branch aprovada em `producao`. Só então a Cloudflare publica.

## 6. Preview sem custo
Qualquer outra branch (ex.: `claude/ajuste-login`) ganha um endereço de teste próprio, como `https://abc123.faro.pages.dev`, sem custo e sem afetar a produção. Para não gerar previews de tudo: em **Settings → Builds → Branch control** escolha **Custom branches** e liste só as que quer. O plano grátis dá 500 builds por mês.

## 7. Avisar o Supabase do novo endereço
1. No painel do Supabase: projeto **mjbyqhreptllilkggiri** → **Edge Functions** → **Secrets**.
2. Crie/atualize `FARO_APP_URL` com o endereço de produção, sem barra no final (ex.: `https://faro.pages.dev`).
3. Em **Authentication → URL Configuration**, ponha o mesmo endereço em **Site URL** (e o `.pages.dev` de preview em **Redirect URLs**, se for testar login nele).

Nunca cole chaves secretas em chats ou arquivos do repositório.

## Se algo der errado
- Build falhou por versão do Node: confira `NODE_VERSION` = `22`.
- Tela branca depois de atualizar: o app usa cache offline; feche e abra de novo (o arquivo `sw.js` é sempre revalidado).
- O `vercel.json` continua no repositório: a Vercel fica como **preview opcional**.
