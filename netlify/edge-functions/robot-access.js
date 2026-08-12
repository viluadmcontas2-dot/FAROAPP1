import {
  constantTimeEqual,
  createSession,
  isCredentialActive,
  parseCredentials,
  sha256Hex,
} from './access-gate.js';

const COOKIE_NAME = 'vetta_access';

function runtimeEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) ?? '';
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

  const robotHash = runtimeEnv('VETTA_ACCESS_ROBOT_HASH').trim().toLowerCase();
  const credentials = parseCredentials(runtimeEnv('VETTA_ACCESS_CREDENTIALS_JSON'));
  const secret = runtimeEnv('VETTA_ACCESS_SESSION_SECRET');
  if (!/^[a-f0-9]{64}$/.test(robotHash) || !credentials.length || secret.length < 32) {
    return new Response('Acesso automatizado indisponível.', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const form = await request.formData();
  const password = form.get('password');
  const passwordHash = typeof password === 'string' ? await sha256Hex(password) : '';
  if (!constantTimeEqual(robotHash, passwordHash)) {
    return new Response('Acesso negado.', {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const credential = credentials.find(item => isCredentialActive(item));
  if (!credential) {
    return new Response('Nenhuma credencial ativa disponível.', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const session = await createSession(credential, secret);
  return new Response(null, {
    status: 303,
    headers: {
      location: safeRedirect(form.get('redirect')),
      'set-cookie': `${COOKIE_NAME}=${session.token}; Path=/; Max-Age=${Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000))}; HttpOnly; Secure; SameSite=Lax`,
      'cache-control': 'no-store',
    },
  });
};
