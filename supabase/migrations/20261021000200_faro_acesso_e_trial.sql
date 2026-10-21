-- FARO 2.0 - acesso e trial (traz para o repositorio o que existia so no banco remoto, endurecido).
--
-- Regra do dono: assinatura mensal R$ 22,99, 7 dias gratis NO STRIPE com cartao coletado no inicio;
-- trial UMA vez por pessoa (e-mail normalizado); acesso = assinatura active/trialing valida.
-- Com enforce_paywall = false (padrao) ninguem e bloqueado.
--
-- DIVERGENCIAS em relacao ao remoto (projeto mjbyqhreptllilkggiri), todas intencionais:
--  1. O remoto concedia trial SEM cartao ao confirmar o e-mail (triggers faro_grant_trial_on_signup /
--     faro_grant_trial_on_email_confirmed + faro_grant_trial). Isso contradiz "cartao no inicio": removido.
--  2. faro_has_access: remoto aceitava tambem past_due e o trial sem cartao (faro_trials_used). Agora so
--     active/trialing com current_period_end > now().
--  3. faro_my_trial_ends_at: remoto lia faro_trials_used; agora le o fim do trial da propria assinatura.
--  4. faro_trials_used passa a ser o livro de "trial ja usado" (escrito pelo webhook ao ver 'trialing').
--  5. Remoto: faro_normalize_email/faro_email_hash/faro_is_real_user/faro_touch... executaveis por anon;
--     aqui so por quem precisa. Tabelas novas: RLS ligado + politica explicita de negar ao cliente.
--  6. Politica de leitura da assinatura usa faro_is_real_user() (como no remoto).
--  7. Trazidos do remoto (existiam so la): colunas extras de faro_subscriptions e as funcoes
--     faro_apply_subscription_event / faro_reserve_checkout / faro_save_checkout / faro_release_checkout /
--     faro_begin_account_deletion (webhook e checkout atomicos). faro_apply_subscription_event ganhou o
--     registro do trial usado.
--  Fora de escopo e NAO trazido: faro_state_rate_limit e os triggers/politicas de faro_state ajustados no remoto.

create table if not exists public.faro_billing_settings (
  id boolean primary key default true check (id),
  enforce_paywall boolean not null default false,
  trial_days integer not null default 7 check (trial_days >= 0 and trial_days <= 60),
  updated_at timestamptz not null default now()
);
insert into public.faro_billing_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.faro_trials_used (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null
);

alter table public.faro_subscriptions
  add column if not exists last_event_created timestamptz,
  add column if not exists last_dispute_at timestamptz,
  add column if not exists checkout_session_id text,
  add column if not exists checkout_url text,
  add column if not exists checkout_expires_at timestamptz,
  add column if not exists checkout_reserved_at timestamptz,
  add column if not exists deleting_at timestamptz;

alter table public.faro_billing_settings enable row level security;
alter table public.faro_trials_used enable row level security;

drop policy if exists "FARO negar cliente" on public.faro_billing_settings;
create policy "FARO negar cliente" on public.faro_billing_settings for all to anon, authenticated using (false) with check (false);
drop policy if exists "FARO negar cliente" on public.faro_trials_used;
create policy "FARO negar cliente" on public.faro_trials_used for all to anon, authenticated using (false) with check (false);

revoke all on public.faro_billing_settings, public.faro_trials_used from public, anon, authenticated;
grant select, update on public.faro_billing_settings to service_role;
grant select, insert on public.faro_trials_used to service_role;
grant select, insert, update, delete on public.faro_subscriptions to service_role;

-- Helpers puros -------------------------------------------------------------------------------
create or replace function public.faro_is_real_user()
returns boolean language sql stable set search_path = ''
as $$ select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false $$;

create or replace function public.faro_normalize_email(p_email text)
returns text language plpgsql immutable set search_path = ''
as $$
declare
  v text := lower(btrim(coalesce(p_email, '')));
  v_local text;
  v_domain text;
begin
  if position('@' in v) = 0 then return nullif(v, ''); end if;
  v_local := split_part(split_part(v, '@', 1), '+', 1);
  v_domain := split_part(v, '@', 2);
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;
  return v_local || '@' || v_domain;
end;
$$;

create or replace function public.faro_email_hash(p_email text)
returns text language sql immutable set search_path = ''
as $$
  select case when public.faro_normalize_email(p_email) is null then null
    else encode(sha256(convert_to(public.faro_normalize_email(p_email), 'UTF8')), 'hex') end
$$;

drop policy if exists "FARO assinatura ler propria" on public.faro_subscriptions;
create policy "FARO assinatura ler propria" on public.faro_subscriptions for select to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

-- Remove o trial sem cartao do remoto (divergencia 1).
-- Os gatilhos ficam em auth.users, tabela do supabase_auth_admin: o papel que aplica migracoes NAO e dono
-- dela e nao consegue apagar gatilhos la. Entao as funcoes dos gatilhos viram no-op (so existem no remoto;
-- num banco novo nao existem e nada e criado). Quem quiser, apaga os dois gatilhos vazios no SQL Editor.
do $$
begin
  if to_regprocedure('public.faro_on_auth_user_created()') is not null then
    create or replace function public.faro_on_auth_user_created()
    returns trigger language plpgsql set search_path = '' as 'begin return new; end';
  end if;
  if to_regprocedure('public.faro_on_auth_email_confirmed()') is not null then
    create or replace function public.faro_on_auth_email_confirmed()
    returns trigger language plpgsql set search_path = '' as 'begin return new; end';
  end if;
end $$;
drop function if exists public.faro_grant_trial(text);

-- Direito de acesso ---------------------------------------------------------------------------
-- Cada um so consulta o proprio acesso (service_role consulta qualquer). paywall desligado = libera.
create or replace function public.faro_has_access(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user_id is not null
    and (p_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')
    and (
      not coalesce((select s.enforce_paywall from public.faro_billing_settings s where s.id), false)
      or exists (
        select 1 from public.faro_subscriptions sub
        where sub.user_id = p_user_id
          and sub.status in ('active', 'trialing')
          and sub.current_period_end > now()
      )
    )
$$;

create or replace function public.faro_my_trial_ends_at()
returns timestamptz language sql stable security definer set search_path = ''
as $$
  select sub.current_period_end
  from public.faro_subscriptions sub
  where sub.user_id = (select auth.uid()) and sub.status = 'trialing' and sub.current_period_end > now()
$$;

-- Dias de trial a oferecer no checkout: 0 se ja usou (e-mail normalizado) ou ja teve assinatura.
create or replace function public.faro_trial_days_for(p_user_id uuid)
returns integer language plpgsql stable security definer set search_path = ''
as $$
declare
  v_email text;
  v_hash text;
  v_days integer;
begin
  select u.email into v_email from auth.users u where u.id = p_user_id and coalesce(u.is_anonymous, false) = false;
  v_hash := public.faro_email_hash(v_email);
  if v_hash is null then return 0; end if;
  if exists (select 1 from public.faro_trials_used t where t.email_hash = v_hash) then return 0; end if;
  if exists (select 1 from public.faro_subscriptions s where s.user_id = p_user_id and s.stripe_subscription_id is not null) then return 0; end if;
  select trial_days into v_days from public.faro_billing_settings where id;
  return coalesce(v_days, 7);
end;
$$;

-- Cobranca atomica (trazida do remoto) --------------------------------------------------------
create or replace function public.faro_apply_subscription_event(
  p_event_id text, p_event_type text, p_event_created timestamptz, p_user_id uuid, p_customer_id text,
  p_subscription_id text, p_status text, p_current_period_end timestamptz, p_cancel_at_period_end boolean
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

create or replace function public.faro_reserve_checkout(p_user_id uuid)
returns table(decision text, checkout_url text) language plpgsql security definer set search_path = ''
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
returns void language sql security definer set search_path = ''
as $$
  update public.faro_subscriptions
  set checkout_session_id = p_session_id, checkout_url = p_url, checkout_expires_at = p_expires_at,
      checkout_reserved_at = null, updated_at = now()
  where user_id = p_user_id
$$;

create or replace function public.faro_release_checkout(p_user_id uuid)
returns void language sql security definer set search_path = ''
as $$ update public.faro_subscriptions set checkout_reserved_at = null where user_id = p_user_id $$;

create or replace function public.faro_begin_account_deletion(p_user_id uuid)
returns text language plpgsql security definer set search_path = ''
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

-- Grants minimos de execucao ------------------------------------------------------------------
revoke all on function
  public.faro_normalize_email(text), public.faro_email_hash(text), public.faro_trial_days_for(uuid),
  public.faro_apply_subscription_event(text, text, timestamptz, uuid, text, text, text, timestamptz, boolean),
  public.faro_reserve_checkout(uuid), public.faro_save_checkout(uuid, text, text, timestamptz),
  public.faro_release_checkout(uuid), public.faro_begin_account_deletion(uuid),
  public.faro_has_access(uuid), public.faro_my_trial_ends_at(), public.faro_is_real_user()
from public, anon, authenticated;
grant execute on function
  public.faro_normalize_email(text), public.faro_email_hash(text), public.faro_trial_days_for(uuid),
  public.faro_apply_subscription_event(text, text, timestamptz, uuid, text, text, text, timestamptz, boolean),
  public.faro_reserve_checkout(uuid), public.faro_save_checkout(uuid, text, text, timestamptz),
  public.faro_release_checkout(uuid), public.faro_begin_account_deletion(uuid)
to service_role;
-- Chamadas pelo proprio usuario (faro_has_access so responde pelo proprio uid; ver advisor 0029, aceito).
grant execute on function public.faro_has_access(uuid), public.faro_my_trial_ends_at(), public.faro_is_real_user()
to authenticated, service_role;
