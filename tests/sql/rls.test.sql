-- Testes de RLS/RPC. Cada falha lança exceção (psql -v ON_ERROR_STOP=1).
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;
create or replace function pg_temp.assert(c boolean, m text) returns void language plpgsql as $$
begin if not c then raise exception 'FALHOU: %', m; end if; end $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');

-- 1. primeira gravação (revisão esperada 0) -> revisão 1
select pg_temp.assert((public.faro_save_state(0, '{"schema_version":2,"x":1}', 'dev-a', 'm1') ->> 'revision')::int = 1, 'insert inicial');
-- 2. repetição da mesma mutação é idempotente
select pg_temp.assert((public.faro_save_state(0, '{"schema_version":2,"x":1}', 'dev-a', 'm1') ->> 'ok')::bool, 'replay idempotente');
-- 3. avanço otimista
select pg_temp.assert((public.faro_save_state(1, '{"schema_version":2,"x":2}', 'dev-a', 'm2') ->> 'revision')::int = 2, 'update rev 2');
-- 4. revisão velha por outro aparelho -> conflito com estado remoto
select pg_temp.assert((public.faro_save_state(1, '{"schema_version":2,"x":9}', 'dev-b', 'm3') ->> 'conflict')::bool, 'conflito');
select pg_temp.assert((select state ->> 'x' from public.faro_state) = '2', 'conflito não sobrescreve');
-- 5. schema errado, não-objeto, grande demais
do $$ begin perform public.faro_save_state(2, '{"schema_version":1}', 'd', 'm4'); raise exception 'FALHOU: aceitou schema 1'; exception when sqlstate '22023' then null; end $$;
do $$ begin perform public.faro_save_state(2, '[1]', 'd', 'm4'); raise exception 'FALHOU: aceitou array'; exception when sqlstate '22023' then null; end $$;
do $$ begin perform public.faro_save_state(2, jsonb_build_object('schema_version',2,'big',repeat('x',600000)), 'd', 'm5'); raise exception 'FALHOU: aceitou grande'; exception when sqlstate '54000' then null; end $$;
-- 6. escrita direta bloqueada
do $$ begin update public.faro_state set state='{}'; raise exception 'FALHOU: update direto'; exception when insufficient_privilege then null; end $$;
do $$ begin insert into public.faro_state(user_id,schema_version,state) values (auth.uid(),2,'{}'); raise exception 'FALHOU: insert direto'; exception when insufficient_privilege then null; end $$;
-- 7. isolamento entre usuários
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.assert((select count(*) from public.faro_state) = 0, 'B não enxerga A');
select pg_temp.assert((public.faro_save_state(0, '{"schema_version":2,"y":1}', 'dev-b', 'mb1') ->> 'revision')::int = 1, 'B grava o seu');
select pg_temp.assert((select count(*) from public.faro_state) = 1, 'B vê só o seu');
-- 8. assinatura: cliente não escreve
do $$ begin insert into public.faro_subscriptions(user_id,status) values (auth.uid(),'active'); raise exception 'FALHOU: cliente escreveu assinatura'; exception when insufficient_privilege then null; end $$;
-- 9. webhook_events inacessível; anon sem acesso e sem RPC
do $$ begin perform 1 from public.faro_webhook_events; raise exception 'FALHOU: webhook_events legível'; exception when insufficient_privilege then null; end $$;
reset role; set role anon;
do $$ begin perform public.faro_save_state(0,'{}','d','m'); raise exception 'FALHOU: anon executou RPC'; exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.faro_state; raise exception 'FALHOU: anon leu estado'; exception when insufficient_privilege then null; end $$;
reset role;
select 'RLS/RPC OK' as resultado;
