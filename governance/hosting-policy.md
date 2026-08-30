# Hosting Policy — FARO

- `HOSTING_TARGET=VERCEL`.
- `NETLIFY_STATUS=RETIRED_HOSTING`.
- Nenhum novo deploy, preview, hook ou integração Git deve ser criado no Netlify para o FARO.
- Recursos Netlify históricos permanecem somente como quarantine/provenance até remoção explícita futura.
- Vercel é runtime/hosting, não autoridade de projeto.
- Preview Vercel pode ser usado em WorkUnit de hosting após configuração explícita.
- Production Vercel exige gate manual: source remoto provado, commercial E2E provado, release verification e autorização do owner.
- Build do produto deve ser provider-neutral; nomes/scripts não devem acoplar o artefato a Netlify.
