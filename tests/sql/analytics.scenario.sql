-- Cenário analytics FARO: allowlist, props filtradas, rate limit, anon sem leitura direta, views só do dono.
\set ON_ERROR_STOP 1

set role anon;
select public.faro_track('11111111-1111-1111-1111-111111111111', 'screen_view', 'resumo', '{"tela":"resumo","valor":"123,45","modo":"pwa","faixa_dia":"D0"}');
select public.faro_track('11111111-1111-1111-1111-111111111111', 'evento_hacker', 'resumo', '{}');
select public.faro_track('11111111-1111-1111-1111-111111111111', 'screen_view', 'Tela Com Espaço <script>', '{}');
select public.faro_track('11111111-1111-1111-1111-111111111111', 'cta_tap', 'ok', '{"id_cta":"salvar_dia","botao":"b","origem":"c","plano":"d","modo":"e","faixa_dia":"D0"}');
select public.faro_track('11111111-1111-1111-1111-111111111111', 'cta_tap', 'resumo', jsonb_build_object('erro_codigo', repeat('x', 80)));
select public.faro_track('11111111-1111-1111-1111-111111111111', 'cta_tap', 'texto', '{"erro_codigo":"joao@x.com disse oi"}');
select public.faro_track(null, 'screen_view', 'resumo', '{}');
select public.faro_track('11111111-1111-1111-1111-111111111111', 'screen_view', 'resumo', '"texto"');
select public.faro_track('11111111-1111-1111-1111-111111111111', 'page_view', 'antigo', '{}');

-- 1) anon não lê nem escreve direto, nem lê as views do dono.
do $$ begin
  begin perform count(*) from public.faro_events; raise exception 'anon leu faro_events';
  exception when insufficient_privilege then null; end;
  begin insert into public.faro_events(session_id, event) values (gen_random_uuid(), 'screen_view'); raise exception 'anon inseriu direto';
  exception when insufficient_privilege then null; end;
  begin perform count(*) from public.faro_v_telas; raise exception 'anon leu view';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ declare n int; r record; begin
  if exists (select 1 from public.faro_events where event in ('evento_hacker','page_view')) then raise exception 'evento fora da allowlist gravado'; end if;
  if exists (select 1 from public.faro_events where session_id is null) then raise exception 'sessao nula gravada'; end if;
  select count(*) into n from public.faro_events where screen is not null and screen !~ '^[a-z0-9_-]{1,40}$';
  if n > 0 then raise exception 'screen invalido gravado'; end if;
  select * into r from public.faro_events where screen = 'resumo' and event = 'screen_view' order by id limit 1;
  if r.props ? 'valor' then raise exception 'prop nao permitida gravada'; end if;
  if r.props->>'modo' <> 'pwa' or r.props->>'faixa_dia' <> 'D0' then raise exception 'prop permitida perdida'; end if;
  select * into r from public.faro_events where screen = 'ok';
  if (select count(*) from jsonb_object_keys(r.props)) > 5 then raise exception 'mais de 5 chaves'; end if;
  select * into r from public.faro_events where event = 'cta_tap' and screen = 'resumo';
  if r.props ? 'erro_codigo' then raise exception 'valor > 40 chars gravado'; end if;
  select * into r from public.faro_events where event = 'cta_tap' and screen = 'texto';
  if r.props ? 'erro_codigo' then raise exception 'texto livre/e-mail gravado em prop'; end if;
end $$;

-- Rate limit: 120 por hora por sessão.
set role anon;
do $$ begin
  for i in 1..200 loop
    perform public.faro_track('22222222-2222-2222-2222-222222222222', 'screen_view', 'resumo', '{}');
  end loop;
end $$;
reset role;
do $$ declare n int; begin
  select count(*) into n from public.faro_events where session_id = '22222222-2222-2222-2222-222222222222';
  if n <> 120 then raise exception 'rate limit esperado 120, veio %', n; end if;
end $$;

-- Views do dono: funil, botões, telas; só service_role.
insert into public.faro_events(created_at, session_id, event, screen, props) values
  (now() - interval '9 minutes', '55555555-5555-5555-5555-555555555555', 'trial_start', null, '{}'),
  (now() - interval '8 minutes', '55555555-5555-5555-5555-555555555555', 'app_installed', null, '{}'),
  (now() - interval '5 minutes', '55555555-5555-5555-5555-555555555555', 'first_entry', 'ganhos', '{"tipo":"ganho"}'),
  (now() - interval '4 minutes', '55555555-5555-5555-5555-555555555555', 'subscription_active', null, '{}');
do $$ declare r record; begin
  select * into r from public.faro_v_funil;
  if r.trial_start < 1 or r.subscription_active < 1 or r.first_entry < 1 or r.app_installed < 1 then raise exception 'funil vazio'; end if;
  if not exists (select 1 from public.faro_v_botoes where botao = 'salvar_dia' and toques >= 1) then raise exception 'view de botoes vazia'; end if;
  perform 1 from public.faro_v_telas;
  if not has_table_privilege('service_role', 'public.faro_v_funil', 'select') then raise exception 'service_role sem acesso'; end if;
  if has_table_privilege('authenticated', 'public.faro_v_funil', 'select') then raise exception 'authenticated le view'; end if;
end $$;

set role authenticated;
select public.faro_track('44444444-4444-4444-4444-444444444444', 'trial_start', 'config', '{}');
do $$ begin
  begin perform count(*) from public.faro_events; raise exception 'authenticated leu faro_events';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'CENARIO_OK' as resultado;
