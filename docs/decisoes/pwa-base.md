# Decisões — PWA base (branch claude/pwa-base)

Objetivo: FARO o mais próximo possível de app nativo (iOS/Android), instalável, offline-first, rápido e acessível. Hospedagem futura: Cloudflare Pages (Vercel só preview). Núcleo protegido por SHA (`app.js`, `legacy-shell.html`, `faro-mark.svg`, `icon.svg`) intocado; toda mudança está no build, em `app-shell.html`, nos módulos `faro-*.js`, em `styles.css` e em arquivos novos.

## 1. Ícones, manifest, iOS
- PNGs gerados por `scripts/generate-pwa-icons.mjs` (Chromium/playwright, só dev) a partir de `icon-512.png`: 192, 512, `icon-maskable-512.png` (logo a 66% sobre o creme da marca = dentro da safe zone), `apple-touch-icon.png` (180, opaco), `favicon-32.png`.
- Manifest: ícones PNG `any` e `maskable` em arquivos separados (nunca "any maskable"), `shortcuts` (Registrar dia, Início → `app-shell.html?atalho=...`, tratado em `faro-pwa.js`), `screenshots` narrow (390x844 @2x, `scripts/capture-pwa-screens.cjs`, dados de exemplo), `display_override`, `dir`, categorias. As entradas SVG antigas ficam porque `install-contract` as exige.
- O shell legado é reescrito em runtime: o `apple-touch-icon` SVG dele vira o PNG (iOS não aceita SVG).
- `theme_color`/`background_color` continuam `#FFFFFF` (testes de instalação travam; a barra de status muda dinamicamente via `faro-pwa.js`).

## 2. Offline 100% e dependências
- Tailwind CDN virou CSS compilado (`vendor/tailwind.css`, Tailwind 3.4.17 só como devDependency; `npm run vendor:css`; config idêntica à do CDN + `hoverOnlyWhenSupported`). Chart.js 4.5.1, FontAwesome 6.4.0 (woff2), Plus Jakarta Sans (latin, woff2), supabase-js 2.112.3 (bundle ESM via esbuild) estão em `vendor/` com versão fixa e são copiados pelo build. Sem dependência de runtime.
- Como `legacy-shell.html` é protegido, a troca CDN para local é feita em `app-shell.html` (tabela `VENDOR_SWAPS`, testada contra o legado real). `<link tailwind>` entra DEPOIS de `styles.css`, como o `<style>` do CDN entrava; isso preserva a cascata (medido: diferença visual <= 61 pixels em 6 telas).
- `faro-account.js` importa o SDK de `./vendor/...`.
- Service worker: pré-cache (com `cache: 'reload'`) de shell + vendor + ícones + `offline.html`; HTML = rede primeiro (3 s) com fallback ao cache e a `offline.html`; estáticos = stale-while-revalidate; sem CDN. O nome do cache `faro-v1-core-23` foi mantido (6 testes o travam); o pré-cache sobrescreve as entradas no install, então não há conteúdo velho.
- Update flow: `faro-pwa.js` mostra "Nova versão disponível / Atualizar" quando há worker waiting; o botão envia `FARO_ACTIVATE_WHEN_SAFE` e recarrega no `controllerchange`. Sem `skipWaiting` no install e sem `clients.claim` (contrato de update seguro mantido).
- Testes antigos ajustados por conflito direto com a decisão: `account-contract` (SDK local), `b9-runtime-audit` (sw não semeia mais CDN).

## 3. Segurança
- `scripts/csp.mjs` é a fonte única: CSP, HSTS, X-Frame-Options, COOP, Permissions-Policy, Referrer-Policy, cache. `npm run headers:sync` grava em `vercel.json`; o build gera `_headers` e `_redirects` (SPA fallback) no `_site` para Cloudflare Pages. Teste falha se `vercel.json` sair de sincronia.
- CSP: `script-src 'self'` + 3 hashes SHA-256 dos únicos scripts inline (index, app-shell, bootstrap injetado); sem `unsafe-inline`/`unsafe-eval` em script. `style-src` precisa de `'unsafe-inline'` (módulos faro-* injetam `<style>` e o legado usa `style=""`): risco aceito, sem execução de código. `connect-src` só self + Supabase do projeto (https/wss). `frame-ancestors 'none'`, `object-src 'none'`.
- Cache: `immutable` só para `vendor/` com versão no caminho; `tailwind.css` (regenerável) e `faro-*.js?v=` (v não é bumpado a cada edição) ficam com revalidação. `Cache-Control` nunca na regra global (Cloudflare concatena regras sobrepostas).
- Se o app-shell mudar um script inline, rode `npm run headers:sync`.

## 4. Sensação nativa
- `styles.css`: overscroll none, tap-highlight off, `touch-action: manipulation` (o `pan-x pan-y` antigo bloqueava pinch-zoom), `user-select:none` só em controles, `:active` scale .97, inputs 16px em `pointer:coarse` (iOS não dá zoom ao focar; zoom do usuário liberado), safe-area nas 4 bordas (barras fixas), `dvh`, rótulos da navegação em 12px sem caixa alta (cabem em 390px).
- Fonte mínima 12px: `faro-*.js`/`styles.css` reescritos (script de regex, sem mudar lógica); legado coberto por override `.text-[8..11px]{12px!important}`. Alvos de toque 48px (chips de 42px subiram). Contraste AA: axe-core com 0 falhas nas 5 telas (tons slate-400/emerald-600/red-500 do legado reforçados em fundo claro; cartão "Registrar meu dia" com azul sólido).
- Transições de tela: o legado já anima (`animate-enter`) e `prefers-reduced-motion` zera animações; View Transitions API NÃO foi usada de propósito (o callback assíncrono quebraria código que espera `showView` síncrono).
- `faro-pwa.js`: `storage.persist()`, Badging (selo 1 quando o app sai de cena sem registro do dia), Wake Lock (modo carro), `theme-color` dinâmico, atalhos, update flow, card Modo carro em Central (`role="switch"`, lembrado em `localStorage`, aplicado cedo no bootstrap para não piscar). Modo carro: preto/alto contraste, alvos 64px, inputs 20px, foco amarelo.

## Provas e limites
- `npm run check` e `npm run build` com exit 0. Provas reais em Chromium headless: `scripts/verify-offline-browser.cjs` (reabre offline sem nenhum host externo), `verify-csp-browser.cjs` (zero violações; script inline sem hash é bloqueado), `verify-pwa-runtime-browser.cjs` (16 verificações), `audit-a11y-browser.cjs` (axe).
- NÃO provado (UNKNOWN até teste em aparelho): instalação e ícone maskable no Android/iOS, comportamento real de safe-area/notch, `storage.persist()` concedido (headless nega), Badging e Wake Lock em hardware, prompt de instalação, push, rolagem/overscroll no iOS Safari, Cloudflare Pages aplicando `_headers`/`_redirects`.
