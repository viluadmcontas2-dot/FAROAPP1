# FARO-WU-002B — Product hardening sem contaminação comercial

Data: 2026-10-12
Issue: #17 — https://github.com/viluadmcontas2-dot/FAROAPP1/issues/17
Approved direction: owner replied "Siga" after the repo-first issue design.
Authority: remote GitHub FAROAPP1; base `main@5baf4356d6d63561be94cca48a44525b10e04fa3`.

## Objective
Corrigir problemas reproduzidos de integridade do pipeline e preparar o fechamento funcional/UX do FARO Financeiro, **sem reescrever o núcleo nem interferir na WorkUnit comercial**.

## Context verified
- WU-001 PR #14 merged; WU-002 Issue #15 / draft PR #16 remains active on its own branch, commercial config gate unresolved at last evidence.
- Fresh clean clone at exact main SHA on Windows with `core.autocrlf=true`: `npm run check` failed while hashing `legacy-shell.html` (actual 26abd1..., canonical expected 2562a7...).
- Fresh clean clone at same SHA with `core.autocrlf=false`: `git ls-files --eol legacy-shell.html` reported i/lf w/lf, original SHA-256 matched; `npm run check` PASS, `npm run build` PASS.
- A second RED on the Windows default checkout also exposed all three platform SVG assets being converted to CRLF while `platform-earnings-contract.test.mjs` compares immutable SHA-256. The seven-file fix addresses both gates.\n- Root cause: checkout EOL transformation of protected byte-hashed source. This is a portability defect, **not** confirmed corruption or calculation error.

## Design
1. Pin checkout line endings of the seven SHA-protected text files and platform vector assets via explicit `.gitattributes`: `legacy-shell.html`, `app.js`, `faro-mark.svg`, `icon.svg`, and the three SVG platform assets as `text eol=lf`.
2. Preserve exact bytes/hashes and the existing strict byte verification; never normalize the hashes at verification time.
3. Add an automated static contract in the existing baseline test, RED without attributes, GREEN once added.
4. Verify on real Windows executor with default `core.autocrlf=true` using fresh checkout of remote branch SHA: protected files w/lf, full check and build green; also exercise the canonical LF checkout as a control.
5. Only after this slice is proven may product-level work advance: document actual UI and financial workflows, reproduce any confirmed functional defects, implement minimal patches with separate tests; never restyle globally on speculation.

## Invariants
- No edit to protected core source bytes or `ci/baseline-integrity.json` expected values.
- No Stripe live, billing enablement, Supabase data mutation, Vercel deploy, paid provider, secret readback, branch deletion or automatic workflow.
- Existing `main` and WU-002 branch untouched; proposed changes via Issue #17 + WU-002B branch + draft PR to `main`.
- Remote read-after-write every commit/ref. Windows bench is execution evidence tied to exact remote SHA, never primary source.
- A browser and Android validation is still mandatory for UI/physical PASS; Node checks alone cannot justify launch.

## Acceptance
- G1: RED portably demonstrable on old main when Git checkout converts protected files to CRLF.
- G2: explicit LF checkout policy for protected files; no core content or baseline hash changes.
- G3: test fails without the policy, succeeds with it.
- G4: fresh Windows clone at exact new remote SHA with autocrlf=true passes full `npm run check` and `npm run build`; `git ls-files --eol` w/lf.
- G5: review remote diff; only declared files; WU-002 remains unchanged and billing disabled.
- G6: record next work as genuinely unproven, without claiming browser/Android E2E.

## Blind spots
A user whose checkout predates attributes may need re-checkout of protected files to normalize their worktree; never overwrite uncommitted user work. CDN/installation, sync conflicts and UX issues require separate dynamic evidence before fixes.
