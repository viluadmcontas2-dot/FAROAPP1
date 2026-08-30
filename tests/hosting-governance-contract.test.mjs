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

const workflowNames = (await readdir('.github/workflows')).filter(name => /\.ya?ml$/i.test(name));
assert.ok(workflowNames.length > 0);
for (const name of workflowNames) {
  const source = await readFile(`.github/workflows/${name}`, 'utf8');
  assert.match(source, /workflow_dispatch/);
  assert.doesNotMatch(source, /^\s*(push|pull_request):/m, `${name} não pode disparar CI pesado automaticamente`);
  assert.doesNotMatch(source, /netlify\s+deploy|NETLIFY_AUTH_TOKEN|vercel\s+deploy|deploy_to_vercel|deploy-site/i, `${name} é verify-only e não pode publicar`);
}

console.log('FARO hosting governance: Vercel target, Netlify retired, provider-neutral build, verify-only workflows — ok');
