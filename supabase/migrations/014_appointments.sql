-- 014: Appointments & Providers
--
-- providers:    contact records for healthcare / school providers. Created less often.
-- appointments: calendar events linked to a provider. The frequent action.
--
-- Role rules:
--   Owner  → full control on all rows for profiles they own.
--   Editor → can create/edit/delete their own providers and appointments at any time
--            (no "today only" restriction — these are planning/contact records).
--   Viewer → read-only.

-- ─────────────────────────────────────────────────────────────────────────────
-- providers
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.providers (
  id            uuid        primary key default uuid_generate_v4(),
  profile_id    uuid        not null references public.child_profiles(id) on delete cascade,
  author_id     uuid        not null references auth.users(id),
  name          text        not null,
  role          text        not null,
  role_other    text,
  organization  text,
  phone         text,
  email         text,
  address       text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint providers_role_check check (role in (
    'Pediatrician','Psychiatrist','ABA Therapist','OT',
    'Speech Therapist','Neurologist','School/IEP Contact','Other'
  ))
);

create trigger providers_updated_at
  before update on public.providers
  for each row execute function public.set_updated_at();

alter table public.providers enable row level security;

create policy "providers: members can select"
  on public.providers for select
  using (public.user_can_access_profile(profile_id));

create policy "providers: editors/owners can insert"
  on public.providers for insert
  with check (
    author_id = auth.uid()
    and public.is_profile_editor_or_owner(profile_id)
  );

create policy "providers: role-based update"
  on public.providers for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and public.is_profile_editor(profile_id)
    )
  );

create policy "providers: role-based delete"
  on public.providers for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and public.is_profile_editor(profile_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- appointments
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id               uuid        primary key default uuid_generate_v4(),
  profile_id       uuid        not null references public.child_profiles(id) on delete cascade,
  provider_id      uuid        references public.providers(id) on delete set null,
  author_id        uuid        not null references auth.users(id),
  appt_date        date        not null,
  appt_time        time        without time zone,
  type             text        not null,
  status           text        not null default 'upcoming',
  notes            text,
  followup_needed  boolean     not null default false,
  followup_text    text,
  followup_date    date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint appointments_type_check check (type in (
    'Regular session','Evaluation','School meeting','Follow-up','Other'
  )),
  constraint appointments_status_check check (
    status in ('upcoming','completed','cancelled','no_show')
  )
);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;

create policy "appointments: members can select"
  on public.appointments for select
  using (public.user_can_access_profile(profile_id));

create policy "appointments: editors/owners can insert"
  on public.appointments for insert
  with check (
    author_id = auth.uid()
    and public.is_profile_editor_or_owner(profile_id)
  );

create policy "appointments: role-based update"
  on public.appointments for update
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and public.is_profile_editor(profile_id)
    )
  );

create policy "appointments: role-based delete"
  on public.appointments for delete
  using (
    public.is_profile_owner(profile_id)
    or (
      author_id = auth.uid()
      and public.is_profile_editor(profile_id)
    )
  );
