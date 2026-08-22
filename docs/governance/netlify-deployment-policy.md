# FARO Financeiro — Netlify Deployment Policy

```plain text
PROJECT_ID=FARO
ARCHITECTURE_ID=FARO_FINANCE_V1
POLICY_ID=FARO-NETLIFY-DEPLOY-001
STATUS=ACTIVE

DEPLOY_DEFAULT=DENIED
CONTINUOUS_DEPLOYMENT=DENIED
AUTO_DEPLOY_ON_PUSH=DENIED
AUTO_DEPLOY_ON_PULL_REQUEST=DENIED
AUTO_DEPLOY_ON_MERGE=DENIED
PR_CI_DEPLOY=DENIED
DEPLOY_TRIGGER=MANUAL_ONLY

DEPLOY_AFTER_MERGE=ALLOWED
DEPLOY_WITH_OWNER_AUTHORIZATION=ALLOWED
DEPLOY_ALLOWED_IF=FINAL_MERGE_COMPLETED_OR_OWNER_EXPLICITLY_AUTHORIZED
DIRECT_NETLIFY_DEPLOY_CALL_BEFORE_FINAL_GATE=DENIED

INTEGRATION_BRANCH=test/ux-r2-00-composition-contracts
INTEGRATION_BRANCH_MUTATION_BEFORE_FINAL_GATE=DENIED
NETLIFY_SOURCE_CONNECTION_BEFORE_FINAL_GATE=DENIED
NETLIFY_BUILD_HOOK_BEFORE_FINAL_GATE=DENIED

NETLIFY_SITE_NAME=faro-financeiro
NETLIFY_SITE_ID=42b9e8d7-14a9-44ab-b23e-829f626ae62e
NETLIFY_SITE_STATE=BLANK_LOCKED_NO_DEPLOY
NETLIFY_VISITOR_ACCESS=SSO_LOCKED_UNTIL_VERIFIED_RELEASE

QUARANTINED_SITE_NAME=faro-financeiro-quarantine-20260822
QUARANTINED_SITE_ID=0344c03f-acb8-4273-a9a7-9f99fe407cba
QUARANTINED_REASON=WRONG_SOURCE_FARO_CORRIDAS
QUARANTINED_VISITOR_ACCESS=SSO_REQUIRED
QUARANTINED_DEPLOY_MUST_NOT_BE_PROMOTED=TRUE
```

## Regra operacional

Durante desenvolvimento, planejamento, auditoria, PR e CI, **nenhum agente deve chamar deploy Netlify, conectar repositório Git ao site de produção, criar build hook ou habilitar continuous deployment**.

A branch de integração `test/ux-r2-00-composition-contracts` é tratada como superfície de merge/release e **não deve receber writes diretos antes do gate final**. Mudanças continuam somente na workstream/feature branch governada e chegam à integração exclusivamente pelo merge final autorizado.

Mesmo após o merge final, não existe auto-deploy. O merge apenas satisfaz uma condição de elegibilidade. O deploy deve ser uma ação **manual e separada**, executada somente quando uma das condições abaixo for verdadeira:

1. o merge final foi concluído e os gates aplicáveis da release estão aprovados; ou
2. o owner deu autorização explícita para um deploy específico.

Autorização para desenvolver, testar, criar PR, rodar CI, criar artifact ou preparar configuração **não equivale** a autorização para deploy.

## Controle de custo

Cada deploy Netlify é tratado como operação que pode consumir créditos. Portanto:

- não usar deploy para preview durante desenvolvimento;
- não usar deploy como substituto de teste local/CI;
- não disparar build remoto para descobrir se algo funciona;
- preferir testes locais, GitHub Actions e artifacts auditados;
- manter o site `faro-financeiro` vazio e protegido até o gate final;
- nunca usar o site de produção como sandbox.

## Incidente 2026-08-22

Um deploy originado por contexto incorreto serviu source do `Faro-App-Corridas` no primeiro site nomeado `faro-financeiro`. O deploy tinha commit `f313d3a0aee454ad6f06ad61893e64b59af42728` do repositório `Faro-App-Corridas`.

Remediação fail-closed:

- o site contaminado foi renomeado para `faro-financeiro-quarantine-20260822`;
- seu acesso permanece restrito por SSO do time;
- um novo site `faro-financeiro` foi criado vazio, sem deploy atual;
- nenhuma nova ação de deploy foi chamada após a remediação;
- o novo site não deve ser conectado a Git nem receber bytes antes do gate final.

## Gate para qualquer futuro deploy

Antes de um deploy manual, registrar e verificar no mesmo release lineage:

- owner authorization ou merge final concluído;
- SHA exato autorizado;
- CI completo verde nesse lineage;
- artifact/build correspondente ao SHA autorizado;
- source repo = `viluadmcontas2-dot/FAROAPP1`;
- source **não** contém referência ao `Faro-App-Corridas`;
- site id = `42b9e8d7-14a9-44ab-b23e-829f626ae62e`;
- destino e contexto de produção explicitamente conferidos;
- nenhum deploy concorrente ou automatic trigger ativo.

Se qualquer item estiver ausente ou ambíguo: `DEPLOY=DENIED`.
