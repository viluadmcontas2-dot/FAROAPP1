import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const agents = await readFile('AGENTS.md', 'utf8');
const project = await readFile('PROJECT.md', 'utf8');
const status = await readFile('STATUS.md', 'utf8');
const authority = await readFile('governance/authority-map.md', 'utf8');

const activeEntries = (await readdir('specs/active', { withFileTypes: true }))
  .filter(entry => entry.isDirectory() && /^FARO-WU-\d+$/.test(entry.name));
assert.equal(activeEntries.length, 1, `deve existir exatamente uma WorkUnit FARO ativa; encontradas=${activeEntries.map(entry => entry.name).join(',')}`);

const activeWorkunitDir = activeEntries[0].name;
const workunit = JSON.parse(await readFile(`specs/active/${activeWorkunitDir}/workunit.json`, 'utf8'));

assert.match(agents, /REMOTE_FIRST = ALWAYS/);
assert.match(agents, /Linear está aposentado como execution writer/);
assert.match(project, /REPO_FIRST_ENGINEERING=TRUE/);
assert.match(project, /LINEAR_EXECUTION_WRITER=RETIRED/);
assert.match(status, /SOLE_DURABLE_PROJECT_TRUTH = GitHub remote/);
assert.match(authority, /Linear.*histórico legado somente/i);
assert.equal(workunit.workunit_id, activeWorkunitDir);
assert.match(workunit.issue, /^https:\/\/github\.com\/viluadmcontas2-dot\/FAROAPP1\/issues\/\d+$/);
assert.match(workunit.branch, /^wu\/faro-wu-\d+-/);
assert.match(workunit.pr, /^https:\/\/github\.com\/viluadmcontas2-dot\/FAROAPP1\/pull\/\d+$/);
assert.ok(workunit.next_unproven_item);
assert.match(status, new RegExp(workunit.workunit_id));

console.log(`FARO governance: remote-first + Spec Kit + GitHub Issues authority — ok (${workunit.workunit_id})`);
