-- FARO — endurecimento (auditoria de segurança). Idempotente.
-- 1) Limites de tamanho nos campos de texto/jsonb e teto de aparelhos de push por usuário.
-- 2) REVOKE EXECUTE das funções auxiliares que ficaram abertas (PUBLIC/anon/authenticated).
-- 3) Valida o CHECK de 512 KB do snapshot, mas só se nenhuma linha antiga o violar.

-- 1a) Tamanhos (NOT VALID: vale para toda gravação nova sem travar a migration por dados antigos).
alter table public.faro_push_devices drop constraint if exists faro_push_devices_limites;
alter table public.faro_push_devices add constraint faro_push_devices_limites check (
  octet_length(coalesce(subscription::text, '')) <= 4096
  and octet_length(device_id) <= 200
  and octet_length(coalesce(city, '')) <= 200
  and octet_length(coalesce(region, '')) <= 200
) not valid;

alter table public.faro_profiles drop constraint if exists faro_profiles_limites;
alter table public.faro_profiles add constraint faro_profiles_limites check (
  octet_length(coalesce(display_name, '')) <= 200
  and octet_length(coalesce(city, '')) <= 200
  and octet_length(coalesce(region, '')) <= 200
) not valid;

-- 1b) Teto de 20 aparelhos por usuário (só limita o cliente; service_role não é limitado).
create or replace function public.faro_push_devices_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    select count(*) from public.faro_push_devices d where d.user_id = new.user_id
  ) >= 20 then
    raise exception 'FARO: limite de 20 aparelhos por conta.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

drop trigger if exists faro_push_devices_cap on public.faro_push_devices;
create trigger faro_push_devices_cap
before insert on public.faro_push_devices
for each row execute function public.faro_push_devices_cap();

-- 2) Funções auxiliares: só o dono/definer as usa (triggers não exigem EXECUTE do chamador).
revoke all on function public.faro_normalize_email(text) from public, anon, authenticated;
revoke all on function public.faro_email_hash(text) from public, anon, authenticated;
revoke all on function public.faro_touch_updated_at() from public, anon, authenticated;
revoke all on function public.faro_advance_state_revision() from public, anon, authenticated;
revoke all on function public.faro_state_rate_limit() from public, anon, authenticated;
revoke all on function public.faro_push_devices_cap() from public, anon, authenticated;

-- 3) Valida os CHECKs só se possível; linha antiga inválida não derruba a migration.
do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tabela, conname from pg_constraint
    where conname in ('faro_state_state_size', 'faro_push_devices_limites', 'faro_profiles_limites')
      and connamespace = 'public'::regnamespace and not convalidated
  loop
    begin
      execute format('alter table %s validate constraint %I', c.tabela, c.conname);
    exception when check_violation then
      raise notice 'FARO: % em % ficou NOT VALID (há linha antiga acima do limite); corrigir os dados e validar depois.', c.conname, c.tabela;
    end;
  end loop;
end $$;
