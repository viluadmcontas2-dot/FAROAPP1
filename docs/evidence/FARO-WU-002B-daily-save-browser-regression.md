# FARO-WU-002B — Browser regression: Registrar → Planejar save lifecycle

Date: 2026-10-12 (America/Bahia)
Authority: GitHub remote `viluadmcontas2-dot/FAROAPP1`
Tracking: Issue #17 / Draft PR #18
Base: `main@5baf4356d6d63561be94cca48a44525b10e04fa3`
Verified implementation source: `4d734345e13b58ff1517fabf9b94c34288235ae2`
Reproducible browser harness added at `66ed2ce6ba61f62350162823ae3384c7f4695bc6` in `scripts/verify-daily-save-browser.cjs`

## Root cause and observed RED state

The frozen legacy `app.js` installs rendering callbacks for an old goal-balance card. The active `faro-planning.js` reconstructs the planning target editor with `targetCard.replaceChildren(...)`, intentionally removing `#goalBalancePanel` and its `#goalAchieved` child.

A clean browser run against remote `efbfb63acbd49d91301a86981cd2dd8ea7578b02` created a local test record via the real runtime:
- Uber R$180 + 99 R$120 + inDrive R$70 + Extras R$40 = `gross=410`, `km=80`.
- `app.saveDay()` persisted one correct record, **but** threw `TypeError: Cannot set properties of null (setting 'textContent')` at `app.renderGoalBalance (...app.js:1050)`, because `#goalAchieved` had already been removed.
- Test-only source commit `4e47607c3934fc34a825a2cf4a4895ba9da47834` introduced a focused regression assertion: it failed while the obsolete render consumer remained unguarded.

## Second incompatible element exposed by iterative browser probing

A first fix at `620120fa1d5cc6aaa6f3e6f2f52c5277066f3c0b` guards only the absent `#goalBalancePanel`. Focused Node test/full suite/build all passed, but the **real browser** uncovered a second `TypeError` at `faro-planning.js:395`: `renderCards()` queried `#faroPlanHeroDays`, while active `faro-r3b.js::reshapeHero()` had replaced that DOM element with `#faroPlanDays`. The same applies to the km element (`#faroPlanHeroKm` → `#faroPlanKm`).

- Additional test-only commit `c78963f16ce66b256421d816ec0c21ebd1386732` adds contract assertions for both old/new sets of IDs and initially fails on the missing fallback.
- Final implementation `4d734345e13b58ff1517fabf9b94c34288235ae2` adapts the existing planning renderer to both DOM generations without introducing a new financial writer or changing immutable core source.

## GREEN verification on actual remote source

Windows MMMACHINE executor, Git `2.45.1.windows.1`, Node `24.18.0`, Git `core.autocrlf=true`, fresh clean clones from exact remote SHAs:
- On `4d734345e13b58ff1517fabf9b94c34288235ae2`: `node tests/planning-composition-contract.test.mjs` **EXIT 0**, `npm.cmd run check` **EXIT 0**, `npm.cmd run build` **EXIT 0**.
- On remote `66ed2ce6ba61f62350162823ae3384c7f4695bc6`: `node --check scripts/verify-daily-save-browser.cjs` **EXIT 0**, `npm.cmd run build` **EXIT 0**, `node scripts/verify-daily-save-browser.cjs` **EXIT 0**.
- Exact browser harness output:
  `PASS FARO daily save browser regression: {"date":"2026-10-12","gross":410,"km":80,"platformSources":4,"records":1}`.
- Reproducible commands from clean remote source (with Node 22+ + installed Chrome):
  ```sh
  npm run check
  npm run build
  node scripts/verify-daily-save-browser.cjs
  ```
  Windows: use `npm.cmd` if PowerShell blocks `npm.ps1`. Set `FARO_CHROME_BIN` if Chrome is installed in a nonstandard location.

## Observable contract proven

Real built FARO HTML/JS loaded in a fresh headless Chrome instance with an isolated empty browser profile. The harness sets `onboardingComplete` directly for synthetic local test state, opens the Registrar route, fills the four `earningsBySource` fields, computes the expected draft, saves via `app.saveDay()`, and independently asserts:
- No runtime exception during save;
- Exactly 1 persisted day with R$410 gross, 80km, 4 correctly classified sources;
- Local storage state exists;
- Daily result dialog remains present;
- Existing source calculation, persistent store and Stripe/Supabase code untouched.

## Boundaries NOT proven

The test deliberately bypasses the installation/onboarding gate for fixture setup. It does not prove the complete manual onboarding journey, physical Android layout, the user's real payment or banking records, cloud sync across devices, signed billing webhooks, external CDN offline behavior, or production Vercel deployment. Those remain separate release gates.

No automatic GitHub Actions, Vercel deploy, Stripe/Supabase provider write, live billing enable or user-financial-data use in this WorkUnit.
