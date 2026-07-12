-- Daily Schedule feature
-- Two tables: template items (the planned routine) + daily entries (each day's snapshot)

-- ── Schedule template ───────────────────────────────────────────────────────

create table if not exists schedule_template_items (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null references child_profiles(id) on delete cascade,
  label       text        not null,
  time_of_day text,       -- 'HH:MM' 24 h, nullable
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table schedule_template_items enable row level security;

create policy "Members read schedule_template_items"
  on schedule_template_items for select
  using (exists(
    select 1 from profile_access
    where profile_id = schedule_template_items.profile_id and user_id = auth.uid()
  ));

create policy "Editors insert schedule_template_items"
  on schedule_template_items for insert
  with check (exists(
    select 1 from profile_access
    where profile_id = schedule_template_items.profile_id and user_id = auth.uid()
      and role in ('owner','editor')
  ));

create policy "Editors update schedule_template_items"
  on schedule_template_items for update
  using (exists(
    select 1 from profile_access
    where profile_id = schedule_template_items.profile_id and user_id = auth.uid()
      and role in ('owner','editor')
  ));

create policy "Editors delete schedule_template_items"
  on schedule_template_items for delete
  using (exists(
    select 1 from profile_access
    where profile_id = schedule_template_items.profile_id and user_id = auth.uid()
      and role in ('owner','editor')
  ));

-- ── Daily entries ───────────────────────────────────────────────────────────
-- Created on-demand when a caregiver changes an item's status for the day.
-- template_item_id links back to the template; label/time are copied at insert time
-- so historical records survive template edits.

create table if not exists daily_schedule_entries (
  id                uuid        primary key default gen_random_uuid(),
  profile_id        uuid        not null references child_profiles(id) on delete cascade,
  schedule_date     date        not null,
  template_item_id  uuid        references schedule_template_items(id) on delete set null,
  label             text        not null,
  time_of_day       text,
  sort_order        int         not null default 0,
  status            text        not null default 'not_yet'
                                  check (status in ('not_yet','done','skipped','changed')),
  deviation_reason  text        check (deviation_reason in ('ran_late','skipped','changed_activity','other')),
  deviation_note    text,
  author_id         uuid        references auth.users(id),
  updated_at        timestamptz not null default now(),
  unique (profile_id, schedule_date, template_item_id)
);

alter table daily_schedule_entries enable row level security;

create policy "Members read daily_schedule_entries"
  on daily_schedule_entries for select
  using (exists(
    select 1 from profile_access
    where profile_id = daily_schedule_entries.profile_id and user_id = auth.uid()
  ));

create policy "Editors insert daily_schedule_entries"
  on daily_schedule_entries for insert
  with check (exists(
    select 1 from profile_access
    where profile_id = daily_schedule_entries.profile_id and user_id = auth.uid()
      and role in ('owner','editor')
  ));

create policy "Editors update daily_schedule_entries"
  on daily_schedule_entries for update
  using (exists(
    select 1 from profile_access
    where profile_id = daily_schedule_entries.profile_id and user_id = auth.uid()
      and role in ('owner','editor')
  ));

-- ── Behavior log linkage ────────────────────────────────────────────────────
-- Lets a Behavior Log entry reference the schedule item that deviated,
-- when antecedent = 'schedule change'.

alter table behavior_logs
  add column if not exists schedule_item_id uuid
    references daily_schedule_entries(id) on delete set null;
