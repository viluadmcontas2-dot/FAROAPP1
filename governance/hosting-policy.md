# Hospedagem

- **Cloudflare Workers Static Assets** (`wrangler.jsonc`): serve `_site/`, gerado por `npm run build`.
- **Preview = produção**: mesmo build, mesmos cabeçalhos (`_site/_headers`, de `src/pwa/headers.mjs`), mesma CSP estrita.
- **Sem deploy automático de produção.** A CI não tem credencial de publicação; publicar é manual e com ok do dono.
- Se a hospedagem falhar ou bater em cota, nenhum upgrade pago é autorizado; siga com a verificação local.
- Backend: Supabase (auth, banco, Edge Functions) e Stripe; não ficam na hospedagem estática.
