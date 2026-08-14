-- FARO v1 — idempotência de eventos Stripe.
-- Esta tabela não é exposta ao cliente autenticado; somente funções administrativas a utilizam.

create table if not exists public.faro_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.faro_webhook_events enable row level security;
revoke all on public.faro_webhook_events from anon, authenticated;
