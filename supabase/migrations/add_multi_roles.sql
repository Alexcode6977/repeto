-- Migration: Add Multi-Role Support

-- 1. Add 'roles' column
ALTER TABLE public.troupe_members ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['member'];

-- 2. Migrate existing data
-- Admins become Admin + Member
UPDATE public.troupe_members 
SET roles = ARRAY['admin', 'member'] 
WHERE role = 'admin';

-- Members become Member
UPDATE public.troupe_members 
SET roles = ARRAY['member'] 
WHERE role = 'member';

-- MES become MES
UPDATE public.troupe_members 
SET roles = ARRAY['metteur_en_scene'] 
WHERE role = 'metteur_en_scene';

-- Adjoints become Adjoint + Member (assuming they were adjoint before, though distinct role wasn't fully used yet)
UPDATE public.troupe_members 
SET roles = ARRAY['adjoint', 'member'] 
WHERE role = 'adjoint';

-- 3. Update RLS Policies to use 'roles'

-- Helper function to check if user has permission in a troupe
CREATE OR REPLACE FUNCTION public.has_troupe_permission(tid uuid, required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.troupe_members
    WHERE troupe_id = tid
    AND user_id = auth.uid()
    AND roles && required_roles -- Overlap check (if user has ANY of the required roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update specific policies if they relied on 'role' column
-- (Most existing policies just checked for existence in the table, which is still valid)

-- Example: Policy for writing to troupe_members (only admins can manage members)
-- We need to drop old policies if they existed and enforced restricted writes based on 'role'

-- Ensure 'roles' is not null
ALTER TABLE public.troupe_members ALTER COLUMN roles SET NOT NULL;

-- Drop the old 'role' column eventually, but keep it nullable for now to check potential backward compat issues
ALTER TABLE public.troupe_members ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.troupe_members ALTER COLUMN role DROP DEFAULT;
-- We can drop it later or keep it synced via trigger if needed, but we will move app logic to 'roles'.
