import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const agents = await readFile('AGENTS.md', 'utf8');
const project = await readFile('PROJECT.md', 'utf8');
const status = await readFile('STATUS.md', 'utf8');
const authority = await readFile('governance/authority-map.md', 'utf8');
const workunit = JSON.parse(await readFile('specs/active/FARO-WU-001/workunit.json', 'utf8'));

assert.match(agents, /REMOTE_FIRST = ALWAYS/);
assert.match(agents, /Linear está aposentado como execution writer/);
assert.match(project, /REPO_FIRST_ENGINEERING=TRUE/);
assert.match(project, /LINEAR_EXECUTION_WRITER=RETIRED/);
assert.match(status, /SOLE_DURABLE_PROJECT_TRUTH = GitHub remote/);
assert.match(authority, /Linear.*histórico legado somente/i);
assert.equal(workunit.workunit_id, 'FARO-WU-001');
assert.equal(workunit.issue, 'https://github.com/viluadmcontas2-dot/FAROAPP1/issues/13');
assert.equal(workunit.branch, 'wu/faro-wu-001-repo-first-cutover');
assert.ok(workunit.next_unproven_item);

console.log('FARO governance: remote-first + Spec Kit + GitHub Issues authority — ok');
