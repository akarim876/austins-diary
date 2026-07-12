-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────
-- child_profiles
-- ─────────────────────────────────────────────────────
create table public.child_profiles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  birth_date  date,
  avatar_url  text,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.child_profiles enable row level security;

-- ─────────────────────────────────────────────────────
-- profile_access  (many-to-many: users <-> child profiles)
-- ─────────────────────────────────────────────────────
create table public.profile_access (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.child_profiles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner', 'viewer', 'editor')),
  invited_at  timestamptz not null default now(),
  unique (profile_id, user_id)
);

alter table public.profile_access enable row level security;

-- ─────────────────────────────────────────────────────
-- diary_entries
-- ─────────────────────────────────────────────────────
create table public.diary_entries (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.child_profiles(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  note        text not null default '',
  photo_url   text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.diary_entries enable row level security;

-- ─────────────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────────────

-- Helper: can the current user access this profile? (SECURITY DEFINER bypasses RLS)
create or replace function public.user_can_access_profile(p_profile_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profile_access
    where profile_id = p_profile_id
      and user_id = auth.uid()
  );
$$;

-- Helper: is the current user an owner of this profile? (SECURITY DEFINER bypasses RLS)
create or replace function public.is_profile_owner(p_profile_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profile_access
    where profile_id = p_profile_id
      and user_id    = auth.uid()
      and role       = 'owner'
  );
$$;

-- child_profiles: visible to users who have access
create policy "Users can view profiles they have access to"
  on public.child_profiles for select
  using (public.user_can_access_profile(id));

create policy "Users can insert their own profiles"
  on public.child_profiles for insert
  with check (created_by = auth.uid());

create policy "Owners and editors can update profiles"
  on public.child_profiles for update
  using (
    exists (
      select 1 from public.profile_access
      where profile_id = id
        and user_id = auth.uid()
        and role in ('owner', 'editor')
    )
  );

create policy "Owners can delete profiles"
  on public.child_profiles for delete
  using (
    exists (
      select 1 from public.profile_access
      where profile_id = id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- profile_access policies — use is_profile_owner() to avoid self-referential recursion
create policy "Users can view their own or owned access rows"
  on public.profile_access for select
  using (
    user_id = auth.uid()
    or public.is_profile_owner(profile_id)
  );

create policy "Users can insert their own access row (bootstrap) or as owner"
  on public.profile_access for insert
  with check (
    user_id = auth.uid()
    or public.is_profile_owner(profile_id)
  );

create policy "Owners can update access rows"
  on public.profile_access for update
  using (public.is_profile_owner(profile_id));

create policy "Owners can delete access rows"
  on public.profile_access for delete
  using (public.is_profile_owner(profile_id));

-- diary_entries: accessible if user can access the profile
create policy "Users can view entries for accessible profiles"
  on public.diary_entries for select
  using (public.user_can_access_profile(profile_id));

create policy "Editors and owners can insert entries"
  on public.diary_entries for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.profile_access
      where profile_id = diary_entries.profile_id
        and user_id = auth.uid()
        and role in ('owner', 'editor')
    )
  );

create policy "Authors can update their entries"
  on public.diary_entries for update
  using (author_id = auth.uid());

create policy "Authors and owners can delete entries"
  on public.diary_entries for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.profile_access
      where profile_id = diary_entries.profile_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- ─────────────────────────────────────────────────────
-- Trigger: auto-update updated_at on diary_entries
-- ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger diary_entries_updated_at
  before update on public.diary_entries
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────
-- Storage bucket for diary photos
-- ─────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('diary-photos', 'diary-photos', false)
on conflict do nothing;

create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'diary-photos' and auth.role() = 'authenticated');

create policy "Users can view photos for accessible profiles"
  on storage.objects for select
  using (bucket_id = 'diary-photos' and auth.role() = 'authenticated');

create policy "Users can delete their own photos"
  on storage.objects for delete
  using (bucket_id = 'diary-photos' and auth.uid()::text = (storage.foldername(name))[1]);
