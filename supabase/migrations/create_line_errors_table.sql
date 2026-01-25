-- Migration: Create rehearsal_line_errors table for tracking mistakes during rehearsal
-- This tracks individual line errors across all rehearsal modes (solo, troupe, visio)

CREATE TABLE IF NOT EXISTS public.rehearsal_line_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.rehearsal_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    script_id uuid,                        -- Reference to play or script
    line_index integer NOT NULL,           -- Index of the line in the script
    line_text text,                        -- The actual text of the line
    character_name text,                   -- Character who speaks this line
    error_type text CHECK (error_type IN ('skip', 'timeout', 'mismatch')) NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_rehearsal_line_errors_user_id ON public.rehearsal_line_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_line_errors_script_id ON public.rehearsal_line_errors(script_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_line_errors_session_id ON public.rehearsal_line_errors(session_id);

-- RLS Policies
ALTER TABLE public.rehearsal_line_errors ENABLE ROW LEVEL SECURITY;

-- Users can read their own errors
CREATE POLICY "Users can read own line errors"
ON public.rehearsal_line_errors FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own errors
CREATE POLICY "Users can insert own line errors"
ON public.rehearsal_line_errors FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own errors
CREATE POLICY "Users can delete own line errors"
ON public.rehearsal_line_errors FOR DELETE
USING (auth.uid() = user_id);
