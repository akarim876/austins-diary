-- 007: Diet & Nutrition logs
--
-- diet_settings: one row per profile — editable lists for foods, smoothie
--                ingredients, and supplements.
-- diet_logs:     individual meal/snack and smoothie entries.

-- ─────────────────────────────────────────────────────
-- diet_settings
-- ─────────────────────────────────────────────────────
create table public.diet_settings (
  id                    uuid primary key default uuid_generate_v4(),
  profile_id            uuid not null unique references public.child_profiles(id) on delete cascade,
  accepted_foods        text[] not null default '{}',
  morning_ingredients   text[] not null default '{}',
  evening_ingredients   text[] not null default '{}',
  supplements           text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.diet_settings enable row level security;

create policy "Users can view diet settings for accessible profiles"
  on public.diet_settings for select
  using (public.user_can_access_profile(profile_id));

create policy "Editors and owners can upsert diet settings"
  on public.diet_settings for insert
  with check (public.user_can_access_profile(profile_id));

create policy "Editors and owners can update diet settings"
  on public.diet_settings for update
  using (public.user_can_access_profile(profile_id));

create trigger diet_settings_updated_at
  before update on public.diet_settings
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────
-- diet_logs
-- ─────────────────────────────────────────────────────
create table public.diet_logs (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references public.child_profiles(id) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,

  entry_date   date not null,
  time_of_day  time not null,

  -- 'meal' or 'smoothie'
  log_type     text not null check (log_type in ('meal', 'smoothie')),

  -- ── Meal fields ────────────────────────────────────
  meal_type    text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  foods_eaten  text[] not null default '{}',

  new_food_introduced  boolean not null default false,
  new_food_name        text    not null default '',
  new_food_acceptance  text    check (new_food_acceptance in ('accepted', 'partially_accepted', 'refused')),
  new_food_notes       text    not null default '',

  -- ── Smoothie fields ────────────────────────────────
  smoothie_type        text check (smoothie_type in ('morning', 'evening')),
  ingredients_checked  text[] not null default '{}',
  ingredients_omitted  text[] not null default '{}',
  supplements_checked  text[] not null default '{}',
  supplements_omitted  text[] not null default '{}',
  hydration            text   check (hydration in ('none', 'some', 'full_cup', 'more')),
  substitution_notes   text   not null default '',

  -- ── Shared ─────────────────────────────────────────
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.diet_logs enable row level security;

create policy "Users can view diet logs for accessible profiles"
  on public.diet_logs for select
  using (public.user_can_access_profile(profile_id));

create policy "Editors and owners can insert diet logs"
  on public.diet_logs for insert
  with check (
    author_id = auth.uid()
    and public.user_can_access_profile(profile_id)
  );

create policy "Authors can update their diet logs"
  on public.diet_logs for update
  using (author_id = auth.uid());

create policy "Authors and owners can delete diet logs"
  on public.diet_logs for delete
  using (
    author_id = auth.uid()
    or public.is_profile_owner(profile_id)
  );

create trigger diet_logs_updated_at
  before update on public.diet_logs
  for each row execute function public.set_updated_at();
