-- Migration: Update session_plans status to support full lifecycle
-- Previous values: draft, published
-- New values: preparation, upcoming, processing, validated

-- 1. Drop the existing check constraint
ALTER TABLE public.session_plans 
DROP CONSTRAINT IF EXISTS session_plans_status_check;

-- 2. Migrate existing data to new statuses
-- 'draft' becomes 'preparation'
UPDATE public.session_plans 
SET status = 'preparation' 
WHERE status = 'draft';

-- 'published' becomes 'upcoming'
UPDATE public.session_plans 
SET status = 'upcoming' 
WHERE status = 'published';

-- 3. Add the new check constraint
ALTER TABLE public.session_plans 
ADD CONSTRAINT session_plans_status_check 
CHECK (status IN ('preparation', 'upcoming', 'processing', 'validated'));
