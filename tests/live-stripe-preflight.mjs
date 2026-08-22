import assert from 'node:assert/strict';
const response = await fetch('https://mjbyqhreptllilkggiri.supabase.co/functions/v1/n6-stripe-preflight?run=faro-n6-preflight-20260822-4c81d7');
const body = await response.json();
assert.equal(response.status, 200, `Stripe preflight deve responder 200: ${response.status}`);
console.log(`STRIPE_PREFLIGHT=${JSON.stringify(body)}`);
