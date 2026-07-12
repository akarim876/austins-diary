-- 012: Role-based permission enforcement
--
-- Rules:
--   Owner  — full read/write/delete on ALL entries for any profile they own.
--            Can also promote/demote other caregivers (including to owner).
--   Editor — can INSERT new entries at any time.
--            Can UPDATE / DELETE only their OWN entries created TODAY.
--            (Sleep logs get a 1-day grace so a draft started at bedtime can
--             be completed the following morning.)
--   Viewer — SELECT only. No INSERT / UPDATE / DELETE.
--
-- This migration drops the old permissive UPDATE/DELETE policies and replaces
-- them. It also fixes INSERT policies that accidentally let viewers write data
-- (they used user_can_access_profile() which checks ANY role, not editor+).

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: is the caller an editor (not owner) for this profile?
-- SECURITY DEFINER so it can read profile_access without recursion.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_profile_editor(p_profile_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.profile_access
    where profile_id = p_profile_id
      and user_id    = auth.uid()
      and role       = 'editor'
  );
$$;

create or replace function public.is_profile_editor_or_owner(p_profile_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.profile_access
    where profile_id = p_profile_id
      and user_id    = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- diary_entries
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Authors can update their entries"           on public.diary_entries;
drop policy if exists "Authors and owners can delete entries"      on public.diary_entries;

create policy "diary_entries: role-based update"
  on public.diary_entries for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

create policy "diary_entries: role-based delete"
  on public.diary_entries for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- behavior_logs
-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: original INSERT used user_can_access_profile (allows viewers). Replace.
drop policy if exists "Editors and owners can insert behavior logs" on public.behavior_logs;
drop policy if exists "Authors can update their behavior logs"      on public.behavior_logs;
drop policy if exists "Authors and owners can delete behavior logs" on public.behavior_logs;

create policy "behavior_logs: editors/owners can insert"
  on public.behavior_logs for insert
  with check (
    author_id = auth.uid()
    and public.is_profile_editor_or_owner(profile_id)
  );

create policy "behavior_logs: role-based update"
  on public.behavior_logs for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

create policy "behavior_logs: role-based delete"
  on public.behavior_logs for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- sensory_logs
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Editors and owners can insert sensory logs" on public.sensory_logs;
drop policy if exists "Authors can update their sensory logs"      on public.sensory_logs;
drop policy if exists "Authors and owners can delete sensory logs" on public.sensory_logs;

create policy "sensory_logs: editors/owners can insert"
  on public.sensory_logs for insert
  with check (
    author_id = auth.uid()
    and public.is_profile_editor_or_owner(profile_id)
  );

create policy "sensory_logs: role-based update"
  on public.sensory_logs for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

create policy "sensory_logs: role-based delete"
  on public.sensory_logs for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- diet_logs
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Editors and owners can insert diet logs" on public.diet_logs;
drop policy if exists "Authors can update their diet logs"      on public.diet_logs;
drop policy if exists "Authors and owners can delete diet logs" on public.diet_logs;

create policy "diet_logs: editors/owners can insert"
  on public.diet_logs for insert
  with check (
    author_id = auth.uid()
    and public.is_profile_editor_or_owner(profile_id)
  );

create policy "diet_logs: role-based update"
  on public.diet_logs for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

create policy "diet_logs: role-based delete"
  on public.diet_logs for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id   = auth.uid()
      and entry_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- diet_settings (fix: viewer INSERT/UPDATE leak)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Editors and owners can upsert diet settings"  on public.diet_settings;
drop policy if exists "Editors and owners can update diet settings"   on public.diet_settings;

create policy "diet_settings: editors/owners can upsert"
  on public.diet_settings for insert
  with check (public.is_profile_editor_or_owner(profile_id));

create policy "diet_settings: editors/owners can update"
  on public.diet_settings for update
  using (public.is_profile_editor_or_owner(profile_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- sleep_logs
-- Sleep logs get a 1-day grace period for editors so a bedtime draft logged
-- at night can be completed the next morning (the main design use-case).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "sleep_logs: editors/owners can update" on public.sleep_logs;
drop policy if exists "sleep_logs: editors/owners can delete" on public.sleep_logs;

create policy "sleep_logs: role-based update"
  on public.sleep_logs for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and log_date >= current_date - 1   -- today OR yesterday (draft completion)
      and public.is_profile_editor(profile_id)
    )
  );

create policy "sleep_logs: role-based delete"
  on public.sleep_logs for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and log_date >= current_date - 1
      and public.is_profile_editor(profile_id)
    )
  );
