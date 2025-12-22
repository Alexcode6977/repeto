-- Migration: Add Guest Members support

-- 1. Create Guests Table
create table public.troupe_guests (
  id uuid primary key default gen_random_uuid(),
  troupe_id uuid references public.troupes(id) on delete cascade not null,
  name text not null,
  email text, -- Optional, for future invites
  created_at timestamp with time zone default now()
);

-- 2. Update Play Characters to support guests
alter table public.play_characters 
add column guest_id uuid references public.troupe_guests(id) on delete set null;

-- 3. RLS for Guests
alter table public.troupe_guests enable row level security;

-- Policies for Guests
-- Visible to all troupe members
create policy "Members can view guests"
on public.troupe_guests for select
using (
  exists (
    select 1 from public.troupe_members
    where troupe_members.troupe_id = troupe_guests.troupe_id
    and troupe_members.user_id = auth.uid()
  )
);

-- Manage: Admins only
create policy "Admins can manage guests"
on public.troupe_guests for all
using (
  exists (
    select 1 from public.troupe_members
    where troupe_members.troupe_id = troupe_guests.troupe_id
    and troupe_members.user_id = auth.uid()
    and troupe_members.role = 'admin'
  )
);
