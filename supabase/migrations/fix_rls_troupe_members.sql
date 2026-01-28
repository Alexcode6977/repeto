-- Fix: Add RLS policy to allow admin-like roles to update troupe_members
-- Execute this in Supabase Cloud SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update member roles" ON public.troupe_members;

-- Create new policy allowing admin-like roles to update members
CREATE POLICY "Admins can update member roles"
ON public.troupe_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.troupe_members tm
        WHERE tm.troupe_id = troupe_members.troupe_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.troupe_members tm
        WHERE tm.troupe_id = troupe_members.troupe_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);
