// Aviso de fim do teste: função pura (sem rede, sem tela). Textos de docs/legal/aviso-fim-do-teste.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { avisoFimDoTeste } from '../src/data/aviso-fim-do-teste.js';

const SP = 'America/Sao_Paulo';
const aviso = (sub, now, extra = {}) => avisoFimDoTeste({ sub, billingEnabled: true, now: Date.parse(now), ...extra });
const trial = fim => ({ status: 'trialing', currentPeriodEnd: fim });

test('níveis por dias que faltam no calendário de São Paulo', () => {
  const fim = '2026-10-24T15:00:00Z'; // 24/10 12:00 em SP
  assert.equal(aviso(trial(fim), '2026-10-19T15:00:00Z'), null, '5 dias: nada');
  assert.equal(aviso(trial(fim), '2026-10-20T15:00:00Z'), null, '4 dias: nada');
  assert.equal(aviso(trial(fim), '2026-10-21T15:00:00Z').nivel, 'tres_dias', 'limite: 3 dias');
  assert.equal(aviso(trial(fim), '2026-10-22T15:00:00Z').nivel, 'tres_dias', '2 dias');
  assert.equal(aviso(trial(fim), '2026-10-23T15:00:00Z').nivel, 'um_dia');
  assert.equal(aviso(trial(fim), '2026-10-24T11:00:00Z').nivel, 'hoje');
  assert.equal(aviso(trial(fim), '2026-10-24T18:00:00Z').nivel, 'hoje', 'passou da hora no mesmo dia: ainda hoje');
});

test('fuso: o dia é o de São Paulo, não o do UTC', () => {
  // 20/10 22:00 em SP, mas já é 21/10 em UTC; fim em 24/10 de SP: faltam 4 dias (UTC diria 3)
  assert.equal(aviso(trial('2026-10-24T15:00:00Z'), '2026-10-21T01:00:00Z'), null);
  // 22/10 23:00 em SP (23/10 02:00 UTC); fim em 23/10 de SP: falta 1 dia (UTC diria 0)
  assert.equal(aviso(trial('2026-10-23T15:00:00Z'), '2026-10-23T02:00:00Z').nivel, 'um_dia');
  // fim às 23:30 de SP no dia 24 (02:30 UTC do dia 25) ainda é dia 24
  assert.equal(aviso(trial('2026-10-25T02:30:00Z'), '2026-10-24T13:00:00Z').nivel, 'hoje');
  // outro fuso pedido de fora
  assert.equal(aviso(trial('2026-10-24T15:00:00Z'), '2026-10-21T01:00:00Z', { timeZone: 'UTC' }).nivel, 'tres_dias');
});

test('textos: valor, dia e verbo igual no botão e no aviso', () => {
  const a = aviso(trial('2026-10-24T15:00:00Z'), '2026-10-21T15:00:00Z');
  assert.equal(a.titulo, 'Seu teste termina em 3 dias');
  assert.match(a.texto, /24\/10/);
  assert.match(a.texto, /R\$ 22,99/);
  assert.match(a.texto, /cancele antes/);
  assert.equal(a.botao, 'Gerenciar assinatura');
  const u = aviso(trial('2026-10-24T15:00:00Z'), '2026-10-23T15:00:00Z');
  assert.equal(u.titulo, 'Amanhã o teste termina');
  assert.match(u.texto, /Amanhã, 24\/10/);
  const h = aviso(trial('2026-10-24T15:00:00Z'), '2026-10-24T13:00:00Z');
  assert.match(h.titulo, /termina hoje/);
  assert.match(h.texto, /22,99/);
  assert.equal(aviso(trial('2026-10-24T15:00:00Z'), '2026-10-21T15:00:00Z', { valor: 'R$ 14,99' }).texto.includes('R$ 14,99'), true);
  for (const x of [a, u, h]) assert.doesNotMatch(`${x.titulo} ${x.texto}`, /não perca|última chance/i);
  // ADR 0009: o teste não pede cartão. O texto precisa ser verdadeiro para quem cadastrou pagamento e para quem não cadastrou.
  for (const x of [a, u, h]) {
    assert.doesNotMatch(x.texto, /no cartão/, 'não promete cobrança num cartão que pode não existir');
    assert.match(x.texto, /Gerenciar assinatura/, 'diz onde cadastrar o pagamento');
    assert.match(x.texto, /não paga nada/, 'diz que sem pagamento cadastrado não há cobrança');
    assert.match(x.texto, /cadastre o pagamento em Gerenciar assinatura \(se já cadastrou, está tudo certo\)/, 'o app não sabe se há pagamento: a frase serve aos dois casos');
    assert.match(x.texto, /o acesso termina/, 'diz o que acontece sem pagamento');
  }
});

test('cobrado: assinatura ativa logo depois do fim do teste', () => {
  const sub = { status: 'active', trialEnd: '2026-10-24T15:00:00Z', currentPeriodEnd: '2026-11-24T15:00:00Z' };
  const a = aviso(sub, '2026-10-24T18:00:00Z');
  assert.equal(a.nivel, 'cobrado');
  assert.equal(a.titulo, 'Cobrança feita: R$ 22,99');
  assert.match(a.texto, /24\/11/);
  assert.equal(a.botao, 'Gerenciar assinatura');
  assert.equal(aviso(sub, '2026-10-26T15:00:00Z').nivel, 'cobrado', '2 dias depois ainda avisa');
  assert.equal(aviso(sub, '2026-10-27T15:00:00Z'), null, 'depois da janela: nada');
  assert.equal(aviso({ ...sub, trialEnd: undefined }, '2026-10-24T18:00:00Z'), null, 'ativa sem trial_end: nada');
});

test('nada quando não deve aparecer', () => {
  const now = '2026-10-23T15:00:00Z', fim = '2026-10-24T15:00:00Z';
  assert.equal(avisoFimDoTeste({ sub: trial(fim), billingEnabled: false, now: Date.parse(now) }), null, 'cobrança desligada');
  assert.equal(avisoFimDoTeste({ sub: trial(fim), now: Date.parse(now) }), null, 'sem informar a cobrança = desligada');
  assert.equal(avisoFimDoTeste({ sub: trial(fim), billingEnabled: 'true', now: Date.parse(now) }), null, 'só true liga');
  for (const status of ['canceled', 'paused', 'inactive', 'past_due', 'unpaid']) assert.equal(aviso({ status, currentPeriodEnd: fim }, now), null, status);
  assert.equal(aviso({ ...trial(fim), cancelAtPeriodEnd: true }, now), null, 'teste já cancelado: não será cobrado');
  assert.equal(aviso({ status: 'trialing' }, now), null, 'sem trial_end');
  assert.equal(aviso({ status: 'trialing', currentPeriodEnd: null }, now), null);
  assert.equal(aviso({ status: 'trialing', currentPeriodEnd: 'lixo' }, now), null, 'data inválida');
  assert.equal(aviso(null, now), null);
  assert.equal(aviso(undefined, now), null);
  assert.equal(aviso({ status: 'active', currentPeriodEnd: fim }, now), null, 'ativa comum');
  assert.equal(aviso({ ...trial(fim), error: true }, now), null, 'falha ao conferir: nada');
});

test('trial_end explícito vale mais que o fim do período', () => {
  const sub = { status: 'trialing', trialEnd: '2026-10-24T15:00:00Z', currentPeriodEnd: '2026-11-24T15:00:00Z' };
  assert.equal(aviso(sub, '2026-10-23T15:00:00Z').nivel, 'um_dia');
});

test('idempotente e não muda a entrada', () => {
  const sub = Object.freeze(trial('2026-10-24T15:00:00Z'));
  assert.deepEqual(aviso(sub, '2026-10-23T15:00:00Z'), aviso(sub, '2026-10-23T15:00:00Z'));
});
