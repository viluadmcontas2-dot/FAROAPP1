-- Cenário comportamental do paywall FARO. Cada falha levanta exceção (psql ON_ERROR_STOP).
\set ON_ERROR_STOP 1

create or replace function pg_temp.as_user(p_sub uuid, p_anon boolean default false) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated', 'is_anonymous', p_anon)::text, false);
$$;

-- Usuários: trial vigente, trial vencido, assinante, anônimo.
insert into auth.users(id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'Novo.Motorista+app@Gmail.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'vencido@faro.app', now()),
  ('00000000-0000-0000-0000-00000000000c', 'assinante@faro.app', now());
insert into auth.users(id, email, is_anonymous) values ('00000000-0000-0000-0000-00000000000d', null, true);

do $$ begin
  if (select count(*) from public.faro_trials_used) <> 3 then
    raise exception 'Trial deveria ser concedido no cadastro para os 3 e-mails reais (anônimo sem e-mail fica de fora)';
  end if;
  if not exists (select 1 from public.faro_trials_used
                 where email_hash = public.faro_email_hash('novomotorista@gmail.com')
                   and trial_ends_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 minute') then
    raise exception 'Trial deve durar 7 dias e normalizar e-mail (gmail sem pontos e sem +tag)';
  end if;
end $$;

update public.faro_trials_used set trial_ends_at = now() - interval '1 day'
where email_hash in (public.faro_email_hash('vencido@faro.app'), public.faro_email_hash('assinante@faro.app'));
insert into public.faro_subscriptions(user_id, stripe_subscription_id, status, current_period_end)
values ('00000000-0000-0000-0000-00000000000c', 'sub_ok', 'active', now() + interval '20 days');

-- Trava ligada (go-live).
update public.faro_billing_settings set enforce_paywall = true;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.faro_state(user_id, state) values ('00000000-0000-0000-0000-00000000000a', '{"a":1}');
insert into public.faro_profiles(user_id) values ('00000000-0000-0000-0000-00000000000a');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.faro_state(user_id, state) values ('00000000-0000-0000-0000-00000000000c', '{"c":1}');
insert into public.faro_push_devices(user_id, device_id) values ('00000000-0000-0000-0000-00000000000c', 'dev1');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  begin
    insert into public.faro_state(user_id, state) values ('00000000-0000-0000-0000-00000000000b', '{"b":1}');
    raise exception 'FALHA: trial vencido sem assinatura conseguiu gravar faro_state';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.faro_profiles(user_id) values ('00000000-0000-0000-0000-00000000000b');
    raise exception 'FALHA: trial vencido gravou faro_profiles';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.faro_push_devices(user_id, device_id) values ('00000000-0000-0000-0000-00000000000b', 'x');
    raise exception 'FALHA: trial vencido gravou faro_push_devices';
  exception when insufficient_privilege then null; end;
end $$;

-- Anônimo: nem lê nem grava.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d', true);
do $$ begin
  begin
    insert into public.faro_state(user_id) values ('00000000-0000-0000-0000-00000000000d');
    raise exception 'FALHA: anônimo gravou faro_state';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', true);
do $$ begin
  if exists (select 1 from public.faro_state) then raise exception 'FALHA: token anônimo leu dados'; end if;
end $$;

-- Leitura do dono continua liberada mesmo sem pagamento (exportar).
reset role;
update public.faro_subscriptions set status = 'past_due', current_period_end = now() - interval '1 day'
where user_id = '00000000-0000-0000-0000-00000000000c';
set session_replication_role = replica; -- simula gravação antiga sem disparar triggers
update public.faro_state set server_updated_at = now() - interval '1 minute';
set session_replication_role = origin;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  if (select count(*) from public.faro_state) <> 1 then raise exception 'FALHA: dono sem pagamento deve ler os próprios dados'; end if;
  begin
    update public.faro_state set state = '{"c":2}' where user_id = '00000000-0000-0000-0000-00000000000c';
    if found then raise exception 'FALHA: past_due fora do período conseguiu atualizar'; end if;
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.faro_push_devices) <> 1 then raise exception 'FALHA: leitura de aparelhos'; end if;
  delete from public.faro_push_devices where device_id = 'dev1';
  if found is not true then raise exception 'FALHA: excluir os próprios dados não depende de pagamento'; end if;
end $$;

-- Tamanho do snapshot (512 KB) e rate-limit.
reset role;
set session_replication_role = replica; -- simula gravação antiga sem disparar triggers
update public.faro_state set server_updated_at = now() - interval '1 minute';
set session_replication_role = origin;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  begin
    update public.faro_state set state = jsonb_build_object('big', repeat('x', 524288))
    where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALHA: snapshot > 512 KB aceito';
  exception when check_violation then null; end;
  update public.faro_state set state = '{"a":2}' where user_id = '00000000-0000-0000-0000-00000000000a';
  if not found then raise exception 'FALHA: gravação normal com trial vigente'; end if;
  begin
    update public.faro_state set state = '{"a":3}' where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALHA: duas gravações no mesmo segundo aceitas';
  exception when sqlstate 'P0429' then null; end;
end $$;

-- Trial é único: excluir a conta e recriar com o mesmo e-mail não renova.
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
insert into auth.users(id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000b2', 'VENCIDO@faro.app ', now());
-- Consultas do servidor (faro_has_access só responde a terceiros para service_role).
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
do $$ begin
  if public.faro_has_access('00000000-0000-0000-0000-0000000000b2') then
    raise exception 'FALHA: recriar conta renovou o trial';
  end if;
  if not public.faro_has_access('00000000-0000-0000-0000-00000000000a') then
    raise exception 'FALHA: trial vigente sem acesso';
  end if;
end $$;

-- Trava desligada (padrão até o go-live): ninguém é bloqueado.
update public.faro_billing_settings set enforce_paywall = false;
do $$ begin
  if not public.faro_has_access('00000000-0000-0000-0000-0000000000b2') then
    raise exception 'FALHA: com a trava desligada todos têm acesso';
  end if;
end $$;

-- Funções e tabelas internas fora do alcance do cliente.
set role anon;
do $$ begin
  begin
    perform public.faro_has_access('00000000-0000-0000-0000-00000000000a');
    raise exception 'FALHA: anon executou faro_has_access';
  exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
do $$ begin
  begin
    perform 1 from public.faro_trials_used;
    raise exception 'FALHA: cliente leu faro_trials_used';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'CENARIO_OK' as resultado;
