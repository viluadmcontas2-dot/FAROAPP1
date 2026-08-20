import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [onboarding, routing, r3b] = await Promise.all([
  readFile('faro-onboarding.js', 'utf8'),
  readFile('faro-r3-routing.js', 'utf8'),
  readFile('faro-r3b.js', 'utf8')
]);

// Physical regression 20/08: depois que a conclusão foi persistida, nenhum render
// potencialmente falho pode impedir o onboarding de fechar e entregar a Home.
const finishStart = onboarding.indexOf("$('faroFinish').addEventListener('click'");
const finishEnd = onboarding.indexOf("$('faroRentalWeekly').value", finishStart);
assert.ok(finishStart >= 0 && finishEnd > finishStart, 'bloco final do onboarding precisa existir');
const finish = onboarding.slice(finishStart, finishEnd);
const persistedAt = finish.indexOf('app.save();');
const closeAt = finish.indexOf("modal.classList.add('hidden')");
const renderAt = finish.indexOf('app.render();');
assert.ok(persistedAt >= 0 && closeAt > persistedAt, 'onboarding precisa fechar somente depois do commit persistido');
assert.ok(renderAt < 0 || closeAt < renderAt, 'render não pode bloquear o fechamento pós-commit do onboarding');
assert.match(finish, /faro:onboarding-complete/, 'handoff pós-commit precisa continuar explícito');

// Physical regression 20/08: criar reserva precisa ter um ID estável e um único
// commit por abertura do formulário. Se o refresh posterior falhar, novo toque não
// pode gerar outra reserva.
assert.match(routing, /draftId\s*:\s*app\.uid\('cost'\)/, 'criação inline precisa pré-alocar um ID estável');
assert.match(routing, /flowCommitPending/, 'save inline precisa bloquear reentrada enquanto o commit está em andamento');
assert.match(routing, /state\.costs[\s\S]*commitId/, 'save inline precisa confirmar persistência pelo mesmo ID antes do pós-save');
assert.match(routing, /closeFlow\(\{restore:false\}\)/, 'save persistido precisa encerrar a profundidade mesmo se o refresh falhar');

// O hero de Planejar ganhou IDs próprios. R3-B não pode continuar escrevendo nos
// IDs do resultado do onboarding, ou as duas superfícies voltam a compartilhar owner.
assert.doesNotMatch(r3b, /\$\('faroPlanDays'\)|\$\('faroPlanKm'\)/, 'R3-B não pode escrever nos métricos do onboarding');
assert.match(r3b, /\$\('faroPlanHeroDays'\)/, 'R3-B precisa escrever nos dias do hero de Planejar');
assert.match(r3b, /\$\('faroPlanHeroKm'\)/, 'R3-B precisa escrever nos km do hero de Planejar');

console.log('physical-commit-boundary-contract: commit atômico, reserva idempotente e owners separados — ok');
