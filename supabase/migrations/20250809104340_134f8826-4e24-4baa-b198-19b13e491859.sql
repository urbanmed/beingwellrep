-- Ensure buckets are private
update storage.buckets
set public = false
where id in ('medical-documents', 'profile-images');

-- Users can read their own files (path must start with their user id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can read their own files (private buckets)'
  ) THEN
    EXECUTE $$
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
    $$;
  END IF;
END $$;

-- Users can upload files to their own folder only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload to their folder (private buckets)'
  ) THEN
    EXECUTE $$
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
    $$;
  END IF;
END $$;

-- Users can update their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update their own files (private buckets)'
  ) THEN
    EXECUTE $$
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
    $$;
  END IF;
END $$;

-- Users can delete their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete their own files (private buckets)'
  ) THEN
    EXECUTE $$
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
    $$;
  END IF;
END $$;