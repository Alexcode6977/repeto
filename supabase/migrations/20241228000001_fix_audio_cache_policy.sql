-- Fix: Allow authenticated users to insert into audio_cache
-- This is necessary so that when a user generates a new audio, their action can save it to the cache.

create policy "Allow authenticated users to insert into audio_cache"
on public.audio_cache for insert
to authenticated
with check (true);
