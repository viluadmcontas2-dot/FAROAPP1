import assert from 'node:assert/strict';
import {
  constantTimeEqual,
  createSession,
  isCredentialActive,
  parseCredentials,
  sha256Hex,
  verifySession,
} from '../netlify/edge-functions/access-gate.js';

const now = Date.parse('2026-08-01T18:00:00.000Z');
const secret = 'test-secret-with-at-least-thirty-two-characters';
const temporaryHash = await sha256Hex('temporary-demo-password');
const ownerHash = await sha256Hex('owner-demo-password');
const credentials = parseCredentials(JSON.stringify([
  { id: 'temporary', hash: temporaryHash, expiresAt: '2026-08-01T19:30:00.000Z' },
  { id: 'owner', hash: ownerHash, expiresAt: null },
]));

assert.equal(credentials.length, 2);
assert.equal(isCredentialActive(credentials[0], now), true);
assert.equal(isCredentialActive(credentials[0], Date.parse('2026-08-01T19:30:00.000Z')), false);
assert.equal(isCredentialActive(credentials[1], Date.parse('2036-01-01T00:00:00.000Z')), true);
assert.equal(constantTimeEqual(temporaryHash, await sha256Hex('temporary-demo-password')), true);
assert.equal(constantTimeEqual(temporaryHash, await sha256Hex('wrong-password')), false);

const temporarySession = await createSession(credentials[0], secret, now);
assert.equal(
  temporarySession.expiresAt,
  Math.floor(Date.parse('2026-08-01T19:30:00.000Z') / 1000),
);
assert.ok(await verifySession(temporarySession.token, credentials, secret, now));
assert.equal(
  await verifySession(
    temporarySession.token,
    credentials,
    secret,
    Date.parse('2026-08-01T19:30:00.000Z'),
  ),
  null,
);
assert.equal(await verifySession(`${temporarySession.token}x`, credentials, secret, now), null);

const ownerSession = await createSession(credentials[1], secret, now);
assert.ok(await verifySession(ownerSession.token, credentials, secret, now));
assert.equal(
  await verifySession(
    ownerSession.token,
    credentials.filter(item => item.id !== 'owner'),
    secret,
    now,
  ),
  null,
);

console.log('VETTA access gate verification passed');
