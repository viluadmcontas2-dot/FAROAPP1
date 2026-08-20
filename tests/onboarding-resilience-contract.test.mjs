import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const onboarding = await readFile('faro-onboarding.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');

const contains = (snippet, label) => assert.equal(onboarding.includes(snippet), true, label);

// 9.15 — o progresso precisa sobreviver a interrupção/reload sem concluir o onboarding cedo.
contains("const DRAFT_KEY = 'faro-onboarding-draft-v2'", 'Onboarding precisa de chave própria de rascunho');
contains("localStorage.getItem(DRAFT_KEY)", 'Retomada precisa ler o rascunho salvo');
contains("localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))", 'Mudanças do onboarding precisam persistir o rascunho');
contains("localStorage.removeItem(DRAFT_KEY)", 'Rascunho só deve ser removido ao concluir');
contains("if (draft.stepId === 'processing') showProcessing()", 'Reload durante processamento precisa retomar o processamento');
contains("else if (draft.stepId === 'result') showResult()", 'Reload no resultado precisa restaurar o resultado');

for (const field of [
  "draft.days = Number(button.dataset.days)",
  "draft.vehicle = button.dataset.vehicle",
  "draft.financeMonthly = n($('faroFinanceMonthly').value)",
  "draft.financeDueDay = clampDueDay($('faroFinanceDue').value) ?? ''",
  "draft.reserveDraft.name=$('faroReserveName').value",
  "draft.reserveDraft.value=$('faroReserveValue').value",
  "draft.revenueKm=n(e.target.value)"
]) contains(field, `Campo de onboarding precisa permanecer persistente: ${field}`);

assert.match(onboarding, /draft\.stepId=seq\[index-1\];saveDraft\(\);renderStep\(\)/, 'Voltar etapa precisa salvar a posição');
assert.match(onboarding, /draft\.stepId=seq\[index\+1\];saveDraft\(\);renderStep\(\)/, 'Avançar etapa precisa salvar a posição');

// 9.16 — processamento e conclusão precisam ser idempotentes: reconstruir, não anexar fatos/custos.
assert.match(onboarding, /const showProcessing = \(\) => \{[\s\S]*draft\.stepId = 'processing';[\s\S]*saveDraft\(\);[\s\S]*app\.state\.costs = buildCosts\(\);[\s\S]*app\.state\.onboardingComplete = false;[\s\S]*app\.save\(\);/,
  'Processamento precisa salvar checkpoint, reconstruir custos e manter onboarding incompleto');
assert.doesNotMatch(onboarding, /app\.state\.costs\.push|app\.state\.records\.push|app\.state\.events\.push/, 'Onboarding não pode duplicar estado por append durante retomada/conclusão');
assert.match(onboarding, /const showResult = \(\) => \{[\s\S]*draft\.stepId = 'result';[\s\S]*saveDraft\(\);[\s\S]*app\.state\.onboardingComplete = false;[\s\S]*app\.save\(\);/,
  'Tela de resultado precisa continuar reversível e não concluir o onboarding');

const finishStart = onboarding.indexOf("$('faroFinish').addEventListener('click'");
assert.ok(finishStart >= 0, 'Conclusão final precisa existir');
const finishEnd = onboarding.indexOf("$('faroRentalWeekly').value", finishStart);
const finishBlock = onboarding.slice(finishStart, finishEnd);
assert.match(finishBlock, /app\.state\.onboardingComplete = true;[\s\S]*app\.save\(\);[\s\S]*clearDraft\(\);/, 'Somente o gesto final pode concluir, salvar e então apagar o rascunho');
assert.doesNotMatch(finishBlock, /buildCosts\(|\.push\(/, 'Duplo toque na conclusão não pode adicionar custos ou registros novamente');

// HF1 físico — app.js ainda abre o onboarding legado antes de faro-onboarding assumir o modal.
// O shell deve impedir qualquer frame visível do owner legado: o modal só pode aparecer
// quando a árvore moderna já contém #faroFinish.
assert.match(shell, /#onboardingModal:not\(:has\(#faroFinish\)\)\{visibility:hidden!important\}/,
  'Onboarding legado não pode ficar visível enquanto o owner moderno ainda não substituiu o modal');
assert.match(onboarding, /id="faroFinish"/,
  'Owner moderno precisa fornecer o marcador que libera a superfície do onboarding');

console.log('FARO: onboarding retomável, idempotente e sem frame visível do owner legado — ok');
