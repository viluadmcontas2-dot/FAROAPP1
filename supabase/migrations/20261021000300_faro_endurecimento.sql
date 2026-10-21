-- FARO 2.0 - endurecimento (achados do ataque local; ver docs/evidence/faro-2-0/seguranca.md). Idempotente.
--
--  B1  Teto de 10 aparelhos de aviso (push) por usuario: trigger BEFORE INSERT em faro_push_devices.
--  D1  faro_save_state exige faro_has_access (erro 'sem_direito') quando faro_billing_settings.enforce_paywall = true.
--      Com false (padrao de hoje) nada muda. O servidor so RECUSA gravar: nunca apaga o que ja esta na nuvem
--      (e o app mantem o estado local; a recusa nao toca no aparelho).
--  D2  Limite de frequencia em faro_save_state: no maximo 60 gravacoes por usuario por minuto (janela fixa),
--      erro 'muitas_gravacoes' (sqlstate P0429). Replay idempotente (mesma mutation_id ja gravada) NAO conta.
--
-- REAPROVEITADO DO REMOTO (projeto mjbyqhreptllilkggiri, lido so em leitura em 2026-10-21):
--  * faro_state_rate_limit() + trigger faro_state_rate_limit (BEFORE UPDATE em faro_state): recusa UPDATE feito pelo
--    papel `authenticated` quando a linha foi gravada ha menos de 1 segundo (errcode P0429). Recriado AQUI com a mesma
--    definicao (create or replace + drop/create do trigger), entao nao ha duplicata nem conflito com o remoto.
--    Observacao: como faro_save_state e SECURITY DEFINER, current_user dentro dela e o dono da funcao (nao
--    `authenticated`) e esse trigger NAO dispara pela RPC; ele so protege contra UPDATE direto (hoje revogado).
--    Por isso o limite real por usuario vem do contador novo (D2), sem atrapalhar gravacoes rapidas legitimas.
--  * faro_advance_state_revision / trigger faro_state_advance_revision: ja existem no repo (migration de fundacao);
--    nada a fazer.
--  * Restricao faro_state_state_size (octet_length(state::text) <= 524288, NOT VALID) existe so no remoto; o repo tem
--    faro_state_max_size (pg_column_size) equivalente. NAO foi duplicada aqui.
--  * Politicas "FARO estado criar/atualizar proprio" do remoto (com faro_has_access no WITH CHECK) nao entram:
--    a escrita direta esta revogada (000100) e o direito e exigido dentro da RPC (D1).
--  * Funcoes novas (faro_push_device_cap, faro_state_write_log) NAO existem no remoto: dependem de aplicar esta migration.

-- B1 ------------------------------------------------------------------------------------------------------------
create or replace function public.faro_push_device_cap()
returns trigger language plpgsql set search_path = ''
as $$
begin
  -- serializa inserts do mesmo usuario (evita passar do teto com inserts concorrentes)
  perform pg_advisory_xact_lock(hashtext('faro_push_devices:' || new.user_id::text));
  -- re-registrar um aparelho que ja existe (upsert por user_id + device_id) nao ocupa vaga nova
  if exists (select 1 from public.faro_push_devices d where d.user_id = new.user_id and d.device_id = new.device_id) then
    return new;
  end if;
  if (select count(*) from public.faro_push_devices d where d.user_id = new.user_id) >= 10 then
    raise exception 'FARO: limite de 10 aparelhos de aviso por conta; remova um aparelho antes de adicionar outro.'
      using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function public.faro_push_device_cap() from public, anon, authenticated;

drop trigger if exists faro_push_devices_cap on public.faro_push_devices;
create trigger faro_push_devices_cap
before insert on public.faro_push_devices
for each row execute function public.faro_push_device_cap();

-- D2 (parte do remoto, mesma definicao) --------------------------------------------------------------------------
create or replace function public.faro_state_rate_limit()
returns trigger language plpgsql set search_path = ''
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
revoke all on function public.faro_state_rate_limit() from public, anon, authenticated;
drop trigger if exists faro_state_rate_limit on public.faro_state;
create trigger faro_state_rate_limit before update on public.faro_state
for each row execute function public.faro_state_rate_limit();

-- D2 (contador novo): uma linha por usuario, janela fixa de 1 minuto. So a RPC (definer) escreve.
create table if not exists public.faro_state_write_log (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  n integer not null default 0
);
alter table public.faro_state_write_log enable row level security;
drop policy if exists "FARO negar cliente" on public.faro_state_write_log;
create policy "FARO negar cliente" on public.faro_state_write_log for all to anon, authenticated using (false) with check (false);
revoke all on public.faro_state_write_log from public, anon, authenticated;
grant select, insert, update, delete on public.faro_state_write_log to service_role;

-- D1 + D2: faro_save_state (mesmo contrato de antes; so ganha 'sem_direito' e 'muitas_gravacoes') -----------------
create or replace function public.faro_save_state(
  p_expected_revision bigint,
  p_state jsonb,
  p_device_id text,
  p_mutation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.faro_state%rowtype;
  v_n integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'invalid_revision' using errcode = '22023';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid_state' using errcode = '22023';
  end if;
  if coalesce((p_state ->> 'schema_version')::int, (p_state ->> 'schemaVersion')::int, 2) <> 2 then
    raise exception 'unsupported_schema_version' using errcode = '22023';
  end if;
  if pg_column_size(p_state) > 524288 then
    raise exception 'state_too_large' using errcode = '54000';
  end if;
  if p_device_id is null or char_length(p_device_id) not between 1 and 128
     or p_mutation_id is null or char_length(p_mutation_id) not between 1 and 128 then
    raise exception 'invalid_ids' using errcode = '22023';
  end if;

  -- D1: com enforce_paywall = true so grava quem tem direito (ativo ou trial valido). Desligado = sempre true.
  -- So recusa; o que ja esta na nuvem fica intacto.
  if not public.faro_has_access(v_uid) then
    raise exception 'sem_direito' using errcode = '42501';
  end if;

  -- Replay idempotente (mesma mutacao ja gravada por este aparelho): responde ok sem gravar e SEM contar no limite.
  select * into v_row from public.faro_state where user_id = v_uid;
  if found and v_row.revision <> p_expected_revision
     and v_row.last_mutation_id = p_mutation_id and v_row.device_id = p_device_id then
    return jsonb_build_object('ok', true, 'replay', true, 'revision', v_row.revision, 'server_updated_at', v_row.server_updated_at);
  end if;

  -- D2: no maximo 60 gravacoes por usuario por minuto (janela fixa). O upsert trava a linha do usuario,
  -- entao chamadas simultaneas dele se enfileiram e a contagem fica exata. A recusa desfaz o incremento.
  insert into public.faro_state_write_log as l (user_id, window_start, n)
  values (v_uid, now(), 1)
  on conflict (user_id) do update set
    window_start = case when l.window_start <= now() - interval '1 minute' then now() else l.window_start end,
    n = case when l.window_start <= now() - interval '1 minute' then 1 else l.n + 1 end
  returning n into v_n;
  if v_n > 60 then
    raise exception 'muitas_gravacoes' using errcode = 'P0429';
  end if;

  if p_expected_revision = 0 then
    insert into public.faro_state as s (user_id, schema_version, revision, state, device_id, last_mutation_id, client_updated_at)
    values (v_uid, 2, 1, p_state, p_device_id, p_mutation_id, now())
    on conflict (user_id) do nothing
    returning * into v_row;
    if found then
      return jsonb_build_object('ok', true, 'revision', v_row.revision, 'server_updated_at', v_row.server_updated_at);
    end if;
  else
    -- O trigger faro_advance_state_revision soma 1 à revisão; a condição abaixo garante o controle otimista atômico.
    update public.faro_state as s
       set state = p_state, schema_version = 2, device_id = p_device_id,
           last_mutation_id = p_mutation_id, client_updated_at = now()
     where s.user_id = v_uid and s.revision = p_expected_revision
    returning * into v_row;
    if found then
      return jsonb_build_object('ok', true, 'revision', v_row.revision, 'server_updated_at', v_row.server_updated_at);
    end if;
  end if;

  select * into v_row from public.faro_state where user_id = v_uid;
  if not found then
    -- revisão esperada > 0, mas a nuvem não tem nada: o cliente decide (reenviar do zero).
    return jsonb_build_object('ok', false, 'conflict', true, 'revision', 0, 'state', null);
  end if;
  -- Repetição idempotente (corrida: a mesma mutação foi gravada entre a checagem acima e agora).
  if v_row.last_mutation_id = p_mutation_id and v_row.device_id = p_device_id then
    return jsonb_build_object('ok', true, 'replay', true, 'revision', v_row.revision, 'server_updated_at', v_row.server_updated_at);
  end if;
  return jsonb_build_object('ok', false, 'conflict', true, 'revision', v_row.revision,
    'state', v_row.state, 'server_updated_at', v_row.server_updated_at, 'device_id', v_row.device_id);
end;
$$;

revoke all on function public.faro_save_state(bigint, jsonb, text, text) from public, anon;
grant execute on function public.faro_save_state(bigint, jsonb, text, text) to authenticated;
