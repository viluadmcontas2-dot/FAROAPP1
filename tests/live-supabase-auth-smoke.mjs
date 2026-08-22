import assert from 'node:assert/strict';

const response = await fetch('https://mjbyqhreptllilkggiri.supabase.co/functions/v1/n5-auth-smoke?run=faro-n5-smoke-20260822-9f4c2a');
const body = await response.json();

assert.equal(response.status, 200, `N5 edge smoke deve responder 200: ${response.status} ${JSON.stringify(body)}`);
assert.equal(body?.ok, true, `N5 edge smoke deve passar: ${JSON.stringify(body)}`);
assert.equal(body?.confirmation_required, true, 'Auth deve exigir confirmação de e-mail');
assert.equal(body?.login, true, 'login por e-mail/senha deve passar para usuário confirmado');
assert.equal(body?.rls_sync, true, 'sync sob RLS deve passar');
assert.equal(body?.relogin_restore, true, 'relogin + restore deve passar');
assert.ok(Number(body?.revision) >= 1, 'estado restaurado deve carregar revision válida');

console.log(`AUTH_SMOKE_PHASE=CONFIRMED_SYNC_RESTORE_PASS revision=${body.revision}`);
