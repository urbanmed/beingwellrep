-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage policies for medical-documents bucket
CREATE POLICY "Users can view their own medical documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own medical documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own medical documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own medical documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);