import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const policy = await readFile('governance/hosting-policy.md', 'utf8');
assert.match(policy, /HOSTING_TARGET=VERCEL/);
assert.match(policy, /NETLIFY_STATUS=RETIRED_HOSTING/);
assert.match(policy, /Production Vercel exige gate manual/);

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(pkg.scripts.build, 'node scripts/build-static-site.mjs');
assert.doesNotMatch(pkg.scripts.check, /build-netlify/i);

await assert.rejects(access('netlify.toml'), /ENOENT/);
await assert.rejects(access('scripts/build-netlify-of.mjs'), /ENOENT/);

const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
assert.equal(vercel.$schema, 'https://openapi.vercel.sh/vercel.json');
assert.equal(vercel.buildCommand, 'npm run build');
assert.equal(vercel.outputDirectory, '_site');
assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);

const headerRules = new Map(vercel.headers.map(rule => [rule.source, new Map(rule.headers.map(header => [header.key, header.value]))]));
assert.equal(headerRules.get('/sw.js')?.get('Cache-Control'), 'no-cache, no-store, must-revalidate');
assert.equal(headerRules.get('/sw.js')?.get('Service-Worker-Allowed'), '/');
assert.equal(headerRules.get('/manifest.webmanifest')?.get('Cache-Control'), 'no-cache, no-store, must-revalidate');
assert.equal(headerRules.get('/manifest.webmanifest')?.get('Content-Type'), 'application/manifest+json; charset=utf-8');
assert.equal(headerRules.get('/index.html')?.get('Cache-Control'), 'no-cache, no-store, must-revalidate');
assert.equal(headerRules.get('/(.*)')?.get('X-Content-Type-Options'), 'nosniff');
assert.equal(headerRules.get('/(.*)')?.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
assert.equal(headerRules.get('/(.*)')?.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(self)');

const workflowNames = (await readdir('.github/workflows')).filter(name => /\.ya?ml$/i.test(name));
assert.ok(workflowNames.length > 0);
for (const name of workflowNames) {
  const source = await readFile(`.github/workflows/${name}`, 'utf8');
  assert.match(source, /workflow_dispatch/);
  assert.doesNotMatch(source, /^\s*(push|pull_request):/m, `${name} não pode disparar CI pesado automaticamente`);
  assert.doesNotMatch(source, /netlify\s+deploy|NETLIFY_AUTH_TOKEN|vercel\s+deploy|deploy_to_vercel|deploy-site/i, `${name} é verify-only e não pode publicar`);
}

console.log('FARO hosting governance: Vercel static runtime contract, Netlify retired, provider-neutral build, verify-only workflows — ok');
