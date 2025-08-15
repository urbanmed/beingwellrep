-- Create proper RLS policies for storage.objects to allow authenticated users to access their medical documents

-- First, ensure RLS is enabled on storage.objects (it should be by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view files in the medical-documents bucket that belong to them
-- The file path structure is: user_id/filename or user_id/folder/filename
CREATE POLICY "Users can view their own medical documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to insert files in their own folder in medical-documents bucket
CREATE POLICY "Users can upload to their own medical documents folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to update files in their own folder
CREATE POLICY "Users can update their own medical documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to delete files in their own folder
CREATE POLICY "Users can delete their own medical documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = split_part(name, '/', 1)
);