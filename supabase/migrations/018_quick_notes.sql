-- Lightweight unfiled notes created via the global voice record button.
-- One row per note; not tied to any specific entry type.

create table if not exists quick_notes (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null references child_profiles(id) on delete cascade,
  author_id   uuid        not null references auth.users(id),
  content     text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table quick_notes enable row level security;

create policy "Members can read quick notes"
  on quick_notes for select
  using (
    exists (
      select 1 from profile_access
      where profile_id = quick_notes.profile_id
        and user_id    = auth.uid()
    )
  );

create policy "Editors can insert quick notes"
  on quick_notes for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from profile_access
      where profile_id = quick_notes.profile_id
        and user_id    = auth.uid()
        and role in ('owner', 'editor')
    )
  );

create policy "Author or owner can delete quick notes"
  on quick_notes for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from profile_access
      where profile_id = quick_notes.profile_id
        and user_id    = auth.uid()
        and role       = 'owner'
    )
  );
