-- 013: Goals & Progress tracking
--
-- goals:          the target itself, created/edited less frequently.
-- progress_notes: quick-log entries against a goal; the frequent action.
--
-- Role rules (follow same pattern as other log tables):
--   Owner  → full control on all goals/notes for profiles they own.
--   Editor → can create goals/notes; can edit/delete their own goals anytime
--            (no "today only" restriction — goals are planning docs, not
--            momentary observations); can edit/delete their own progress
--            notes only from today (same rule as other event logs).
--   Viewer → read-only.

-- ─────────────────────────────────────────────────────────────────────────────
-- goals
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          uuid        primary key default uuid_generate_v4(),
  profile_id  uuid        not null references public.child_profiles(id) on delete cascade,
  author_id   uuid        not null references auth.users(id),
  title       text        not null,
  source      text        not null,
  description text        not null default '',
  status      text        not null default 'active',
  start_date  date        not null default current_date,
  target_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint goals_source_check check (source in ('IEP','ABA','OT','Speech','Behavior Plan','Other')),
  constraint goals_status_check check (status in ('active','on_hold','achieved','discontinued'))
);

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "goals: members can select"
  on public.goals for select
  using (public.user_can_access_profile(profile_id));

create policy "goals: editors/owners can insert"
  on public.goals for insert
  with check (
    author_id = auth.uid()
    and public.is_profile_editor_or_owner(profile_id)
  );

-- Editors can update/delete their own goals at any time (no date restriction).
create policy "goals: role-based update"
  on public.goals for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and public.is_profile_editor(profile_id)
    )
  );

create policy "goals: role-based delete"
  on public.goals for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and public.is_profile_editor(profile_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- progress_notes
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.progress_notes (
  id          uuid        primary key default uuid_generate_v4(),
  profile_id  uuid        not null references public.child_profiles(id) on delete cascade,
  goal_id     uuid        not null references public.goals(id) on delete cascade,
  author_id   uuid        not null references auth.users(id),
  note_date   date        not null default current_date,
  rating      text        not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint progress_notes_rating_check check (
    rating in ('regression','no_change','slight_progress','good_progress','goal_met')
  )
);

create trigger progress_notes_updated_at
  before update on public.progress_notes
  for each row execute function public.set_updated_at();

alter table public.progress_notes enable row level security;

create policy "progress_notes: members can select"
  on public.progress_notes for select
  using (public.user_can_access_profile(profile_id));

create policy "progress_notes: editors/owners can insert"
  on public.progress_notes for insert
  with check (
    author_id = auth.uid()
    and public.is_profile_editor_or_owner(profile_id)
  );

-- Today-only rule for editors (same as other event logs).
create policy "progress_notes: role-based update"
  on public.progress_notes for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id  = auth.uid()
      and note_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );

create policy "progress_notes: role-based delete"
  on public.progress_notes for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id  = auth.uid()
      and note_date = current_date
      and public.is_profile_editor(profile_id)
    )
  );
