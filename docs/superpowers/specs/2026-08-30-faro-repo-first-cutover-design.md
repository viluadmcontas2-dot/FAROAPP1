# FARO Repo-first Cutover Design

## Decision

Adopt the same remote-first governance pattern proven in PULSE-RIDE/OMEGAS: GitHub remote as sole durable engineering truth, Spec Kit WorkUnits, GitHub Issues as execution ledger, one branch/PR lineage per material unit, Actions-last, and local execution against exact remote SHA.

## Cutover source

Preserve `3eb2b72283545a4a51aac5749ca102691ba294ec` as the functional starting snapshot. Do not rebuild from `main`, Linear, Notion or an old release branch.

## Authority

`AGENTS.md → PROJECT.md → STATUS.md → active WorkUnit → Issue → branch → PR → evidence`.

Linear is retired as execution writer. Notion is contextual/historical only. External providers are evidence/runtime surfaces.

## Branch model

The cutover branch is the single consolidation lineage. Legacy branches are classified by remote commit comparison; delete only proven redundant tips. Unique tips are quarantined until absorbed or intentionally retained.

## Verification

Local/Remote Desktop is preferred for syntax, contracts, full regression and build on exact remote SHA. GitHub Actions are manual/selective remote proof only. No deploy is part of WU-001.

## Hosting consequence

Netlify is retired. Build becomes provider-neutral. Vercel configuration/deploy belongs to FARO-WU-002 after WU-001 establishes a clean canonical `main`.
