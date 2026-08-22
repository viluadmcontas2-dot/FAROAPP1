import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const policy = await readFile('docs/governance/netlify-deployment-policy.md', 'utf8');

assert.match(policy, /DEPLOY_DEFAULT=DENIED/);
assert.match(policy, /DEPLOY_AFTER_MERGE=ALLOWED/);
assert.match(policy, /DEPLOY_WITH_OWNER_AUTHORIZATION=ALLOWED/);
assert.match(policy, /PR_CI_DEPLOY=DENIED/);
assert.match(policy, /DIRECT_NETLIFY_DEPLOY_CALL_BEFORE_FINAL_GATE=DENIED/);
assert.match(policy, /INTEGRATION_BRANCH_MUTATION_BEFORE_FINAL_GATE=DENIED/);
assert.match(policy, /NETLIFY_SITE_ID=42b9e8d7-14a9-44ab-b23e-829f626ae62e/);
assert.match(policy, /QUARANTINED_SITE_ID=0344c03f-acb8-4273-a9a7-9f99fe407cba/);

const workflowNames = (await readdir('.github/workflows')).filter(name => /\.ya?ml$/i.test(name));
for (const name of workflowNames) {
  const source = await readFile(`.github/workflows/${name}`, 'utf8');
  assert.doesNotMatch(
    source,
    /netlify\s+deploy|@netlify\/mcp|NETLIFY_AUTH_TOKEN|netlify-mcp|deploy-site/i,
    `${name} não pode conter deploy Netlify antes do gate final`
  );
}

console.log('FARO release policy: Netlify deploy deny-by-default; merge/owner authorization required — ok');
