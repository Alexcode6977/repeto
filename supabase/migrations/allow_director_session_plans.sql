-- Migration: Allow Directors and Adjoints to manage Session Plans
-- Fixes error where only 'admin' could save session plans.

-- 1. Ensure RLS is enabled
alter table public.session_plans enable row level security;

-- 2. Drop existing restrictive policies
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

-- 4. Policy: Troupe Managers (Admin, Adjoint, Director) can MANAGE session plans
-- This uses the helper function `has_troupe_permission` (assumed to exist from previous migrations)
-- If not, we fallback to direct role check, but let's try to be consistent.

create policy "Troupe managers can manage session plans"
on public.session_plans for all
using (
  exists (
    select 1 from public.events
    where events.id = session_plans.event_id
    and public.has_troupe_permission(events.troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = session_plans.event_id
    and public.has_troupe_permission(events.troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
  )
);
