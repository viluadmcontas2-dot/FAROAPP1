# FARO Repo-first Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make FARO remotely reconstructible from GitHub alone, consolidate one canonical lineage, retire Linear/Netlify execution assumptions, and safely remove redundant branches.

**Architecture:** Start from preserved functional SHA `3eb2b722...`, materialize governance/Spec Kit on one WorkUnit branch, then neutralize hosting-specific build names, classify every branch by remote compare, retire the legacy PR, remove only proven redundant branches, and merge one clean PR to `main` after verification.

**Tech Stack:** GitHub Issues/PRs/API, Node.js static PWA tests/build, Remote Desktop for local verification when online, manual GitHub Actions only for remote proof.

**Spec:** `specs/active/FARO-WU-001/spec.md`

## Global Constraints

- REMOTE_FIRST=ALWAYS.
- No source reconstruction from Linear/Notion.
- No branch deletion without remote proof.
- No production deploy in WU-001.
- Preserve Stripe/Supabase behavior and `billingEnabled=false`.
- Actions-last.

---

### Task 1: Materialize repo-first governance

**Files:** AGENTS.md, PROJECT.md, STATUS.md, governance/*, specs/active/FARO-WU-001/*, Issue #13.

- [ ] Write all governance/Spec Kit files atomically on the WU branch.
- [ ] Fetch/read them back from the resulting remote SHA.
- [ ] Mark A1/A2 proven only after readback.

### Task 2: Make verification economic

**Files:** `.github/ISSUE_TEMPLATE/workunit.yml`, `.github/pull_request_template.md`, `.github/workflows/manual-faro-verify.yml`, `.github/workflows/manual-faro-release-verify.yml`.

- [ ] Remove heavy automatic PR trigger workflow.
- [ ] Add manual fast/full/release workflows with concurrency cancellation.
- [ ] Verify workflow files remotely and mark A3.

### Task 3: Neutralize hosting-specific build coupling

**Files:** `scripts/build-static-site.mjs`, `package.json`, workflow references, deployment policy tests/docs.

- [ ] Add a contract that active build command is provider-neutral and no active workflow/deploy path targets Netlify.
- [ ] Rename the build script without changing generated `_site` behavior.
- [ ] Update package/workflows/tests.
- [ ] Run syntax/contracts/build/built-artifact audit on exact remote SHA.
- [ ] Mark A4 only after pass.

### Task 4: Audit branch lineage

**Files:** `docs/evidence/FARO-WU-001-branch-inventory.md`, STATUS.md, workunit.json.

- [ ] Fetch all branch tips.
- [ ] Compare each tip against the WU branch/current product lineage.
- [ ] Classify each branch KEEP_CANONICAL, REDUNDANT_DELETE, or QUARANTINED_UNIQUE with commit evidence.
- [ ] Mark A5.

### Task 5: Consolidate PR lineage

- [ ] Verify WU branch contains the complete source tree represented by legacy PR #12.
- [ ] Open one draft PR from WU branch to `main`.
- [ ] Update Issue #13/workunit.json with PR.
- [ ] Close PR #12 as superseded with pointer to Issue #13/new PR only after comparison proof.
- [ ] Mark A6/A9 as applicable.

### Task 6: Delete proven redundant branches

- [ ] Delete only branches classified REDUNDANT_DELETE.
- [ ] Re-list branches and verify deletion readback.
- [ ] Leave unique branches quarantined until absorbed.
- [ ] Record receipt and mark A7.

### Task 7: Final verification and merge readiness

- [ ] Prefer Remote Desktop local run on exact SHA: `npm run check`, `npm run build`, built-artifact contract.
- [ ] If local executor unavailable, run one manual GitHub full verify as remote proof.
- [ ] Ensure no deployment occurs.
- [ ] Update STATUS/workunit evidence and mark A8.

### Task 8: Close cutover and create next WorkUnit

- [ ] When all acceptance items pass, merge the clean WU PR to `main`.
- [ ] Verify `main` readback and branch tree.
- [ ] Archive FARO-WU-001 spec and close Issue #13 with receipt.
- [ ] Create FARO-WU-002 — Vercel cutover + commercial completion.
- [ ] Point STATUS.md to WU-002 and mark A10.
