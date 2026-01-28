-- Migration: Add new troupe roles (adjoint, metteur_en_scene)
-- These roles have the same permissions as admin

-- 1. Drop existing constraint on troupe_members.role
ALTER TABLE troupe_members 
DROP CONSTRAINT IF EXISTS troupe_members_role_check;

-- 2. Add new constraint with additional roles
ALTER TABLE troupe_members
ADD CONSTRAINT troupe_members_role_check 
CHECK (role IN ('admin', 'adjoint', 'metteur_en_scene', 'member'));

-- 3. Update RLS policies to include new admin-like roles
-- Note: We'll use a helper to check if role is admin-like

-- Update policy for events INSERT (only admin-like roles can create)
DROP POLICY IF EXISTS "Admins can create events" ON events;
CREATE POLICY "Admins can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM troupe_members
        WHERE troupe_members.troupe_id = events.troupe_id
        AND troupe_members.user_id = auth.uid()
        AND troupe_members.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);

-- Update policy for events UPDATE
DROP POLICY IF EXISTS "Admins can update events" ON events;
CREATE POLICY "Admins can update events"
ON events FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM troupe_members
        WHERE troupe_members.troupe_id = events.troupe_id
        AND troupe_members.user_id = auth.uid()
        AND troupe_members.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);

-- Update policy for events DELETE
DROP POLICY IF EXISTS "Admins can delete events" ON events;
CREATE POLICY "Admins can delete events"
ON events FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM troupe_members
        WHERE troupe_members.troupe_id = events.troupe_id
        AND troupe_members.user_id = auth.uid()
        AND troupe_members.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);

-- Update policy for plays INSERT
DROP POLICY IF EXISTS "Admins can create plays" ON plays;
CREATE POLICY "Admins can create plays"
ON plays FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM troupe_members
        WHERE troupe_members.troupe_id = plays.troupe_id
        AND troupe_members.user_id = auth.uid()
        AND troupe_members.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);

-- Update policy for plays UPDATE
DROP POLICY IF EXISTS "Admins can update plays" ON plays;
CREATE POLICY "Admins can update plays"
ON plays FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM troupe_members
        WHERE troupe_members.troupe_id = plays.troupe_id
        AND troupe_members.user_id = auth.uid()
        AND troupe_members.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);

-- Update policy for plays DELETE
DROP POLICY IF EXISTS "Admins can delete plays" ON plays;
CREATE POLICY "Admins can delete plays"
ON plays FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM troupe_members
        WHERE troupe_members.troupe_id = plays.troupe_id
        AND troupe_members.user_id = auth.uid()
        AND troupe_members.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);

-- Update policy for troupe_join_requests (only admins can see)
DROP POLICY IF EXISTS "Admins can view requests" ON troupe_join_requests;
CREATE POLICY "Admins can view requests"
ON troupe_join_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM troupe_members
        WHERE troupe_members.troupe_id = troupe_join_requests.troupe_id
        AND troupe_members.user_id = auth.uid()
        AND troupe_members.role IN ('admin', 'adjoint', 'metteur_en_scene')
    )
);
