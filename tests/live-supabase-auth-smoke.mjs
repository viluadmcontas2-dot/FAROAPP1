import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('faro-config.js', 'utf8');
const url = source.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
const key = source.match(/supabasePublishableKey:\s*'([^']+)'/)?.[1];
assert.ok(url && key, 'config pública do Supabase deve existir');
assert.match(url, /mjbyqhreptllilkggiri\.supabase\.co$/);

const email = 'faro-ci-n5@invalid.test';
const password = 'FaroCiN5!a4f92xQ7';
const headers = { apikey: key, 'Content-Type': 'application/json' };

const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
assert.equal(settingsResponse.status, 200, 'settings Auth deve responder');
const settings = await settingsResponse.json();
assert.equal(settings?.external?.email, true, 'Email Auth deve estar habilitado');
assert.equal(settings?.mailer_autoconfirm, false, 'confirmação de e-mail deve estar habilitada');

async function login() {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  return { response, body };
}

let attempt = await login();
assert.ok(attempt.response.ok, `login confirmado deve passar: ${attempt.response.status} ${JSON.stringify(attempt.body)}`);
assert.ok(attempt.body?.access_token, 'login confirmado deve produzir access token');
const userId = attempt.body?.user?.id;
assert.ok(userId, 'sessão deve conter user id');

const stateHeaders = {
  apikey: key,
  Authorization: `Bearer ${attempt.body.access_token}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
};
const marker = `n5-live-auth-${Date.now()}`;
const upsertResponse = await fetch(`${url}/rest/v1/faro_state?on_conflict=user_id`, {
  method: 'POST',
  headers: stateHeaders,
  body: JSON.stringify({
    user_id: userId,
    schema_version: 1,
    state: { ci: 'n5-live-auth', marker },
    device_id: 'github-actions-n5',
    last_mutation_id: marker,
    client_updated_at: new Date().toISOString(),
  }),
});
assert.ok(upsertResponse.ok, `sync write deve passar: ${upsertResponse.status} ${await upsertResponse.text()}`);

// Simula reabertura: descarta o token e autentica novamente antes de restaurar estado.
attempt = await login();
assert.ok(attempt.response.ok && attempt.body?.access_token, 'relogin deve passar');
const restoreResponse = await fetch(`${url}/rest/v1/faro_state?user_id=eq.${userId}&select=user_id,state,revision,last_mutation_id`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${attempt.body.access_token}`,
  },
});
assert.equal(restoreResponse.status, 200, 'restore read deve passar');
const rows = await restoreResponse.json();
assert.equal(rows.length, 1, 'restore deve retornar exatamente o próprio estado');
assert.equal(rows[0]?.state?.marker, marker, 'estado restaurado deve ser o estado sincronizado');
assert.equal(rows[0]?.last_mutation_id, marker, 'mutation id deve sobreviver ao relogin');

console.log(`AUTH_SMOKE_PHASE=CONFIRMED_SYNC_RESTORE_PASS user_id=${userId}`);
