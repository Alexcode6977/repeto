-- Migration: Add detailed stats columns to rehearsal_sessions
-- Tracks first-try success, wrong answers, and skipped lines

ALTER TABLE public.rehearsal_sessions
ADD COLUMN IF NOT EXISTS lines_validated_first_try integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lines_wrong integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lines_skipped integer DEFAULT 0;

-- Update existing rows to have 0 for new columns (already default, but explicit)
UPDATE public.rehearsal_sessions
SET 
    lines_validated_first_try = COALESCE(lines_validated_first_try, 0),
    lines_wrong = COALESCE(lines_wrong, 0),
    lines_skipped = COALESCE(lines_skipped, 0)
WHERE lines_validated_first_try IS NULL 
   OR lines_wrong IS NULL 
   OR lines_skipped IS NULL;
