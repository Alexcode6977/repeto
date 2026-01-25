-- Migration: Add type column to rehearsal_feedbacks
-- Allows distinguishing between 'feedback' (general) and 'indication' (acting direction)

ALTER TABLE public.rehearsal_feedbacks
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('feedback', 'indication')) DEFAULT 'feedback';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_rehearsal_feedbacks_type ON public.rehearsal_feedbacks(type);
