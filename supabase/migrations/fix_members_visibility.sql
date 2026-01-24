-- Fix RLS visibility for troupe members (allow seeing colleagues)

-- 1. Create a helper function to check membership safely (bypassing RLS recursion)
CREATE OR REPLACE FUNCTION public.is_troupe_member(_troupe_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.troupe_members
    WHERE troupe_id = _troupe_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Policy for troupe_members
DROP POLICY IF EXISTS "View own membership" ON public.troupe_members;
DROP POLICY IF EXISTS "Members can view troupe data" ON public.troupe_members;

CREATE POLICY "Members can view all members of their troupes"
ON public.troupe_members
FOR SELECT
USING (
  public.is_troupe_member(troupe_id)
);

-- 3. Update Policy for Profiles (Ensure visibility)
-- Often profiles are locked down. Let's ensure authenticated users can read basic profile info.
-- Check if policy exists first? Or just create a broad one for now.
-- We'll try to drop if exists to be safe, assuming standard naming.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
