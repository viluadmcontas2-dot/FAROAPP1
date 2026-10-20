-- FARO — faro_has_access só responde sobre o PRÓPRIO usuário (o servidor/service_role pode consultar qualquer um).
-- Evita que um usuário logado descubra o status de acesso de outra pessoa pelo RPC.
create or replace function public.faro_has_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and (p_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')
    and (
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
