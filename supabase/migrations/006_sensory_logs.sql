-- 006: Sensory & Regulation logs
-- Tracks sensory state, triggers, and calming strategies.
-- Optionally linked to a behavior_log entry via behavior_log_id.

create table public.sensory_logs (
  id                      uuid primary key default uuid_generate_v4(),
  profile_id              uuid not null references public.child_profiles(id) on delete cascade,
  author_id               uuid not null references auth.users(id) on delete cascade,

  entry_date              date        not null,
  time_of_day             time        not null,
  location                text        not null default '',

  -- Regulation state
  regulation_level        text        not null
    check (regulation_level in ('calm', 'alert', 'anxious', 'dysregulated', 'shutdown')),

  -- Sensory triggers (multi-select stored as array)
  sensory_triggers        text[]      not null default '{}',
  sensory_triggers_other  text        not null default '',

  -- Calming strategies (multi-select stored as array)
  calming_strategies      text[]      not null default '{}',
  calming_strategies_other text       not null default '',

  helped                  text        not null default 'somewhat'
    check (helped in ('yes', 'somewhat', 'no')),

  duration_mins           smallint,
  notes                   text        not null default '',

  -- Optional link to a behavior log from the same day
  behavior_log_id         uuid references public.behavior_logs(id) on delete set null,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.sensory_logs enable row level security;

create policy "Users can view sensory logs for accessible profiles"
  on public.sensory_logs for select
  using (public.user_can_access_profile(profile_id));

create policy "Editors and owners can insert sensory logs"
  on public.sensory_logs for insert
  with check (
    author_id = auth.uid()
    and public.user_can_access_profile(profile_id)
  );

create policy "Authors can update their sensory logs"
  on public.sensory_logs for update
  using (author_id = auth.uid());

create policy "Authors and owners can delete sensory logs"
  on public.sensory_logs for delete
  using (
    author_id = auth.uid()
    or public.is_profile_owner(profile_id)
  );

create trigger sensory_logs_updated_at
  before update on public.sensory_logs
  for each row execute function public.set_updated_at();
