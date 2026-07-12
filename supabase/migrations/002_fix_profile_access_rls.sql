-- Fix: infinite recursion in profile_access RLS policy.
--
-- The original "Owners can manage access" policy queried profile_access from
-- inside a policy ON profile_access, causing infinite recursion. Replace it
-- with a SECURITY DEFINER function that bypasses RLS when doing the check.

-- 1. Helper function (runs as postgres superuser, bypasses RLS)
create or replace function public.is_profile_owner(p_profile_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profile_access
    where profile_id = p_profile_id
      and user_id    = auth.uid()
      and role       = 'owner'
  );
$$;

-- 2. Drop the recursive policy
drop policy if exists "Owners can manage access" on public.profile_access;

-- 3. Replace with non-recursive versions using the helper function
create policy "Owners can select all access rows for their profiles"
  on public.profile_access for select
  using (
    user_id = auth.uid()               -- own row always visible
    or public.is_profile_owner(profile_id)  -- owners see everyone
  );

create policy "Owners can insert access rows for their profiles"
  on public.profile_access for insert
  with check (
    user_id = auth.uid()               -- inserting own first row (bootstrap)
    or public.is_profile_owner(profile_id)  -- owners can invite others
  );

create policy "Owners can update access rows for their profiles"
  on public.profile_access for update
  using (public.is_profile_owner(profile_id));

create policy "Owners can delete access rows for their profiles"
  on public.profile_access for delete
  using (public.is_profile_owner(profile_id));

-- Also drop the old insert-only policy (now replaced by the ones above)
drop policy if exists "Users can insert their own access on new profiles" on public.profile_access;
drop policy if exists "Users can view their own access records" on public.profile_access;
