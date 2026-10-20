# Publicar o FARO na Play Store (passo a passo)

O app da Play é o mesmo site do FARO embrulhado num app Android (TWA). Nada de código novo no app.

Antes de tudo: leia a decisão de cobrança em `docs/pendencias-do-dono.md` (item 16). Sem ela, a Play pode rejeitar o app.

## 1. Conta de desenvolvedor
1. Entre em play.google.com/console e crie a conta (taxa única, cerca de US$ 25).
2. Conta pessoal nova: a Play exige teste fechado com 12+ testadores por 14 dias antes de liberar. Conta de empresa (CNPJ) não exige.

## 2. Domínio e páginas legais
1. Defina o domínio definitivo (pendência 5) e troque `DOMINIO_A_DEFINIR` em `twa-manifest.json`.
2. Preencha `privacidade.html` e `termos.html` (pendência 10). A Play rejeita política com texto `[PREENCHER]`.
3. Publique a página de exclusão de conta (pendência 12): a Play exige um endereço web para isso.

## 3. Gerar o app com o Bubblewrap
1. Instale o Node e rode `npx @bubblewrap/cli init --manifest=https://SEU_DOMINIO/manifest.webmanifest` (ou use o `twa-manifest.json` deste repo).
2. Rode `npx @bubblewrap/cli build`. Sai um arquivo `.aab` (para a Play) e um `.apk` (para testar).
3. O Bubblewrap cria uma chave de assinatura (`android.keystore`). GUARDE a chave e a senha fora do repositório (gerenciador de senhas). Quem perde a chave perde o app.

## 4. Assinatura e assetlinks
1. Na Play Console, abra Integridade do app > Assinatura de apps e copie o SHA-256 do "certificado de assinatura do app" (não o de upload).
2. Cole no `.well-known/assetlinks.json`, no lugar de `PREENCHER_SHA256_DO_CERTIFICADO_PLAY`. Para testar o APK local, acrescente também o SHA do `npx @bubblewrap/cli fingerprint`.
3. Publique o site e confira: `https://SEU_DOMINIO/.well-known/assetlinks.json` deve abrir direto (sem redirecionar) como JSON.
4. Prova final: `FARO_REQUIRE_REAL_ASSETLINKS=1 node tests/assetlinks-contract.test.mjs` precisa passar.

## 5. Ficha e envio
1. Textos, Segurança dos Dados e classificação: use `ficha.md` desta pasta.
2. Imagens: ícone 512x512, imagem de destaque 1024x500 (criar) e 2 a 8 capturas de telefone com proporção até 2:1 (as atuais 780x1688 passam de 2:1: refaça, ex. 1080x1920).
3. Envie o `.aab` primeiro em teste fechado, depois em produção.
4. Nas notas para o revisor, informe uma conta de teste com acesso liberado.
