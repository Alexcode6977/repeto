-- Migration: Create session_raw_notes table for Live Session raw data

CREATE TABLE public.session_raw_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    play_id uuid REFERENCES public.plays(id) ON DELETE CASCADE NOT NULL,
    scene_index integer NOT NULL, -- Global index in the script
    line_index integer, -- Optional, if attached to a specific line
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.session_raw_notes ENABLE ROW LEVEL SECURITY;

-- Policies
-- Directors can do everything
CREATE POLICY "Directors can manage raw notes"
    ON public.session_raw_notes
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = session_raw_notes.event_id
            AND tm.user_id = auth.uid()
            AND tm.roles && '{admin,director,adjoint}'
        )
    );

-- Actors cannot see raw notes (they are private to the director until processed)
-- No policy for actors = implicit deny
