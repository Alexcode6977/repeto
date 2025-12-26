-- Migration to support user voice recordings for play lines

-- 1. Create the recordings table
CREATE TABLE IF NOT EXISTS play_line_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_id UUID NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
    character_name TEXT NOT NULL,
    line_id TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure one recording per line per character (or maybe per user?)
    -- Let's say one recording per line_id for now, to keep it simple.
    -- If multiple people record the same line, the last one wins or we could allow multiple.
    -- For now: Unique per (play_id, line_id, user_id)
    UNIQUE(play_id, line_id, user_id)
);

-- 2. Set up RLS for the table
ALTER TABLE play_line_recordings ENABLE ROW LEVEL SECURITY;

-- Policy: Members of the troupe can read recordings
DROP POLICY IF EXISTS "Troupe members can read recordings" ON play_line_recordings;
CREATE POLICY "Troupe members can read recordings" ON play_line_recordings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM plays p
        JOIN troupe_members tm ON tm.troupe_id = p.troupe_id
        WHERE p.id = play_line_recordings.play_id
        AND tm.user_id = auth.uid()
    )
);

-- Policy: Users can insert their own recordings
DROP POLICY IF EXISTS "Users can insert their own recordings" ON play_line_recordings;
CREATE POLICY "Users can insert their own recordings" ON play_line_recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own recordings
DROP POLICY IF EXISTS "Users can delete their own recordings" ON play_line_recordings;
CREATE POLICY "Users can delete their own recordings" ON play_line_recordings
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Storage bucket setup (Manual instruction)
-- Note: Create the bucket 'play-recordings' in the dashboard first.
-- Then run these policies to allow uploads:

INSERT INTO storage.buckets (id, name, public)
VALUES ('play-recordings', 'play-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload recordings to their own folder
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'play-recordings' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to update their own recordings
DROP POLICY IF EXISTS "Allow individual updates" ON storage.objects;
CREATE POLICY "Allow individual updates" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'play-recordings' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own recordings
DROP POLICY IF EXISTS "Allow individual deletes" ON storage.objects;
CREATE POLICY "Allow individual deletes" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'play-recordings' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public read access
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'play-recordings');

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_recordings_play_line ON play_line_recordings(play_id, line_id);
