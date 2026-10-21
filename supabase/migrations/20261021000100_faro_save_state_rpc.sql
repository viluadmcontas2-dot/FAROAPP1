-- FARO v2 — gravação atômica do snapshot via RPC + limites de integridade.
-- Caminho único de escrita: faro_save_state. O cliente não faz mais INSERT/UPDATE direto em faro_state.
-- SECURITY DEFINER é intencional (o papel authenticated perde INSERT/UPDATE na tabela); a função
-- só opera na linha de auth.uid(), com search_path vazio e EXECUTE restrito a authenticated.

-- Estado v2 apenas; objeto JSON; teto de 512 KB.
alter table public.faro_state alter column schema_version set default 2;
alter table public.faro_state
  add constraint faro_state_schema_v2 check (schema_version = 2) not valid,
  add constraint faro_state_is_object check (jsonb_typeof(state) = 'object') not valid,
  add constraint faro_state_max_size check (pg_column_size(state) <= 524288) not valid,
  add constraint faro_state_ids_len check (char_length(coalesce(device_id,'')) <= 128 and char_length(coalesce(last_mutation_id,'')) <= 128) not valid;

-- Aparelhos de push: limites contra abuso de armazenamento.
alter table public.faro_push_devices
  add constraint faro_push_devices_limits check (
    char_length(device_id) between 1 and 128
    and (subscription is null or pg_column_size(subscription) <= 8192)
  ) not valid;

alter table public.faro_profiles
  add constraint faro_profiles_limits check (
    char_length(coalesce(display_name,'')) <= 120
    and char_length(coalesce(city,'')) <= 120
    and char_length(coalesce(region,'')) <= 120
  ) not valid;

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
  -- Repetição idempotente da mesma mutação já gravada.
  if v_row.last_mutation_id = p_mutation_id and v_row.device_id = p_device_id then
    return jsonb_build_object('ok', true, 'replay', true, 'revision', v_row.revision, 'server_updated_at', v_row.server_updated_at);
  end if;
  return jsonb_build_object('ok', false, 'conflict', true, 'revision', v_row.revision,
    'state', v_row.state, 'server_updated_at', v_row.server_updated_at, 'device_id', v_row.device_id);
end;
$$;

revoke all on function public.faro_save_state(bigint, jsonb, text, text) from public, anon;
grant execute on function public.faro_save_state(bigint, jsonb, text, text) to authenticated;

-- A tabela passa a aceitar escrita só pela RPC.
revoke insert, update on public.faro_state from authenticated;
-- Assinatura/webhooks seguem sem escrita do cliente (já eram). Reafirma:
revoke insert, update, delete on public.faro_subscriptions from authenticated, anon;
