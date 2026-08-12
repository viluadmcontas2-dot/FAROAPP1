const ISSUER = 'https://token.actions.githubusercontent.com';
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(decoder.decode(base64UrlToBytes(value)));
}

function audienceIncludes(actual, expected) {
  return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
}

export async function verifyGitHubOidc(token, {
  audience = 'vetta-netlify-robot',
  repositoryId = '1320048021',
  repository = 'vitoohugo333/VETTA',
  ownerId = '220289104',
  actorId = '220289104',
  reusableWorkflow = 'vitoohugo333/VETTA/.github/workflows/ci-engine.yml@refs/heads/main',
  fetchImpl = fetch,
  now = Date.now(),
} = {}) {
  if (typeof token !== 'string' || token.length > 16_384) throw new Error('Token ausente ou inválido.');
  const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) throw new Error('JWT malformado.');

  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedPayload);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Algoritmo ou chave OIDC inválidos.');

  const jwksResponse = await fetchImpl(JWKS_URL, { headers: { accept: 'application/json' } });
  if (!jwksResponse.ok) throw new Error(`Não foi possível obter as chaves OIDC: ${jwksResponse.status}`);
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Chave OIDC não reconhecida.');

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    base64UrlToBytes(encodedSignature),
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!validSignature) throw new Error('Assinatura OIDC inválida.');

  const nowSeconds = Math.floor(now / 1000);
  if (claims.iss !== ISSUER) throw new Error('Emissor OIDC inválido.');
  if (!audienceIncludes(claims.aud, audience)) throw new Error('Audiência OIDC inválida.');
  if (!Number.isInteger(claims.exp) || claims.exp <= nowSeconds) throw new Error('Token OIDC expirado.');
  if (!Number.isInteger(claims.iat) || claims.iat < nowSeconds - 600 || claims.iat > nowSeconds + 60) throw new Error('Horário de emissão inválido.');
  if (Number.isInteger(claims.nbf) && claims.nbf > nowSeconds + 30) throw new Error('Token OIDC ainda não válido.');
  if (String(claims.repository_id) !== repositoryId || claims.repository !== repository) throw new Error('Repositório OIDC inválido.');
  if (String(claims.repository_owner_id) !== ownerId) throw new Error('Proprietário OIDC inválido.');
  if (String(claims.actor_id) !== actorId) throw new Error('Ator OIDC não autorizado.');
  if (claims.job_workflow_ref !== reusableWorkflow) throw new Error('Workflow OIDC não autorizado.');
  if (claims.runner_environment !== 'github-hosted') throw new Error('Executor OIDC não autorizado.');
  if (!['push', 'workflow_dispatch', 'issue_comment'].includes(claims.event_name)) throw new Error('Evento OIDC não autorizado.');
  if (claims.repository_visibility !== 'public') throw new Error('Visibilidade OIDC inesperada.');

  return claims;
}
