# FARO-WU-002B — Windows checkout integrity receipt

Date: 2026-10-12 (BRT)
Repository: `viluadmcontas2-dot/FAROAPP1`
Issue: https://github.com/viluadmcontas2-dot/FAROAPP1/issues/17
Base authority: `main@5baf4356d6d63561be94cca48a44525b10e04fa3`
Implementation source: `wu/faro-wu-002b-product-hardening@1b6c2eb31921075f45fb5eda062906fed347b8a7`

## Hypothesis, falsifiers and outcomes

### RED A: original main
On Windows MMMACHINE (Node 24.18.0, git 2.45.1, PowerShell), clean clone of exact main SHA with Windows `core.autocrlf=true` checked out `legacy-shell.html` as `i/lf w/crlf` and `npm run check` failed in `scripts/build-static-site.mjs`:
- expected: `2562a71314dc3f4fe834985e1a39e022e1565c1268a732917ad267a3cf09ab7b`
- actual: `26abd1c8229d5095acf8dbc442fba90ef58678a78a49a16d2416daf83dcddd5e`

Same SHA cloned with `git -c core.autocrlf=false clone`: `i/lf w/lf`, canonical SHA matched, `npm run check` EXIT 0, `npm run build` EXIT 0. This isolates EOL conversion rather than repository corruption.

### RED B: regression before policy
- Test-only commit `c15832964efb57085b093c025ab07194c230022b`: baseline EOL contract failed with `ENOENT: .gitattributes`; syntax was valid.
- First policy `820e7709fa36b55454b3e5a5f23b3bb6e102c0a6` repaired four core paths, but Windows default clone revealed `platform-earnings-contract.test.mjs` byte-SHA failure: `assets/platforms/faro-platform-99.svg` expected `d10212...5e51b`, actual `8c06d8...a015`; the three platform SVGs were `i/lf w/crlf`.
- Expanded test-only commit `9068ab0d58c09911a6ae4de5aa3377c60d102d4f` failed exactly on missing `text eol=lf` contract for `assets/platforms/faro-platform-99.svg`.

### GREEN: exact source from GitHub
- Policy commit `1b6c2eb31921075f45fb5eda062906fed347b8a7` pins seven immutable text files with `text eol=lf`, without editing their bytes.
- A new remote clone using `git -c core.autocrlf=true clone --depth 1 --branch wu/faro-wu-002b-product-hardening` confirmed the exact SHA above.
- `git ls-files --eol legacy-shell.html app.js faro-mark.svg icon.svg 'assets/platforms/*.svg'`: all seven `i/lf w/lf attr/text eol=lf`.
- `npm run check`: **EXIT 0**.
- `npm run build`: **EXIT 0**; output `FARO static site ready: protected core copied to _site`.
- Chrome headless served locally from the exact same `_site` (temporary Python HTTP server): loaded rendered DOM of 154,515 characters; `view-dashboard`, `recordGross`, install gate and FARO tagline present; generic fatal shell screen absent. HTTP server terminated after probe.
- `git status --porcelain` returned no tracked modifications in fresh bench.

## Source and safety invariant
- Remote diff limited to `.gitattributes`, one baseline test, specs/plan/WorkUnit and this receipt. The immutable financial `app.js`, `legacy-shell.html`, SVG asset bytes and expected hash constants are unchanged.
- `main` has not been modified. Commercial `wu/faro-wu-002-vercel-commercial` / PR #16 remains separate.
- No GitHub Actions, paid hosting, deploy, Stripe/Supabase mutation, billing enablement, live user financial data or physical-device tests.

## Explicitly not proven
This is a **portability/build correctness** proof and a limited browser DOM startup smoke. It does NOT validate clicking through registration, lossless cloud sync, real signed Stripe checkout/webhooks, accessible mobile layouts or physical Android. All remain downstream acceptance gates, not implicit PASS.

## Next unproven
Complete controlled dynamic journeys (boot, daily registration by platform, edit history, backup/restore, cross-account conflict), reproduce a specific defect before any source rewrite, then stage focused RED→GREEN. Coordinate planned release WorkUnit after commercial PR #16 is reconciled. No production deployment.
