# FARO Product Integrity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, with RED→GREEN and fresh evidence.

**Goal:** Make the strict SHA-protected FARO Financeiro build reproducible on default Windows Git checkouts without weakening integrity checks or interfering with commercial WU-002.

**Architecture:** GitHub remote main is immutable base; work on sole WU-002B implementation branch. `.gitattributes` governs checkout EOL of byte-hash protected files. Existing baseline test asserts attributes and exact SHA; strict build stays unchanged.

**Tech Stack:** Git, Node 22-24, Windows PowerShell executor, GitHub contents API / PR.

**Spec:** `docs/superpowers/specs/2026-10-12-faro-product-integrity-design.md`

## Global Constraints
- `REMOTE_FIRST=ALWAYS`; worktree/local is never source authority.
- Do not edit `app.js`, `legacy-shell.html`, assets, protected hash constants or migration/financial logic.
- Preserve Issue #15 + PR #16; production deploy and billing enablement denied.
- No new additional branches, no paid CI; full tests on exact remote SHA.
- Stop if checkout still changes any protected hash or if source HEAD differs unexpectedly.

## Review Focus
1. CRLF checkout of protected HTML must remain LF on Windows.
2. CRLF checkout of protected JS must remain LF, no hash mismatch.
3. Protected SVG assets should keep binary-equivalent bytes.
4. Strict integrity guard must still reject an actually modified protected file.
5. No impact on frontend/PWA behavior, platform payments or WU-002.

---

### Task 1: Baseline EOL RED
**Files:** Modify `tests/baseline-contract.test.mjs`.
**Interface:** baseline-integrity static test run by `npm run check`.
- [ ] Insert seven anchored assertions for `.gitattributes` protected-file `text eol=lf` entries.
- [ ] Commit test-only change on WU-002B.
- [ ] Run `node tests/baseline-contract.test.mjs` on this exact remote SHA in an LF checkout; ensure RED specifically because attributes are absent, not unrelated failure.

### Task 2: Checkout policy GREEN
**Files:** Create `.gitattributes`.
- [ ] Add seven exact `text eol=lf` entries for the four baseline-protected files plus the three platform SVG assets verified by `platform-earnings-contract.test.mjs`.
- [ ] Commit production policy change on WU-002B.
- [ ] Fresh clone remote WU-002B on Windows with normal `core.autocrlf=true`.
- [ ] Verify `git ls-files --eol` shows i/lf w/lf for HTML, JS and all platform SVG assets, and SHA-256 hash equals `ci/baseline-integrity.json`.
- [ ] Run `npm run check`, `npm run build`; record exit codes.

### Task 3: Independent review + draft PR
**Files:** only issue receipt and optionally `docs/evidence/FARO-WU-002B-line-endings-windows.md` after evidence.
- [ ] Inspect fresh remote diff, ensure protected core/hashes are unchanged and WU-002 file set untouched.
- [ ] Document base/new SHA, Windows setup, RED/GREEN and remaining unproven items.
- [ ] Create/update single draft PR linking Issue #17. Do not merge/deploy without release and integration gates.

### Task 4: Next product gate (separate slice)
**Files:** to be selected only after actual dynamic reproduction.
- [ ] Exercise browser startup, Registrar flow, backup import/export and sync-conflict scenarios on exact remote SHA.
- [ ] Classify each finding CONFIRMED/INFERRED/UNPROVEN.
- [ ] For confirmed defect, write a failing behavior test, minimal fix, then rerun proportional suite.
- [ ] Defer brand/theme adoption until screenshots and functional UI audits; financial math cannot change without independent numerical oracle.
