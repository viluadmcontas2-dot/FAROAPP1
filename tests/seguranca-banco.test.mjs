// ATAQUE ao banco (Postgres TEMPORARIO + stub do auth + todas as migracoes). Nunca toca o Supabase real.
// Um teste que FALHA aqui = falha real confirmada (ver docs/evidence/faro-2-0/seguranca.md). Reexecutar: node --test tests/seguranca-banco.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { startPg, pgAvailable, UA, UB, UC } from './helpers/ataque-pg.mjs';

const skip = pgAvailable() ? false : 'Postgres nao encontrado (veja tests/sql/run-local.sh)';
let pg;
test.before(() => {
  if (skip) return;
  pg = startPg();
  // dados da vitima B (inseridos pelo dono do banco, como o servidor faria)
  pg.raw(`insert into public.faro_profiles(user_id,display_name,city) values ('${UB}','Vitima B','Recife');
          insert into public.faro_state(user_id,schema_version,state) values ('${UB}',2,'{"schema_version":2,"segredo":"dados-de-B"}');
          insert into public.faro_subscriptions(user_id,status,stripe_customer_id,stripe_subscription_id,current_period_end) values ('${UB}','active','cus_B','sub_B', now()+interval '30 days');
          insert into public.faro_push_devices(user_id,device_id,subscription) values ('${UB}','disp-B','{"endpoint":"https://push/B"}')`, { stopOnError: true });
});
test.after(() => { if (pg) pg.stop(); });

const denied = r => !r.ok && /permission denied|row-level security|not_authenticated|violates|must be owner/i.test(r.err);
const TABLES = ['faro_state', 'faro_profiles', 'faro_subscriptions', 'faro_push_devices'];

test('5.1 usuario A nao le linhas de B em nenhuma tabela', { skip }, () => {
  for (const t of TABLES) {
    const r = pg.user(UA, `select count(*) from public.${t} where user_id='${UB}'`);
    assert.equal(r.out, '0', `${t}: A enxergou linha de B`);
  }
  // nem sem filtro, nem pelo segredo
  assert.equal(pg.user(UA, `select count(*) from public.faro_state where state::text like '%dados-de-B%'`).out, '0');
});

test('5.2 usuario A nao escreve nem forja linhas de B', { skip }, () => {
  assert.equal(pg.user(UA, `with u as (update public.faro_profiles set display_name='HACK' where user_id='${UB}' returning 1) select count(*) from u`).out, '0');
  assert.ok(denied(pg.user(UA, `insert into public.faro_profiles(user_id,display_name) values ('${UB}','x')`)), 'A criou perfil em nome de B');
  assert.ok(denied(pg.user(UA, `insert into public.faro_push_devices(user_id,device_id) values ('${UB}','intruso')`)), 'A criou aparelho em nome de B');
  assert.equal(pg.user(UA, `with u as (update public.faro_push_devices set active=false where user_id='${UB}' returning 1) select count(*) from u`).out, '0');
  assert.equal(pg.user(UA, `with d as (delete from public.faro_state where user_id='${UB}' returning 1) select count(*) from d`).out, '0');
  // mudar o dono da PROPRIA linha para B (roubo de linha / plantar dado em B)
  assert.ok(pg.user(UA, `insert into public.faro_profiles(user_id) values ('${UA}')`).ok, 'A deveria criar o proprio perfil');
  assert.ok(denied(pg.user(UA, `update public.faro_profiles set user_id='${UB}' where user_id='${UA}'`)) || pg.user(UA, `select count(*) from public.faro_profiles where user_id='${UB}' and display_name is distinct from 'Vitima B'`).out === '0');
  assert.equal(pg.raw(`select display_name from public.faro_profiles where user_id='${UB}'`).out, 'Vitima B');
  assert.match(pg.raw(`select state->>'segredo' from public.faro_state where user_id='${UB}'`).out, /dados-de-B/);
});

test('5.3 anon nao tem acesso a tabelas nem a RPCs', { skip }, () => {
  for (const t of [...TABLES, 'faro_webhook_events', 'faro_billing_settings', 'faro_trials_used']) {
    assert.ok(denied(pg.anon(`select * from public.${t}`)), `anon leu ${t}`);
    assert.ok(denied(pg.anon(`insert into public.${t} default values`)), `anon escreveu ${t}`);
  }
  assert.ok(denied(pg.anon(`select public.faro_save_state(0,'{}','d','m')`)));
  assert.ok(denied(pg.anon(`select public.faro_has_access('${UB}')`)));
  assert.ok(denied(pg.anon(`select public.faro_trial_days_for('${UB}')`)));
});

test('5.4 INSERT/UPDATE direto em faro_state esta revogado (so a RPC grava)', { skip }, () => {
  assert.ok(denied(pg.user(UA, `insert into public.faro_state(user_id,schema_version,state) values ('${UA}',2,'{}')`)), 'INSERT direto passou');
  assert.ok(denied(pg.user(UB, `update public.faro_state set state='{"hack":1}' where user_id='${UB}'`)), 'UPDATE direto passou');
  assert.ok(denied(pg.user(UB, `update public.faro_state set revision=999999 where user_id='${UB}'`)), 'adulterar revisao passou');
});

test('5.5 faro_save_state: revisao errada, replay, user_id forjado, schema, tamanho', { skip }, () => {
  const save = (uid, rev, state, dev = 'd1', mut = 'm1') => pg.user(uid, `select public.faro_save_state(${rev}, $j$${state}$j$::jsonb, '${dev}', '${mut}')`);
  assert.match(save(UC, 0, '{"schema_version":2,"v":1}', 'dc', 'c1').out, /"ok": true/);
  // revisao errada nao sobrescreve e devolve conflito
  const wrong = save(UC, 5, '{"schema_version":2,"v":"HACK"}', 'dc', 'c2');
  assert.match(wrong.out, /"conflict": true/);
  assert.equal(pg.raw(`select state->>'v' from public.faro_state where user_id='${UC}'`).out, '1');
  // replay idempotente (mesma mutacao e aparelho) nao duplica nem avanca
  const rev1 = pg.raw(`select revision from public.faro_state where user_id='${UC}'`).out;
  assert.match(save(UC, 0, '{"schema_version":2,"v":1}', 'dc', 'c1').out, /"replay": true|"ok": true/);
  assert.equal(pg.raw(`select revision from public.faro_state where user_id='${UC}'`).out, rev1);
  // mesma mutation_id mas OUTRO aparelho nao vira "replay" (nao pode ser usado para fingir sucesso)
  assert.match(save(UC, 0, '{"schema_version":2,"v":"X"}', 'outro', 'c1').out, /"conflict": true/);
  // user_id forjado dentro do estado e ignorado: a linha e sempre de auth.uid()
  save(UA, 0, `{"schema_version":2,"user_id":"${UB}","userId":"${UB}"}`, 'da', 'a1');
  assert.equal(pg.raw(`select count(*) from public.faro_state where user_id='${UB}'`).out, '1');
  assert.match(pg.raw(`select state->>'segredo' from public.faro_state where user_id='${UB}'`).out, /dados-de-B/);
  // schema_version errado / nao numerico / array / nulo
  for (const bad of ['{"schema_version":1}', '{"schema_version":3}', '{"schemaVersion":99}', '{"schema_version":"abc"}', '[1,2]', '"texto"', 'null', '5']) {
    const r = save(UC, 1, bad, 'dc', 'bad');
    assert.ok(!r.ok, `aceitou estado invalido ${bad}`);
  }
  // expected_revision negativo / nulo
  assert.ok(!pg.user(UC, `select public.faro_save_state(-1,'{}'::jsonb,'d','m')`).ok);
  assert.ok(!pg.user(UC, `select public.faro_save_state(null,'{}'::jsonb,'d','m')`).ok);
  // ids gigantes / vazios
  assert.ok(!pg.user(UC, `select public.faro_save_state(1,'{}'::jsonb,repeat('x',129),'m')`).ok);
  assert.ok(!pg.user(UC, `select public.faro_save_state(1,'{}'::jsonb,'d','')`).ok);
  // sem sessao
  assert.ok(denied(pg.user(null, `select public.faro_save_state(0,'{}'::jsonb,'d','m')`)), 'gravou sem uid');
});

test('5.6 faro_save_state recusa estado de 10 MB e de 600 KB (inclusive muito compressivel)', { skip }, () => {
  const big = pg.user(UC, `select public.faro_save_state(1, jsonb_build_object('schema_version',2,'big',repeat('x',10*1024*1024)), 'dc', 'big1')`);
  assert.ok(!big.ok && /state_too_large|54000|maximum|too large/i.test(big.err), `10MB passou: ${big.err}${big.out}`.slice(0, 200));
  const many = pg.user(UC, `select public.faro_save_state(1, jsonb_build_object('schema_version',2,'a',(select jsonb_agg(i) from generate_series(1,200000) i)), 'dc', 'big2')`);
  assert.ok(!many.ok, 'array grande passou');
  const ok = pg.user(UC, `select (public.faro_save_state(1, jsonb_build_object('schema_version',2,'pad',repeat('y',100000)), 'dc', 'ok-100k')) ->> 'ok'`);
  assert.equal(ok.out, 'true', 'estado legitimo de 100 KB deveria passar');
  assert.ok(pg.raw(`select pg_column_size(state) from public.faro_state where user_id='${UC}'`).out < 524288 + 1);
});

test('5.7 usuario comum nao se concede assinatura nem chama RPCs de servico', { skip }, () => {
  assert.ok(denied(pg.user(UA, `insert into public.faro_subscriptions(user_id,status,current_period_end) values ('${UA}','active', now()+interval '999 days')`)));
  assert.ok(denied(pg.user(UB, `update public.faro_subscriptions set status='active', current_period_end=now()+interval '999 days' where user_id='${UB}'`)));
  assert.ok(denied(pg.user(UB, `delete from public.faro_subscriptions where user_id='${UB}'`)));
  for (const fn of [
    `public.faro_apply_subscription_event('evt_x','customer.subscription.created',now(),'${UA}','cus_x','sub_x','active',now()+interval '99 days',false)`,
    `public.faro_reserve_checkout('${UA}')`, `public.faro_save_checkout('${UA}','s','https://x',now())`,
    `public.faro_release_checkout('${UA}')`, `public.faro_begin_account_deletion('${UB}')`,
    `public.faro_trial_days_for('${UB}')`, `public.faro_email_hash('a@b.com')`, `public.faro_normalize_email('a@b.com')`,
  ]) assert.ok(denied(pg.user(UA, `select ${fn}`)), `usuario executou ${fn}`);
  for (const t of ['faro_billing_settings', 'faro_trials_used', 'faro_webhook_events']) {
    assert.ok(denied(pg.user(UA, `select * from public.${t}`)) || pg.user(UA, `select count(*) from public.${t}`).out === '0', `usuario leu ${t}`);
  }
  assert.ok(denied(pg.user(UA, `update public.faro_billing_settings set enforce_paywall=false`)) || pg.user(UA, `select count(*) from public.faro_billing_settings`).out === '0');
  assert.equal(pg.raw(`select status from public.faro_subscriptions where user_id='${UB}'`).out, 'active');
  assert.equal(pg.raw(`select count(*) from public.faro_subscriptions where user_id='${UA}'`).out, '0');
});

test('5.8 todas as funcoes SECURITY DEFINER fixam search_path vazio e nenhuma e executavel por anon', { skip }, () => {
  const rows = pg.raw(`select p.proname||'|'||coalesce(array_to_string(p.proconfig,','),'-')||'|'||has_function_privilege('anon',p.oid,'execute')||'|'||p.prosecdef
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'faro_%'`).out.split('\n').filter(Boolean);
  assert.ok(rows.length >= 12, 'funcoes faro_* nao encontradas');
  for (const r of rows) {
    const [name, cfg, anonExec, definer] = r.split('|');
    assert.match(cfg, /search_path=""/, `${name} sem search_path vazio (${cfg})`);
    if (definer === 't') assert.equal(anonExec, 'f', `${name} (SECURITY DEFINER) executavel por anon`);
  }
  // nenhum papel de cliente cria objetos no schema public
  assert.equal(pg.raw(`select has_schema_privilege('authenticated','public','CREATE') or has_schema_privilege('anon','public','CREATE')`).out, 'f');
});

test('5.9 funcoes executaveis pelo usuario logado: so as esperadas', { skip }, () => {
  const exec = pg.raw(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname like 'faro_%' and p.prosecdef and has_function_privilege('authenticated',p.oid,'execute') order by 1`).out.split('\n');
  assert.deepEqual(exec, ['faro_has_access', 'faro_my_trial_ends_at', 'faro_save_state']);
});

test('5.10 faro_has_access: nao escala (so responde por si mesmo) e respeita enforce_paywall', { skip }, () => {
  assert.equal(pg.user(UA, `select public.faro_has_access('${UB}')`).out, 'f', 'A consultou o direito de B e obteve true');
  pg.raw(`update public.faro_billing_settings set enforce_paywall=true`);
  try {
    assert.equal(pg.user(UA, `select public.faro_has_access('${UA}')`).out, 'f', 'sem assinatura nao pode ter acesso');
    assert.equal(pg.user(UB, `select public.faro_has_access('${UB}')`).out, 't');
    assert.equal(pg.user(UA, `select public.faro_has_access(null)`).out, 'f');
    // assinatura vencida / status ruim nao concede
    pg.raw(`update public.faro_subscriptions set current_period_end = now() - interval '1 second' where user_id='${UB}'`);
    assert.equal(pg.user(UB, `select public.faro_has_access('${UB}')`).out, 'f', 'assinatura vencida concedeu acesso');
    pg.raw(`update public.faro_subscriptions set current_period_end = now() + interval '30 days', status='past_due' where user_id='${UB}'`);
    assert.equal(pg.user(UB, `select public.faro_has_access('${UB}')`).out, 'f', 'past_due concedeu acesso');
    pg.raw(`update public.faro_subscriptions set status='active' where user_id='${UB}'`);
  } finally { pg.raw(`update public.faro_billing_settings set enforce_paywall=false`); }
});

test('9.1 com enforce_paywall=true o SERVIDOR recusa gravar na nuvem quem nao tem direito (sem_direito); com false nada muda', { skip }, () => {
  const save = (u, rev, m) => pg.user(u, `select public.faro_save_state(${rev}, '{"schema_version":2,"gratis":1}', 'da', '${m}')`);
  // paywall desligado (padrao de hoje): ninguem e barrado
  assert.equal(pg.raw(`select enforce_paywall from public.faro_billing_settings`).out, 'f');
  pg.raw(`delete from public.faro_state where user_id='${UA}'`);
  assert.match(save(UA, 0, 'paywall-off').out, /"ok": true/, 'com paywall desligado a gravacao deveria passar');
  pg.raw(`delete from public.faro_state where user_id='${UA}'`);
  pg.raw(`update public.faro_billing_settings set enforce_paywall=true`);
  try {
    const r = save(UA, 0, 'paywall-1');
    assert.ok(!r.ok && /sem_direito/.test(r.err), `sem assinatura deveria dar sem_direito: ${r.err || r.out}`);
    assert.equal(pg.raw(`select count(*) from public.faro_state where user_id='${UA}'`).out, '0', 'a nuvem gravou para quem nao tem assinatura');
    // quem tem assinatura ativa (B) segue gravando; o servidor so recusa, nao apaga nada
    const antes = pg.raw(`select revision from public.faro_state where user_id='${UB}'`).out;
    assert.match(save(UB, antes, 'paywall-b').out, /"ok": true/, 'assinante ativo foi barrado');
    // assinatura vencida: barrado e o estado que ja estava na nuvem permanece intacto
    pg.raw(`update public.faro_subscriptions set current_period_end = now() - interval '1 second' where user_id='${UB}'`);
    const rev = pg.raw(`select revision from public.faro_state where user_id='${UB}'`).out;
    const r2 = save(UB, rev, 'paywall-venc');
    assert.ok(!r2.ok && /sem_direito/.test(r2.err), 'assinatura vencida gravou');
    assert.equal(pg.raw(`select revision from public.faro_state where user_id='${UB}'`).out, rev, 'o servidor alterou o estado ao recusar');
    assert.match(pg.raw(`select state->>'gratis' from public.faro_state where user_id='${UB}'`).out, /1/, 'estado de B foi apagado ao recusar');
  } finally {
    pg.raw(`update public.faro_billing_settings set enforce_paywall=false; update public.faro_subscriptions set current_period_end = now()+interval '30 days' where user_id='${UB}'; delete from public.faro_state where user_id='${UA}'`);
  }
});

test('5.11 aparelhos de push: limites por linha valem e UM usuario nao pode criar linhas sem teto', { skip }, () => {
  assert.ok(!pg.user(UA, `insert into public.faro_push_devices(user_id,device_id,subscription) values ('${UA}','big', jsonb_build_object('k',repeat('x',9000)))`).ok, 'subscription > 8 KB aceita');
  assert.ok(!pg.user(UA, `insert into public.faro_push_devices(user_id,device_id) values ('${UA}',repeat('d',129))`).ok, 'device_id > 128 aceito');
  assert.ok(!pg.user(UA, `insert into public.faro_push_devices(user_id,device_id,platform) values ('${UA}','p','desktop')`).ok, 'plataforma invalida aceita');
  // teto por usuario: 500 linhas de uma vez sao recusadas por inteiro
  const r = pg.user(UA, `insert into public.faro_push_devices(user_id,device_id,subscription) select '${UA}','farm-'||i, jsonb_build_object('p',repeat('x',2000)) from generate_series(1,500) i`);
  const n = Number(pg.raw(`select count(*) from public.faro_push_devices where user_id='${UA}'`).out);
  assert.ok(!r.ok || n <= 20, `usuario criou ${n} aparelhos (sem teto por usuario)`);
  assert.ok(!r.ok && /limite de 10 aparelhos/i.test(r.err), `erro deveria ser claro: ${r.err}`);
  // 10 passam; o 11o e recusado com mensagem clara; re-registrar um aparelho existente (upsert) segue valendo
  pg.raw(`delete from public.faro_push_devices where user_id='${UA}'`);
  for (let i = 1; i <= 10; i++) assert.ok(pg.user(UA, `insert into public.faro_push_devices(user_id,device_id) values ('${UA}','ok-${i}')`).ok, `aparelho ${i} recusado`);
  const o = pg.user(UA, `insert into public.faro_push_devices(user_id,device_id) values ('${UA}','ok-11')`);
  assert.ok(!o.ok && /limite de 10 aparelhos/i.test(o.err), `11o aparelho aceito/erro obscuro: ${o.err}`);
  assert.ok(pg.user(UA, `insert into public.faro_push_devices(user_id,device_id,subscription) values ('${UA}','ok-3','{"endpoint":"https://push/novo"}') on conflict (user_id,device_id) do update set subscription=excluded.subscription`).ok, 'upsert de aparelho existente barrado no teto');
  assert.equal(pg.raw(`select count(*) from public.faro_push_devices where user_id='${UA}'`).out, '10');
  // o teto e por usuario: B (que ja tem 1) nao e afetado pelo teto de A
  assert.ok(pg.user(UB, `insert into public.faro_push_devices(user_id,device_id) values ('${UB}','b-2')`).ok);
  // apagar um libera vaga
  assert.ok(pg.user(UA, `delete from public.faro_push_devices where device_id='ok-1'`).ok);
  assert.ok(pg.user(UA, `insert into public.faro_push_devices(user_id,device_id) values ('${UA}','ok-11')`).ok, 'apagar um aparelho nao liberou vaga');
  pg.raw(`delete from public.faro_push_devices where user_id='${UA}' or device_id='b-2'`);
});

test('5.12 faro_save_state tem limite de frequencia (60 por minuto por usuario, muitas_gravacoes); replay idempotente nao conta', { skip }, () => {
  pg.raw(`delete from public.faro_state where user_id='${UC}'; delete from public.faro_state_write_log where user_id='${UC}'`);
  const save = (rev, m, st = '{"schema_version":2}') => pg.user(UC, `select public.faro_save_state(${rev}, '${st}', 'd', '${m}')`);
  const rev = () => Number(pg.raw(`select revision from public.faro_state where user_id='${UC}'`).out || 0);
  let accepted = 0, barrada = null;
  for (let i = 0; i < 70; i++) {
    const r = save(rev(), `r${i}`, `{"schema_version":2,"i":${i}}`);
    if (/"ok": true/.test(r.out)) accepted++; else { barrada = r; break; }
  }
  assert.equal(accepted, 60, `${accepted} gravacoes seguidas aceitas (esperado exatamente 60 por minuto)`);
  assert.ok(barrada && !barrada.ok && /muitas_gravacoes/.test(barrada.err), `a barrada deveria ser muitas_gravacoes: ${barrada && (barrada.err || barrada.out)}`);
  // replay da ULTIMA mutacao ja gravada continua respondendo ok mesmo com o limite estourado (nao conta, nao e barrado)
  const ultima = `r${accepted - 1}`;
  assert.match(save(rev() - 1, ultima, `{"schema_version":2,"i":${accepted - 1}}`).out, /"replay": true/, 'replay idempotente foi barrado pelo limite');
  // o limite e por usuario: A segue gravando
  assert.match(pg.user(UA, `select public.faro_save_state(0,'{"schema_version":2}','da','a-1')`).out, /"ok": true/, 'o limite de C afetou A');
  pg.raw(`delete from public.faro_state where user_id='${UA}'`);
  // a janela reinicia depois de 1 minuto
  pg.raw(`update public.faro_state_write_log set window_start = now() - interval '61 seconds' where user_id='${UC}'`);
  assert.match(save(rev(), 'depois-da-janela').out, /"ok": true/, 'janela nao reiniciou');
  // o cliente nao enxerga nem mexe no contador
  assert.ok(denied(pg.user(UC, `select * from public.faro_state_write_log`)), 'cliente leu o contador');
  assert.ok(denied(pg.user(UC, `update public.faro_state_write_log set n=0`)), 'cliente zerou o contador');
  pg.raw(`delete from public.faro_state where user_id='${UC}'`);
});

test('9.2 trial: e-mail normalizado (gmail com ponto/+alias) e historico sobrevive a exclusao da conta', { skip }, () => {
  const h = e => pg.service(`select public.faro_email_hash('${e}')`).out;
  const base = h('joao.silva@gmail.com');
  for (const alias of ['joaosilva@gmail.com', 'JOAO.SILVA+farm1@gmail.com', 'j.o.a.o.s.i.l.v.a+x+y@googlemail.com', ' joaosilva@gmail.com ']) assert.equal(h(alias), base, `alias ${alias} geraria novo trial`);
  assert.equal(h('maria+a@outlook.com'), h('maria@outlook.com'));
  assert.notEqual(h('a@exemplo.com'), h('b@exemplo.com'));
  // registra o trial pelo caminho do webhook (service_role) e confere que o alias nao ganha outro
  const uid = '00000000-0000-0000-0000-0000000000d1', uid2 = '00000000-0000-0000-0000-0000000000d2';
  pg.raw(`insert into auth.users(id,email,email_confirmed_at) values ('${uid}','joao.silva@gmail.com',now()),('${uid2}','joaosilva+farm@gmail.com',now())`);
  assert.equal(pg.service(`select public.faro_trial_days_for('${uid}')`).out, '2');
  assert.equal(pg.service(`select public.faro_apply_subscription_event('evt_trial1','customer.subscription.created',now(),'${uid}','cus_d1','sub_d1','trialing',now()+interval '7 days',false)`).out, 'applied');
  assert.equal(pg.service(`select public.faro_trial_days_for('${uid2}')`).out, '0', 'alias do mesmo gmail ganhou segundo trial');
  pg.raw(`delete from auth.users where id='${uid}'`);
  assert.equal(pg.service(`select public.faro_trial_days_for('${uid2}')`).out, '0', 'excluir e recriar a conta renovaria o trial');
  // contas anonimas nunca recebem trial
  pg.raw(`insert into auth.users(id,email,is_anonymous) values ('00000000-0000-0000-0000-0000000000d3','novo@exemplo.com',true)`);
  assert.equal(pg.service(`select public.faro_trial_days_for('00000000-0000-0000-0000-0000000000d3')`).out, '0');
});

test('6.x webhook no banco: replay, evento velho, conta inexistente, status desconhecido, roubo de assinatura de outro', { skip }, () => {
  const ev = (id, created, user, sub, status) => pg.service(`select public.faro_apply_subscription_event('${id}','customer.subscription.updated','${created}','${user}','cus_${user.slice(-2)}','${sub}','${status}',now()+interval '30 days',false)`);
  const U = '00000000-0000-0000-0000-0000000000e1', V = '00000000-0000-0000-0000-0000000000e2';
  pg.raw(`insert into auth.users(id,email) values ('${U}','u@exemplo.com'),('${V}','v@exemplo.com')`);
  assert.equal(ev('evt_a', '2026-10-20T10:00:00Z', U, 'sub_U', 'active').out, 'applied');
  assert.equal(ev('evt_a', '2026-10-20T10:00:00Z', U, 'sub_U', 'canceled').out, 'duplicate', 'replay do mesmo evento reaplicou');
  assert.equal(pg.raw(`select status from public.faro_subscriptions where user_id='${U}'`).out, 'active');
  assert.equal(ev('evt_old', '2026-10-19T10:00:00Z', U, 'sub_U', 'canceled').out, 'stale', 'evento mais velho sobrescreveu');
  assert.equal(pg.raw(`select status from public.faro_subscriptions where user_id='${U}'`).out, 'active');
  assert.equal(ev('evt_orf', '2026-10-21T10:00:00Z', '00000000-0000-0000-0000-0000000000ff', 'sub_X', 'active').out, 'orphan');
  assert.equal(ev('evt_weird', '2026-10-21T11:00:00Z', U, 'sub_U', 'hacked; drop table').out, 'applied');
  assert.equal(pg.raw(`select status from public.faro_subscriptions where user_id='${U}'`).out, 'inactive', 'status desconhecido virou acesso');
  // V tenta ficar com a assinatura de U: a unicidade impede (e U continua intacto)
  const steal = ev('evt_steal', '2026-10-21T12:00:00Z', V, 'sub_U', 'active');
  assert.ok(!steal.ok || steal.out !== 'applied', 'assinatura de U atribuida a V');
  assert.equal(pg.raw(`select count(*) from public.faro_subscriptions where stripe_subscription_id='sub_U'`).out, '1');
  assert.equal(ev('', '2026-10-21T12:00:00Z', U, 'sub_U', 'active').ok, false, 'evento sem id aceito');
});

test('5.13 estado salvo e devolvido sem execucao: payload malicioso e so dado (jsonb), nao e interpretado', { skip }, () => {
  const evil = JSON.stringify({ schema_version: 2, nome: "'); drop table faro_state;--", html: '<img src=x onerror=alert(1)>', __proto__: { x: 1 }, constructor: 'c' }).replace(/\$/g, '');
  const r = pg.user(UA, `select public.faro_save_state(0, $j$${evil}$j$::jsonb, 'da', 'evil-1')`);
  assert.ok(r.ok, r.err);
  assert.equal(pg.raw(`select count(*) from public.faro_state`).out >= '1', true);
  assert.match(pg.user(UA, `select state->>'html' from public.faro_state`).out, /onerror/);
});
