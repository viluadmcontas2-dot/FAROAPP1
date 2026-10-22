-- Guarda o fim do teste mesmo após a ativação da assinatura. Reaplicável.
alter table public.faro_subscriptions add column if not exists trial_end timestamptz;

-- Remove a assinatura antiga para evitar ambiguidade; o parâmetro final tem valor padrão.
drop function if exists public.faro_apply_subscription_event(text, text, timestamptz, uuid, text, text, text, timestamptz, boolean);

create or replace function public.faro_apply_subscription_event(
  p_event_id text, p_event_type text, p_event_created timestamptz, p_user_id uuid, p_customer_id text,
  p_subscription_id text, p_status text, p_current_period_end timestamptz, p_cancel_at_period_end boolean,
  p_trial_end timestamptz default null
) returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_current public.faro_subscriptions%rowtype;
  v_inserted text;
  v_blocking constant text[] := array['active', 'trialing', 'past_due'];
begin
  if coalesce(p_event_id, '') = '' then raise exception 'FARO: event_id obrigatorio'; end if;
  if p_user_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  end if;

  insert into public.faro_webhook_events (event_id, event_type)
  values (p_event_id, coalesce(p_event_type, 'desconhecido'))
  on conflict (event_id) do nothing
  returning event_id into v_inserted;
  if v_inserted is null then return 'duplicate'; end if;

  if p_user_id is null or p_subscription_id is null then return 'recorded'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then return 'orphan'; end if;

  select * into v_current from public.faro_subscriptions where user_id = p_user_id for update;
  if found then
    if v_current.last_event_created is not null and p_event_created < v_current.last_event_created then
      return 'stale';
    end if;
    if v_current.stripe_subscription_id is not null
       and v_current.stripe_subscription_id <> p_subscription_id
       and v_current.status = any (v_blocking)
       and not (coalesce(p_status, '') = any (v_blocking)) then
      return 'stale';
    end if;
  end if;

  insert into public.faro_subscriptions as s (
    user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end,
    cancel_at_period_end, last_event_created, updated_at, trial_end
  ) values (
    p_user_id, p_customer_id, p_subscription_id,
    case when p_status in ('trialing','active','past_due','unpaid','paused','canceled') then p_status else 'inactive' end,
    p_current_period_end, coalesce(p_cancel_at_period_end, false), p_event_created, now(), p_trial_end
  )
  on conflict (user_id) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, s.stripe_customer_id),
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    trial_end = excluded.trial_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_event_created = excluded.last_event_created,
    updated_at = now();

  -- Trial consumido: registra por e-mail normalizado (conta nova com o mesmo e-mail nao ganha outro).
  if p_status = 'trialing' then
    insert into public.faro_trials_used (email_hash, trial_started_at, trial_ends_at)
    select public.faro_email_hash(u.email), now(), coalesce(p_current_period_end, now() + interval '7 days')
    from auth.users u
    where u.id = p_user_id and coalesce(u.is_anonymous, false) = false and public.faro_email_hash(u.email) is not null
    on conflict (email_hash) do nothing;
  end if;
  return 'applied';
end;
$$;

revoke all on function public.faro_apply_subscription_event(text, text, timestamptz, uuid, text, text, text, timestamptz, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.faro_apply_subscription_event(text, text, timestamptz, uuid, text, text, text, timestamptz, boolean, timestamptz) to service_role;
