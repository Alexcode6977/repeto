-- Migration: Fix Audio Cache Constraint for Mixed-Voice TTS
-- Reason: A character can speak multiple times in the same line (interrupted by narration),
-- so (config_id, line_index) is not unique enough. We must include text_hash.

-- 1. Drop old constraint
ALTER TABLE public.play_audio_cache 
DROP CONSTRAINT IF EXISTS play_audio_cache_config_id_line_index_key;

-- 2. Add new constraint including text_hash
ALTER TABLE public.play_audio_cache
ADD CONSTRAINT play_audio_cache_config_id_line_index_text_hash_key 
UNIQUE (config_id, line_index, text_hash);
