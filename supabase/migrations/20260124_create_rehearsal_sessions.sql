-- Migration: Create Rehearsal Sessions Table for Stats
-- Decoupled from feedback, allowing automatic tracking of all sessions.

create table public.rehearsal_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  script_id uuid references public.scripts(id) on delete set null, -- Keep stats if script is deleted
  script_title text, -- Snapshot of title
  character_name text, -- Snapshot of character(s)
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  duration_seconds integer,
  lines_total integer,
  lines_rehearsed integer,
  completion_percentage integer,
  mode text, -- 'solo_premium', 'solo_free', 'troupe', etc.
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.rehearsal_sessions enable row level security;

-- Policies
create policy "Users can view their own sessions"
  on public.rehearsal_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.rehearsal_sessions for insert
  with check (auth.uid() = user_id);

-- Optional: Index on user_id for faster dashboard queries
create index idx_rehearsal_sessions_user_id on public.rehearsal_sessions(user_id);
create index idx_rehearsal_sessions_script_id on public.rehearsal_sessions(script_id);
