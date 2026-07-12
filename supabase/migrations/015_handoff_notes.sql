-- Handoff notes: one per child profile, updated in place.
-- Not a log entry — no date, no history. Just a live "right now" sticky note.

create table if not exists handoff_notes (
  profile_id  uuid        primary key references child_profiles(id) on delete cascade,
  note        text        not null default '',
  updated_by  uuid        references auth.users(id),
  updated_at  timestamptz not null default now()
);

alter table handoff_notes enable row level security;

-- Any member of the profile can read the handoff note
create policy "Members can read handoff notes"
  on handoff_notes for select
  using (
    exists (
      select 1 from profile_access
      where profile_id = handoff_notes.profile_id
        and user_id    = auth.uid()
    )
  );

-- Owners and editors can create the initial note row
create policy "Editors can insert handoff notes"
  on handoff_notes for insert
  with check (
    exists (
      select 1 from profile_access
      where profile_id = handoff_notes.profile_id
        and user_id    = auth.uid()
        and role in ('owner', 'editor')
    )
  );

-- Owners and editors can update the note
create policy "Editors can update handoff notes"
  on handoff_notes for update
  using (
    exists (
      select 1 from profile_access
      where profile_id = handoff_notes.profile_id
        and user_id    = auth.uid()
        and role in ('owner', 'editor')
    )
  );
