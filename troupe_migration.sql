-- Migration: Create Troupe Mode Tables

-- 1. Troupes Table
create table public.troupes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text unique not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default now()
);

-- 2. Troupe Members Table
create table public.troupe_members (
  troupe_id uuid references public.troupes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null, -- Links to profiles (public view of users)
  role text check (role in ('admin', 'member')) default 'member',
  joined_at timestamp with time zone default now(),
  primary key (troupe_id, user_id)
);

-- 3. Plays Table (Specific to a Troupe)
create table public.plays (
  id uuid primary key default gen_random_uuid(),
  troupe_id uuid references public.troupes(id) on delete cascade not null,
  title text not null,
  description text,
  pdf_url text, -- URL to the script PDF
  script_content jsonb, -- Stores the parsed script (lines, chars, scenes) from the PDF
  created_at timestamp with time zone default now()
);

-- 4. Play Characters
create table public.play_characters (
  id uuid primary key default gen_random_uuid(),
  play_id uuid references public.plays(id) on delete cascade not null,
  name text not null,
  actor_id uuid references public.profiles(id) on delete set null, -- Optional casting
  description text
);

-- 5. Play Scenes
create table public.play_scenes (
  id uuid primary key default gen_random_uuid(),
  play_id uuid references public.plays(id) on delete cascade not null,
  title text not null, -- e.g. "Acte 1, Scène 2"
  order_index integer not null default 0
);

-- 6. Scene Characters (Junction: Who is in this scene?)
create table public.scene_characters (
  scene_id uuid references public.play_scenes(id) on delete cascade not null,
  character_id uuid references public.play_characters(id) on delete cascade not null,
  primary key (scene_id, character_id)
);

-- 7. Events (Calendar / Rehearsals)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  troupe_id uuid references public.troupes(id) on delete cascade not null,
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  type text check (type in ('rehearsal', 'performance', 'other')) default 'rehearsal',
  play_id uuid references public.plays(id) on delete set null, -- Optional link to a specific play
  created_at timestamp with time zone default now()
);

-- 8. Event Attendance
create table public.event_attendance (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('present', 'absent', 'unknown')) default 'unknown',
  primary key (event_id, user_id)
);

-- Enable RLS (Row Level Security)
alter table public.troupes enable row level security;
alter table public.troupe_members enable row level security;
alter table public.plays enable row level security;
alter table public.play_characters enable row level security;
alter table public.play_scenes enable row level security;
alter table public.scene_characters enable row level security;
alter table public.events enable row level security;
alter table public.event_attendance enable row level security;

-- Policies (Simple initial policies)

-- Troupes: Visible if you are a member
create policy "Troupes are visible to members"
  on public.troupes for select
  using (
    exists (
      select 1 from public.troupe_members
      where troupe_members.troupe_id = troupes.id
      and troupe_members.user_id = auth.uid()
    )
  );

-- Troupes: Insert allowed by anyone (Creator becomes admin via trigger or app logic)
create policy "Anyone can create a troupe"
  on public.troupes for insert
  with check (auth.uid() = created_by);

-- Play/Events/Members: Visible if user is in the troupe
create policy "Members can view troupe data"
  on public.troupe_members for select
  using (
    troupe_id in (
      select troupe_id from public.troupe_members where user_id = auth.uid()
    )
  );

-- (Simplified policies for now, will refine later)
create policy "Public access to join invites"
  on public.troupes for select
  using (true); -- Ideally restrict to just by join_code lookup
