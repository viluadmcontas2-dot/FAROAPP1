-- Fim do teste persiste após ativação; replay e eventos antigos não alteram a linha.
begin;
create or replace function pg_temp.assert(c boolean, m text) returns void language plpgsql as $$
begin if c is distinct from true then raise exception 'FALHOU: %', m; end if; end $$;
select pg_temp.assert(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'faro_subscriptions' and column_name = 'trial_end' and data_type = 'timestamp with time zone'), 'coluna trial_end criada');
insert into auth.users (id, email, is_anonymous) values ('00000000-0000-0000-0000-0000000000d1', 'fim@exemplo.com', false);
do $$
declare
  u uuid := '00000000-0000-0000-0000-0000000000d1';
  fim timestamptz := '2026-10-22T00:00:00Z';
  anterior jsonb;
begin
  perform pg_temp.assert(public.faro_apply_subscription_event('fim_1','customer.subscription.created',now(),u,'cus_fim','sub_fim','trialing',now()+interval '7 days',false,fim-interval '1 day') = 'applied', 'trial aplicado');
  perform pg_temp.assert((select trial_end = fim-interval '1 day' from public.faro_subscriptions where user_id=u), 'fim salvo no insert');
  perform pg_temp.assert(public.faro_apply_subscription_event('fim_2','customer.subscription.updated',now()+interval '1 second',u,'cus_fim','sub_fim','active',now()+interval '30 days',false,fim) = 'applied', 'ativação aplicada');
  perform pg_temp.assert((select trial_end = fim and status = 'active' from public.faro_subscriptions where user_id=u), 'fim salvo após ativação');
  select to_jsonb(s) into anterior from public.faro_subscriptions s where user_id=u;
  perform pg_temp.assert(public.faro_apply_subscription_event('fim_2','customer.subscription.updated',now()+interval '2 seconds',u,'cus_fim','sub_fim','canceled',null,false,null) = 'duplicate', 'replay duplicate');
  perform pg_temp.assert((select to_jsonb(s) = anterior from public.faro_subscriptions s where user_id=u), 'replay não altera linha');
  perform pg_temp.assert(public.faro_apply_subscription_event('fim_3','customer.subscription.updated',now()-interval '1 second',u,'cus_fim','sub_fim','trialing',null,false,fim+interval '1 day') = 'stale', 'evento antigo stale');
  perform pg_temp.assert((select to_jsonb(s) = anterior from public.faro_subscriptions s where user_id=u), 'stale não altera linha');
  perform pg_temp.assert(public.faro_apply_subscription_event('fim_4','customer.subscription.updated',now()+interval '3 seconds',u,'cus_fim','sub_fim','active',now()+interval '30 days',false) = 'applied', 'chamada antiga aceita');
end $$;
rollback;
select 'trial_end OK: coluna, gravação, ativação, duplicate, stale e chamada antiga' as resultado;
