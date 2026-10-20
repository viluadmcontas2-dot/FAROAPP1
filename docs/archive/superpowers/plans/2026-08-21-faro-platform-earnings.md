# FARO Platform Earnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o motorista registre ganhos por Uber, 99, inDrive e Extras/Outros, com soma automática para o `gross` canônico do dia, preservando compatibilidade com registros legados e o único writer financeiro existente.

**Architecture:** `faro-register.js` permanece owner da experiência e passa a manter um draft visual de origens. Um helper puro `faro-register-earnings.js` normaliza/soma as quatro origens e é testável isoladamente. O core legado continua sendo o único writer de `state.records`: `faro-register.js` apenas estende `app.recordDraft()` para que `gross` e `earningsBySource` entrem no mesmo objeto antes de `app.saveDay()` persistir.

**Tech Stack:** JavaScript browser IIFE, DOM nativo, localStorage, Node 22 para contratos, Chromium headless efêmero para matriz de comportamento, PWA/service worker existente.

**Spec:** `docs/superpowers/specs/2026-08-21-faro-platform-earnings-design.md`

## Global Constraints

- GitHub remoto é a única fonte e superfície de escrita do código.
- Testes devem rodar primeiro em runtime efêmero/local; CI remoto é fallback excepcional, não rotina.
- `app.js` e `legacy-shell.html` permanecem intactos nesta feature.
- `app.saveDay()` permanece o único writer de `state.records`.
- `record.gross` continua sendo o único bruto consumido pelo motor financeiro.
- `earningsBySource` é opcional e nunca é inventado para registros legados.
- Uber, 99 e inDrive usam exatamente os SVGs aprovados e validados, sem bitmap/base64 embutido.
- Histórico não ganha ranking/gráfico/breakdown por plataforma nesta entrega.
- A feature deve continuar funcional offline depois de a nova geração PWA estar instalada.
- A implementação deve ocorrer em branch isolada derivada do HEAD atual, sem mutar a branch ativa `test/ux-r2-00-composition-contracts` enquanto VIT-88 ainda é blocker físico.

---

### Task 1: Helper puro de ganhos por origem + contratos RED→GREEN

**Files:**
- Create: `faro-register-earnings.js`
- Create: `tests/platform-earnings-contract.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: objetos livres com chaves `uber`, `ninetyNine`, `indrive`, `extras`.
- Produces: `window.FaroRegisterEarnings` com `SOURCES`, `normalize(raw)`, `total(raw)`, `hasAny(raw)`.

- [ ] **Step 1: Write the failing contract**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('faro-register-earnings.js', 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const api = sandbox.window.FaroRegisterEarnings;

assert.deepEqual(JSON.parse(JSON.stringify(api.normalize({ uber:'180,50', ninetyNine:'120', indrive:'', extras:'40' }))), {
  uber: 180.5,
  ninetyNine: 120,
  indrive: 0,
  extras: 40
});
assert.equal(api.total({ uber:180, ninetyNine:120, indrive:70, extras:40 }), 410);
assert.equal(api.hasAny({ uber:0, ninetyNine:0, indrive:0, extras:0 }), false);
assert.equal(api.hasAny({ uber:0, ninetyNine:1, indrive:0, extras:0 }), true);
assert.throws(() => api.normalize({ uber:-1 }), /negativo/i);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `node tests/platform-earnings-contract.test.mjs`
Expected: FAIL because `faro-register-earnings.js` does not exist yet.

- [ ] **Step 3: Implement the minimal pure helper**

```js
(() => {
  const SOURCES = Object.freeze(['uber', 'ninetyNine', 'indrive', 'extras']);
  const number = value => {
    const parsed = Number(String(value ?? '').trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const normalize = raw => Object.fromEntries(SOURCES.map(key => {
    const value = number(raw?.[key]);
    if (value < 0) throw new Error(`Valor negativo não permitido: ${key}`);
    return [key, Math.round(value * 100) / 100];
  }));
  const total = raw => Object.values(normalize(raw)).reduce((sum, value) => Math.round((sum + value) * 100) / 100, 0);
  const hasAny = raw => Object.values(normalize(raw)).some(value => value > 0);
  window.FaroRegisterEarnings = Object.freeze({ SOURCES, normalize, total, hasAny });
})();
```

- [ ] **Step 4: Run GREEN and add the contract to `npm run check`**

Run: `node --check faro-register-earnings.js && node tests/platform-earnings-contract.test.mjs`
Expected: PASS.

Update `package.json` so `npm run check` executes both the syntax check and the new contract before the existing `register-contract.test.mjs`.

- [ ] **Step 5: Commit**

Commit message: `feat(register): add platform earnings normalization contract`

---

### Task 2: Assets vetoriais aprovados + entrega de build

**Files:**
- Create: `assets/platforms/faro-platform-99.svg`
- Create: `assets/platforms/faro-platform-indrive.svg`
- Create: `assets/platforms/faro-platform-uber.svg`
- Modify: `tests/platform-earnings-contract.test.mjs`
- Modify: `scripts/build-netlify-of.mjs`

**Interfaces:**
- Consumes: assets aprovados pelo owner com hashes registrados na spec.
- Produces: paths estáveis `./assets/platforms/...` disponíveis no build `_site`.

- [ ] **Step 1: Extend the contract with asset validation before adding assets**

```js
import { createHash } from 'node:crypto';
const expected = new Map([
  ['assets/platforms/faro-platform-99.svg', 'd10212afb5788d77f617dcea0efcb85145c42dfca4641c0d8cf04dbc44b5e51b'],
  ['assets/platforms/faro-platform-indrive.svg', '9d045ddec23b41327e27e0d056469b3596279976bc3b0fb6b8e24198889c2794'],
  ['assets/platforms/faro-platform-uber.svg', 'e1b09c8e1a04c3acbd508dc27cf6e248e62895dde72f03332529720245df9329']
]);
for (const [path, wanted] of expected) {
  const svg = await readFile(path, 'utf8');
  assert.equal(createHash('sha256').update(svg).digest('hex'), wanted);
  assert.doesNotMatch(svg, /<image\b|data:image|base64/i);
  assert.match(svg, /<svg\b[^>]*viewBox=/i);
}
```

- [ ] **Step 2: Run and verify RED**

Run: `node tests/platform-earnings-contract.test.mjs`
Expected: FAIL because the approved assets are not in the repository yet.

- [ ] **Step 3: Add the exact approved SVG contents and build copies**

Copy the owner-approved files byte-for-byte into `assets/platforms/` and append the three exact paths to `copyFiles` in `scripts/build-netlify-of.mjs`.

- [ ] **Step 4: Verify GREEN and build output**

Run: `node tests/platform-earnings-contract.test.mjs && node scripts/build-netlify-of.mjs`
Expected: PASS and `_site/assets/platforms/` contains the same three hashes.

- [ ] **Step 5: Commit**

Commit message: `feat(register): add approved platform vector assets`

---

### Task 3: Registrar UI 2×2 + draft por origem + persistência atômica

**Files:**
- Modify: `faro-register.js`
- Modify: `tests/platform-earnings-contract.test.mjs`
- Modify: `tests/register-contract.test.mjs`

**Interfaces:**
- Consumes: `window.FaroRegisterEarnings` from Task 1 and the three asset paths from Task 2.
- Produces: DOM `#faroEarningsBySource`, `#faroEarningsTotal`, per-source inputs `data-faro-earning-source`, and extended `app.recordDraft()` returning `{...legacyDraft, gross, earningsBySource}` only in detailed mode.

- [ ] **Step 1: Write failing integration assertions**

Add assertions requiring:

```js
assert.match(register, /De onde veio seu faturamento\?/);
assert.match(register, /faro-platform-uber\.svg/);
assert.match(register, /faro-platform-99\.svg/);
assert.match(register, /faro-platform-indrive\.svg/);
assert.match(register, /Extras\/Outros/);
assert.match(register, /const baseRecordDraft = app\.recordDraft/);
assert.match(register, /earningsBySource/);
assert.match(register, /recordGross/);
assert.doesNotMatch(register, /state\.records\.(push|splice)/);
```

Require CSS `grid-template-columns:repeat(2,minmax(0,1fr))`, read-only total copy `Total do dia`, and a legacy action copy `Detalhar por aplicativo`.

- [ ] **Step 2: Run RED**

Run: `node tests/platform-earnings-contract.test.mjs && node tests/register-contract.test.mjs`
Expected: FAIL on missing platform UI/data integration.

- [ ] **Step 3: Implement the platform UI in `faro-register.js`**

Create a dynamic section immediately after the legacy `recordGross` field container. Required source config:

```js
const earningsSources = [
  { key:'uber', label:'Uber', asset:'./assets/platforms/faro-platform-uber.svg' },
  { key:'ninetyNine', label:'99', asset:'./assets/platforms/faro-platform-99.svg' },
  { key:'indrive', label:'inDrive', asset:'./assets/platforms/faro-platform-indrive.svg' },
  { key:'extras', label:'Extras/Outros', icon:'fa-plus' }
];
```

The section must:
- render cards in a 2×2 grid;
- show a numeric money input only for active sources;
- allow multiple active sources;
- update a read-only `Total do dia` on each source input;
- synchronize that total into hidden/canonical `#recordGross` and dispatch `input` so the existing preview keeps working;
- keep the legacy gross field available only for a legacy record that has no `earningsBySource` until the user taps `Detalhar por aplicativo`;
- never preassign a legacy gross to any platform.

- [ ] **Step 4: Extend `app.recordDraft()` without creating a second writer**

Use the existing method as base:

```js
const baseRecordDraft = app.recordDraft;
app.recordDraft = function() {
  if (earningsMode === 'detailed') syncEarningsTotal();
  const draft = baseRecordDraft.call(this);
  if (earningsMode !== 'detailed') return draft;
  const earningsBySource = window.FaroRegisterEarnings.normalize(readEarningsInputs());
  return {
    ...draft,
    gross: window.FaroRegisterEarnings.total(earningsBySource),
    earningsBySource
  };
};
```

Do not mutate `state.records` in FARO code. The existing `baseSaveDay` must receive this extended draft through the dynamic `this.recordDraft()` call and persist it atomically.

- [ ] **Step 5: Extend draft recovery/editing**

`faro-record-draft-v1` must include `earningsMode` and `earningsBySource` when present. On view/edit:
- record with `earningsBySource` -> detailed mode and restore exact values;
- legacy record without it -> legacy mode, preserve original gross, show `Detalhar por aplicativo`;
- new empty day -> detailed mode with no preselected value required.

- [ ] **Step 6: Validate save behavior**

Detailed mode must reject all-zero source values before invoking canonical save. Existing `saving` lock and `aria-busy` remain intact. After canonical save confirms the date/gross record exists, clear the local draft exactly once.

- [ ] **Step 7: Run targeted GREEN**

Run: `node --check faro-register.js && node tests/platform-earnings-contract.test.mjs && node tests/register-contract.test.mjs && node tests/b9-finance-register-contract.test.mjs`
Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat(register): add earnings by platform with canonical gross`

---

### Task 4: PWA generation + exact runtime matrix

**Files:**
- Modify: `app-shell.html`
- Modify: `sw.js`
- Modify: `tests/baseline-contract.test.mjs`
- Modify: `tests/install-contract.test.mjs`
- Modify: `tests/update-contract.test.mjs`
- Modify: `tests/runtime-composition-contract.test.mjs` only if it contains explicit register-generation ordering expectations.

**Interfaces:**
- Consumes: `faro-register-earnings.js`, `faro-register.js` and `assets/platforms/*`.
- Produces: one installed generation where helper loads before register owner and service worker caches the same files.

- [ ] **Step 1: Write/update generation expectations first**

Require shell order:

```text
faro-home-r2.js?v=1
faro-register-earnings.js?v=1
faro-register.js?v=2
faro-finance.js?v=1
```

Require service worker `CORE_CACHE = 'faro-v1-core-22'` and the same helper/register/assets paths.

- [ ] **Step 2: Run affected tests and observe RED**

Run: `node tests/baseline-contract.test.mjs && node tests/install-contract.test.mjs && node tests/update-contract.test.mjs && node tests/register-contract.test.mjs`
Expected: FAIL on old register/core generation.

- [ ] **Step 3: Update delivery**

In `app-shell.html`, load `faro-register-earnings.js?v=1` immediately before `faro-register.js?v=2`.

In `sw.js`:
- bump `faro-v1-core-21` -> `faro-v1-core-22`;
- cache `./faro-register-earnings.js?v=1`;
- cache `./faro-register.js?v=2`;
- cache the three `./assets/platforms/*.svg` files.

Ensure `scripts/build-netlify-of.mjs` already copies helper + three assets; if helper was not added during Task 1, add it now.

- [ ] **Step 4: Run local/ephemeral repository checks**

Materialize a read-only execution copy of the exact remote feature HEAD. Do not use local files as source authority or write them back.

Run in Node 22:

```text
node --check faro-register-earnings.js
node --check faro-register.js
node --check scripts/build-netlify-of.mjs
npm run check
```

Expected: all PASS. Do not invoke GitHub Actions unless the full suite cannot be materialized locally and the missing proof is material to acceptance.

- [ ] **Step 5: Run Chromium behavior matrix**

Serve the ephemeral build and run these cases in Chromium headless:

1. new day: Uber 180 + 99 120 + inDrive 70 + Extras 40 => Total 410 and saved `record.gross=410`;
2. one platform only => gross equals that platform;
3. unused platforms remain zero and do not block save;
4. all-zero detailed mode blocks save;
5. edit detailed record restores exact four values and preserves gross sum;
6. edit legacy record stays legacy until `Detalhar por aplicativo` is pressed;
7. legacy edit without detailing preserves original gross and no `earningsBySource` is invented;
8. repeated save click creates/updates only one record for the date;
9. reload with unsaved detailed draft restores selected sources and values;
10. offline reload after service worker installation still renders the three logos and detailed registrar.

Expected: 10/10 GREEN.

- [ ] **Step 6: Re-open remote HEAD and diff**

Confirm feature branch HEAD is stable and diff is limited to spec/plan, helper, register UX, approved assets, delivery/build and affected tests. Confirm `app.js`, `legacy-shell.html`, finance and reserves are unchanged.

- [ ] **Step 7: Commit final delivery reconciliation**

Commit message: `feat(register): deliver platform earnings in PWA`

---

### Task 5: Governance checkpoint without premature merge

**Files:**
- No product files.

**Interfaces:**
- Consumes: exact feature HEAD, local/ephemeral test evidence and Chromium matrix.
- Produces: Linear VIT-196 implementation checkpoint while VIT-88 remains the active physical gate.

- [ ] **Step 1: Update VIT-196**

Record exact feature branch/SHA, source delta, tests run, Chromium matrix result, asset hashes and `REMOTE_CI=NOT_USED` unless an explicit exception was necessary.

- [ ] **Step 2: Preserve current FARO execution authority**

Do not mark VIT-88 complete and do not merge feature branch into the active branch while the current physical onboarding/reserve gate remains unresolved. Mark VIT-196 as implemented/ready-for-integration rather than product PASS if physical device validation of this feature has not yet happened.

- [ ] **Step 3: Final verification statement**

Report only evidence actually observed. Distinguish `IMPLEMENTED_LOCAL_RUNTIME_GREEN` from `PHONE_PHYSICAL_PASS`.
