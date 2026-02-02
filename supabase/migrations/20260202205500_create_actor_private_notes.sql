-- Create actor_private_notes table for personal script annotations
CREATE TABLE public.actor_private_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    play_id uuid REFERENCES public.plays(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    scene_index integer NOT NULL,
    line_index integer, -- Optional, if attached to a specific line
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.actor_private_notes ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can only manage their own notes
CREATE POLICY "Users can manage their own private notes"
    ON public.actor_private_notes
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_actor_private_notes_play_user ON public.actor_private_notes(play_id, user_id);
