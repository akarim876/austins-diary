-- 020: Fix child_profiles DELETE policy
--
-- The original policy used a raw subquery on profile_access which is itself
-- subject to profile_access RLS, causing silent 0-row deletes for owners.
-- Replace it with is_profile_owner() (SECURITY DEFINER) which bypasses RLS.

drop policy if exists "Owners can delete profiles" on public.child_profiles;

create policy "Owners can delete profiles"
  on public.child_profiles for delete
  using (public.is_profile_owner(id));
