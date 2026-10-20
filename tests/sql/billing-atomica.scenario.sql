-- Cenário: trial só com e-mail confirmado, webhook atômico e reserva de checkout.
\set ON_ERROR_STOP 1
select set_config('request.jwt.claims', '{"role":"service_role"}', false);

-- 1) Trial só depois do e-mail confirmado.
insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000e1', 'descartavel@lixo.app');
do $$ begin
  if exists (select 1 from public.faro_trials_used where email_hash = public.faro_email_hash('descartavel@lixo.app')) then
    raise exception 'FALHA: trial concedido antes de confirmar o e-mail';
  end if;
end $$;
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  if not exists (select 1 from public.faro_trials_used where email_hash = public.faro_email_hash('descartavel@lixo.app')) then
    raise exception 'FALHA: confirmar o e-mail não concedeu o trial';
  end if;
end $$;
update public.faro_trials_used set trial_ends_at = now() - interval '1 day'
where email_hash = public.faro_email_hash('descartavel@lixo.app');
-- Reconfirmar (ou recriar a conta confirmada) não renova.
update auth.users set email_confirmed_at = now() + interval '1 second' where id = '00000000-0000-0000-0000-0000000000e1';
insert into auth.users(id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000e2', 'Descartavel@lixo.app', now());
do $$ begin
  if (select trial_ends_at from public.faro_trials_used where email_hash = public.faro_email_hash('descartavel@lixo.app')) > now() then
    raise exception 'FALHA: trial renovado';
  end if;
end $$;

-- 2) Webhook atômico.
insert into auth.users(id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000f1', 'pagante@faro.app', now());
do $$
declare r text;
begin
  r := public.faro_apply_subscription_event('evt_2', 'customer.subscription.updated', to_timestamp(2000),
    '00000000-0000-0000-0000-0000000000f1', 'cus_1', 'sub_1', 'active', now() + interval '30 days', false);
  if r <> 'applied' then raise exception 'FALHA: evento novo deveria aplicar (%)', r; end if;
  r := public.faro_apply_subscription_event('evt_2', 'customer.subscription.updated', to_timestamp(2000),
    '00000000-0000-0000-0000-0000000000f1', 'cus_1', 'sub_1', 'active', now() + interval '30 days', false);
  if r <> 'duplicate' then raise exception 'FALHA: evento repetido deveria ser duplicate (%)', r; end if;
  r := public.faro_apply_subscription_event('evt_1', 'customer.subscription.updated', to_timestamp(1000),
    '00000000-0000-0000-0000-0000000000f1', 'cus_1', 'sub_1', 'past_due', now() + interval '30 days', false);
  if r <> 'stale' then raise exception 'FALHA: evento velho deveria ser stale (%)', r; end if;
  if (select status from public.faro_subscriptions where user_id = '00000000-0000-0000-0000-0000000000f1') <> 'active' then
    raise exception 'FALHA: evento velho sobrescreveu o status';
  end if;
  if not exists (select 1 from public.faro_webhook_events where event_id = 'evt_1') then
    raise exception 'FALHA: evento velho não foi registrado';
  end if;
  -- Delete atrasado de assinatura antiga não derruba a nova.
  r := public.faro_apply_subscription_event('evt_3', 'customer.subscription.deleted', to_timestamp(3000),
    '00000000-0000-0000-0000-0000000000f1', 'cus_1', 'sub_velha', 'canceled', null, false);
  if r <> 'stale' then raise exception 'FALHA: delete de assinatura antiga deveria ser stale (%)', r; end if;
  -- Conta excluída: registra e não falha.
  r := public.faro_apply_subscription_event('evt_4', 'invoice.paid', to_timestamp(4000),
    '00000000-0000-0000-0000-0000000000ff', 'cus_x', 'sub_x', 'active', now(), false);
  if r <> 'orphan' then raise exception 'FALHA: usuário inexistente deveria ser orphan (%)', r; end if;
  if not exists (select 1 from public.faro_webhook_events where event_id = 'evt_4') then
    raise exception 'FALHA: evento órfão não foi registrado';
  end if;
  -- Sem usuário (ex.: disputa): só registra.
  r := public.faro_apply_subscription_event('evt_5', 'charge.dispute.created', to_timestamp(5000),
    null, null, null, null, null, false);
  if r <> 'recorded' then raise exception 'FALHA: evento sem usuário deveria ser recorded (%)', r; end if;
end $$;

-- 3) Checkout reservado por usuário + exclusão bloqueia checkout.
do $$
declare v record;
begin
  select * into v from public.faro_reserve_checkout('00000000-0000-0000-0000-0000000000e2');
  if v.decision <> 'create' then raise exception 'FALHA: 1ª reserva deveria ser create (%)', v.decision; end if;
  select * into v from public.faro_reserve_checkout('00000000-0000-0000-0000-0000000000e2');
  if v.decision <> 'busy' then raise exception 'FALHA: 2ª reserva simultânea deveria ser busy (%)', v.decision; end if;
  perform public.faro_save_checkout('00000000-0000-0000-0000-0000000000e2', 'cs_1', 'https://checkout/cs_1', now() + interval '30 minutes');
  select * into v from public.faro_reserve_checkout('00000000-0000-0000-0000-0000000000e2');
  if v.decision <> 'reuse' or v.checkout_url <> 'https://checkout/cs_1' then
    raise exception 'FALHA: sessão aberta deveria ser reutilizada (%)', v.decision;
  end if;
  update public.faro_subscriptions set checkout_expires_at = now() - interval '1 minute'
  where user_id = '00000000-0000-0000-0000-0000000000e2';
  select * into v from public.faro_reserve_checkout('00000000-0000-0000-0000-0000000000e2');
  if v.decision <> 'create' then raise exception 'FALHA: sessão vencida deveria liberar nova (%)', v.decision; end if;
  perform public.faro_save_checkout('00000000-0000-0000-0000-0000000000e2', 'cs_2', 'https://checkout/cs_2', now() + interval '30 minutes');
  if (select public.faro_begin_account_deletion('00000000-0000-0000-0000-0000000000e2')) is distinct from 'cs_2' then
    raise exception 'FALHA: exclusão deveria devolver a sessão aberta';
  end if;
  select * into v from public.faro_reserve_checkout('00000000-0000-0000-0000-0000000000e2');
  if v.decision <> 'deleting' then raise exception 'FALHA: checkout durante exclusão (%)', v.decision; end if;
end $$;

-- Funções internas fora do alcance do cliente.
set role authenticated;
do $$ begin
  begin
    perform public.faro_apply_subscription_event('x', 'x', now(), null, null, null, null, null, false);
    raise exception 'FALHA: cliente chamou faro_apply_subscription_event';
  exception when insufficient_privilege then null; end;
  begin
    perform public.faro_reserve_checkout('00000000-0000-0000-0000-0000000000e2');
    raise exception 'FALHA: cliente chamou faro_reserve_checkout';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'CENARIO_OK' as resultado;
