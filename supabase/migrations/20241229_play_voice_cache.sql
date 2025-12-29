-- Migration: Play Voice Cache System
-- Creates tables for caching AI voices per play with fixed voice assignments

-- Table 1: play_voice_config
-- Stores voice assignments per character for a given source (library script, private script, or troupe play)
CREATE TABLE IF NOT EXISTS public.play_voice_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('library_script', 'private_script', 'troupe_play')),
    source_id UUID NOT NULL,
    character_name TEXT NOT NULL,
    voice TEXT NOT NULL CHECK (voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    troupe_id UUID REFERENCES public.troupes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint: one voice per character per source
    UNIQUE (source_type, source_id, character_name)
);

-- Table 2: play_audio_cache
-- Stores generated audio files linked to voice configs
CREATE TABLE IF NOT EXISTS public.play_audio_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id UUID REFERENCES public.play_voice_config(id) ON DELETE CASCADE NOT NULL,
    line_index INTEGER NOT NULL,
    text_hash TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint: one audio per line per config
    UNIQUE (config_id, line_index)
);

-- Enable RLS
ALTER TABLE public.play_voice_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_audio_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for play_voice_config

-- Everyone can read library configs
CREATE POLICY "read_library_voice_config" ON public.play_voice_config
FOR SELECT USING (source_type = 'library_script');

-- Users can read their own private configs
CREATE POLICY "read_own_private_voice_config" ON public.play_voice_config
FOR SELECT USING (
    source_type = 'private_script' 
    AND created_by = auth.uid()
);

-- Troupe members can read troupe configs
CREATE POLICY "read_troupe_voice_config" ON public.play_voice_config
FOR SELECT USING (
    source_type = 'troupe_play' 
    AND troupe_id IN (
        SELECT troupe_id FROM public.troupe_members WHERE user_id = auth.uid()
    )
);

-- Authenticated users can insert (first to play creates the config)
CREATE POLICY "insert_voice_config" ON public.play_voice_config
FOR INSERT TO authenticated
WITH CHECK (true);

-- RLS Policies for play_audio_cache

-- Anyone can read audio cache (follows config visibility)
CREATE POLICY "read_audio_cache" ON public.play_audio_cache
FOR SELECT USING (
    config_id IN (SELECT id FROM public.play_voice_config)
);

-- Authenticated users can insert audio cache entries
CREATE POLICY "insert_audio_cache" ON public.play_audio_cache
FOR INSERT TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_config_source ON public.play_voice_config(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_voice_config_troupe ON public.play_voice_config(troupe_id) WHERE troupe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audio_cache_config ON public.play_audio_cache(config_id);
CREATE INDEX IF NOT EXISTS idx_audio_cache_hash ON public.play_audio_cache(text_hash);

-- Add helpful comments
COMMENT ON TABLE public.play_voice_config IS 'Stores AI voice assignments per character per play source';
COMMENT ON TABLE public.play_audio_cache IS 'Caches generated AI audio files linked to voice configurations';
