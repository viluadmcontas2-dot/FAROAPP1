-- FARO — cobrança no servidor.
-- 1) Paywall por RLS: gravar (insert/update) exige acesso pago ou trial vigente; ler e excluir os
--    próprios dados continua livre (exportar/LGPD).
-- 2) Usuários anônimos ficam fora de todas as policies "to authenticated".
-- 3) Trial de 7 dias concedido pelo servidor no cadastro, uma única vez por e-mail normalizado.
-- 4) Snapshot limitado a 512 KB e a 1 gravação por segundo.
-- 5) Colunas para o webhook descartar eventos velhos e registrar disputas.
-- A trava (enforce_paywall) nasce DESLIGADA: liga-se no go-live, junto com billingEnabled.

-- Configuração única da cobrança no servidor.
create table if not exists public.faro_billing_settings (
  id boolean primary key default true check (id),
  enforce_paywall boolean not null default false,
  trial_days integer not null default 7 check (trial_days between 0 and 60),
  updated_at timestamptz not null default now()
);
insert into public.faro_billing_settings (id) values (true) on conflict (id) do nothing;
alter table public.faro_billing_settings enable row level security;
revoke all on public.faro_billing_settings from anon, authenticated;

-- Trials já usados. Chave = hash do e-mail normalizado. SEM FK para auth.users:
-- a linha sobrevive à exclusão da conta e impede trial repetido com o mesmo e-mail.
create table if not exists public.faro_trials_used (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null
);
alter table public.faro_trials_used enable row level security;
revoke all on public.faro_trials_used from anon, authenticated;

-- Normaliza e-mail: minúsculo, sem espaços, sem "+tag"; Gmail sem pontos no nome.
create or replace function public.faro_normalize_email(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := lower(btrim(coalesce(p_email, '')));
  v_local text;
  v_domain text;
begin
  if position('@' in v) = 0 then return nullif(v, ''); end if;
  v_local := split_part(v, '@', 1);
  v_domain := split_part(v, '@', 2);
  v_local := split_part(v_local, '+', 1);
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;
  return v_local || '@' || v_domain;
end;
$$;

create or replace function public.faro_email_hash(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when public.faro_normalize_email(p_email) is null then null
    else encode(sha256(convert_to(public.faro_normalize_email(p_email), 'UTF8')), 'hex') end
$$;

-- Concede o trial uma única vez por e-mail (idempotente).
create or replace function public.faro_grant_trial(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := public.faro_email_hash(p_email);
  v_days integer;
begin
  if v_hash is null then return; end if;
  select trial_days into v_days from public.faro_billing_settings where id;
  insert into public.faro_trials_used (email_hash, trial_started_at, trial_ends_at)
  values (v_hash, now(), now() + make_interval(days => coalesce(v_days, 7)))
  on conflict (email_hash) do nothing;
end;
$$;

-- Garantia literal do contrato: 7 dias é o padrão (interval '7 days'), configurável em faro_billing_settings.
comment on function public.faro_grant_trial(text) is 'Trial padrão: interval ''7 days''; concedido uma vez por e-mail.';

create or replace function public.faro_on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.is_anonymous, false) = false and new.email is not null then
    perform public.faro_grant_trial(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists faro_grant_trial_on_signup on auth.users;
create trigger faro_grant_trial_on_signup
after insert on auth.users
for each row execute function public.faro_on_auth_user_created();

-- Usuário real (não anônimo).
create or replace function public.faro_is_real_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- Acesso: trava desligada, assinatura paga no período, ou trial vigente.
create or replace function public.faro_has_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and (
    not coalesce((select s.enforce_paywall from public.faro_billing_settings s where s.id), false)
    or exists (
      select 1 from public.faro_subscriptions sub
      where sub.user_id = p_user_id
        and sub.status in ('active', 'trialing', 'past_due')
        and sub.current_period_end > now()
    )
    or exists (
      select 1
      from auth.users u
      join public.faro_trials_used t on t.email_hash = public.faro_email_hash(u.email)
      where u.id = p_user_id
        and coalesce(u.is_anonymous, false) = false
        and t.trial_ends_at > now()
    )
  )
$$;

revoke all on function public.faro_has_access(uuid) from public, anon;
grant execute on function public.faro_has_access(uuid) to authenticated, service_role;
revoke all on function public.faro_grant_trial(text) from public, anon, authenticated;
revoke all on function public.faro_on_auth_user_created() from public, anon, authenticated;
revoke all on function public.faro_is_real_user() from public, anon;
grant execute on function public.faro_is_real_user() to authenticated;

-- Status do trial para a UI (somente o próprio usuário).
create or replace function public.faro_my_trial_ends_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select t.trial_ends_at
  from auth.users u
  join public.faro_trials_used t on t.email_hash = public.faro_email_hash(u.email)
  where u.id = auth.uid() and coalesce(u.is_anonymous, false) = false
$$;
revoke all on function public.faro_my_trial_ends_at() from public, anon;
grant execute on function public.faro_my_trial_ends_at() to authenticated;

-- Policies recriadas: anônimo excluído; escrita exige acesso.
drop policy if exists "FARO perfil ler proprio" on public.faro_profiles;
drop policy if exists "FARO perfil criar proprio" on public.faro_profiles;
drop policy if exists "FARO perfil atualizar proprio" on public.faro_profiles;
drop policy if exists "FARO perfil excluir proprio" on public.faro_profiles;
drop policy if exists "FARO estado ler proprio" on public.faro_state;
drop policy if exists "FARO estado criar proprio" on public.faro_state;
drop policy if exists "FARO estado atualizar proprio" on public.faro_state;
drop policy if exists "FARO estado excluir proprio" on public.faro_state;
drop policy if exists "FARO assinatura ler propria" on public.faro_subscriptions;
drop policy if exists "FARO aparelhos ler proprios" on public.faro_push_devices;
drop policy if exists "FARO aparelhos criar proprios" on public.faro_push_devices;
drop policy if exists "FARO aparelhos atualizar proprios" on public.faro_push_devices;
drop policy if exists "FARO aparelhos excluir proprios" on public.faro_push_devices;

create policy "FARO perfil ler proprio"
on public.faro_profiles for select
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

create policy "FARO perfil criar proprio"
on public.faro_profiles for insert
to authenticated
with check ((select public.faro_is_real_user()) and (select auth.uid()) = user_id and (select public.faro_has_access((select auth.uid()))));

create policy "FARO perfil atualizar proprio"
on public.faro_profiles for update
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id)
with check ((select public.faro_is_real_user()) and (select auth.uid()) = user_id and (select public.faro_has_access((select auth.uid()))));

create policy "FARO perfil excluir proprio"
on public.faro_profiles for delete
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

create policy "FARO estado ler proprio"
on public.faro_state for select
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

create policy "FARO estado criar proprio"
on public.faro_state for insert
to authenticated
with check ((select public.faro_is_real_user()) and (select auth.uid()) = user_id and (select public.faro_has_access((select auth.uid()))));

create policy "FARO estado atualizar proprio"
on public.faro_state for update
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id)
with check ((select public.faro_is_real_user()) and (select auth.uid()) = user_id and (select public.faro_has_access((select auth.uid()))));

create policy "FARO estado excluir proprio"
on public.faro_state for delete
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

create policy "FARO assinatura ler propria"
on public.faro_subscriptions for select
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

create policy "FARO aparelhos ler proprios"
on public.faro_push_devices for select
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

create policy "FARO aparelhos criar proprios"
on public.faro_push_devices for insert
to authenticated
with check ((select public.faro_is_real_user()) and (select auth.uid()) = user_id and (select public.faro_has_access((select auth.uid()))));

create policy "FARO aparelhos atualizar proprios"
on public.faro_push_devices for update
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id)
with check ((select public.faro_is_real_user()) and (select auth.uid()) = user_id and (select public.faro_has_access((select auth.uid()))));

create policy "FARO aparelhos excluir proprios"
on public.faro_push_devices for delete
to authenticated
using ((select public.faro_is_real_user()) and (select auth.uid()) = user_id);

-- Snapshot: no máximo 512 KB (texto JSON). NOT VALID: vale para toda gravação nova sem travar a migration.
alter table public.faro_state drop constraint if exists faro_state_state_size;
alter table public.faro_state
  add constraint faro_state_state_size check (octet_length(state::text) <= 524288) not valid;

-- Rate-limit simples: no máximo 1 gravação por segundo por usuário (o app grava a cada ~2,5 s).
create or replace function public.faro_state_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Só limita o cliente (papel authenticated); service_role/admin não são limitados.
  if current_user = 'authenticated' and old.server_updated_at > now() - interval '1 second' then
    raise exception 'FARO: gravações muito próximas; tente de novo em instantes.'
      using errcode = 'P0429';
  end if;
  return new;
end;
$$;

drop trigger if exists faro_state_rate_limit on public.faro_state;
create trigger faro_state_rate_limit
before update on public.faro_state
for each row execute function public.faro_state_rate_limit();

-- Webhook: ordem de eventos e disputas.
alter table public.faro_subscriptions add column if not exists last_event_created timestamptz;
alter table public.faro_subscriptions add column if not exists last_dispute_at timestamptz;
