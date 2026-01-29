-- Helper function to check membership WITHOUT triggering recursive RLS
-- SECURITY DEFINER allows it to read troupe_members with owner privileges
DROP FUNCTION IF EXISTS public.is_troupe_member(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_troupe_member(tid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.troupe_members
    WHERE troupe_id = tid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the SELECT policy to use the helper function
DROP POLICY IF EXISTS "Members can view other members" ON public.troupe_members;

CREATE POLICY "Members can view other members" ON public.troupe_members
  FOR SELECT
  USING (
    public.is_troupe_member(troupe_id)
  );

-- Note: Policies for Insert/Update/Delete (Admins only) already use has_troupe_permission 
-- which is also SECURITY DEFINER, so they should be fine.
