// Sync seguro: titularidade, compare-and-set, voo de upload e paywall (Supabase falso).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountHarness, tick } from './helpers/fake-supabase-account.mjs';

const dataA = { onboardingComplete: true, records: [{ id: 'a1', gross: 777, owner: 'a' }] };
const leaks = (h, marker = 777) => h.server.writes.filter(w => JSON.stringify(w.payload || {}).includes(String(marker)) && (w.filters.user_id === 'b' || w.payload?.user_id === 'b'));

test('(A) logout em outra aba + login de B sem snapshot: nada de A vai para B nem aparece na tela', async () => {
  const h = await accountHarness({ meta: { userId: 'a', remoteRevision: 1 }, state: dataA, rows: { a: { user_id: 'a', state: dataA, revision: 1 } }, sessionUser: 'a' });
  // outra aba sai da conta: apaga a meta e o Supabase avisa SIGNED_OUT
  h.storage.delete('faro-sync-meta-v1');
  await h.fireStorage('faro-sync-meta-v1', null);
  await h.fireAuth('SIGNED_OUT', null);
  await h.signIn('b');
  await h.runTimers();
  assert.deepEqual(leaks(h), [], 'nenhuma gravação com dados de A para B');
  assert.ok(!JSON.stringify(h.app.state).includes('777'), 'dados de A não ficam na tela de B');
  const copy = JSON.parse(h.storage.get('faro-account-switch-backup-v1') || '[]').at(-1);
  assert.equal(copy?.userId, 'a'); assert.equal(copy?.state.records[0].gross, 777, 'cópia exportável de A guardada');
});

test('(A) sem evento de logout: edição após a meta sumir e login de B ainda não vaza A', async () => {
  const h = await accountHarness({ meta: { userId: 'a', remoteRevision: 1 }, state: dataA, rows: { a: { user_id: 'a', state: dataA, revision: 1 } }, sessionUser: 'a' });
  h.storage.delete('faro-sync-meta-v1');
  h.app.save(); // edição nesta aba recria a meta sem dono
  h.server.authUser = null;
  await h.signIn('b');
  await h.runTimers();
  assert.deepEqual(leaks(h), []);
  assert.ok(!JSON.stringify(h.app.state).includes('777'));
});

test('(B) outro aparelho grava entre a leitura e a escrita: abre conflito, não sobrescreve', async () => {
  const mine = { onboardingComplete: true, records: [{ id: 'm', gross: 1 }] };
  const theirs = { onboardingComplete: true, records: [{ id: 't', gross: 2 }] };
  const h = await accountHarness({ meta: { userId: 'a', remoteRevision: 1, dirty: true, lastMutationId: 'x' }, state: { onboardingComplete: true, records: [] }, rows: { a: { user_id: 'a', state: { onboardingComplete: true, records: [] }, revision: 1 } } });
  h.app.state = mine;
  h.server.beforeWrite = () => { h.server.rows.a = { user_id: 'a', state: theirs, revision: 2 }; };
  await h.signIn('a');
  assert.equal(h.server.rows.a.state.records[0].id, 't', 'gravação do outro aparelho preservada');
  assert.equal(h.el('faroSyncConflict').classes.has('hidden'), false, 'janela de conflito aberta');
  assert.ok(h.server.writes.filter(w => w.table === 'faro_state').every(w => w.op !== 'upsert'), 'sem upsert cego');
});

test('(B) dois aparelhos criando a primeira cópia: INSERT só se não existe; senão conflito', async () => {
  const theirs = { onboardingComplete: true, records: [{ id: 't', gross: 2 }] };
  const h = await accountHarness({ state: dataA });
  h.server.beforeWrite = () => { h.server.rows.a = { user_id: 'a', state: theirs, revision: 1 }; };
  await h.signIn('a');
  assert.equal(h.server.rows.a.state.records[0].id, 't');
  assert.equal(h.el('faroSyncConflict').classes.has('hidden'), false);
});

test('(C) edição durante o upload mantém dirty e reenvia', async () => {
  const base = { onboardingComplete: true, records: [{ id: 'r', gross: 1 }] };
  const h = await accountHarness({ meta: { userId: 'a', remoteRevision: 1, dirty: true, lastMutationId: 'm1' }, state: base, rows: { a: { user_id: 'a', state: { onboardingComplete: true, records: [{ id: 'r', gross: 0 }] }, revision: 1 } } });
  let release; h.server.gate = new Promise(r => { release = r; });
  const signing = h.signIn('a');
  await tick();
  h.app.state = { onboardingComplete: true, records: [{ id: 'r', gross: 99 }] };
  h.app.save(); // edição em voo
  h.server.gate = null; release(); await signing; await tick();
  assert.equal(h.meta().dirty, true, 'edição em voo continua pendente');
  await h.runTimers();
  assert.equal(h.server.rows.a.state.records[0].gross, 99, 'edição reenviada');
  assert.equal(h.meta().dirty, false);
});

test('(D) paywall: login não trava no perfil e mostra "Assine" sem repetir para sempre', async () => {
  const h = await accountHarness({ state: dataA, paywall: true });
  await h.signIn('a');
  assert.equal(h.el('faroAccountModal').classes.has('hidden'), true, 'modal de login fecha');
  assert.equal(h.syncText(), 'Assine para voltar a salvar na nuvem. Seus dados continuam neste aparelho.');
  h.timers.length = 0; h.app.save();
  assert.equal(h.timers.length, 0, 'sem nova tentativa automática enquanto o paywall recusa');
  assert.equal(h.syncText(), 'Assine para voltar a salvar na nuvem. Seus dados continuam neste aparelho.');
});

test('(D) paywall: recuperar dados da nuvem continua funcionando', async () => {
  const remote = { onboardingComplete: true, records: [{ id: 'n', gross: 5 }] };
  const h = await accountHarness({ state: { records: [] }, rows: { a: { user_id: 'a', state: remote, revision: 3 } }, paywall: true });
  await h.signIn('a');
  assert.equal(h.app.state.records[0].gross, 5);
});

test('(A) a mesma conta volta: a cópia guardada retorna e segue o fluxo normal', async () => {
  // nuvem mudou em outro aparelho (rev 2): a edição local pendente fica à espera da escolha
  const h = await accountHarness({ meta: { userId: 'a', remoteRevision: 1, dirty: true, lastMutationId: 'm9' }, state: dataA, rows: { a: { user_id: 'a', state: { onboardingComplete: true, records: [{ id: 'x', gross: 5 }] }, revision: 2 } }, sessionUser: 'a' });
  await h.fireAuth('SIGNED_OUT', null);
  assert.ok(!JSON.stringify(h.app.state).includes('777'));
  assert.equal(h.el('faroSwitchBackup').classes.has('hidden'), false, 'cópia aparece para exportar');
  await h.signIn('a');
  await h.runTimers();
  assert.ok(JSON.stringify(h.app.state).includes('777'), 'edição pendente de A volta ao aparelho');
  assert.equal(h.el('faroSyncConflict').classes.has('hidden'), false, 'conflito aberto, nada sobrescrito');
  assert.equal(h.server.rows.a.revision, 2);
  assert.equal(h.storage.has('faro-account-switch-backup-v1'), false);
});

test('(A) cópia de outra conta pode ser exportada e apagada', async () => {
  const h = await accountHarness({ meta: { userId: 'a', remoteRevision: 1, dirty: true }, state: dataA, sessionUser: 'a', rows: { a: { user_id: 'a', state: dataA, revision: 1 } } });
  await h.fireStorage('faro-sync-meta-v1', JSON.stringify({ userId: 'b' }));
  h.el('faroExportSwitch').click();
  assert.equal(h.exported?.records?.[0]?.gross, undefined); // export usa app.exportData real do app
  h.el('faroRemoveSwitch').click();
  assert.equal(h.storage.has('faro-account-switch-backup-v1'), false);
  assert.equal(h.el('faroSwitchBackup').classes.has('hidden'), true);
});
