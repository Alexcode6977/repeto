-- Remove overly permissive troupe visibility policy.
drop policy if exists "Public access to join invites" on public.troupes;
