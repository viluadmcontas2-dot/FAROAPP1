import { isCredentialActive, parseCredentials } from './access-gate.js';
import { verifyGitHubOidc } from './github-oidc.js';

const COOKIE_NAME = 'vetta_access';
const SESSION_SECONDS = 15 * 60;
const encoder = new TextEncoder();

function runtimeEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) ?? '';
}

function bytesToBase64Url(bytes) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

async function createShortSession(credential, secret) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ id: credential.id, exp: expiresAt })));
  const signature = bytesToBase64Url(await hmac(payload, secret));
  return { token: `${payload}.${signature}`, expiresAt };
}

function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default async request => {
  if (request.method !== 'POST') {
    return new Response('Método não permitido.', {
      status: 405,
      headers: { allow: 'POST', 'cache-control': 'no-store' },
    });
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  try {
    await verifyGitHubOidc(token);
  } catch {
    return new Response('Identidade automatizada negada.', {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const credentials = parseCredentials(runtimeEnv('VETTA_ACCESS_CREDENTIALS_JSON'));
  const secret = runtimeEnv('VETTA_ACCESS_SESSION_SECRET');
  const credential = credentials.find(item => isCredentialActive(item));
  if (!credential || secret.length < 32) {
    return new Response('Acesso automatizado indisponível.', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  let redirect = '/';
  try {
    const body = await request.json();
    redirect = safeRedirect(body?.redirect);
  } catch {
    redirect = '/';
  }

  const session = await createShortSession(credential, secret);
  return new Response(null, {
    status: 303,
    headers: {
      location: redirect,
      'set-cookie': `${COOKIE_NAME}=${session.token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
      'cache-control': 'no-store',
    },
  });
};
