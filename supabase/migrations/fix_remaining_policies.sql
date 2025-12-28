-- Fix for remaining RLS policies (Casting, Calendar, Events)

-- 1. CASTING (Update Play Characters)
-- Admins can update casting (assign actors)
create policy "Admins can cast characters"
on public.play_characters for update
using (
  exists (
    select 1 from public.plays
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where plays.id = play_characters.play_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.plays
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where plays.id = play_characters.play_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);

-- 2. EVENTS (Calendar)
-- Visible to members
create policy "Members can view events"
on public.events for select
using (
  exists (
    select 1 from public.troupe_members
    where troupe_members.troupe_id = events.troupe_id
    and troupe_members.user_id = auth.uid()
  )
);

-- Create/Update/Delete: Admins only
create policy "Admins can manage events"
on public.events for all
using (
  exists (
    select 1 from public.troupe_members
    where troupe_members.troupe_id = events.troupe_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);

-- 3. EVENT ATTENDANCE
-- Visible to members (so they can see who is coming)
create policy "Members can view attendance"
on public.event_attendance for select
using (
  exists (
    select 1 from public.events
    join public.troupe_members on events.troupe_id = troupe_members.troupe_id
    where events.id = event_attendance.event_id
    and troupe_members.user_id = auth.uid()
  )
);

-- Manage Own Attendance (Insert/Update)
create policy "Members can manage own attendance"
on public.event_attendance for insert
with check (user_id = auth.uid());

create policy "Members can update own attendance"
on public.event_attendance for update
using (user_id = auth.uid());
