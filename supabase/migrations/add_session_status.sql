-- Migration: Add status to session_plans for workflow management

alter table public.session_plans
add column if not exists status text check (status in ('draft', 'published')) default 'draft';

-- Optional: Add published_at timestamp
alter table public.session_plans
add column if not exists published_at timestamp with time zone;
