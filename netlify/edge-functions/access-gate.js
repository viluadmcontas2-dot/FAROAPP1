const COOKIE_NAME = 'vetta_access';
const LOGIN_PATH = '/__vetta-access';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function runtimeEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) ?? globalThis.process?.env?.[name] ?? '';
}

function bytesToBase64Url(bytes) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const limit = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < limit; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function parseCredentials(value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => (
      item
      && typeof item.id === 'string'
      && /^[A-Za-z0-9_-]{1,80}$/.test(item.id)
      && typeof item.hash === 'string'
      && /^[a-f0-9]{64}$/i.test(item.hash)
      && (item.expiresAt === null || (typeof item.expiresAt === 'string' && Number.isFinite(Date.parse(item.expiresAt))))
    )).map(item => ({ id: item.id, hash: item.hash.toLowerCase(), expiresAt: item.expiresAt }));
  } catch {
    return [];
  }
}

export function isCredentialActive(credential, now = Date.now()) {
  if (!credential || credential.expiresAt === undefined) return false;
  return credential.expiresAt === null || Date.parse(credential.expiresAt) > now;
}

export async function createSession(credential, secret, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  const credentialExpiry = credential.expiresAt === null
    ? issuedAt + SESSION_SECONDS
    : Math.floor(Date.parse(credential.expiresAt) / 1000);
  const expiresAt = Math.min(issuedAt + SESSION_SECONDS, credentialExpiry);
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ id: credential.id, exp: expiresAt })));
  const signature = bytesToBase64Url(await hmac(payload, secret));
  return { token: `${payload}.${signature}`, expiresAt };
}

export async function verifySession(token, credentials, secret, now = Date.now()) {
  if (typeof token !== 'string' || typeof secret !== 'string' || !secret) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !constantTimeEqual(signature, bytesToBase64Url(await hmac(payload, secret)))) return null;
  const bytes = base64UrlToBytes(payload);
  if (!bytes) return null;
  try {
    const parsed = JSON.parse(decoder.decode(bytes));
    if (!parsed || typeof parsed.id !== 'string' || !Number.isInteger(parsed.exp) || parsed.exp * 1000 <= now) return null;
    const credential = credentials.find(item => item.id === parsed.id && isCredentialActive(item, now));
    return credential ?? null;
  } catch {
    return null;
  }
}

function sessionToken(request) {
  const match = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : '';
}

function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function accessPage(redirectTo, message = '') {
  const notice = message
    ? '<div class="notice" role="alert"><span class="notice-dot" aria-hidden="true"></span><span>Senha inválida ou acesso expirado.</span></div>'
    : '';
  const safeRedirectTo = escapeHtml(redirectTo);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#0b1121">
  <title>VETTA | Acesso</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #07101f;
      color: #f8fafc;
    }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body {
      margin: 0;
      min-height: 100svh;
      display: grid;
      place-items: center;
      overflow-x: hidden;
      background:
        radial-gradient(circle at 10% 10%, rgba(37, 99, 235, .24), transparent 34%),
        radial-gradient(circle at 88% 12%, rgba(59, 130, 246, .14), transparent 28%),
        linear-gradient(160deg, #07101f 0%, #0b1121 46%, #111827 100%);
      padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
      background-size: 32px 32px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,.7), transparent 72%);
    }
    .shell {
      position: relative;
      width: min(100%, 430px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .mark {
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      border-radius: 15px;
      background: linear-gradient(145deg, #3b82f6, #1d4ed8);
      box-shadow: 0 14px 35px rgba(37, 99, 235, .34), inset 0 1px 0 rgba(255,255,255,.22);
      font-weight: 900;
      font-size: 20px;
      letter-spacing: -.05em;
    }
    .brand-copy strong {
      display: block;
      font-size: 18px;
      letter-spacing: .22em;
    }
    .brand-copy span {
      display: block;
      margin-top: 3px;
      color: #94a3b8;
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .card {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, .16);
      border-radius: 28px;
      padding: 30px 24px 24px;
      background: linear-gradient(180deg, rgba(30, 41, 59, .88), rgba(15, 23, 42, .92));
      box-shadow: 0 30px 80px rgba(2, 6, 23, .52), inset 0 1px 0 rgba(255,255,255,.05);
      backdrop-filter: blur(18px);
    }
    .card::after {
      content: "";
      position: absolute;
      width: 160px;
      height: 160px;
      top: -80px;
      right: -65px;
      border-radius: 50%;
      background: rgba(59, 130, 246, .12);
      filter: blur(5px);
    }
    .eyebrow {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border: 1px solid rgba(96, 165, 250, .22);
      border-radius: 999px;
      background: rgba(37, 99, 235, .10);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .04em;
    }
    .eyebrow::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #60a5fa;
      box-shadow: 0 0 0 5px rgba(96,165,250,.10);
    }
    h1 {
      position: relative;
      z-index: 1;
      margin: 22px 0 10px;
      font-size: clamp(30px, 8vw, 40px);
      line-height: 1.02;
      letter-spacing: -.045em;
    }
    .subtitle {
      position: relative;
      z-index: 1;
      margin: 0 0 26px;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.6;
    }
    form { position: relative; z-index: 1; }
    label {
      display: block;
      margin-bottom: 9px;
      color: #dbeafe;
      font-size: 13px;
      font-weight: 700;
    }
    .field {
      position: relative;
    }
    .field svg {
      position: absolute;
      left: 16px;
      top: 50%;
      width: 20px;
      height: 20px;
      transform: translateY(-50%);
      color: #64748b;
      pointer-events: none;
    }
    input[type="password"] {
      width: 100%;
      height: 56px;
      border: 1px solid rgba(148, 163, 184, .22);
      border-radius: 17px;
      outline: none;
      padding: 0 16px 0 48px;
      background: rgba(2, 6, 23, .38);
      color: #f8fafc;
      font: inherit;
      font-size: 16px;
      transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
    }
    input[type="password"]::placeholder { color: #64748b; }
    input[type="password"]:focus {
      border-color: #3b82f6;
      background: rgba(15, 23, 42, .74);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, .13);
    }
    button {
      width: 100%;
      height: 56px;
      margin-top: 15px;
      border: 0;
      border-radius: 17px;
      background: linear-gradient(135deg, #3b82f6, #2563eb 55%, #1d4ed8);
      color: white;
      font: inherit;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: .01em;
      box-shadow: 0 16px 30px rgba(37, 99, 235, .28), inset 0 1px 0 rgba(255,255,255,.22);
      cursor: pointer;
      transition: transform .18s ease, filter .18s ease;
    }
    button:active { transform: translateY(1px) scale(.995); }
    button:hover { filter: brightness(1.05); }
    .notice {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 16px;
      padding: 12px 13px;
      border: 1px solid rgba(248, 113, 113, .22);
      border-radius: 14px;
      background: rgba(127, 29, 29, .18);
      color: #fecaca;
      font-size: 13px;
      line-height: 1.4;
    }
    .notice-dot {
      width: 8px;
      height: 8px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: #f87171;
      box-shadow: 0 0 0 5px rgba(248, 113, 113, .10);
    }
    .footer {
      margin: 18px 6px 0;
      color: #64748b;
      text-align: center;
      font-size: 12px;
      line-height: 1.5;
    }
    @media (max-width: 370px) {
      body { padding-inline: 14px; }
      .card { padding: 26px 19px 21px; border-radius: 24px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
    }
  </style>
</head>
<body>
  <main class="shell" data-vetta-access-gate="true">
    <div class="brand" aria-label="VETTA">
      <div class="mark" aria-hidden="true">V</div>
      <div class="brand-copy">
        <strong>VETTA</strong>
        <span>Driver Intelligence</span>
      </div>
    </div>

    <section class="card" aria-labelledby="access-title">
      <div class="eyebrow">Versão de testes</div>
      <h1 id="access-title">Seu acesso começa aqui.</h1>
      <p class="subtitle">Digite a senha que você recebeu para entrar no VETTA.</p>
      ${notice}
      <form method="post" action="${LOGIN_PATH}">
        <input type="hidden" name="redirect" value="${safeRedirectTo}">
        <label for="password">Senha de acesso</label>
        <div class="field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="3"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
          <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" required autofocus>
        </div>
        <button type="submit">Entrar no VETTA</button>
      </form>
    </section>

    <p class="footer">Acesso exclusivo para participantes autorizados da versão de testes.</p>
  </main>
</body>
</html>`;
}

function unauthorized(request, message = '') {
  const url = new URL(request.url);
  if (request.headers.get('accept')?.includes('text/html')) {
    return new Response(accessPage(`${url.pathname}${url.search}`, message), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return new Response('Acesso protegido.', { status: 401, headers: { 'cache-control': 'no-store' } });
}

export default async (request, context) => {
  const credentials = parseCredentials(runtimeEnv('VETTA_ACCESS_CREDENTIALS_JSON'));
  const secret = runtimeEnv('VETTA_ACCESS_SESSION_SECRET');
  if (!credentials.length || secret.length < 32) {
    return new Response('Proteção de acesso indisponível.', { status: 503, headers: { 'cache-control': 'no-store' } });
  }

  const url = new URL(request.url);
  if (url.pathname === LOGIN_PATH && request.method === 'POST') {
    const form = await request.formData();
    const password = form.get('password');
    const passwordHash = typeof password === 'string' ? await sha256Hex(password) : '';
    const credential = typeof password === 'string'
      ? credentials.find(item => isCredentialActive(item) && constantTimeEqual(item.hash, passwordHash))
      : null;
    if (!credential) return unauthorized(request, 'invalid');
    const session = await createSession(credential, secret);
    return new Response(null, {
      status: 303,
      headers: {
        location: safeRedirect(form.get('redirect')),
        'set-cookie': `${COOKIE_NAME}=${session.token}; Path=/; Max-Age=${Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000))}; HttpOnly; Secure; SameSite=Lax`,
        'cache-control': 'no-store',
      },
    });
  }

  if (await verifySession(sessionToken(request), credentials, secret)) return context.next();
  return unauthorized(request);
};
