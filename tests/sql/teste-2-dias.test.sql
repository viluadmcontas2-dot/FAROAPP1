-- Cada cenário isolado; nenhum dado de teste persiste.
begin;
create or replace function pg_temp.assert(c boolean, m text) returns void language plpgsql as $$
begin if c is distinct from true then raise exception 'FALHOU: %', m; end if; end $$;
do $$
declare
  u uuid := gen_random_uuid();
  alias_id uuid := gen_random_uuid();
  dominio text;
begin
  perform pg_temp.assert((select trial_days = 2 from public.faro_billing_settings where id), 'configuração de dois dias');
  insert into auth.users (id, email, email_confirmed_at) values (u, 'Pessoa.Normal+teste@gmail.com', now());
  perform pg_temp.assert(public.faro_trial_days_for(u) = 2, 'confirmado e normal recebe dois dias');
  update auth.users set email_confirmed_at = null where id = u;
  perform pg_temp.assert(public.faro_trial_days_for(u) = 0, 'não confirmado não recebe teste');
  update auth.users set email_confirmed_at = now() where id = u;
  foreach dominio in array array['mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','temp-mail.org','yopmail.com','trashmail.com','getnada.com','sharklasers.com','dispostable.com','maildrop.cc','throwawaymail.com','fakeinbox.com','mohmal.com','emailondeck.com']
  loop
    update auth.users set email = ' Pessoa+tag@' || upper(dominio) || ' ' where id = u;
    perform pg_temp.assert(public.faro_trial_days_for(u) = 0, 'descartável bloqueado: ' || dominio);
  end loop;
  update auth.users set email = 'Pessoa.Normal+teste@gmail.com' where id = u;
  perform pg_temp.assert(public.faro_normalize_email(' Pessoa.Normal+outro@GoogleMail.com ') = 'pessoanormal@gmail.com', 'normalização Gmail completa');
  delete from public.faro_billing_settings where id;
  perform pg_temp.assert(public.faro_trial_days_for(u) = 2, 'sem configuração usa dois dias');
  insert into public.faro_billing_settings (id, trial_days) values (true, 0);
  perform pg_temp.assert(public.faro_trial_days_for(u) = 0, 'configuração zero preservada');
  update public.faro_billing_settings set trial_days = 2 where id;
  perform public.faro_apply_subscription_event('teste_dois_dias','customer.subscription.created',now(),u,'cus_dois','sub_dois','trialing',now()+interval '2 days',false);
  insert into auth.users (id, email, email_confirmed_at) values (alias_id, 'p.e.s.s.o.a.normal+novo@googlemail.com', now());
  perform pg_temp.assert(public.faro_trial_days_for(alias_id) = 0, 'alias confirmado não repete teste consumido');
  -- Outro e-mail, sem registro de trial: histórico da assinatura basta.
  update auth.users set email = 'outro@exemplo.com' where id = u;
  update public.faro_subscriptions set status = 'canceled' where user_id = u;
  perform pg_temp.assert(public.faro_trial_days_for(u) = 0, 'assinatura cancelada impede novo teste');
end $$;
do $$
declare papel text; assinatura text;
begin
  foreach assinatura in array array['public.faro_trial_days_for(uuid)', 'public.faro_normalize_email(text)'] loop
    foreach papel in array array['anon', 'authenticated'] loop
      perform pg_temp.assert(not has_function_privilege(papel, assinatura, 'EXECUTE'), papel || ' sem execução de ' || assinatura);
    end loop;
    perform pg_temp.assert(has_function_privilege('service_role', assinatura, 'EXECUTE'), 'serviço mantém execução');
    perform pg_temp.assert(has_function_privilege('postgres', assinatura, 'EXECUTE'), 'postgres mantém execução');
  end loop;
end $$;
rollback;
select 'teste de 2 dias OK: confirmação, descartáveis, aliases, histórico, configuração e permissões' as resultado;
