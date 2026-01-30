-- Fix RLS for Calendar Events to allow Metteur en scène and Adjoint
-- Also fixes reliance on deprecated 'role' column by using 'roles' array/has_troupe_permission

-- 1. Events Policies
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;

-- Allow Admin, Adjoint, and Metteur en scène to manage events
CREATE POLICY "Troupe managers can insert events"
ON public.events FOR INSERT
WITH CHECK (
  public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
);

CREATE POLICY "Troupe managers can update events"
ON public.events FOR UPDATE
USING (
  public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
);

CREATE POLICY "Troupe managers can delete events"
ON public.events FOR DELETE
USING (
  public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
);

-- 2. Event Attendance Policies (for managing others)
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.event_attendance;

CREATE POLICY "Troupe managers can manage all attendance"
ON public.event_attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_attendance.event_id
    AND public.has_troupe_permission(events.troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
  )
);
