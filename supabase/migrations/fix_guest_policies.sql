-- Fix RLS policies for troupe_guests to use the new roles array
-- The previous policy relied on the 'role' column which is now deprecated/empty for new members

DROP POLICY IF EXISTS "Admins can manage guests" ON public.troupe_guests;

CREATE POLICY "Admins can manage guests"
ON public.troupe_guests
FOR ALL
USING (
    public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
);
