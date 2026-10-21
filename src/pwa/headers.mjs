// Fonte unica dos cabecalhos HTTP. Deriva: _site/_headers (Cloudflare, no build) e vercel.json (node scripts/sync-headers.mjs).
// Padrao: '*' no fim = qualquer sufixo (Cloudflare '/*', Vercel '/(.*)').
export const HEADER_RULES = [
  {
    "path": "/*",
    "headers": {
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://mjbyqhreptllilkggiri.supabase.co wss://mjbyqhreptllilkggiri.supabase.co; manifest-src 'self'; worker-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains"
    }
  },
  {
    "path": "/",
    "headers": {
      "Cache-Control": "no-cache"
    }
  },
  {
    "path": "/index.html",
    "headers": {
      "Cache-Control": "no-cache"
    }
  },
  {
    "path": "/app.js",
    "headers": {
      "Cache-Control": "no-cache"
    }
  },
  {
    "path": "/app.css",
    "headers": {
      "Cache-Control": "no-cache"
    }
  },
  {
    "path": "/manifest.webmanifest",
    "headers": {
      "Cache-Control": "no-cache",
      "Content-Type": "application/manifest+json; charset=utf-8"
    }
  },
  {
    "path": "/sw.js",
    "headers": {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
      "Content-Type": "text/javascript; charset=utf-8"
    }
  },
  {
    "path": "/assets/fonts/*",
    "headers": {
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  }
];

export const toVercel = (rules = HEADER_RULES) => rules.map((r) => ({
  source: r.path.replace(/\*$/, '(.*)'),
  headers: Object.entries(r.headers).map(([key, value]) => ({ key, value })),
}));

export const toCloudflare = (rules = HEADER_RULES) =>
  '# Gerado por scripts/build-app.mjs a partir de src/pwa/headers.mjs. Nao edite.\n' +
  rules.map((r) => `${r.path}\n` + Object.entries(r.headers).map(([k, val]) => `  ${k}: ${val}`).join('\n')).join('\n\n') + '\n';
