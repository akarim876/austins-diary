-- 005: Invite system + caregiver status display
--
-- 1. Add email column to profile_access (for display without joining auth.users)
-- 2. Create profile_invites table (pending invites by email)
-- 3. Add accept_pending_invites() function (called client-side on sign-in)

-- ─────────────────────────────────────────────────────
-- 1. Add email column to profile_access
-- ─────────────────────────────────────────────────────
alter table public.profile_access
  add column if not exists email text;

-- ─────────────────────────────────────────────────────
-- 2. profile_invites — pending invites by email address
-- ─────────────────────────────────────────────────────
create table public.profile_invites (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.child_profiles(id) on delete cascade,
  invited_by  uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('editor', 'viewer')),
  invited_at  timestamptz not null default now(),
  unique (profile_id, email)
);

alter table public.profile_invites enable row level security;

-- Owners can do everything with invites for their profiles
create policy "Owners can manage invites"
  on public.profile_invites for all
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

-- Invited users can see their own pending invites (so the client can accept them)
create policy "Invitees can view their own invites"
  on public.profile_invites for select
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- ─────────────────────────────────────────────────────
-- 3. accept_pending_invites()
--    Grants profile_access for all pending invites matching
--    the signed-in user's email, then clears those invite rows.
--    Call this RPC from the client after every sign-in.
-- ─────────────────────────────────────────────────────
create or replace function public.accept_pending_invites()
returns void
language plpgsql
security definer
as $$
begin
  -- Insert access rows for every pending invite matching this user's email
  insert into public.profile_access (profile_id, user_id, email, role)
  select
    pi.profile_id,
    auth.uid(),
    pi.email,
    pi.role
  from public.profile_invites pi
  where lower(pi.email) = lower(auth.jwt() ->> 'email')
  on conflict (profile_id, user_id) do nothing;

  -- Delete the accepted invite rows
  delete from public.profile_invites
  where lower(email) = lower(auth.jwt() ->> 'email');
end;
$$;
