-- Add avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Instructions for the user:
-- 1. Create a storage bucket named 'avatars' in the Supabase Dashboard.
-- 2. Make it public (so users can see each other's avatars).
-- 3. Add these RLS policies to the 'avatars' bucket:

/*
-- Policy 1: Allow anyone to view avatars
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Policy 2: Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
*/
