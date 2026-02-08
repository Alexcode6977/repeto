-- Migration: Add explicit rehearsal context columns for solo/troupe separation

-- 1) Sessions context
ALTER TABLE public.rehearsal_sessions
ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'solo_script',
ADD COLUMN IF NOT EXISTS play_id uuid REFERENCES public.plays(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS troupe_id uuid REFERENCES public.troupes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rehearsal_sessions_context_type_check'
    ) THEN
        ALTER TABLE public.rehearsal_sessions
        ADD CONSTRAINT rehearsal_sessions_context_type_check
        CHECK (context_type IN ('solo_script', 'troupe_play', 'troupe_event'));
    END IF;
END $$;

UPDATE public.rehearsal_sessions
SET context_type = COALESCE(
    context_type,
    CASE
        WHEN event_id IS NOT NULL THEN 'troupe_event'
        WHEN play_id IS NOT NULL THEN 'troupe_play'
        ELSE 'solo_script'
    END
);

CREATE INDEX IF NOT EXISTS idx_rehearsal_sessions_play_id ON public.rehearsal_sessions(play_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_sessions_troupe_id ON public.rehearsal_sessions(troupe_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_sessions_event_id ON public.rehearsal_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_sessions_context_type ON public.rehearsal_sessions(context_type);

-- 2) Line errors context
ALTER TABLE public.rehearsal_line_errors
ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'solo_script',
ADD COLUMN IF NOT EXISTS play_id uuid REFERENCES public.plays(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS troupe_id uuid REFERENCES public.troupes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rehearsal_line_errors_context_type_check'
    ) THEN
        ALTER TABLE public.rehearsal_line_errors
        ADD CONSTRAINT rehearsal_line_errors_context_type_check
        CHECK (context_type IN ('solo_script', 'troupe_play', 'troupe_event'));
    END IF;
END $$;

UPDATE public.rehearsal_line_errors
SET context_type = COALESCE(
    context_type,
    CASE
        WHEN event_id IS NOT NULL THEN 'troupe_event'
        WHEN play_id IS NOT NULL THEN 'troupe_play'
        ELSE 'solo_script'
    END
);

CREATE INDEX IF NOT EXISTS idx_rehearsal_line_errors_play_id ON public.rehearsal_line_errors(play_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_line_errors_troupe_id ON public.rehearsal_line_errors(troupe_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_line_errors_event_id ON public.rehearsal_line_errors(event_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_line_errors_context_type ON public.rehearsal_line_errors(context_type);
