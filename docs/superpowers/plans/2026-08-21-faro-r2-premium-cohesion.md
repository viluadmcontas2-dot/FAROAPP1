# FARO R2 Premium Cohesion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the FARO R2 premium cohesion batch: shared semantic card grammar, earnings by platform, coherent Home/Planning/History/Central, and a transversal readiness audit while preserving canonical state and finance.

**Architecture:** Keep existing runtime owners and protected financial core. `styles.css` becomes the single semantic visual foundation; existing dynamic modules adopt shared classes/data attributes. `faro-register.js` extends the canonical record draft with `earningsBySource`, while existing `saveDay()` remains the only record writer. PWA delivery is versioned coherently and tested locally/ephemerally first.

**Tech Stack:** Vanilla JS, CSS, HTML shell composition, service worker/PWA, Node 22 contract tests, Chromium 144/Xvfb when permitted.

**Spec:** `docs/superpowers/specs/2026-08-21-faro-r2-premium-cohesion-design.md`

## Global Constraints

- `PROJECT_ID=FARO` and Linear is mutable execution authority.
- Workstream branch is `feat/vit-196-platform-earnings`; do not create another branch for this batch.
- `app.js` and `legacy-shell.html` are protected core and must remain byte-identical to base.
- No parallel state store, financial formula, router, record writer, cost writer or reserve writer.
- `UIUX-CUSTOMROM + UIUX-OMEGADEV` are mandatory design authorities.
- `TEST_EXECUTION_POLICY=EPHEMERAL_RUNTIME_FIRST`.
- `REMOTE_CI_POLICY=DENY_BY_DEFAULT`.
- `LOCAL_SOURCE_MUTATION=DENIED`; local copies are runners only.
- Physical-phone PASS remains separate from static/runtime evidence.
- Payments/payment providers are out of this batch.

---

### Task 1: R2/UI0 semantic visual foundation

**Files:**
- Modify: `styles.css`
- Create: `tests/premium-ui-grammar-contract.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `.card-vetta`, FARO color/spacing grammar.
- Produces: `.faro-hero`, `.faro-action-card`, `.faro-state-card`, `.faro-detail-row`, `.faro-card-eyebrow`, `.faro-card-title`, `.faro-card-value`, `.faro-card-support`, `.faro-card-action`, and `data-faro-tone` semantics.

- [ ] **Step 1: Write the failing grammar contract**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css = await readFile('styles.css','utf8');
for (const token of ['--faro-radius-hero','--faro-radius-card','--faro-shadow-card','--faro-shadow-hero']) assert.match(css,new RegExp(token));
for (const cls of ['.faro-hero','.faro-action-card','.faro-state-card','.faro-detail-row','.faro-card-eyebrow','.faro-card-action']) assert.equal(css.includes(cls),true,`${cls} ausente`);
for (const tone of ['positive','attention','risk','action']) assert.equal(css.includes(`[data-faro-tone="${tone}"]`),true,`tone ${tone} ausente`);
assert.match(css,/min-height:var\(--faro-touch\)/);
assert.match(css,/prefers-reduced-motion:reduce/);
```

- [ ] **Step 2: Run RED**

Run: `node tests/premium-ui-grammar-contract.test.mjs`
Expected: FAIL because semantic classes/tokens are missing.

- [ ] **Step 3: Add the shared foundation to `styles.css`**

Add root tokens and semantic classes only; do not remove `.card-vetta` compatibility. Use one tone variable (`--faro-accent-rgb`) so consumers do not invent colors.

- [ ] **Step 4: Run GREEN**

Run: `node tests/premium-ui-grammar-contract.test.mjs && node tests/ui-grammar.test.mjs`
Expected: PASS.

- [ ] **Step 5: Add contract to `npm run check`**

Place it before surface-specific premium contracts so the foundation fails first.

---

### Task 2: R2/REG premium platform cards and canonical gross

**Files:**
- Modify: `faro-register.js`
- Keep: `faro-register-earnings.js`
- Keep: `assets/platforms/faro-platform-{uber,99,indrive}.svg`
- Modify: `tests/platform-earnings-contract.test.mjs`
- Modify: `tests/register-contract.test.mjs`

**Interfaces:**
- Consumes: `window.FaroRegisterEarnings.{normalize,total,hasAny}`.
- Produces: canonical `record.gross` plus optional `record.earningsBySource` through the existing `recordDraft()`/`saveDay()` path.

- [ ] **Step 1: Extend RED contract for card anatomy**

Require the register source to use semantic unit classes and state labels:

```js
for (const token of ['faro-action-card','faro-state-card','data-faro-platform-state','Não usado']) assert.equal(register.includes(token),true,token);
```

Also assert no `state.records.push/splice` appears in FARO UX code.

- [ ] **Step 2: Run RED**

Run: `node tests/platform-earnings-contract.test.mjs && node tests/register-contract.test.mjs`
Expected: FAIL on premium anatomy/state copy only; existing earnings behavior should remain characterized.

- [ ] **Step 3: Refine platform cards**

Each platform article becomes `faro-action-card` with semantic tone and state text. Toggle remains the only activator. When value is zero show `Não usado`; when positive show `app.money(value)`. Keep amount input hidden until active.

The total container becomes `faro-state-card` with `data-faro-tone="action"`. Preserve `grossInput` as canonical compatibility input and preserve current `recordDraft()` extension.

- [ ] **Step 4: Verify register behavior**

Run:

```text
node --check faro-register-earnings.js
node --check faro-register.js
node tests/platform-earnings-contract.test.mjs
node tests/register-contract.test.mjs
node tests/b9-finance-register-contract.test.mjs
```

Expected: PASS.

---

### Task 3: R2/HOME cockpit hierarchy

**Files:**
- Modify: `faro-home-r2.js`
- Create: `tests/premium-home-contract.test.mjs`

**Interfaces:**
- Consumes: canonical `app.weekContext`, `app.calculations`, `app.navigateToPrimary`, `FaroFinance.nextPendingOccurrence`.
- Produces: semantic classes/tone attributes only; no new state.

- [ ] **Step 1: Write RED contract**

Require week/month/attention/register intent to resolve to semantic units and forbid financial formulas/writers in Home.

```js
assert.match(home,/data\.faroRole = 'week'/);
assert.match(home,/faro-state-card/);
assert.match(home,/faro-action-card/);
assert.doesNotMatch(home,/state\.(targetProfit|records|costs)\s*=|contributionKm\s*=/);
```

- [ ] **Step 2: Run RED**

Run: `node tests/premium-home-contract.test.mjs`
Expected: FAIL on semantic anatomy.

- [ ] **Step 3: Apply premium classes and compact exception behavior**

Use Action Card for the Register CTA/month target, State Card for week, and State Card with attention/risk tone for financial exception. Preserve the existing one-touch routes and the current week math.

- [ ] **Step 4: GREEN + regressions**

Run: `node tests/premium-home-contract.test.mjs && node tests/home-contract.test.mjs && node tests/navigation-contract.test.mjs`
Expected: PASS.

---

### Task 4: R2/PLAN premium planning and Money anatomy

**Files:**
- Modify: `faro-r3b.js`
- Create: `tests/premium-planning-anatomy-contract.test.mjs`

**Interfaces:**
- Consumes: existing R3 Planning/Money view models and R3 routing.
- Produces: shared semantic classes/data tones; no writer changes.

- [ ] **Step 1: Write RED anatomy contract**

Require R3 tiles/hero/radar items to carry shared semantics and forbid new state writes.

```js
assert.match(r3b,/faro-action-card/);
assert.match(r3b,/faro-state-card/);
assert.match(r3b,/faro-hero/);
assert.doesNotMatch(r3b,/app\.state\.[A-Za-z0-9_]+\s*=/);
```

- [ ] **Step 2: Run RED**

Run: `node tests/premium-planning-anatomy-contract.test.mjs`
Expected: FAIL on shared semantic classes.

- [ ] **Step 3: Adopt shared grammar without changing ownership**

Add shared classes to existing hero/tiles/Money states. Use `data-faro-tone` from current `calm/upcoming/attention/risk` view-model state. Keep current CSS where it provides surface-specific polish, but shared tokens own radius/shadow/tone baseline.

- [ ] **Step 4: GREEN + existing R3 contracts**

Run:

```text
node tests/premium-planning-anatomy-contract.test.mjs
node tests/planning-r3-contract.test.mjs
node tests/planning-r3b-contract.test.mjs
node tests/planning-r3b3-navigation-contract.test.mjs
node tests/physical-commit-boundary-contract.test.mjs
```

Expected: PASS.

---

### Task 5: R2/HIST History and Central hygiene

**Files:**
- Modify: `faro-r2-polish.js`
- Modify: `faro-navigation.js` only if needed to expose source detail in existing history detail path; do not replace router.
- Create: `tests/premium-history-central-contract.test.mjs`

**Interfaces:**
- Consumes: `app.state.records`, existing history list/detail navigation, existing Central DOM.
- Produces: semantic row/group classes and optional source-detail copy; no analytics engine.

- [ ] **Step 1: Write RED contract**

Require History list prominence, collapsible analytics, Central intent groups, tour replay, and legacy-source copy if source detail is surfaced.

- [ ] **Step 2: Run RED**

Run: `node tests/premium-history-central-contract.test.mjs`
Expected: FAIL on semantic class/group guarantees not yet present.

- [ ] **Step 3: Apply Detail Row / grouping grammar**

Use Detail Rows for history entries and Central rows. Preserve the existing chart `<details>` behavior. If a record has `earningsBySource`, show a compact breakdown in the existing detail/edit context; otherwise show `Faturamento sem origem detalhada` and never fabricate a source.

- [ ] **Step 4: GREEN + navigation regressions**

Run: `node tests/premium-history-central-contract.test.mjs && node tests/r2-surface-contract.test.mjs && node tests/navigation-contract.test.mjs && node tests/guided-tour-contract.test.mjs`
Expected: PASS.

---

### Task 6: PWA generation reconciliation

**Files:**
- Modify: `sw.js` only if product-source generation changes require cache bump.
- Modify: `app-shell.html` only if module version changes.
- Modify: `scripts/build-netlify-of.mjs` only if new runtime file is introduced (none expected).
- Update affected generation contracts.

**Interfaces:**
- Consumes: current installed generation `core-22`, helper v1, register v2.
- Produces: one coherent installed runtime generation.

- [ ] **Step 1: Write/adjust RED generation expectation before bump**

If any loaded runtime JS/CSS versioned resource changed and cache-busting is required, set the expected new generation in `tests/platform-earnings-delivery-contract.test.mjs` and affected install/update/baseline contracts first.

- [ ] **Step 2: Run RED**

Expected: FAIL only on generation mismatch.

- [ ] **Step 3: Reconcile shell/SW/build**

Bump exactly once. Keep helper before register and cache all SVGs.

- [ ] **Step 4: GREEN generation contracts**

Run affected delivery/install/update/baseline contracts.

---

### Task 7: R2/AUDIT local/ephemeral full verification

**Files:**
- No product writes unless a genuine test failure identifies a root cause; any fix re-enters TDD.

**Interfaces:**
- Consumes: exact remote feature HEAD.
- Produces: auditable technical verdict and residual-scope list.

- [ ] **Step 1: Re-open remote HEAD and compare to base**

Confirm changed files are within approved write surfaces and protected core is unchanged.

- [ ] **Step 2: Materialize a read-only execution snapshot**

Fetch exact remote blobs into an ephemeral directory. Verify important blob hashes before running.

- [ ] **Step 3: Run syntax and full Node suite**

```text
node --check faro-register-earnings.js
node --check faro-register.js
node --check faro-home-r2.js
node --check faro-r3b.js
node --check faro-r2-polish.js
npm run check
```

Expected: PASS with no material warning/error.

- [ ] **Step 4: Run Chromium matrix when environment permits**

Minimum behavior matrix:

1. 180 Uber + 120 99 + 70 inDrive + 40 Extras = 410.
2. One platform only.
3. Unused sources remain zero.
4. All-zero detailed save blocks.
5. Edit detailed record restores exact values.
6. Edit legacy record remains legacy until opt-in.
7. Legacy save preserves gross and no source is invented.
8. Double save yields one date record.
9. Draft restores detailed values when storage origin is available.
10. Installed/offline path serves helper/register/SVGs when service worker origin is available.

Environment inability to provide storage/SW origin is `HARNESS_LIMIT`, not product PASS/FAIL.

- [ ] **Step 5: Program residual-scope audit**

Compare source/Linear/Program Mestre for remaining material domains. Distinguish:

- code/product scope complete;
- physical validation pending;
- commercial payment providers pending;
- any other commercial/backend/push/release scope still genuinely pending.

Do not collapse these into one claim.

- [ ] **Step 6: Update Linear tracks and Notion ledger/projection**

Record exact SHA, tests, harness limits, remote CI usage, protected-core verdict, and next physical/commercial gate.

- [ ] **Step 7: Independent audit preparation**

Move completed implementation tracks to `In Review` rather than `Done` if independent audit/physical gate is still required.

---

### Task 8: Final branch verification and handoff

**Files:**
- No source mutation.

- [ ] **Step 1: Re-open final remote HEAD**

Confirm branch is stable.

- [ ] **Step 2: Re-run critical targeted contracts against final HEAD snapshot**

At minimum: premium grammar, register/platform, Home, Planning anatomy, History/Central, baseline, install/update, physical commit boundary.

- [ ] **Step 3: Record executor verdict**

Allowed executor verdicts:

- `IMPLEMENTED_LOCAL_RUNTIME_GREEN_AWAITING_AUDIT_PHYSICAL`
- `IMPLEMENTED_STATIC_GREEN_HARNESS_LIMIT_AWAITING_AUDIT_PHYSICAL`
- `FAIL_MATERIAL`

Never report `PHONE_PHYSICAL_PASS` without phone evidence.
