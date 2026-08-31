# FARO-WU-002 — Vercel output hotfix receipt

Date: 2026-08-30

## Observed failure

The manually-created Vercel project attempted to build `viluadmcontas2-dot/FAROAPP1` from `main` at commit `360fc66743bef4d1aff46ee4b13d82b8f2ed9fb3`.

Observed build behavior:
- `npm run build` executed successfully;
- `scripts/build-static-site.mjs` produced `_site` successfully;
- Vercel then failed because it looked for the default `public` output directory.

GitHub commit status identified the Vercel project context as `Vercel – faroapp-1-mddh` and linked the failed Vercel deployment.

## Root cause

`main@360fc66743bef4d1aff46ee4b13d82b8f2ed9fb3` contained a minimal `vercel.json` that disabled automatic Git deployments but did not declare the FARO build/output contract.

## Fix

Candidate commit `d3f0c4303d61a18caf51adbacd212a07bb38e1df` changed only `vercel.json` and preserved `git.deploymentEnabled=false` while declaring:
- `buildCommand = npm run build`;
- `outputDirectory = _site`;
- SPA fallback to `/index.html`;
- PWA/service-worker cache headers;
- security headers.

## Verification

Temporary verification workflow run: `33346078602`.

The runner checked out the exact candidate SHA `d3f0c4303d61a18caf51adbacd212a07bb38e1df` so the temporary workflow itself was not part of the tested tree.

PASS:
- exact candidate SHA check;
- Vercel config contract;
- `npm run check`;
- `npm run build`;
- `_site/index.html`;
- `_site/sw.js`;
- `_site/manifest.webmanifest`;
- `_site/.well-known/faro-baseline.json`;
- built-artifact contract.

The verified candidate was cherry-picked to `main` as `5baf4356d6d63561be94cca48a44525b10e04fa3`.
The temporary `ops/faro-vercel-output-hotfix` branch was deleted by the successful job.

## Deploy discipline

No automatic Vercel deployment was triggered by the hotfix. `git.deploymentEnabled=false` remains in `main`, so a material Vercel redeploy remains an explicit/manual action.

## Verdict

- Vercel project/import identity: PROVEN through GitHub/Vercel commit status and real build execution.
- Repository-side Vercel output configuration: PROVEN.
- Successful Vercel runtime deployment after the fix: UNPROVEN until an explicit redeploy of the updated `main` is performed.
