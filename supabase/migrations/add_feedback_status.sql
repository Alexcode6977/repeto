-- Migration: Add status to rehearsal_feedbacks for Draft/Publish workflow

-- 1. Add status column
ALTER TABLE public.rehearsal_feedbacks
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending', 'published')) DEFAULT 'published';

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_rehearsal_feedbacks_status ON public.rehearsal_feedbacks(status);

-- 3. Update existing rows (Optional, but good practice to be explicit)
-- We assume all existing feedbacks were 'published' (live)
UPDATE public.rehearsal_feedbacks SET status = 'published' WHERE status IS NULL;
