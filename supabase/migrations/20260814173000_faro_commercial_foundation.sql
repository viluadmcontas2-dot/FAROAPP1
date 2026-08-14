-- FARO v1 — fundação comercial
-- Fonte de verdade do usuário: auth.users.id. Telefone é credencial, nunca chave primária dos dados.

create extension if not exists pgcrypto;

create table if not exists public.faro_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  city text,
  region text,
  notices_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faro_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  revision bigint not null default 1 check (revision > 0),
  state jsonb not null default '{}'::jsonb,
  device_id text,
  last_mutation_id text,
  client_updated_at timestamptz,
  server_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.faro_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','unpaid','paused','canceled')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.faro_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  platform text not null default 'web' check (platform in ('web','android','ios')),
  subscription jsonb,
  active boolean not null default true,
  city text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists faro_push_devices_user_id_idx on public.faro_push_devices(user_id);
create index if not exists faro_subscriptions_status_idx on public.faro_subscriptions(status);

create or replace function public.faro_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.faro_advance_state_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision = old.revision + 1;
  new.server_updated_at = now();
  return new;
end;
$$;

create trigger faro_profiles_touch_updated_at
before update on public.faro_profiles
for each row execute function public.faro_touch_updated_at();

create trigger faro_push_devices_touch_updated_at
before update on public.faro_push_devices
for each row execute function public.faro_touch_updated_at();

create trigger faro_state_advance_revision
before update on public.faro_state
for each row execute function public.faro_advance_state_revision();

alter table public.faro_profiles enable row level security;
alter table public.faro_state enable row level security;
alter table public.faro_subscriptions enable row level security;
alter table public.faro_push_devices enable row level security;

-- Perfil: o usuário gerencia apenas a própria linha.
create policy "FARO perfil ler proprio"
on public.faro_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "FARO perfil criar proprio"
on public.faro_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "FARO perfil atualizar proprio"
on public.faro_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "FARO perfil excluir proprio"
on public.faro_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Snapshot: uma linha por usuário. O cliente nunca escolhe o user_id de outra pessoa.
create policy "FARO estado ler proprio"
on public.faro_state for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "FARO estado criar proprio"
on public.faro_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "FARO estado atualizar proprio"
on public.faro_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "FARO estado excluir proprio"
on public.faro_state for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Assinatura: o usuário pode ler o próprio estado, mas não pode conceder acesso a si mesmo.
create policy "FARO assinatura ler propria"
on public.faro_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

-- Aparelhos/avisos: cada usuário controla apenas os próprios aparelhos.
create policy "FARO aparelhos ler proprios"
on public.faro_push_devices for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "FARO aparelhos criar proprios"
on public.faro_push_devices for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "FARO aparelhos atualizar proprios"
on public.faro_push_devices for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "FARO aparelhos excluir proprios"
on public.faro_push_devices for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Grants explícitos: assinatura não recebe INSERT/UPDATE/DELETE do papel authenticated.
grant select, insert, update, delete on public.faro_profiles to authenticated;
grant select, insert, update, delete on public.faro_state to authenticated;
grant select on public.faro_subscriptions to authenticated;
grant select, insert, update, delete on public.faro_push_devices to authenticated;
