-- Ensure buckets are private
update storage.buckets
set public = false
where id in ('medical-documents', 'profile-images');

-- Policies for private access to storage objects within these buckets
-- Users can read their own files (path must start with their user id)
create policy if not exists "Users can read their own files (private buckets)"
  on storage.objects
  for select
  using (
    bucket_id in ('medical-documents','profile-images')
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Users can upload files to their own folder only
create policy if not exists "Users can upload to their folder (private buckets)"
  on storage.objects
  for insert
  with check (
    bucket_id in ('medical-documents','profile-images')
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Users can update their own files
create policy if not exists "Users can update their own files (private buckets)"
  on storage.objects
  for update
  using (
    bucket_id in ('medical-documents','profile-images')
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'super_admin')
    )
  )
  with check (
    bucket_id in ('medical-documents','profile-images')
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Users can delete their own files
create policy if not exists "Users can delete their own files (private buckets)"
  on storage.objects
  for delete
  using (
    bucket_id in ('medical-documents','profile-images')
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'super_admin')
    )
  );