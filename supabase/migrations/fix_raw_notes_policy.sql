-- Migration: Fix session_raw_notes policy and created_by default

-- 1. Set DEFAULT auth.uid() for created_by
ALTER TABLE public.session_raw_notes ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 2. Drop existing policy
DROP POLICY IF EXISTS "Directors can manage raw notes" ON public.session_raw_notes;

-- 3. Create split policies for better control

-- INSERT Policy
CREATE POLICY "Directors can insert raw notes"
    ON public.session_raw_notes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = event_id -- event_id is the column in session_raw_notes being inserted
            AND tm.user_id = auth.uid()
            -- Check for all admin/director variations
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );

-- SELECT Policy
CREATE POLICY "Directors can view raw notes"
    ON public.session_raw_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = session_raw_notes.event_id
            AND tm.user_id = auth.uid()
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );

-- UPDATE/DELETE Policy
CREATE POLICY "Directors can update/delete raw notes"
    ON public.session_raw_notes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = session_raw_notes.event_id
            AND tm.user_id = auth.uid()
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );

CREATE POLICY "Directors can delete raw notes"
    ON public.session_raw_notes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = session_raw_notes.event_id
            AND tm.user_id = auth.uid()
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );
