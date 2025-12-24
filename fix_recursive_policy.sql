-- Fix for recursive RLS policy on troupe_members

-- 1. Drop the problematic recursive policy
drop policy if exists "Members can view troupe data" on public.troupe_members;

-- 2. Create a safe, basic policy: You can see your own membership
create policy "View own membership"
on public.troupe_members for select
using (user_id = auth.uid());

-- 3. (Optional) Allow seeing other members if you are an admin or member of that troupe
-- For now, to avoid recursion loop, we stick to the basic one. 
-- The dashboard only needs to see "My Membership".
