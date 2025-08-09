-- Ensure buckets are private
update storage.buckets
set public = false
where id in ('medical-documents', 'profile-images');

-- Storage RLS policies for private buckets
-- Drop existing policies with the same names to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own files (private buckets)" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder (private buckets)" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files (private buckets)" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files (private buckets)" ON storage.objects;

-- Users can read their own files
CREATE POLICY "Users can read their own files (private buckets)"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id IN ('medical-documents','profile-images')
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Users can upload files to their own folder only
CREATE POLICY "Users can upload to their folder (private buckets)"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id IN ('medical-documents','profile-images')
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Users can update their own files
CREATE POLICY "Users can update their own files (private buckets)"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id IN ('medical-documents','profile-images')
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  )
  WITH CHECK (
    bucket_id IN ('medical-documents','profile-images')
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Users can delete their own files
CREATE POLICY "Users can delete their own files (private buckets)"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id IN ('medical-documents','profile-images')
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );