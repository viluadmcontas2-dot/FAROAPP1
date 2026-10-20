-- Cenário de endurecimento FARO: limites de tamanho, teto de aparelhos, REVOKE e constraint validada.
\set ON_ERROR_STOP 1

create or replace function pg_temp.as_user(p_sub uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated', 'is_anonymous', false)::text, false);
$$;

insert into auth.users(id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1', 'limite@faro.app', now());

-- 1) Funções auxiliares não são chamáveis por anon/authenticated.
do $$
declare f text;
begin
  foreach f in array array[
    'public.faro_normalize_email(text)', 'public.faro_email_hash(text)',
    'public.faro_touch_updated_at()', 'public.faro_advance_state_revision()', 'public.faro_state_rate_limit()'
  ] loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute')
       or has_function_privilege('public', f, 'execute') then
      raise exception 'EXECUTE ainda aberto em %', f;
    end if;
  end loop;
end $$;

-- 2) A constraint de 512 KB está validada.
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'faro_state_state_size' and not convalidated) then
    raise exception 'faro_state_state_size continua NOT VALID';
  end if;
end $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');

-- 3) Subscription gigante é recusada.
do $$ begin
  begin
    insert into public.faro_push_devices(user_id, device_id, subscription)
    values ('00000000-0000-0000-0000-0000000000a1', 'big', jsonb_build_object('x', repeat('a', 20000)));
    raise exception 'subscription gigante deveria falhar';
  exception when check_violation then null; end;
  begin
    insert into public.faro_profiles(user_id, display_name) values ('00000000-0000-0000-0000-0000000000a1', repeat('n', 500));
    raise exception 'display_name gigante deveria falhar';
  exception when check_violation then null; end;
end $$;

-- 4) Teto de aparelhos por usuário (20).
do $$ begin
  for i in 1..20 loop
    insert into public.faro_push_devices(user_id, device_id, subscription)
    values ('00000000-0000-0000-0000-0000000000a1', 'dev' || i, '{"endpoint":"https://x"}');
  end loop;
  begin
    insert into public.faro_push_devices(user_id, device_id) values ('00000000-0000-0000-0000-0000000000a1', 'dev21');
    raise exception 'o 21o aparelho deveria falhar';
  exception when sqlstate 'P0429' then null; end;
end $$;
reset role;

select 'CENARIO_OK' as resultado;
