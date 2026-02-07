-- Phase 2: subscription integrity guards
-- Goal: prevent duplicate linkage and enforce minimum consistency for paid troupe states.

-- A Stripe subscription ID must map to at most one profile.
create unique index if not exists uq_profiles_stripe_subscription_id
on public.profiles (stripe_subscription_id)
where stripe_subscription_id is not null;

-- A Stripe subscription ID must map to at most one troupe.
create unique index if not exists uq_troupes_stripe_subscription_id
on public.troupes (stripe_subscription_id)
where stripe_subscription_id is not null;

-- Fast lookup for reconciliation queries.
create index if not exists idx_troupes_subscription_status_stripe
on public.troupes (subscription_status, stripe_subscription_id)
where stripe_subscription_id is not null;

-- Paid troupe states must carry Stripe linkage.
alter table public.troupes
drop constraint if exists troupes_paid_status_requires_stripe_subscription;

alter table public.troupes
add constraint troupes_paid_status_requires_stripe_subscription
check (
  subscription_status not in ('active', 'past_due')
  or (stripe_subscription_id is not null and stripe_customer_id is not null)
) not valid;
