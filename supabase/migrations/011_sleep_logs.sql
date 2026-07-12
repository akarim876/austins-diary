-- 011: Sleep logs
--
-- log_date is the date the *night* started (e.g. July 9 covers the Jul 9 → Jul 10 sleep).
-- bedtime and wake_time are nullable so an entry can be saved as a draft —
-- e.g. log bedtime at night, complete wake_time the next morning.
-- total_sleep_minutes is stored redundantly for easy querying but should always be
-- derived from bedtime/wake_time (crossing midnight is assumed when wake < bed).
-- night_wakings_detail and naps are JSONB arrays for flexibility without extra tables.

create table if not exists public.sleep_logs (
  id                    uuid        primary key default uuid_generate_v4(),
  profile_id            uuid        not null references public.child_profiles(id) on delete cascade,
  author_id             uuid        not null references auth.users(id),
  log_date              date        not null,

  -- sleep window (both nullable for draft support)
  bedtime               time        without time zone,
  wake_time             time        without time zone,
  total_sleep_minutes   integer,

  -- night wakings
  night_wakings_count   integer     not null default 0,
  -- [{duration_minutes: number|null, cause: string, cause_other?: string}]
  night_wakings_detail  jsonb       not null default '[]'::jsonb,

  -- quality: 1=Very poor … 5=Very good
  sleep_quality         smallint    check (sleep_quality between 1 and 5),

  -- naps
  nap_enabled           boolean     not null default false,
  -- [{start_time: string|null, end_time: string|null}]
  naps                  jsonb       not null default '[]'::jsonb,

  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- one sleep log per night per profile
  unique (profile_id, log_date)
);

create trigger sleep_logs_updated_at
  before update on public.sleep_logs
  for each row execute function public.set_updated_at();

alter table public.sleep_logs enable row level security;

create policy "sleep_logs: profile members can select"
  on public.sleep_logs for select
  using (
    exists (
      select 1 from public.profile_access
      where profile_id = sleep_logs.profile_id
        and user_id    = auth.uid()
    )
  );

create policy "sleep_logs: editors/owners can insert"
  on public.sleep_logs for insert
  with check (
    exists (
      select 1 from public.profile_access
      where profile_id = sleep_logs.profile_id
        and user_id    = auth.uid()
        and role in ('owner', 'editor')
    )
  );

create policy "sleep_logs: editors/owners can update"
  on public.sleep_logs for update
  using (
    exists (
      select 1 from public.profile_access
      where profile_id = sleep_logs.profile_id
        and user_id    = auth.uid()
        and role in ('owner', 'editor')
    )
  );

create policy "sleep_logs: editors/owners can delete"
  on public.sleep_logs for delete
  using (
    exists (
      select 1 from public.profile_access
      where profile_id = sleep_logs.profile_id
        and user_id    = auth.uid()
        and role in ('owner', 'editor')
    )
  );
