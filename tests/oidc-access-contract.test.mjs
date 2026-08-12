import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const netlify = readFileSync('netlify.toml', 'utf8');
const oidc = readFileSync('netlify/edge-functions/github-oidc.js', 'utf8');
const access = readFileSync('netlify/edge-functions/robot-oidc-access.js', 'utf8');

assert.ok(netlify.includes('path = "/__vetta-oidc-access"'));
assert.ok(netlify.indexOf('/__vetta-oidc-access') < netlify.indexOf('path = "/*"'));
assert.ok(netlify.includes('.well-known/vetta-deploy.json'));
assert.ok(oidc.includes("repositoryId = '1320048021'"));
assert.ok(oidc.includes("actorId = '220289104'"));
assert.ok(oidc.includes("ci-engine.yml@refs/heads/main"));
assert.ok(oidc.includes("runner_environment !== 'github-hosted'"));
assert.ok(access.includes('const SESSION_SECONDS = 15 * 60'));
assert.ok(access.includes("authorization.startsWith('Bearer ')"));
assert.equal(oidc.match(/gh[pousr]_[A-Za-z0-9]{20,}/g), null);
assert.equal(access.match(/gh[pousr]_[A-Za-z0-9]{20,}/g), null);

console.log('VETTA OIDC access contract passed');
