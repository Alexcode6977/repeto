-- Create the audio_cache table
create table if not exists public.audio_cache (
  id uuid default gen_random_uuid() primary key,
  text_hash text not null unique,
  audio_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_accessed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb
);

-- Enable RLS (although we primarily use this server-side)
alter table public.audio_cache enable row level security;

-- Policy: Allow public read access to the cache (optional, mostly for debugging or client-side checks if ever needed)
-- For now, we'll keep it restricted to service_role mostly, but maybe allow authenticated users to read.
create policy "Allow authenticated users to read audio cache"
on public.audio_cache for select
to authenticated
using (true);

-- Policy: Only service role can insert/update (handled by server actions)
-- No explicit policy needed for service_role as it bypasses RLS, but we ensure no public write access.


-- Storage Bucket Setup
-- We need to create a bucket for audio files if it doesn't exist.
-- Note: Creating buckets via SQL is specific to Supabase's storage schema.

insert into storage.buckets (id, name, public)
values ('audio-cache', 'audio-cache', true)
on conflict (id) do nothing;

-- Storage Policies
-- 1. Allow public read access to the audio-cache bucket
create policy "Give public access to audio-cache"
on storage.objects for select
using ( bucket_id = 'audio-cache' );

-- 2. Allow authenticated users (server actions essentially acting as user or service) to upload?
-- Ideally, uploads happen via Server Action which uses the Supabase Admin/Service Key or the User's context.
-- If we use the standard client in Server Action, it acts as the user.
-- So we need to allow authenticated users to upload to this bucket.
create policy "Allow authenticated uploads to audio-cache"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'audio-cache' );

-- 3. Allow updates/overwrites? (Generally we don't need this if hashes are unique, but just in case)
create policy "Allow authenticated updates to audio-cache"
on storage.objects for update
to authenticated
using ( bucket_id = 'audio-cache' );
