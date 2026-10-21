# 0004 — Cloudflare, com preview igual à produção
**Decisão:** hospedar em Cloudflare Workers Static Assets. Preview e produção usam o mesmo build e os mesmos cabeçalhos.
**Por quê:** o que foi testado no preview é exatamente o que vai ao ar; sem deploy automático de produção.
**Consequência:** `wrangler.jsonc` aponta para `_site/`; a CI só verifica. Outras hospedagens estão fora.
