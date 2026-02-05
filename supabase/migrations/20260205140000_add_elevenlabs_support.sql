-- Migration: Add ElevenLabs Support
-- Goal: meaningful diversity of voices by supporting external providers

-- 1. Remove the restrictive check constraint on 'voice' column
-- We need to check the constraint name, usually table_column_check
ALTER TABLE public.play_voice_config 
DROP CONSTRAINT IF EXISTS play_voice_config_voice_check;

-- 2. Add 'provider' column to distinguish services
-- enum: 'openai', 'elevenlabs', 'browser' (future?)
ALTER TABLE public.play_voice_config
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'openai';

-- 3. Add 'settings' column for provider-specific tweaking
-- e.g. { "stability": 0.5, "similarity_boost": 0.7, "style": 0.2 } for ElevenLabs
-- e.g. { "emotion": "angry" } for our AI Director
ALTER TABLE public.play_voice_config
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
