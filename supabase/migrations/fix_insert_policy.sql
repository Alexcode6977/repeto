-- Fix for missing INSERT policy on troupe_members

-- Allow users to add themselves to a troupe (create or join)
create policy "Users can join troupes"
on public.troupe_members for insert
with check (user_id = auth.uid());
