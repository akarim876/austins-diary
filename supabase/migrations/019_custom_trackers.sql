-- Custom Trackers — per-child-profile tracker definitions and logs.
-- Shared across all caregivers for the same child profile.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.custom_trackers (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.child_profiles(id) on delete cascade,
  name         text not null,
  icon_name    text not null default 'star',
  color        text not null default '#5B7B7A',
  tracker_type text not null check (tracker_type in ('duration','counter','yes_no','rating')),
  archived     boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.custom_tracker_logs (
  id               uuid primary key default gen_random_uuid(),
  tracker_id       uuid not null references public.custom_trackers(id) on delete cascade,
  profile_id       uuid not null references public.child_profiles(id) on delete cascade,
  author_id        uuid not null references auth.users(id),
  entry_date       date not null default current_date,
  duration_minutes integer,
  started_at       timestamptz,
  ended_at         timestamptz,
  counter_value    integer,
  yes_no_value     boolean,
  rating_value     integer check (rating_value between 1 and 5),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.custom_trackers     enable row level security;
alter table public.custom_tracker_logs enable row level security;

-- custom_trackers: all caregivers can view; editors/owners can write
create policy "members view trackers"
  on public.custom_trackers for select
  using (
    exists (
      select 1 from public.profile_access
       where profile_id = custom_trackers.profile_id
         and user_id = auth.uid()
    )
  );

create policy "editors manage trackers"
  on public.custom_trackers for all
  using (
    exists (
      select 1 from public.profile_access
       where profile_id = custom_trackers.profile_id
         and user_id = auth.uid()
         and role in ('owner','editor')
    )
  );

-- custom_tracker_logs: all caregivers can view; editors/owners can write
create policy "members view tracker logs"
  on public.custom_tracker_logs for select
  using (
    exists (
      select 1 from public.profile_access
       where profile_id = custom_tracker_logs.profile_id
         and user_id = auth.uid()
    )
  );

create policy "editors insert tracker logs"
  on public.custom_tracker_logs for insert
  with check (
    exists (
      select 1 from public.profile_access
       where profile_id = custom_tracker_logs.profile_id
         and user_id = auth.uid()
         and role in ('owner','editor')
    )
  );

create policy "editors update tracker logs"
  on public.custom_tracker_logs for update
  using (
    exists (
      select 1 from public.profile_access
       where profile_id = custom_tracker_logs.profile_id
         and user_id = auth.uid()
         and role in ('owner','editor')
    )
  );

create policy "editors delete tracker logs"
  on public.custom_tracker_logs for delete
  using (
    exists (
      select 1 from public.profile_access
       where profile_id = custom_tracker_logs.profile_id
         and user_id = auth.uid()
         and role in ('owner','editor')
    )
  );
