-- FARO_FINANCE_V1 — privilégios explícitos da Data API.
-- Defense in depth: RLS continua obrigatório, mas os papéis públicos recebem apenas o mínimo necessário.

revoke all on
  public.faro_profiles,
  public.faro_state,
  public.faro_subscriptions,
  public.faro_push_devices,
  public.faro_webhook_events
from anon;

revoke all on
  public.faro_profiles,
  public.faro_state,
  public.faro_subscriptions,
  public.faro_push_devices,
  public.faro_webhook_events
from authenticated;

grant select, insert, update, delete on public.faro_profiles to authenticated;
grant select, insert, update, delete on public.faro_state to authenticated;
grant select on public.faro_subscriptions to authenticated;
grant select, insert, update, delete on public.faro_push_devices to authenticated;

-- faro_webhook_events permanece sem grants para anon/authenticated.
-- Edge Functions administrativas usam contexto server-side e não dependem destes grants de cliente.
