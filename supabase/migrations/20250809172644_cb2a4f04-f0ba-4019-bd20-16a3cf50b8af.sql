
-- Storage policies for the 'profile-images' bucket

-- Allow users to view their own profile images
create policy "Users can view their own profile images"
on storage.objects
for select
using (
  bucket_id = 'profile-images'
  and owner = auth.uid()
);

-- Allow users to upload their own profile images
create policy "Users can upload their own profile images"
on storage.objects
for insert
with check (
  bucket_id = 'profile-images'
  and owner = auth.uid()
);

-- Allow users to update their own profile images
create policy "Users can update their own profile images"
on storage.objects
for update
using (
  bucket_id = 'profile-images'
  and owner = auth.uid()
);

-- Allow users to delete their own profile images
create policy "Users can delete their own profile images"
on storage.objects
for delete
using (
  bucket_id = 'profile-images'
  and owner = auth.uid()
);
