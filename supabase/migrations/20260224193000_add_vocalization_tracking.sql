-- Add vocalization tracking columns to scripts table
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS vocalization_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS vocalization_progress integer DEFAULT 0;

-- Create the audio_cache storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio_cache', 'audio_cache', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the audio_cache bucket
CREATE POLICY "Audio cache is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio_cache');

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio_cache');

CREATE POLICY "Authenticated users can update audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio_cache');
