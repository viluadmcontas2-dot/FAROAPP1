import assert from 'node:assert/strict';
import robotAccess from '../netlify/edge-functions/robot-access.js';
import {
  parseCredentials,
  sha256Hex,
  verifySession,
} from '../netlify/edge-functions/access-gate.js';

const secret = 'test-secret-with-at-least-thirty-two-characters';
const userHash = await sha256Hex('existing-user-password');
const robotHash = await sha256Hex('robot-only-password');
const credentialsJson = JSON.stringify([
  { id: 'existing-user', hash: userHash, expiresAt: null },
]);

const env = {
  VETTA_ACCESS_CREDENTIALS_JSON: credentialsJson,
  VETTA_ACCESS_SESSION_SECRET: secret,
  VETTA_ACCESS_ROBOT_HASH: robotHash,
};

globalThis.Netlify = { env: { get: name => env[name] ?? '' } };

const form = new FormData();
form.set('password', 'robot-only-password');
form.set('redirect', '/?forceBrowser=1');
const response = await robotAccess(new Request('https://example.com/__vetta-robot-access', {
  method: 'POST',
  body: form,
}));

assert.equal(response.status, 303);
assert.equal(response.headers.get('location'), '/?forceBrowser=1');
const cookie = response.headers.get('set-cookie');
assert.ok(cookie?.startsWith('vetta_access='));
const token = cookie.match(/^vetta_access=([^;]+)/)?.[1];
assert.ok(token);
assert.ok(await verifySession(token, parseCredentials(credentialsJson), secret));

const wrongForm = new FormData();
wrongForm.set('password', 'wrong-password');
const wrongResponse = await robotAccess(new Request('https://example.com/__vetta-robot-access', {
  method: 'POST',
  body: wrongForm,
}));
assert.equal(wrongResponse.status, 401);

const getResponse = await robotAccess(new Request('https://example.com/__vetta-robot-access'));
assert.equal(getResponse.status, 405);

console.log('VETTA robot access verification passed');
