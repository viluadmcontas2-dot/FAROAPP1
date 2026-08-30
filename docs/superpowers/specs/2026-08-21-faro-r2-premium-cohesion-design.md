# FARO R2 Premium Cohesion — Design Spec

## Status

Approved by owner on 2026-08-21 for inline execution.

## Program and authority

- `PROJECT_ID=FARO`
- Linear execution parent: `VIT-267`
- Milestone: `FARO-2 — Refinamento 360 Motorista-First`
- Workstream: `FARO-R2-PREMIUM`
- Branch: `feat/vit-196-platform-earnings`
- Base: `test/ux-r2-00-composition-contracts@efb89d7b917ace506934dbc6ae8e830e946c4634`
- Notion direction page: `FARO-R2 Premium — Direção, Tracks e Contrato de Execução`
- UI/UX authority: `UIUX-CUSTOMROM + UIUX-OMEGADEV`
- Source authority: GitHub remote
- Mutable execution authority: Linear
- Tests: ephemeral/local runtime first; remote CI deny-by-default
- Protected core: `app.js`, `legacy-shell.html`

## Human outcome

FARO must feel like one coherent premium mobile product built for a working driver, not a collection of screens. A driver should understand each surface in about two seconds: what matters, what it means, and what to do next.

The UI exposes intention and consequence; architecture stays behind the product. Complexity appears only when the user needs it.

## Gate chain

`R2/UI0 → R2/REG → R2/HOME → R2/PLAN → R2/HIST → R2/AUDIT`

Payment providers / payment rails are outside this batch.

## Semantic visual grammar

Only four top-level semantic visual units are allowed:

1. **Hero** — one dominant decision or state.
2. **Action Card** — one human intention with a clear action.
3. **State Card** — one situation that must be understood before acting.
4. **Detail Row** — list/row content that is not an independent card.

If a surface does not map to one of these, it should remain plain hierarchy/section, not become another decorative card.

### Internal anatomy

Every premium unit follows this reading order when applicable:

`microcontext → primary information → consequence/context → next action`

The hierarchy must survive without gradients or icons. Decoration may reinforce hierarchy but never create it.

## Visual direction

- light FARO as the default product surface;
- deep `#0B1121` as the strong anchor and occasional protagonist surface;
- FARO blue for intention/navigation/action;
- green only for healthy/success semantics;
- amber/orange only for attention/reversible warning;
- red only for risk/failure;
- neutral surfaces structure information;
- shadows separate semantic units subtly rather than making every box float;
- rounded geometry stays consistent, but radius is not a substitute for hierarchy;
- 48px minimum interactive target;
- visible keyboard focus;
- reduced-motion support;
- practical mobile contrast;
- no decorative card nesting.

## R2/UI0 — foundation

`styles.css` remains the single visual foundation. It will define semantic tokens and reusable classes for Hero, Action Card, State Card and Detail Row.

No JavaScript design-system runtime will be introduced. Dynamic modules add semantic classes/data attributes to their existing DOM owners.

Required tokens/functions:

- surface/background/text/muted/stroke/action/positive/attention/risk;
- radius hierarchy for hero/card/row/pill;
- shadow hierarchy for hero/card/raised exception;
- spacing scale;
- semantic tone via `data-faro-tone`;
- common anatomy classes for eyebrow/title/value/support/action;
- focus, pressed, disabled and reduced-motion behavior.

## R2/REG — earnings by platform

Approved sources:

- Uber
- 99
- inDrive
- Extras/Outros

Approved behavior is mode A: driver enters amounts per origin and FARO automatically sums the canonical daily `gross`.

### Data contract

Detailed records may include:

```js
earningsBySource: {
  uber: number,
  ninetyNine: number,
  indrive: number,
  extras: number
}
```

Rules:

- `saveDay()` remains the sole writer of `state.records`;
- `recordDraft()` may extend the same canonical record object;
- `gross` in detailed mode equals the sum of normalized sources;
- no second finance formula/store/writer;
- unused sources are zero and do not block save;
- all-zero detailed mode blocks save;
- repeated save gesture cannot duplicate the date record;
- old records without `earningsBySource` remain valid and are never assigned a fake source;
- old records may opt in via `Detalhar por aplicativo`;
- km/hours remain totals for the day, not per-platform fields;
- history may display/edit source detail but no analytics-by-platform is introduced in this batch.

### Platform card anatomy

Each platform is an Action Card, not a generic form box:

- brand asset;
- platform name;
- state `Não usado` or formatted amount;
- activation affordance;
- amount field only while active;
- strong visual acknowledgement when a value exists.

The total is a distinct State Card / closing surface for the day.

### Asset contract

The approved SVGs at `assets/platforms/` must:

- parse as SVG;
- contain vector paths/shapes;
- contain no `<image>`, `data:image`, or base64 raster payload;
- remain exact approved blobs unless the owner re-approves replacements;
- fit inside the card with `object-fit: contain` and safe padding.

## R2/HOME — Today cockpit

Home remains a working cockpit, not a decorative dashboard.

Hierarchy:

1. Today / next action;
2. week consequence;
3. month target / access to Planejar;
4. financial exception only when needed;
5. secondary insight only if it adds a decision.

Rules:

- Registrar is the dominant action until today is closed;
- if today is already registered, copy switches to review/edit intent;
- week and month values remain canonical consumers;
- month opens Planejar in one gesture;
- financial exception grows only when attention is required;
- no slider/DRE returns to Home;
- no parallel formula.

## R2/PLAN — Planning and Money

Planning is already the most mature FARO surface. This batch refines rather than rewrites it.

Rules:

- preserve `FaroPlanning`, `FaroFinance`, `FaroReserves`, `FaroInteractions` and R3 routing;
- goal remains the protagonist;
- days, operation and commitments use common Action/State Card anatomy;
- normality stays compact; risk/attention can expand;
- Money remains one workspace with depth, never open-close-reopen choreography;
- reserve/cost writers remain canonical and idempotent;
- no duplicated IDs, state, formulas or owners.

## R2/HIST — History and Central

### History

- registered days/list are the protagonist;
- analytics/chart remain support and may be collapsed;
- detailed source earnings may be shown for new records;
- old records explicitly remain `Faturamento sem origem detalhada`;
- opening/editing a day returns through the existing router.

### Central

Organize by intention:

- Conta e dados
- Ferramentas
- Aplicativo
- Ajuda
- Segurança

Rules:

- remove explanatory cards that repeat headings;
- preserve functionality;
- preserve tour replay;
- use Detail Rows for settings/tools unless the unit truly needs Action/State Card semantics;
- no new router/state owner.

## Cross-surface interaction rules

- Every touch produces immediate visible acknowledgement.
- Buttons must not look dead during work; use busy/disabled semantics when an operation is committed.
- Back/cancel returns one level without unexpected Home jumps.
- Error surfaces state what happened, consequence, and next action; technical detail remains secondary.
- keyboard opening must not hide the active money field or save action on target mobile widths.

## PWA delivery

Shell, service worker and build must request/copy the same module generation and all platform SVGs.

Any product-source change that affects installed runtime requires a cache generation review. Do not bump cache for documentation-only changes.

## Audit and falsification

R2/AUDIT must verify:

- final remote HEAD is stable;
- diff contains only approved product/doc/test surfaces;
- protected core hashes unchanged;
- single writers/routers/state owners preserved;
- no duplicate active DOM IDs across owners;
- earnings source normalization and sum;
- legacy compatibility;
- repeated gestures are idempotent;
- Home/Planning/History/Central routes and back behavior;
- onboarding/reserve regressions materially affected by shared shell/routing remain green;
- shell/SW/build generation parity;
- full materializable Node test suite;
- Chromium behavior when the environment permits a real origin/storage; environment limits must not become product PASS/FAIL;
- physical-phone verdict remains separate.

## Completion semantics

Executor maximum is `IMPLEMENTED_AWAITING_AUDIT` until independent audit/meta-audit requirements are satisfied.

The batch may report `CODE_SCOPE_COMPLETE_EXCEPT_PAYMENTS` if code/product audit finds no other material unimplemented domain. It may report `ONLY_PAYMENTS_REMAIN` only if the broader Program Mestre/commercial readiness audit also confirms there is no other material scope such as backend/sync/push/release work remaining.

`PHONE_PHYSICAL_PASS` is never inferred from static, Node, Chromium, CI or screenshots.