-- Fix Recursive RLS on troupe_members
-- The previous policy caused infinite recursion or performance issues because it queried the table itself within its own policy.

-- 1. Drop the problematic policy
drop policy if exists "Members can view troupe data" on public.troupe_members;

-- 2. Create non-recursive policies
-- A. Users can ALWAYS see their own membership rows.
create policy "Users can view own membership"
on public.troupe_members for select
using ( user_id = auth.uid() );

-- B. Users can see members of troupes they belong to.
-- To avoid recursion, we should seemingly use a different method, but actually, 
-- we can just rely on the fact that for "my" row (cached by the DB or via the first policy), I have access.
-- But a standard way to break recursion is to use a SECURITY DEFINER function or separate the lookup.

-- For now, let's keep it simple: Access to own row is critical for the other joins (play_characters etc) to work.
-- The joins in other tables usually do:
--    join troupe_members on ... and troupe_members.user_id = auth.uid()
-- This only requires seeing YOUR OWN row.

-- So policy "Users can view own membership" might be ENOUGH for the joins in other policies to work?
-- Let's check `fix_play_policies.sql`:
--    select 1 from public.troupe_members where ... and user_id = auth.uid()
-- YES! verifying "user_id = auth.uid()" only checks MY row. 
-- So simply granting access to one's own row is enough for the subqueries to work.

-- However, to see OTHER actors in the team (e.g. "Lucien is playing with me"), we need to see others.
-- We can try to re-add the "view others" policy but wrapped carefully, 
-- or for now just solving the "My Scenes" issue only requires seeing oneself.

-- Let's verify if `getUserPreparationDetails` needs to see others?
-- It fetches `userCharacters` -> `play_characters` where `actor_id = me`.
-- This requires `play_characters` policy:
--    exists (select 1 from plays join troupe_members ... where user_id = auth.uid())
-- This join only needs ME.

-- So, I will Just enable "View Own Membership" first to unblock the query.
-- If we need to see teammates, we can add a second policy later using a helper function.

