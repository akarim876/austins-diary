-- 010: User profiles — first name, last name, username
--
-- Stores display info for each caregiver account.
-- Separate from auth.users and child_profiles.
-- Required before accessing the app (enforced at the frontend level).

create table if not exists public.user_profiles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  username   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique username
create unique index if not exists user_profiles_username_lower_idx
  on public.user_profiles (lower(username));

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

-- Own row: full access
create policy "user_profiles: own row select"
  on public.user_profiles for select using (auth.uid() = user_id);

create policy "user_profiles: own row insert"
  on public.user_profiles for insert with check (auth.uid() = user_id);

create policy "user_profiles: own row update"
  on public.user_profiles for update using (auth.uid() = user_id);

-- Caregivers who share at least one profile can see each other's display name
create policy "user_profiles: shared profile members can view"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.profile_access pa1
      join   public.profile_access pa2 on pa1.profile_id = pa2.profile_id
      where  pa1.user_id = auth.uid()
        and  pa2.user_id = user_profiles.user_id
    )
  );
