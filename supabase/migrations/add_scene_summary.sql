-- Migration to add summary column to play_scenes
ALTER TABLE play_scenes ADD COLUMN IF NOT EXISTS summary TEXT;
