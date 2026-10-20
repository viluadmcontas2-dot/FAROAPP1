# FARO-WU-002 — Vercel Runtime Contract Receipt

Date: 2026-08-30

`FARO_WU002_B3_VERCEL_RUNTIME_CONTRACT=PASS`

## Target

- hosting target: Vercel
- build command: `npm run build`
- output directory: `_site`
- production deploy during this proof: NONE
- canonical source SHA verified: `34450b6db77b31211820ea9a365b55f38fa54d89`

## Runtime contract

`vercel.json` now defines:

- `$schema = https://openapi.vercel.sh/vercel.json`
- `buildCommand = npm run build`
- `outputDirectory = _site`
- SPA fallback rewrite: `/(.*) -> /index.html`
- service-worker no-cache + `Service-Worker-Allowed: /`
- manifest no-cache + manifest content type
- index no-cache
- security headers: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`

## TDD / verification

RED:
- source SHA: `0229de2af9d62e74e15e04cd9e1ce136156916cc`
- run: `33333411178`
- expected failure: `ENOENT vercel.json`

First GREEN attempt:
- source SHA: `c6b25c2e120fa224142cb2726abd873de56dbe23`
- run: `33333464665`
- hosting contract passed, but full suite exposed an unrelated repo-first regression: hardcoded `FARO-WU-001` path in `tests/repo-first-governance-contract.test.mjs`.

Root-cause fix:
- commit: `34450b6db77b31211820ea9a365b55f38fa54d89`
- governance test now discovers exactly one active WorkUnit instead of hardcoding an archived WU.

Final GREEN:
- run: `33333535649`
- `npm run check`: PASS
- `npm run build`: PASS
- `_site/index.html`: PASS
- `_site/sw.js`: PASS
- `_site/manifest.webmanifest`: PASS
- `_site/.well-known/faro-baseline.json`: PASS
- transformed storage key in `_site/app.js`: PASS
- ephemeral `ops/faro-wu-002-vercel-red` branch self-deleted after GREEN: PASS

## Vercel provider preflight

Connected team: `team_HECWodzpFDWJQCxmo9ZUwmv5` (`vitoohugo333s-projects`, Hobby).

Current provider inventory before project import:
- existing project: `brasko` only
- FARO project: NOT YET CREATED

Therefore:
- B3 build/runtime compatibility = PROVEN
- B2 provider project creation/import = IN_PROGRESS

Next: import GitHub repo `viluadmcontas2-dot/FAROAPP1` as Vercel project `faro-financeiro` in Preview/non-production mode, then read back project/deployment identity before commercial secret wiring.
