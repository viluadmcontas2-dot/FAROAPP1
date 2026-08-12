import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { verifyGitHubOidc } from '../netlify/edge-functions/github-oidc.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.atob) globalThis.atob = value => Buffer.from(value, 'base64').toString('binary');
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64');

const base64url = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Date.parse('2026-08-04T00:00:00.000Z');
const nowSeconds = Math.floor(now / 1000);
const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
jwk.kid = 'test-key';
jwk.alg = 'RS256';
jwk.use = 'sig';

const baseClaims = {
  iss: 'https://token.actions.githubusercontent.com',
  aud: 'vetta-netlify-robot',
  exp: nowSeconds + 300,
  iat: nowSeconds,
  nbf: nowSeconds - 1,
  repository_id: '1320048021',
  repository: 'vitoohugo333/VETTA',
  repository_owner_id: '220289104',
  actor_id: '220289104',
  job_workflow_ref: 'vitoohugo333/VETTA/.github/workflows/ci-engine.yml@refs/heads/main',
  runner_environment: 'github-hosted',
  event_name: 'push',
  repository_visibility: 'public',
};

async function sign(claims = baseClaims) {
  const header = base64url({ typ: 'JWT', alg: 'RS256', kid: 'test-key' });
  const payload = base64url(claims);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    pair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
}

const fetchImpl = async () => new Response(JSON.stringify({ keys: [jwk] }), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

const valid = await verifyGitHubOidc(await sign(), { fetchImpl, now });
assert.equal(valid.repository, 'vitoohugo333/VETTA');

for (const [field, value] of [
  ['aud', 'outro-publico'],
  ['repository_id', '999'],
  ['actor_id', '999'],
  ['job_workflow_ref', 'vitoohugo333/VETTA/.github/workflows/outro.yml@refs/heads/main'],
  ['runner_environment', 'self-hosted'],
  ['event_name', 'pull_request'],
  ['repository_visibility', 'private'],
]) {
  const claims = { ...baseClaims, [field]: value };
  await assert.rejects(async () => verifyGitHubOidc(await sign(claims), { fetchImpl, now }));
}

await assert.rejects(async () => verifyGitHubOidc(await sign({ ...baseClaims, exp: nowSeconds - 1 }), { fetchImpl, now }));
console.log('VETTA GitHub OIDC verification passed');
