-- Ensure Stripe webhooks are processed at most once per event.id

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Service role can insert stripe webhook events" on public.stripe_webhook_events;
create policy "Service role can insert stripe webhook events"
  on public.stripe_webhook_events
  for insert
  to service_role
  with check (true);
