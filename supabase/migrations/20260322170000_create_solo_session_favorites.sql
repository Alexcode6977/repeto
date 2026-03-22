create table public.solo_session_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  launch_mode text not null,
  character_name text not null,
  ignored_characters text[] not null default '{}'::text[],
  show_stage_directions boolean not null default true,
  preset jsonb not null,
  fingerprint text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_used_at timestamp with time zone,
  constraint solo_session_favorites_launch_mode_check
    check (launch_mode in ('reader', 'listen', 'rehearsal')),
  constraint solo_session_favorites_preset_object_check
    check (jsonb_typeof(preset) = 'object'),
  constraint solo_session_favorites_user_fingerprint_unique
    unique (user_id, fingerprint)
);

alter table public.solo_session_favorites enable row level security;

create policy "Users can view their own solo favorites"
  on public.solo_session_favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own solo favorites"
  on public.solo_session_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own solo favorites"
  on public.solo_session_favorites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own solo favorites"
  on public.solo_session_favorites for delete
  using (auth.uid() = user_id);

create index idx_solo_session_favorites_user_id
  on public.solo_session_favorites(user_id);

create index idx_solo_session_favorites_script_id
  on public.solo_session_favorites(script_id);

create index idx_solo_session_favorites_user_recent
  on public.solo_session_favorites(user_id, (coalesce(last_used_at, created_at)) desc);
