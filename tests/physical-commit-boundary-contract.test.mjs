import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [shell, routing] = await Promise.all([
  readFile('app-shell.html', 'utf8'),
  readFile('faro-r3-routing.js', 'utf8')
]);

// Physical regression 20/08: a conclusão do onboarding precisa de um único owner
// pós-commit. O módulo de commit substitui o nó que carrega o listener anônimo legado,
// então não existem dois handlers ativos sobre o mesmo gesto.
assert.match(shell, /faro-onboarding-commit\.js\?v=1/, 'shell precisa carregar o owner pós-commit do onboarding');
const onboardingIndex = shell.indexOf('faro-onboarding.js?v=3');
const commitIndex = shell.indexOf('faro-onboarding-commit.js?v=1');
const tourIndex = shell.indexOf('faro-tour.js?v=2');
assert.ok(onboardingIndex >= 0 && onboardingIndex < commitIndex && commitIndex < tourIndex,
  'owner pós-commit precisa ligar depois do onboarding e antes do tour');

if (commitIndex >= 0) {
  const commit = await readFile('faro-onboarding-commit.js', 'utf8');
  assert.match(commit, /cloneNode\(true\)[\s\S]*replaceWith\(/,
    'owner pós-commit precisa remover o listener antigo substituindo o CTA');
  assert.match(commit, /app\.state\.onboardingComplete\s*=\s*true[\s\S]*app\.save\(\)/,
    'conclusão precisa persistir antes do handoff');
  assert.match(commit, /modal\.classList\.add\('hidden'\)[\s\S]*navigateToPrimary\('dashboard'\)[\s\S]*faro:onboarding-complete/,
    'handoff precisa fechar onboarding, entrar na Home e só então liberar o tour');
  assert.match(commit, /try\s*\{[\s\S]*app\.syncInputs\(\)[\s\S]*app\.render\(\)[\s\S]*\}\s*catch/,
    'refresh visual pós-commit não pode travar o handoff já persistido');
}

// Physical regression 20/08: criar reserva precisa ter um ID estável e um único
// commit por abertura do formulário. Se o refresh posterior falhar, novo toque não
// pode gerar outra reserva.
assert.match(routing, /draftId\s*:\s*app\.uid\('cost'\)/, 'criação inline precisa pré-alocar um ID estável');
assert.match(routing, /flowCommitPending/, 'save inline precisa bloquear reentrada enquanto o commit está em andamento');
assert.match(routing, /state\.costs[\s\S]*commitId/, 'save inline precisa confirmar persistência pelo mesmo ID antes do pós-save');
assert.match(routing, /closeFlow\(\{restore:false\}\)/, 'save persistido precisa encerrar a profundidade mesmo se o refresh falhar');

console.log('physical-commit-boundary-contract: commit atômico e criação de reserva idempotente — ok');
