-- Migration: Create Troupe Join Requests Table

create table public.troupe_join_requests (
  id uuid primary key default gen_random_uuid(),
  troupe_id uuid references public.troupes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(troupe_id, user_id)
);

-- Enable RLS
alter table public.troupe_join_requests enable row level security;

-- Policies
create policy "Users can view their own requests"
  on public.troupe_join_requests for select
  using (auth.uid() = user_id);

create policy "Admins can view and manage requests for their troupes"
  on public.troupe_join_requests for all
  using (
    exists (
      select 1 from public.troupe_members
      where troupe_members.troupe_id = troupe_join_requests.troupe_id
      and troupe_members.user_id = auth.uid()
      and troupe_members.role = 'admin'
    )
  );

-- Also allow users to delete their own request (cancel)
create policy "Users can cancel their own requests"
  on public.troupe_join_requests for delete
  using (auth.uid() = user_id);

-- Allow anyone to insert a request if they have the code (handled by app logic but policy is check)
create policy "Anyone can create a join request"
  on public.troupe_join_requests for insert
  with check (auth.uid() = user_id);
