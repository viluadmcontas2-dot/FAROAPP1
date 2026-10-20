-- FARO — analytics próprio, anônimo e sem terceiros. Idempotente.
-- Sem PII, sem valores financeiros, sem texto livre, sem cookie e sem ID persistente:
-- session_id é um UUID aleatório de sessão (sessionStorage, renovado por dia), sem ligação com conta ou e-mail.
-- Ninguém lê a tabela pelo cliente: só a RPC grava; só o dono (service_role) consulta as views.
-- Retenção e agendamento: ver docs/pendencias-do-dono.md.

create table if not exists public.faro_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  session_id uuid not null,
  event text not null,
  screen text,
  props jsonb not null default '{}'::jsonb
);
create index if not exists faro_events_created_idx on public.faro_events (created_at);
create index if not exists faro_events_session_created_idx on public.faro_events (session_id, created_at);
create index if not exists faro_events_event_created_idx on public.faro_events (event, created_at);

alter table public.faro_events enable row level security;
revoke all on table public.faro_events from public, anon, authenticated;
revoke all on sequence public.faro_events_id_seq from public, anon, authenticated;

create or replace function public.faro_track(p_session uuid, p_event text, p_screen text, p_props jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_screen text;
  v_props jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_count int := 0;
begin
  begin
    if p_session is null or p_event is null then return; end if;
    if p_event <> all (array['screen_view','cta_tap','trial_start','app_installed','first_entry','subscription_active']) then
      return;
    end if;

    v_screen := case when p_screen ~ '^[a-z0-9_-]{1,40}$' then p_screen else null end;

    -- Só chaves permitidas; valor curto e em formato de código (sem espaço, @ ou texto livre).
    if p_props is not null and jsonb_typeof(p_props) = 'object' then
      for v_key, v_val in select key, value from jsonb_each(p_props) loop
        exit when v_count >= 5;
        if v_key in ('tela','botao','id_cta','origem','plano','versao_app','modo','faixa_dia','erro_codigo','tipo')
           and jsonb_typeof(v_val) = 'string'
           and (v_val #>> '{}') ~ '^[A-Za-z0-9_.-]{1,40}$' then
          v_props := v_props || jsonb_build_object(v_key, v_val #>> '{}');
          v_count := v_count + 1;
        end if;
      end loop;
    end if;

    -- Limite simples: 120 eventos por hora por sessão; o excedente é ignorado em silêncio.
    if (select count(*) from public.faro_events e
        where e.session_id = p_session and e.created_at > now() - interval '1 hour') >= 120 then
      return;
    end if;

    insert into public.faro_events(session_id, event, screen, props) values (p_session, p_event, v_screen, v_props);
  exception when others then
    return; -- nunca falha para o cliente
  end;
end;
$$;

revoke all on function public.faro_track(uuid, text, text, jsonb) from public;
grant execute on function public.faro_track(uuid, text, text, jsonb) to anon, authenticated;

-- Views do dono (somente service_role).
create or replace view public.faro_v_telas as
  select coalesce(screen, props->>'tela') as tela, count(*) as vistas, count(distinct session_id) as sessoes
  from public.faro_events
  where event = 'screen_view'
  group by 1
  order by vistas desc;

create or replace view public.faro_v_botoes as
  select coalesce(props->>'id_cta', props->>'botao') as botao, screen as tela, count(*) as toques
  from public.faro_events
  where event = 'cta_tap' and coalesce(props->>'id_cta', props->>'botao') is not null
  group by 1, 2
  order by toques desc;

-- Funil por sessões distintas: trial_start -> app_installed -> first_entry -> subscription_active.
create or replace view public.faro_v_funil as
  select
    count(distinct session_id) filter (where event = 'trial_start') as trial_start,
    count(distinct session_id) filter (where event = 'app_installed') as app_installed,
    count(distinct session_id) filter (where event = 'first_entry') as first_entry,
    count(distinct session_id) filter (where event = 'subscription_active') as subscription_active
  from public.faro_events;

revoke all on public.faro_v_telas, public.faro_v_botoes, public.faro_v_funil
  from public, anon, authenticated;
grant select on public.faro_v_telas, public.faro_v_botoes, public.faro_v_funil
  to service_role;
