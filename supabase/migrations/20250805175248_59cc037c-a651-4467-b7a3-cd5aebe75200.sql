-- Make the medical-documents bucket public to allow getPublicUrl() to work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'medical-documents';