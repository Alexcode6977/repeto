-- Enable RLS (just in case)
ALTER TABLE public.troupe_members ENABLE ROW LEVEL SECURITY;

-- 1. Policy: "Members can view other members of their troupe"
DROP POLICY IF EXISTS "Members can view other members" ON public.troupe_members;
CREATE POLICY "Members can view other members" ON public.troupe_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.troupe_members AS tm
      WHERE tm.troupe_id = troupe_members.troupe_id
    )
  );

-- 2. Policy: "Admins can insert members"
-- Check if the *requesting user* has 'admin' role in the target troupe
DROP POLICY IF EXISTS "Admins can insert members" ON public.troupe_members;
CREATE POLICY "Admins can insert members" ON public.troupe_members
  FOR INSERT
  WITH CHECK (
    public.has_troupe_permission(troupe_id, ARRAY['admin'])
  );

-- 3. Policy: "Admins can update members"
DROP POLICY IF EXISTS "Admins can update members" ON public.troupe_members;
CREATE POLICY "Admins can update members" ON public.troupe_members
  FOR UPDATE
  USING (
    public.has_troupe_permission(troupe_id, ARRAY['admin'])
  );

-- 4. Policy: "Admins can delete members"
DROP POLICY IF EXISTS "Admins can delete members" ON public.troupe_members;
CREATE POLICY "Admins can delete members" ON public.troupe_members
  FOR DELETE
  USING (
    public.has_troupe_permission(troupe_id, ARRAY['admin'])
  );

-- 5. Policy: "Users can delete themselves (leave troupe)"
DROP POLICY IF EXISTS "Users can leave troupe" ON public.troupe_members;
CREATE POLICY "Users can leave troupe" ON public.troupe_members
  FOR DELETE
  USING (
    auth.uid() = user_id
  );
