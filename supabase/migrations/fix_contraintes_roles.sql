-- Fix: Drop existing constraint and recreate with new roles
-- Execute this in Supabase Cloud SQL Editor

-- Drop the old constraint
ALTER TABLE public.troupe_members
DROP CONSTRAINT IF EXISTS troupe_members_role_check;

-- Add the new constraint with all roles
ALTER TABLE public.troupe_members
ADD CONSTRAINT troupe_members_role_check CHECK (role IN ('admin', 'adjoint', 'metteur_en_scene', 'member'));
