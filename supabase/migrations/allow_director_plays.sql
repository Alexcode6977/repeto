-- Fix RLS for Plays to allow Metteur en scène to manage scripts
-- Enabling Admin, Adjoint, and Metteur en scène to create/edit/delete plays

-- 1. Plays Policies
DROP POLICY IF EXISTS "Troupe managers can insert plays" ON public.plays;
DROP POLICY IF EXISTS "Troupe managers can update plays" ON public.plays;
DROP POLICY IF EXISTS "Troupe managers can delete plays" ON public.plays;
DROP POLICY IF EXISTS "Members can view plays" ON public.plays;

-- Setup View Policy (All members can view)
CREATE POLICY "Members can view plays"
ON public.plays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.troupe_members
    WHERE troupe_id = plays.troupe_id
    AND user_id = auth.uid()
  )
);

-- Setup Manage Policies (Admin, Adjoint, MES)
CREATE POLICY "Troupe managers can insert plays"
ON public.plays FOR INSERT
WITH CHECK (
  public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
);

CREATE POLICY "Troupe managers can update plays"
ON public.plays FOR UPDATE
USING (
  public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
);

CREATE POLICY "Troupe managers can delete plays"
ON public.plays FOR DELETE
USING (
  public.has_troupe_permission(troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
);

-- 2. Play Characters
DROP POLICY IF EXISTS "Troupe managers can manage characters" ON public.play_characters;
DROP POLICY IF EXISTS "Members can view characters" ON public.play_characters;

CREATE POLICY "Members can view characters"
ON public.play_characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.plays
    JOIN public.troupe_members ON plays.troupe_id = troupe_members.troupe_id
    WHERE plays.id = play_characters.play_id
    AND troupe_members.user_id = auth.uid()
  )
);

CREATE POLICY "Troupe managers can manage characters"
ON public.play_characters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.plays
    WHERE plays.id = play_characters.play_id
    AND public.has_troupe_permission(plays.troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
  )
);

-- 3. Play Scenes
DROP POLICY IF EXISTS "Troupe managers can manage scenes" ON public.play_scenes;
DROP POLICY IF EXISTS "Members can view scenes" ON public.play_scenes;

CREATE POLICY "Members can view scenes"
ON public.play_scenes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.plays
    JOIN public.troupe_members ON plays.troupe_id = troupe_members.troupe_id
    WHERE plays.id = play_scenes.play_id
    AND troupe_members.user_id = auth.uid()
  )
);

CREATE POLICY "Troupe managers can manage scenes"
ON public.play_scenes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.plays
    WHERE plays.id = play_scenes.play_id
    AND public.has_troupe_permission(plays.troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
  )
);

-- 4. Scene Characters
DROP POLICY IF EXISTS "Troupe managers can manage scene characters" ON public.scene_characters;
DROP POLICY IF EXISTS "Members can view scene characters" ON public.scene_characters;

CREATE POLICY "Members can view scene characters"
ON public.scene_characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.play_scenes
    JOIN public.plays ON play_scenes.play_id = plays.id
    JOIN public.troupe_members ON plays.troupe_id = troupe_members.troupe_id
    WHERE play_scenes.id = scene_characters.scene_id
    AND troupe_members.user_id = auth.uid()
  )
);

CREATE POLICY "Troupe managers can manage scene characters"
ON public.scene_characters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.play_scenes
    JOIN public.plays ON play_scenes.play_id = plays.id
    WHERE play_scenes.id = scene_characters.scene_id
    AND public.has_troupe_permission(plays.troupe_id, ARRAY['admin', 'adjoint', 'metteur_en_scene'])
  )
);
