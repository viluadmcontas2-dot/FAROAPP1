# FARO-WU-001 — Branch lineage inventory

Date: 2026-08-30

## Canonical cutover lineage

- Functional source preserved: `3eb2b72283545a4a51aac5749ca102691ba294ec`.
- Active WU branch: `wu/faro-wu-001-repo-first-cutover`.
- Repo-first governance: `c558c34927d95d6d177f1d5b0f69f41daad188cb`.
- Provider-neutral build: `653b9c81d2189ce13a420c444e5eddb486a9f3c5`.
- Historical archive commit: `9b8c268a2d29423efc40ee3e2b5cd44bc62cf250`.
- Historical archive branch: `archive/pre-repo-first-lineages-20260830`.
- Legacy-history reconciliation: `cf99cc74386bd17a180827d543714503f130d77d`.
- Active Netlify config retired: `d4678811ce7450b8abbd45ecdcad7696b792cccd`.
- Repo-first PR: #14 → `main`; fresh GitHub readback reports `mergeable=true`.
- Legacy PR #12: closed as superseded, unmerged; old head preserved by ancestry/archive.

## Archive proof

Commit `9b8c268a2d29423efc40ee3e2b5cd44bc62cf250` was remotely read back with every pre-cutover branch tip below as a direct parent. Therefore deleting those branch refs does not make their commit histories unreachable: they remain reachable from `archive/pre-repo-first-lineages-20260830`, which is itself a parent of the active WU lineage through `cf99cc74386bd17a180827d543714503f130d77d`.

## Classification

| Branch | Pre-cutover tip | Classification | Reason |
|---|---|---|---|
| `main` | `12f138813065fb146ad34e4d1fb97d111108f93c` | KEEP_CANONICAL | final stable line after WU merge |
| `archive/pre-repo-first-lineages-20260830` | `9b8c268a2d29423efc40ee3e2b5cd44bc62cf250` | KEEP_ARCHIVE | sole legacy genealogy anchor |
| `wu/faro-wu-001-repo-first-cutover` | active | KEEP_ACTIVE | Issue #13 / PR #14 |
| `FAROAPP1CLEAN` | `24253a7810b361148f88470e9a0444777b33601f` | ARCHIVED_DELETE | tip anchored in archive |
| `feature/bloco-4a-planejamento` | `24253a7810b361148f88470e9a0444777b33601f` | ARCHIVED_DELETE | duplicate tip, anchored |
| `audit/runtime-contracts-4f386ccc` | `2e8d69451b64b560aafbe79afb6ad8a36fa64432` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-8c06c79a` | `64eeba40ebe29a8bcd2b19eef448f4b12c63b7c5` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-9f7996a0` | `df3ef7ecb73c96d4065ea548071387757a89e058` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-10db298c` | `118ca469e6335aacc97155dab5286461d93a50b1` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-31e64658` | `09af2eed664425d9e58bf525c5837d0b3c3a63dc` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-082bc9b6` | `376217e46776ef717285edc638c837083a057680` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-0482c3a5` | `e9abe06d1b7770cf8dd6bd2fa6ceb1a70a08b695` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-9411aa4b` | `2a438e9279382eb8099007a318ddb9e1a3ebc31f` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-b801f593` | `6407d7e7bef1ca48ea80ca2ebe500b625edc686c` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-c78f5f3e` | `84b573d244dcb9c9784878deb8d0acc5649dcd2d` | ARCHIVED_DELETE | audit genealogy anchored |
| `audit/runtime-contracts-f1a6623f` | `b0a7158f86bf7f2698a333f3b72804dd0c5b90db` | ARCHIVED_DELETE | audit genealogy anchored |
| `docs/vit-196-platform-earnings-design` | `544f533d3e8ce6db0c24e0b004f026dc936a9272` | ARCHIVED_DELETE | design branch anchored; design docs exist in product lineage |
| `feat/vit-196-platform-earnings` | `3eb2b72283545a4a51aac5749ca102691ba294ec` | ARCHIVED_DELETE | functional source is ancestor of active WU and archived |
| `maintenance/plan-id-fix-9f7996a0` | `962959bfa5f1cb629f8f7a7c47438d213c2e1fca` | ARCHIVED_DELETE | unique maintenance tip anchored |
| `release/faro-v1-comercial-22-08` | `df9a064ca562a2fde7cd88ff59b6ac76235c84f8` | ARCHIVED_DELETE | old release lineage anchored |
| `test/ux-r2-00-composition-contracts` | `efb89d7b917ace506934dbc6ae8e830e946c4634` | ARCHIVED_DELETE | old integration branch; ancestor/archive preserved |
| `teste-netlify-of` | `60990d00a196c6c0a61b663edd8d110ae5ffbf05` | ARCHIVED_DELETE | disconnected historical hosting lineage anchored |

## Destructive-operation gate

Actual ref deletion is still pending. The GitHub connector exposed in this session has no delete-ref operation, and Remote Desktop `MMMACHINE` is currently offline. No deletion is claimed until `git push origin --delete ...` (or equivalent supported delete-ref action) runs and the remote branch list is read back.

## Verification gate

Current WU source changed build/test/governance files after historical run 79. Therefore exact current-SHA `npm run check`, `npm run build`, and built-artifact audit remain required before merge. Historical CI is not promoted to current proof.
