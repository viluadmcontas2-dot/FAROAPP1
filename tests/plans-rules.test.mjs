// Regras puras da tela Plano (faro-plans.js): estados, textos e preço. Sem navegador, sem rede.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../faro-plans.js', import.meta.url), 'utf8');
const sandbox = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox);
const P = sandbox.FaroPlans;
assert.ok(P, 'faro-plans.js precisa expor FaroPlans');

const now = Date.parse('2026-10-20T12:00:00Z');
const inDays = d => new Date(now + d * 86400000).toISOString();

assert.equal(P.brl(P.PRICE.monthly), 'R$ 22,99');
assert.equal(P.brl(P.PRICE.promo), 'R$ 14,90');
assert.equal(P.brl(P.savings()), 'R$ 40,45', 'economia exibida no mockup');
assert.equal(P.normalizeCode(' pragas '), 'PRAGAS');

assert.equal(P.computeState({ now }).kind, 'anon');
assert.equal(P.computeState({ signedIn: true, anonymous: true, now }).kind, 'anon', 'anônimo não assina');
const trial = P.computeState({ signedIn: true, trialEndsAt: inDays(5), now });
assert.equal(trial.kind, 'trial'); assert.equal(trial.daysLeft, 5);
const ending = P.computeState({ signedIn: true, trialEndsAt: inDays(1.5), now });
assert.equal(ending.kind, 'trial-ending'); assert.equal(ending.daysLeft, 2);
assert.equal(P.computeState({ signedIn: true, trialEndsAt: inDays(-1), now }).kind, 'expired');
assert.equal(P.computeState({ signedIn: true, trialEndsAt: inDays(-1), subscription: { status: 'active', stripe_customer_id: 'cus_x', current_period_end: inDays(20) }, now }).kind, 'subscriber');
assert.equal(P.computeState({ signedIn: true, trialEndsAt: inDays(-1), subscription: { status: 'active', current_period_end: inDays(-2) }, now }).kind, 'expired', 'período vencido não libera');
assert.equal(P.computeState({ signedIn: true, now }).kind, 'no-trial', 'conta antiga sem trial não é travada');

// billingEnabled=false: nunca oferece cobrança; criar conta continua possível.
for (const kind of ['trial', 'trial-ending', 'expired', 'subscriber', 'no-trial']) {
  assert.equal(P.copyFor({ kind, daysLeft: 3, status: 'active' }, false).label, 'Em breve', kind);
}
assert.equal(P.copyFor({ kind: 'anon' }, false).label, 'Testar 7 dias grátis');
assert.equal(P.copyFor({ kind: 'anon' }, false).action, 'signup');
assert.equal(P.copyFor({ kind: 'trial', daysLeft: 3 }, true).badge, 'Faltam 3 dias');
assert.equal(P.copyFor({ kind: 'trial-ending', daysLeft: 1 }, true).title, 'Seu teste acaba amanhã');
assert.equal(P.copyFor({ kind: 'expired' }, true).label, 'Assinar FARO');
assert.equal(P.copyFor({ kind: 'subscriber', status: 'active' }, true).label, 'Gerenciar assinatura');
assert.equal(P.copyFor({ kind: 'subscriber', status: 'active' }, true).action, 'portal');

// O app nunca liga a cobrança sozinho.
assert.match(fs.readFileSync(new URL('../faro-config.js', import.meta.url), 'utf8'), /billingEnabled: false/);
console.log('PASS FARO plano: estados, textos, preço R$ 22,99, PRAGAS R$ 14,90 e economia R$ 40,45.');
