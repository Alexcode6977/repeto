-- Migration: Fix RLS policies for rehearsal_feedbacks to allow directors to process notes

-- 1. Enable RLS
ALTER TABLE public.rehearsal_feedbacks ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential existing policies to ensure clean state
DROP POLICY IF EXISTS "Directors can manage feedbacks" ON public.rehearsal_feedbacks;
DROP POLICY IF EXISTS "Actors can view own feedbacks" ON public.rehearsal_feedbacks;
DROP POLICY IF EXISTS "Directors can insert feedbacks" ON public.rehearsal_feedbacks;
DROP POLICY IF EXISTS "Directors can view feedbacks" ON public.rehearsal_feedbacks;
DROP POLICY IF EXISTS "Directors can update feedbacks" ON public.rehearsal_feedbacks;
DROP POLICY IF EXISTS "Directors can delete feedbacks" ON public.rehearsal_feedbacks;

-- 3. Create granular policies

-- INSERT: Directors/Admins can insert feedback for their troupe's events
CREATE POLICY "Directors can insert feedbacks"
    ON public.rehearsal_feedbacks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = event_id -- 'event_id' from the row being inserted
            AND tm.user_id = auth.uid()
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );

-- SELECT: Directors/Admins can view all feedbacks for their troupe
CREATE POLICY "Directors can view feedbacks"
    ON public.rehearsal_feedbacks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = rehearsal_feedbacks.event_id
            AND tm.user_id = auth.uid()
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );

-- SELECT: Actors can view feedbacks assigned to them
CREATE POLICY "Actors can view own feedbacks"
    ON public.rehearsal_feedbacks
    FOR SELECT
    USING (
        auth.uid() = actor_id
    );

-- UPDATE: Directors/Admins can update feedbacks
CREATE POLICY "Directors can update feedbacks"
    ON public.rehearsal_feedbacks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = rehearsal_feedbacks.event_id
            AND tm.user_id = auth.uid()
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );

-- DELETE: Directors/Admins can delete feedbacks
CREATE POLICY "Directors can delete feedbacks"
    ON public.rehearsal_feedbacks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.troupe_members tm ON tm.troupe_id = e.troupe_id
            WHERE e.id = rehearsal_feedbacks.event_id
            AND tm.user_id = auth.uid()
            AND tm.roles && ARRAY['admin', 'director', 'metteur_en_scene', 'adjoint']
        )
    );
