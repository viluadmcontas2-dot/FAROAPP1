-- Stub mínimo do Supabase para testar as migrações num Postgres comum (NÃO usar em produção).
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean not null default false);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user) $$;
create function auth.jwt() returns jsonb language sql stable as
$$ select jsonb_build_object('is_anonymous', coalesce(nullif(current_setting('request.jwt.claim.is_anonymous', true), ''), 'false')::boolean) $$;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;
grant usage on schema auth to service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated;
