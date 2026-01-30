-- Fix RLS for troupe_join_requests to support multi-role system
-- The previous policy relied on the deprecated 'role' column

-- 1. Drop the old policy
DROP POLICY IF EXISTS "Admins can view and manage requests for their troupes" ON public.troupe_join_requests;

-- 2. Create the new policy using the 'roles' array check via has_troupe_permission
-- Admins and Adjoints should be able to see and manage requests
CREATE POLICY "Admins can view and manage requests for their troupes"
  ON public.troupe_join_requests FOR ALL
  USING (
    public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint'])
  );
