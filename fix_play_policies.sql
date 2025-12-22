-- Fix for missing RLS policies on Plays and related tables

-- 1. PLAYS
-- Visible to all troupe members
create policy "Members can view plays"
on public.plays for select
using (
  exists (
    select 1 from public.troupe_members
    where troupe_members.troupe_id = plays.troupe_id
    and troupe_members.user_id = auth.uid()
  )
);

-- Creating plays: Only admins
create policy "Admins can create plays"
on public.plays for insert
with check (
  exists (
    select 1 from public.troupe_members
    where troupe_members.troupe_id = plays.troupe_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);

-- 2. PLAY CHARACTERS
-- Visible to members (via play)
create policy "Members can view characters"
on public.play_characters for select
using (
  exists (
    select 1 from public.plays
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where plays.id = play_characters.play_id
    and troupe_members.user_id = auth.uid()
  )
);

-- Create: Admins
create policy "Admins can create characters"
on public.play_characters for insert
with check (
  exists (
    select 1 from public.plays
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where plays.id = play_characters.play_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);

-- 3. PLAY SCENES
-- Visible to members
create policy "Members can view scenes"
on public.play_scenes for select
using (
  exists (
    select 1 from public.plays
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where plays.id = play_scenes.play_id
    and troupe_members.user_id = auth.uid()
  )
);

-- Create: Admins
create policy "Admins can create scenes"
on public.play_scenes for insert
with check (
  exists (
    select 1 from public.plays
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where plays.id = play_scenes.play_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);

-- 4. SCENE CHARACTERS (Junction)
-- Visible to members
create policy "Members can view scene characters"
on public.scene_characters for select
using (
  exists (
    select 1 from public.play_scenes
    join public.plays on play_scenes.play_id = plays.id
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where play_scenes.id = scene_characters.scene_id
    and troupe_members.user_id = auth.uid()
  )
);

-- Create: Admins
create policy "Admins can assign chars to scenes"
on public.scene_characters for insert
with check (
  exists (
    select 1 from public.play_scenes
    join public.plays on play_scenes.play_id = plays.id
    join public.troupe_members on plays.troupe_id = troupe_members.troupe_id
    where play_scenes.id = scene_characters.scene_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);
