-- Fix RLS: Allow members to view session plans
-- Problem: Members cannot see the 'session_plans' linked to events, preventing them from seeing prepare info.

-- 1. Ensure RLS is enabled
alter table public.session_plans enable row level security;

-- 2. Drop existing policy if any (to be safe/clean)
drop policy if exists "Members can view session plans" on public.session_plans;
drop policy if exists "Admins can manage session plans" on public.session_plans;

-- 3. Policy: Members can VIEW session plans of their troupe
create policy "Members can view session plans"
on public.session_plans for select
using (
  exists (
    select 1 from public.events
    join public.troupe_members on events.troupe_id = troupe_members.troupe_id
    where events.id = session_plans.event_id
    and troupe_members.user_id = auth.uid()
  )
);

-- 4. Policy: Admins can MANAGE session plans
create policy "Admins can manage session plans"
on public.session_plans for all
using (
  exists (
    select 1 from public.events
    join public.troupe_members on events.troupe_id = troupe_members.troupe_id
    where events.id = session_plans.event_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.events
    join public.troupe_members on events.troupe_id = troupe_members.troupe_id
    where events.id = session_plans.event_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);
