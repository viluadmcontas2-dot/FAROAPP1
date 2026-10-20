-- FARO — cobrança atômica (revisões finais Claude #3/#5 e Codex #4/#5/#6).
-- 1) Trial só depois do e-mail confirmado (e-mail descartável não confirmado não ganha teste).
-- 2) Webhook: ordem + upsert + registro do evento numa única transação, travada por usuário.
-- 3) Checkout: uma sessão aberta por usuário (reutiliza a URL) e bloqueio durante a exclusão da conta.
-- Não altera migrations já aplicadas; só substitui funções/gatilhos e adiciona colunas.

-- 1) Trial ------------------------------------------------------------------------------------
create or replace function public.faro_on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Cadastro já confirmado (ex.: confirmação de e-mail desligada ou login social) ganha na hora.
  if coalesce(new.is_anonymous, false) = false and new.email is not null and new.email_confirmed_at is not null then
    perform public.faro_grant_trial(new.email);
  end if;
  return new;
end;
$$;

create or replace function public.faro_on_auth_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.is_anonymous, false) = false and new.email is not null then
    perform public.faro_grant_trial(new.email); -- idempotente: 1 vez por e-mail normalizado
  end if;
  return new;
end;
$$;
revoke all on function public.faro_on_auth_email_confirmed() from public, anon, authenticated;

drop trigger if exists faro_grant_trial_on_email_confirmed on auth.users;
create trigger faro_grant_trial_on_email_confirmed
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.faro_on_auth_email_confirmed();

-- 2) Webhook atômico -----------------------------------------------------------------------------
-- Retorno: applied | duplicate | stale | orphan (conta excluída) | recorded (evento sem usuário).
create or replace function public.faro_apply_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created timestamptz,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.faro_subscriptions%rowtype;
  v_inserted text;
  v_blocking constant text[] := array['active', 'trialing', 'past_due'];
begin
  if coalesce(p_event_id, '') = '' then raise exception 'FARO: event_id obrigatório'; end if;
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
    cancel_at_period_end, last_event_created, updated_at
  ) values (
    p_user_id, p_customer_id, p_subscription_id,
    case when p_status in ('trialing','active','past_due','unpaid','paused','canceled') then p_status else 'inactive' end,
    p_current_period_end, coalesce(p_cancel_at_period_end, false), p_event_created, now()
  )
  on conflict (user_id) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, s.stripe_customer_id),
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_event_created = excluded.last_event_created,
    updated_at = now();
  return 'applied';
end;
$$;
revoke all on function public.faro_apply_subscription_event(text, text, timestamptz, uuid, text, text, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.faro_apply_subscription_event(text, text, timestamptz, uuid, text, text, text, timestamptz, boolean)
  to service_role;

-- 3) Checkout único e exclusão -------------------------------------------------------------------
alter table public.faro_subscriptions add column if not exists checkout_session_id text;
alter table public.faro_subscriptions add column if not exists checkout_url text;
alter table public.faro_subscriptions add column if not exists checkout_expires_at timestamptz;
alter table public.faro_subscriptions add column if not exists checkout_reserved_at timestamptz;
alter table public.faro_subscriptions add column if not exists deleting_at timestamptz;

-- Decide, sob trava por usuário: deleting | reuse (URL aberta) | busy (outra criação em curso) | create.
create or replace function public.faro_reserve_checkout(p_user_id uuid)
returns table (decision text, checkout_url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.faro_subscriptions%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  insert into public.faro_subscriptions (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into v from public.faro_subscriptions s where s.user_id = p_user_id for update;
  if v.deleting_at is not null and v.deleting_at > now() - interval '15 minutes' then
    return query select 'deleting'::text, null::text; return;
  end if;
  if v.checkout_session_id is not null and v.checkout_expires_at > now() + interval '1 minute' then
    return query select 'reuse'::text, v.checkout_url; return;
  end if;
  if v.checkout_reserved_at is not null and v.checkout_reserved_at > now() - interval '60 seconds' then
    return query select 'busy'::text, null::text; return;
  end if;
  update public.faro_subscriptions s
  set checkout_reserved_at = now(), checkout_session_id = null, checkout_url = null, checkout_expires_at = null
  where s.user_id = p_user_id;
  return query select 'create'::text, null::text;
end;
$$;

create or replace function public.faro_save_checkout(p_user_id uuid, p_session_id text, p_url text, p_expires_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.faro_subscriptions
  set checkout_session_id = p_session_id, checkout_url = p_url, checkout_expires_at = p_expires_at,
      checkout_reserved_at = null, updated_at = now()
  where user_id = p_user_id
$$;

create or replace function public.faro_release_checkout(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.faro_subscriptions set checkout_reserved_at = null where user_id = p_user_id
$$;

-- Marca a exclusão (bloqueia checkouts novos por 15 min) e devolve a sessão aberta conhecida, se houver.
create or replace function public.faro_begin_account_deletion(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_session text;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  insert into public.faro_subscriptions (user_id) values (p_user_id) on conflict (user_id) do nothing;
  update public.faro_subscriptions s set deleting_at = now()
  where s.user_id = p_user_id
  returning case when s.checkout_expires_at > now() then s.checkout_session_id end into v_session;
  return v_session;
end;
$$;

revoke all on function public.faro_reserve_checkout(uuid) from public, anon, authenticated;
revoke all on function public.faro_save_checkout(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.faro_release_checkout(uuid) from public, anon, authenticated;
revoke all on function public.faro_begin_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.faro_reserve_checkout(uuid) to service_role;
grant execute on function public.faro_save_checkout(uuid, text, text, timestamptz) to service_role;
grant execute on function public.faro_release_checkout(uuid) to service_role;
grant execute on function public.faro_begin_account_deletion(uuid) to service_role;
