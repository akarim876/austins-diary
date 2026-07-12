-- Fix storage bucket and policies.
--
-- auth.role() is unreliable in storage RLS — use auth.uid() is not null instead.
-- Also ensures the bucket exists.

-- 1. Create bucket if it doesn't already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary-photos',
  'diary-photos',
  false,
  10485760,   -- 10 MB limit per file
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic']
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Drop the old policies (ignore errors if they don't exist)
drop policy if exists "Authenticated users can upload photos"    on storage.objects;
drop policy if exists "Users can view photos for accessible profiles" on storage.objects;
drop policy if exists "Users can delete their own photos"        on storage.objects;

-- 3. Recreate with auth.uid() checks (reliable in all Supabase versions)

create policy "diary-photos: authenticated users can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'diary-photos'
    and auth.uid() is not null
  );

create policy "diary-photos: authenticated users can read"
  on storage.objects for select
  using (
    bucket_id = 'diary-photos'
    and auth.uid() is not null
  );

create policy "diary-photos: owners can update their files"
  on storage.objects for update
  using (
    bucket_id = 'diary-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "diary-photos: owners can delete their files"
  on storage.objects for delete
  using (
    bucket_id = 'diary-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
