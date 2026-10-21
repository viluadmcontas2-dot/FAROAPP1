import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, isApiHost, isCacheableResponse } from '../src/pwa/sw-policy.js';

const O = 'https://faro.example';
test('nunca cacheia hosts de API (Supabase/Stripe)', () => {
  for (const url of ['https://mjbyqhreptllilkggiri.supabase.co/rest/v1/x', 'https://mjbyqhreptllilkggiri.supabase.co/functions/v1/y', 'https://checkout.stripe.com/c/pay', 'https://js.stripe.com/v3', 'https://billing.stripe.com/p/s'])
    assert.equal(decide({ url, method: 'GET' }, O), 'bypass', url);
  assert.ok(isApiHost('a.b.supabase.co')); assert.ok(!isApiHost('faro.example'));
  assert.ok(!isApiHost('evilsupabase.co.attacker.com'));
});
test('nao mexe em POST, requisicao autenticada, outra origem ou /api', () => {
  assert.equal(decide({ url: O + '/app.js', method: 'POST' }, O), 'bypass');
  assert.equal(decide({ url: O + '/app.js', method: 'GET', hasAuth: true }, O), 'bypass');
  assert.equal(decide({ url: 'https://cdn.outro.com/a.js', method: 'GET' }, O), 'bypass');
  assert.equal(decide({ url: O + '/api/me', method: 'GET' }, O), 'bypass');
  assert.equal(decide({ url: 'lixo', method: 'GET' }, O), 'bypass');
});
test('navegacao e arquivos do shell', () => {
  assert.equal(decide({ url: O + '/qualquer/rota', method: 'GET', mode: 'navigate' }, O), 'navigate');
  assert.equal(decide({ url: O + '/app.js', method: 'GET', mode: 'no-cors' }, O), 'shell');
});
test('so respostas publicas e simples entram no cache', () => {
  const r = (init, type = 'basic') => { const x = new Response('a', init); Object.defineProperty(x, 'type', { value: type }); return x; };
  assert.ok(isCacheableResponse(r({ status: 200 })));
  assert.ok(!isCacheableResponse(r({ status: 404 })));
  assert.ok(!isCacheableResponse(r({ status: 200 }, 'cors')));
  assert.ok(!isCacheableResponse(r({ status: 200, headers: { 'cache-control': 'private, max-age=0' } })));
});
