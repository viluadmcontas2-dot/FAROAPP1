# Erro grave achado e corrigido: as 3 funções de cobrança davam 401 para qualquer pessoa (22/10/2026)

## O que acontecia
`criar-checkout-faro`, `abrir-portal-faro` e `excluir-conta-faro` liam o usuário em `ctx.userClaims?.sub`. Na biblioteca `@supabase/server@1.4.1` o tipo `UserClaims` tem `id` (e não `sub`); `sub` existe só em `jwtClaims`, e `is_anonymous` também só em `jwtClaims`. Resultado: o usuário vinha vazio e toda chamada de pessoa logada recebia `401 "Sessão inválida."`. Ninguém conseguiria assinar, abrir o portal nem excluir a conta.

## Por que os testes não pegaram
Os testes eram de contrato de texto e travavam o código errado (`/ctx\.userClaims\?\.sub/`). Nenhum teste chamava a função com um token real.

## Como foi achado
Usuário descartável criado no banco real (0 usuários antes e depois), login com senha, chamada do checkout com o token válido (ES256): 401 "Sessão inválida.". Tipo conferido em `@supabase/server@1.4.1` (`dist/types-*.d.mts`).

## Correção
`String(ctx.userClaims?.id || ctx.jwtClaims?.sub || '')` e `ctx.jwtClaims?.is_anonymous` nas 3 funções. Testes `seguranca-edge-segredos-deps` (incluindo o novo 6.9) e `backend-edge-contract`: 37 de 37 passam (antes: 3 falhavam).

## Prova depois de publicar as funções no Supabase real
- Checkout com o usuário de teste: `503 "Cobrança ainda não aberta."` (a sessão passou; a trava de cobrança desligada respondeu, como deve).
- Exclusão sem confirmação: `400`. Com confirmação: `200 {"deleted":true}` e o banco voltou a 0 usuários e 0 assinaturas.

## Não provado
Checkout completo com a cobrança ligada: `FARO_BILLING_ENABLED` só o dono altera (o ambiente nega a escrita de segredo ao Claude). Ficam sem prova real: `STRIPE_FARO_MONTHLY_PRICE_ID`, `FARO_APP_URL` e a chave `STRIPE_SECRET_KEY` criando sessão. O webhook já foi provado com um evento real de teste (assinatura válida).
