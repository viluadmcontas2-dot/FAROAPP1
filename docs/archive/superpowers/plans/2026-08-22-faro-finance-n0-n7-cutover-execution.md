# FARO Finance N0–N7 Cutover Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate FARO Financeiro to `FARO_FINANCE_V1`, reconcile governance/source, preserve proven core, then execute and verify the product through N0→N7 without treating static, runtime, physical, or external-service evidence as interchangeable.

**Architecture:** Governance mutates in place through the canonical EntryPoint/Kernel/Project Registry; project-specific direction lives in one active architecture. Linear remains the operational writer, GitHub remote remains source truth, and the Ledger remains evidence/provenance. Product code is frozen in N0/N1, then reused or rebuilt only after anti-legacy classification.

**Tech Stack:** Vanilla JavaScript/HTML/CSS PWA, Node 22 contract harnesses, GitHub remote source mutation, Linear execution, Notion governance/architecture/ledger, external backend/payment services only when real credentials/project boundaries exist.

**Spec:** `docs/superpowers/specs/2026-08-22-faro-finance-governance-cutover-v1-design.md`

## Global Constraints

- `PROJECT_ID=FARO` and `ARCHITECTURE_ID=FARO_FINANCE_V1`.
- `FEATURE_CODING=DENIED` and `UI_POLISH=DENIED` during N0/N1.
- Do not create a competing Governance Kernel, Central, execution writer, or architecture authority.
- Notion governs durable product/architecture/contracts; Linear writes current execution; GitHub remote writes source; Ledger stores claims/audit provenance.
- Source mutation is remote-only; ephemeral runtime may test an exact remote SHA but may not write source.
- `STATIC_VERDICT != RUNTIME_VERDICT != PHYSICAL_VERDICT != EXTERNAL_SERVICE_VERDICT`.
- Existing code is classified `KEEP_AS_PROVEN_CORE | REBUILD_TO_NEW_CONTRACT | RETIRE_FROM_NEW_DIRECTION | OUTSIDE_NEW_SCOPE` before product mutation.
- Branch lifecycle is `REUSE_OR_PROVE`; no branch is created only because Linear suggests a name.
- `app.js` and `legacy-shell.html` are treated as high-risk shared core and are not modified unless N2 evidence proves a contract cannot be met through the existing extension seams.
- No claim of N5/N6/N7 closure without real backend/payment/device evidence where applicable.

---

### Task 1: N0 authority cutover and coding freeze

**Surfaces:**
- Modify in place: Notion `🐕 FARO — Central Oficial do Projeto`, `🟢 START HERE — FARO`, `📓 FARO — Caderno de Contratos Resolvidos`, `📒 FARO — Execution & Audit Ledger`.
- Create under FARO context: `FARO — CEO / Strategy`, `FARO — Product & Architecture Studio`, `FARO_FINANCE_V1 — Active Product Architecture`.
- Linear: create one canonical N0→N7 parent and child gate issues; reclassify VIT-88/VIT-267-era work as historical/input rather than current execution.

**Interfaces:**
- Consumes: canonical EntryPoint/Kernel/Project Registry and approved cutover spec.
- Produces: one unambiguous authority chain and coding freeze.

- [ ] Fresh-read EntryPoint, Kernel, Project Registry/FARO, Central, START HERE, Caderno, Ledger, Linear current, and GitHub remote topology.
- [ ] Create the two advisory Notion areas with `EXECUTION_AUTHORITY=NONE`, no Linear/GitHub writes, and explicit handoff rules.
- [ ] Create the active architecture page with `ARCHITECTURE_ID=FARO_FINANCE_V1`, anti-legacy classes, N0→N7 gate graph, coding freeze, and active authority routes.
- [ ] Mutate Central and START HERE in place to point to `FARO_FINANCE_V1`; mark prior product directions `SUPERSEDED_FOR_PRODUCT_DIRECTION` without deleting evidence.
- [ ] Update the Caderno with FARO-specific source-topology/workstream/branch lifecycle and PASS-dimension bindings.
- [ ] Create Linear parent `FARO_FINANCE_V1 — N0→N7` plus N0…N7 children in dependency order; set N0 In Progress and others Todo/blocked by predecessor.
- [ ] Freeze VIT-88/VIT-267-era execution as historical input and preserve links/evidence.
- [ ] Append a Ledger receipt for activation/cutover start.
- [ ] Fresh-read all mutated authorities and assert exactly one current architecture and one operational current gate.

### Task 2: N0 source-topology reconciliation and retirement map

**Surfaces:** GitHub remote branches, Linear N0 issue, Ledger.

**Interfaces:**
- Consumes: Task 1 authority chain.
- Produces: branch/workstream map with explicit keep/merge/retire/delete conditions.

- [ ] Enumerate every remote branch and current HEAD.
- [ ] Compare release baseline, integration line, active feature line, legacy `main`, and all residual audit/docs/maintenance branches.
- [ ] For every branch record `PURPOSE`, `LINEAR_SCOPE`, `SEMANTIC_DOMAINS`, `BASE_REF`, `HEAD`, `MERGE_TARGET`, `MERGE_OR_RETIRE_PATH`, `DELETE_WHEN`.
- [ ] Mark already-absorbed/superseded branches as retirement candidates only after confirming no unique source/evidence/intent remains.
- [ ] Select the modern integration/release lineage without assuming legacy `main` is the target.
- [ ] Reconcile Linear snapshot with GitHub actual refs and append topology receipt to Ledger.
- [ ] N0 passes only when every remote branch has a destination and future branch budget is <=4.

### Task 3: N1 product/domain contract and anti-legacy matrix

**Surfaces:** Notion `FARO — Product & Architecture Studio`, active architecture page, GitHub read-only source, Linear N1.

**Interfaces:**
- Consumes: N0 branch/source truth and existing UX/commercial/R2 documents as reference only.
- Produces: canonical product contract and domain-by-domain legacy classification.

- [ ] Define one product promise: the driver understands current financial state, next action, and path to monthly goal in seconds.
- [ ] Define canonical journeys for onboarding, Home, Registrar, Planejar, Histórico, Central, account/sync, and commercial entitlement.
- [ ] Define domain ownership: `FINANCIAL_STATE`, `DAILY_RECORD`, `PLANNING`, `HOME_COCKPIT`, `HISTORY`, `ONBOARDING_NAV`, `PWA_RUNTIME`, `ACCOUNT_SYNC`, `COMMERCIAL_ENTITLEMENT`, `SHARED_UI`.
- [ ] Read `app.js`, `faro-state.js`, `faro-finance.js`, `faro-reserves.js`, `faro-register-earnings.js`, `faro-register.js`, `faro-planning.js`, `faro-planning-invariants.js`, `faro-r3b.js`, `faro-home-r2.js`, `faro-r2-polish.js`, `faro-account.js`, `faro-notifications.js`, `app-shell.html`, `sw.js`, build script, and relevant tests.
- [ ] Classify each domain/module `KEEP | REBUILD | RETIRE | OUTSIDE`, with evidence and exact reason.
- [ ] Freeze canonical state writers and math invariants; prohibit duplicate gross/net/goal/reserve calculations.
- [ ] Define one UI grammar and dominant purpose per screen.
- [ ] Define N2–N7 falsifiers and acceptance criteria from the new contract.
- [ ] Record N1 outcome in Linear/Notion/Ledger; do not edit product source during this task.

### Task 4: N2 core and state integrity

**Files:**
- Inspect first: `app.js`, `faro-state.js`, `faro-finance.js`, `faro-reserves.js`, `faro-register-earnings.js`, `faro-register.js`, `faro-planning.js`, `faro-planning-invariants.js`.
- Tests: `tests/state-integrity-contract.test.mjs`, `tests/finance-contract.test.mjs`, `tests/reserves-contract.test.mjs`, `tests/platform-earnings-contract.test.mjs`, `tests/register-contract.test.mjs`, `tests/b9-finance-register-contract.test.mjs`.
- Modify only modules classified `REBUILD_TO_NEW_CONTRACT`; shared `app.js` only if no safe seam exists.

**Interfaces:**
- Produces: one canonical daily record, one financial calculation path, one reserve/cost model, one planning input/output contract.

- [ ] Add focused RED tests for every N2 invariant not already covered: single record writer, atomic `gross+earningsBySource`, no duplicate financial formulas, legacy record readability, idempotent save, goal/plan math consistency.
- [ ] Run each focused RED on an exact remote snapshot in ephemeral Node 22 runtime.
- [ ] Apply the minimum remote source changes required by failing contracts.
- [ ] Re-fetch the new remote SHA and run focused GREEN tests.
- [ ] Run N2 regression set plus syntax checks.
- [ ] Run `npm run check` in ephemeral runtime if the focused set is green.
- [ ] Independent read-only audit N2; remediate under a new audit epoch if needed.
- [ ] Close N2 only with fresh static/runtime evidence; physical remains separate where not applicable.

### Task 5: N3 unified experience

**Files:**
- `styles.css`
- `faro-home-r2.js`
- `faro-register.js`
- `faro-r3b.js`
- `faro-r2-polish.js`
- `faro-navigation.js`
- onboarding/tour modules only where N1 classifies them `REBUILD`.
- Tests: `tests/premium-ui-grammar-contract.test.mjs`, `tests/premium-home-contract.test.mjs`, `tests/premium-planning-anatomy-contract.test.mjs`, `tests/premium-history-central-contract.test.mjs`, `tests/register-contract.test.mjs`, `tests/navigation-contract.test.mjs`, onboarding/tour contract tests.

**Interfaces:**
- Produces: coherent Home→Registrar→Planejar→Histórico/Central journey with one visual language and explicit dominant action per screen.

- [ ] Write/extend RED tests for cross-screen vocabulary, hierarchy, one-tap Home→goal path, Registrar clarity, Planejar anatomy, History/Central noise reduction, and onboarding ownership.
- [ ] Make the smallest remote UI changes by screen owner; do not duplicate business state in presentation modules.
- [ ] Verify focused GREEN after each screen slice.
- [ ] Run integrated UI/navigation contract matrix.
- [ ] Run Chromium/runtime composition where available.
- [ ] Independent UI contract audit; physical verdict stays open until device evidence.

### Task 6: N4 runtime and reliability

**Files:**
- `app-shell.html`
- `sw.js`
- `scripts/build-netlify-of.mjs`
- runtime/listener modules affected by N2/N3.
- Tests: `tests/runtime-composition-contract.test.mjs`, `tests/b9-runtime-audit-contract.test.mjs`, `tests/install-contract.test.mjs`, `tests/update-contract.test.mjs`, `tests/onboarding-resilience-contract.test.mjs`, `tests/physical-commit-boundary-contract.test.mjs`.

**Interfaces:**
- Produces: exact-generation shell/build/SW coherence, idempotent bindings, reload/reopen integrity, offline-safe core.

- [ ] Add RED for any detected duplicate owner/listener, stale generation, reload/reopen loss, or service-worker inconsistency.
- [ ] Apply minimum remote fixes.
- [ ] Run syntax, focused runtime, build, install/update, and full `npm run check` on exact SHA.
- [ ] Inspect built artifact for expected scripts/assets and no stale generation.
- [ ] Independent N4 audit and Ledger receipt.

### Task 7: N5 backend, account, and sync

**Files:**
- `faro-account.js` and newly justified backend adapter modules only after provider boundary is explicit.
- Tests: `tests/account-contract.test.mjs`, `tests/b9-account-continuity-contract.test.mjs`, plus new adapter/sync contracts.

**Interfaces:**
- Produces: authenticated account boundary, remote sync/recovery, conflict policy, and local-first compatibility without making browser storage the cloud authority.

- [ ] Discover whether a real FARO backend project already exists; do not reuse FARO Corridas backend.
- [ ] If no real backend boundary exists, record `BLOCKED_EXTERNAL_RESOURCE` rather than fake PASS.
- [ ] If available, define schema/auth/sync ownership and write falsifiers for unauthorized read/write, account restore, conflict resolution, duplicate sync, and legacy local migration.
- [ ] Implement adapter behind existing frontend seams; no service secret in client bundle.
- [ ] Execute real backend tests and recovery path.
- [ ] Close N5 only with `EXTERNAL_SERVICE_VERDICT=PASS` plus runtime evidence.

### Task 8: N6 commercial entitlement

**Files:**
- commercial/payment adapter modules only after provider credentials/server boundary exist.
- Tests: entitlement, webhook idempotency, checkout return, expired/canceled subscription, offline read of last known entitlement.

**Interfaces:**
- Produces: payment state separate from financial-driver state and webhook-authoritative entitlement.

- [ ] Verify real Stripe/payment test environment and secure server-side webhook boundary exist.
- [ ] If unavailable, record exact external blocker; do not simulate FINAL_PASS.
- [ ] Implement hosted checkout handoff and server-authoritative entitlement without collecting card data in FARO.
- [ ] Test webhook replay/idempotency, subscription state transitions, client entitlement refresh, and failure recovery.
- [ ] Verify privacy/support/terms operational surfaces required by release.
- [ ] Close N6 only with real provider test evidence.

### Task 9: N7 physical release

**Surfaces:** exact release SHA, installed PWA/device, release/deploy target, Linear N7, Ledger.

**Interfaces:**
- Produces: final release verdict.

- [ ] Freeze exact candidate SHA and run full static/runtime/build regression.
- [ ] Validate install/update/offline/reopen on physical target.
- [ ] Execute full human journey: onboarding → Home → Registrar → Planejar → Histórico/Central → account/sync → commercial entitlement where applicable.
- [ ] Confirm keyboard/small-screen/touch behavior, no duplicate onboarding/listeners, and no stale PWA shell.
- [ ] Confirm external backend/payment on candidate build when launch scope requires them.
- [ ] Record physical evidence and independent final audit/meta-audit.
- [ ] `FINAL_PASS` only when all applicable static/runtime/physical/external verdicts are PASS on the same release lineage.

### Task 10: Finish and branch retirement

**Surfaces:** GitHub branches/PRs, Linear, Notion, Ledger.

- [ ] Merge/integrate only after the corresponding gate passes.
- [ ] Recheck surviving branches against the new target after each integration.
- [ ] Drain durable knowledge to Notion, mutable workstream state to Linear, and evidence to Ledger.
- [ ] Mark absorbed branches `READY_TO_DELETE` only after retirement proof.
- [ ] Keep the minimum durable topology: one stable integration/release line plus only justified active workstreams.
- [ ] Final owner-facing status must name any gate that remains blocked; never claim N7 if a physical/external requirement was not executed.
