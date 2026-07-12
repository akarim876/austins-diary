-- Behavior Logs table
-- Tracks individual incidents using ABC (Antecedent–Behavior–Consequence) model.

create table public.behavior_logs (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid not null references public.child_profiles(id) on delete cascade,
  author_id       uuid not null references auth.users(id) on delete cascade,

  entry_date      date        not null,
  time_of_day     time        not null,
  location        text        not null default '',

  -- A — Antecedent
  antecedent      text        not null,
  antecedent_note text        not null default '',

  -- B — Behavior
  behavior        text        not null,
  severity        smallint    not null check (severity between 1 and 5),
  duration_mins   smallint,

  -- C — Consequence / Response
  consequence     text        not null default '',
  helped          text        not null check (helped in ('yes', 'somewhat', 'no')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.behavior_logs enable row level security;

-- RLS: same access model as diary_entries (gated through profile_access)

create policy "Users can view behavior logs for accessible profiles"
  on public.behavior_logs for select
  using (public.user_can_access_profile(profile_id));

create policy "Editors and owners can insert behavior logs"
  on public.behavior_logs for insert
  with check (
    author_id = auth.uid()
    and public.user_can_access_profile(profile_id)
  );

create policy "Authors can update their behavior logs"
  on public.behavior_logs for update
  using (author_id = auth.uid());

create policy "Authors and owners can delete behavior logs"
  on public.behavior_logs for delete
  using (
    author_id = auth.uid()
    or public.is_profile_owner(profile_id)
  );

-- Auto-update updated_at
create trigger behavior_logs_updated_at
  before update on public.behavior_logs
  for each row execute function public.set_updated_at();
