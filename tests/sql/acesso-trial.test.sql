-- Acesso e trial: trial uma vez, acesso por status, replay do webhook. Falha = exceção.
create or replace function pg_temp.assert(c boolean, m text) returns void language plpgsql as $$
begin if not c then raise exception 'FALHOU: %', m; end if; end $$;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); perform set_config('request.jwt.claim.role', 'authenticated', false); end $$;

insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', 'Joao.Silva+faro@gmail.com', false),
  ('00000000-0000-0000-0000-0000000000c2', 'joaosilva@gmail.com', false),
  ('00000000-0000-0000-0000-0000000000c3', null, true),
  ('00000000-0000-0000-0000-0000000000c4', 'maria@exemplo.com', false);

-- 1. trial: elegivel na primeira vez; 0 para anonimo; 7 dias vindos de faro_billing_settings
select pg_temp.assert(public.faro_trial_days_for('00000000-0000-0000-0000-0000000000c1') = 7, 'primeira vez: 7 dias');
select pg_temp.assert(public.faro_trial_days_for('00000000-0000-0000-0000-0000000000c3') = 0, 'anonimo sem trial');
select pg_temp.assert(public.faro_trial_days_for(gen_random_uuid()) = 0, 'usuario inexistente sem trial');

-- 2. webhook: trialing grava assinatura e consome o trial
select pg_temp.assert(public.faro_apply_subscription_event('evt_1','customer.subscription.created', now(),
  '00000000-0000-0000-0000-0000000000c1','cus_1','sub_1','trialing', now() + interval '7 days', false) = 'applied', 'trialing aplicado');
select pg_temp.assert((select status from public.faro_subscriptions where user_id='00000000-0000-0000-0000-0000000000c1') = 'trialing', 'status trialing salvo');
select pg_temp.assert((select count(*) from public.faro_trials_used) = 1, 'trial registrado');

-- 3. replay do mesmo evento: duplicate, nada muda
select pg_temp.assert(public.faro_apply_subscription_event('evt_1','customer.subscription.created', now(),
  '00000000-0000-0000-0000-0000000000c1','cus_1','sub_1','canceled', null, false) = 'duplicate', 'replay = duplicate');
select pg_temp.assert((select status from public.faro_subscriptions where user_id='00000000-0000-0000-0000-0000000000c1') = 'trialing', 'replay nao altera');

-- 4. trial_will_end sem assinatura: so registra
select pg_temp.assert(public.faro_apply_subscription_event('evt_2','customer.subscription.trial_will_end', now(),
  null, null, null, null, null, false) = 'recorded', 'evento sem assinatura so registra');

-- 5. trial UMA vez: mesmo usuario e o mesmo e-mail normalizado (gmail com pontos/+tag) nao ganham outro
select pg_temp.assert(public.faro_trial_days_for('00000000-0000-0000-0000-0000000000c1') = 0, 'mesmo usuario sem 2o trial');
select pg_temp.assert(public.faro_trial_days_for('00000000-0000-0000-0000-0000000000c2') = 0, 'alias do mesmo e-mail sem 2o trial');
select pg_temp.assert(public.faro_trial_days_for('00000000-0000-0000-0000-0000000000c4') = 7, 'outra pessoa tem trial');

-- 6. quem ja teve assinatura (mesmo cancelada) nao ganha trial
select pg_temp.assert(public.faro_apply_subscription_event('evt_3','customer.subscription.created', now(),
  '00000000-0000-0000-0000-0000000000c4','cus_4','sub_4','active', now() + interval '30 days', false) = 'applied', 'active aplicado');
select pg_temp.assert(public.faro_apply_subscription_event('evt_4','customer.subscription.deleted', now() + interval '1 second',
  '00000000-0000-0000-0000-0000000000c4','cus_4','sub_4','canceled', now() - interval '1 day', false) = 'applied', 'cancelada aplicada');
select pg_temp.assert(public.faro_trial_days_for('00000000-0000-0000-0000-0000000000c4') = 0, 'ja teve assinatura: sem trial');

-- 7. evento velho nao sobrescreve
select pg_temp.assert(public.faro_apply_subscription_event('evt_5','customer.subscription.updated', now() - interval '1 hour',
  '00000000-0000-0000-0000-0000000000c4','cus_4','sub_4','active', now() + interval '30 days', false) = 'stale', 'evento velho ignorado');

-- 8. acesso: paywall desligado libera o proprio usuario; ligado exige active/trialing valido
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select pg_temp.assert(public.faro_has_access('00000000-0000-0000-0000-0000000000c3'), 'paywall off: libera');
select pg_temp.assert(not public.faro_has_access('00000000-0000-0000-0000-0000000000c1'), 'nao consulta acesso de outro');
reset role;
update public.faro_billing_settings set enforce_paywall = true;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select pg_temp.assert(not public.faro_has_access('00000000-0000-0000-0000-0000000000c3'), 'paywall on: sem assinatura bloqueia');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(public.faro_has_access('00000000-0000-0000-0000-0000000000c1'), 'trialing valido libera');
select pg_temp.assert(public.faro_my_trial_ends_at() > now(), 'fim do trial visivel ao dono');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select pg_temp.assert(not public.faro_has_access('00000000-0000-0000-0000-0000000000c4'), 'canceled bloqueia');
select pg_temp.assert(public.faro_my_trial_ends_at() is null, 'sem trial ativo = null');
reset role;
-- past_due, unpaid, paused e active/trialing vencido nao liberam; active valido libera
update public.faro_subscriptions set status='past_due', current_period_end = now() + interval '5 days' where user_id='00000000-0000-0000-0000-0000000000c4';
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select pg_temp.assert(not public.faro_has_access('00000000-0000-0000-0000-0000000000c4'), 'past_due bloqueia');
reset role;
update public.faro_subscriptions set status='active', current_period_end = now() - interval '1 minute' where user_id='00000000-0000-0000-0000-0000000000c4';
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select pg_temp.assert(not public.faro_has_access('00000000-0000-0000-0000-0000000000c4'), 'active vencido bloqueia');
reset role;
update public.faro_subscriptions set current_period_end = now() + interval '3 days' where user_id='00000000-0000-0000-0000-0000000000c4';
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select pg_temp.assert(public.faro_has_access('00000000-0000-0000-0000-0000000000c4'), 'active valido libera');

-- 9. cliente nao enxerga/escreve tabelas de trial/config nem chama RPCs de servico
do $$ begin perform 1 from public.faro_trials_used; raise exception 'FALHOU: trials_used legivel'; exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.faro_billing_settings; raise exception 'FALHOU: settings legivel'; exception when insufficient_privilege then null; end $$;
do $$ begin perform public.faro_trial_days_for(auth.uid()); raise exception 'FALHOU: cliente chamou faro_trial_days_for'; exception when insufficient_privilege then null; end $$;
do $$ begin perform public.faro_apply_subscription_event('x','y',now(),null,null,null,null,null,false); raise exception 'FALHOU: cliente chamou apply'; exception when insufficient_privilege then null; end $$;
reset role; set role anon;
do $$ begin perform public.faro_has_access(gen_random_uuid()); raise exception 'FALHOU: anon chamou has_access'; exception when insufficient_privilege then null; end $$;
reset role;
-- service_role consulta qualquer usuario
set role service_role; select set_config('request.jwt.claim.role','service_role',false);
select pg_temp.assert(public.faro_has_access('00000000-0000-0000-0000-0000000000c4'), 'service_role consulta qualquer usuario');
reset role;
update public.faro_billing_settings set enforce_paywall = false;
select 'acesso/trial OK' as resultado;
