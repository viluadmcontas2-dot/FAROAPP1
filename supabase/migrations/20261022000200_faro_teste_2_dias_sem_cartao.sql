-- Teste de dois dias sem cartão: confirmação e histórico limitam a elegibilidade.
-- A normalização existente já neutraliza pontos, +tag e googlemail.com.
alter table public.faro_billing_settings alter column trial_days set default 2;
update public.faro_billing_settings set trial_days = 2 where id;

create or replace function public.faro_trial_days_for(p_user_id uuid)
returns integer language plpgsql stable security definer set search_path = ''
as $$
declare
  v_email text;
  v_hash text;
  v_days integer;
begin
  select u.email into v_email from auth.users u
  where u.id = p_user_id
    and coalesce(u.is_anonymous, false) = false
    and u.email_confirmed_at is not null;
  v_hash := public.faro_email_hash(v_email);
  if v_hash is null then return 0; end if;
  if split_part(public.faro_normalize_email(v_email), '@', 2) in (
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
    'temp-mail.org', 'yopmail.com', 'trashmail.com', 'getnada.com',
    'sharklasers.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
    'fakeinbox.com', 'mohmal.com', 'emailondeck.com'
  ) then return 0; end if;
  if exists (select 1 from public.faro_trials_used t where t.email_hash = v_hash) then return 0; end if;
  if exists (select 1 from public.faro_subscriptions s where s.user_id = p_user_id and s.stripe_subscription_id is not null) then return 0; end if;
  select trial_days into v_days from public.faro_billing_settings where id;
  return coalesce(v_days, 2);
end;
$$;

revoke all on function public.faro_trial_days_for(uuid) from public, anon, authenticated;
grant execute on function public.faro_trial_days_for(uuid) to service_role;
