import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const onboarding = await readFile('faro-onboarding.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');

const contains = (snippet, label) => assert.equal(onboarding.includes(snippet), true, label);

// 9.15 — o progresso precisa sobreviver a interrupção/reload sem concluir o onboarding cedo.
contains("const DRAFT_KEY = 'faro-onboarding-draft-v2'", 'Onboarding precisa de chave própria de rascunho');
contains("localStorage.getItem(DRAFT_KEY)", 'Retomada precisa ler o rascunho salvo');
contains("localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))", 'Mudanças do onboarding precisam persistir o rascunho');
// F5: o rascunho só some no commit final, que tem um único owner (faro-onboarding-commit.js).
const commit = await readFile('faro-onboarding-commit.js', 'utf8');
assert.doesNotMatch(onboarding, /removeItem\(DRAFT_KEY\)/, 'Onboarding não pode apagar o rascunho antes do commit final');
assert.match(commit, /localStorage\.removeItem\('faro-onboarding-draft-v2'\)/, 'Rascunho só deve ser removido ao concluir (owner do commit)');
contains("else renderStep()", 'Reload no meio precisa retomar a pergunta salva');
contains("if (draft.stepId === 'result') showResult()", 'Reload no resultado precisa restaurar o resultado');

for (const field of [
  "draft.vehicle = vehicle",
  "draft.vehicleCost = n(e.target.value)",
  "syncTarget(Number(button.dataset.targetChoice))",
  "applyEnergy(button.dataset.energyChoice)"
]) contains(field, `Resposta do onboarding precisa permanecer persistente: ${field}`);
assert.match(onboarding, /const goTo = stepId => \{ draft\.stepId = stepId; saveDraft\(\); renderStep\(\); \}/, 'Trocar de pergunta precisa salvar a posição');

// 9.16 — gravação idempotente: reconstruir, não anexar fatos/custos; nunca concluir antes do gesto final.
assert.match(onboarding, /const commitDraftToState = \(\) => \{[\s\S]*app\.state\.costs = buildCosts\(\);[\s\S]*app\.state\.onboardingComplete = false;[\s\S]*app\.save\(\);/,
  'Gravação precisa reconstruir custos e manter onboarding incompleto');
assert.doesNotMatch(onboarding, /app\.state\.costs\.push|app\.state\.records\.push|app\.state\.events\.push/, 'Onboarding não pode duplicar estado por append durante retomada/conclusão');
assert.match(onboarding, /const showResult = \(\) => \{[\s\S]*draft\.stepId = 'result';[\s\S]*saveDraft\(\);[\s\S]*app\.state\.onboardingComplete = false;[\s\S]*app\.save\(\);/,
  'Tela de resultado precisa continuar reversível e não concluir o onboarding');
assert.doesNotMatch(onboarding, /onboardingComplete = true/, 'Somente o owner do commit conclui o onboarding');
assert.doesNotMatch(onboarding, /setTimeout\(showResult/, 'Sem espera artificial antes do plano');
assert.match(commit, /app\.state\.onboardingComplete = true;[\s\S]*app\.save\(\);[\s\S]*removeItem\('faro-onboarding-draft-v2'\)/, 'Somente o gesto final pode concluir, salvar e então apagar o rascunho');
assert.doesNotMatch(commit, /buildCosts\(|\.push\(/, 'Duplo toque na conclusão não pode adicionar custos ou registros novamente');

// HF1 físico — app.js ainda abre o onboarding legado antes de faro-onboarding assumir o modal.
// O shell deve impedir qualquer frame visível do owner legado: o modal só pode aparecer
// quando a árvore moderna já contém #faroFinish.
assert.match(shell, /#onboardingModal:not\(:has\(#faroFinish\)\)\{visibility:hidden!important\}/,
  'Onboarding legado não pode ficar visível enquanto o owner moderno ainda não substituiu o modal');
assert.match(onboarding, /id="faroFinish"/,
  'Owner moderno precisa fornecer o marcador que libera a superfície do onboarding');

console.log('FARO: onboarding retomável, idempotente e sem frame visível do owner legado — ok');
