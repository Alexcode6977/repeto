-- Add context column to session_raw_notes for storing metadata like line text and character name
ALTER TABLE session_raw_notes ADD COLUMN IF NOT EXISTS context JSONB;
