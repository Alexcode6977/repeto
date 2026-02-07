-- Phase 3: webhook observability
-- Persist webhook failures to make monitoring and debugging actionable.

create table if not exists public.stripe_webhook_failures (
  id bigint generated always as identity primary key,
  event_id text,
  event_type text,
  error_message text not null,
  payload_excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stripe_webhook_failures_created_at
  on public.stripe_webhook_failures (created_at desc);

create index if not exists idx_stripe_webhook_failures_event
  on public.stripe_webhook_failures (event_type, event_id);

alter table public.stripe_webhook_failures enable row level security;

drop policy if exists "Service role can insert stripe webhook failures" on public.stripe_webhook_failures;
create policy "Service role can insert stripe webhook failures"
  on public.stripe_webhook_failures
  for insert
  to service_role
  with check (true);

drop policy if exists "Service role can read stripe webhook failures" on public.stripe_webhook_failures;
create policy "Service role can read stripe webhook failures"
  on public.stripe_webhook_failures
  for select
  to service_role
  using (true);
