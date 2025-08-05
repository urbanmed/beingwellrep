import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadFile {
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  reportId?: string;
  error?: string;
}

interface UseFileUploadOptions {
  onUploadComplete?: (reportIds: string[]) => void;
  onUploadError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileStates, setUploadFileStates] = useState<UploadFile[]>([]);
  const { toast } = useToast();

  // Helper function to ensure user is authenticated
  const ensureAuthenticated = useCallback(async (retryCount = 0): Promise<{ user: any; error?: string }> => {
    const maxRetries = 3;
    
    try {
      // First, try to get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      if (!user) {
        // Try to refresh the session
        console.log('No user found, attempting session refresh...');
        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
        
        if (sessionError) {
          console.error('Session refresh error:', sessionError);
          throw new Error('Session expired. Please log in again.');
        }
        
        if (!session?.user) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        console.log('Session refreshed successfully');
        return { user: session.user };
      }
      
      console.log('User authenticated:', user.id);
      return { user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      if (retryCount < maxRetries) {
        console.log(`Auth retry ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return ensureAuthenticated(retryCount + 1);
      }
      
      return { user: null, error: errorMessage };
    }
  }, []);

  const uploadFiles = useCallback(async (
    files: File[],
    reportType: string,
    title: string,
    additionalData: Record<string, any> = {}
  ) => {
    if (files.length === 0) return;

    // Pre-flight authentication check
    console.log('Starting upload process, checking authentication...');
    const authResult = await ensureAuthenticated();
    if (authResult.error || !authResult.user) {
      toast({
        title: 'Authentication Required',
        description: authResult.error || 'Please log in to upload files',
        variant: 'destructive',
      });
      options.onUploadError?.(authResult.error || 'Authentication required');
      return;
    }

    console.log('Authentication verified, proceeding with upload...');

    setIsUploading(true);
    setUploadProgress(0);
    
    // Initialize upload files state
    const initialFiles: UploadFile[] = files.map(file => ({
      name: file.name,
      status: 'uploading',
      progress: 0
    }));
    setUploadFileStates(initialFiles);

    const uploadedReportIds: string[] = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileProgress = (i / totalFiles) * 100;
        
        // Update overall progress
        setUploadProgress(fileProgress);
        
        // Update specific file status
        setUploadFileStates(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        try {
          // Generate unique filename with user ID folder structure
          const timestamp = Date.now();
          const fileExtension = file.name.split('.').pop();
          const fileName = `${authResult.user.id}/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

          // Upload file to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('medical-documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          // Update file progress to 50% after upload
          setUploadFileStates(prev => prev.map((f, idx) => 
            idx === i ? { ...f, progress: 50 } : f
          ));

          // Ensure authentication before database insert with retry logic
          console.log(`Ensuring auth before DB insert for file ${i + 1}/${files.length}`);
          const dbAuthResult = await ensureAuthenticated();
          if (dbAuthResult.error || !dbAuthResult.user) {
            throw new Error(`Authentication failed for database operation: ${dbAuthResult.error || 'User not found'}`);
          }

          // Create report record
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .insert({
              title: files.length > 1 ? `${title} (${i + 1})` : title,
              report_type: reportType,
              file_name: file.name,
              file_url: uploadData.path,
              file_type: file.type,
              file_size: file.size,
              report_date: new Date().toISOString().split('T')[0],
              parsing_status: 'pending',
              user_id: dbAuthResult.user.id,
              ...additionalData
            })
            .select()
            .single();

          if (reportError) {
            throw new Error(`Database error: ${reportError.message}`);
          }

          const reportId = reportData.id;
          uploadedReportIds.push(reportId);

          // Update file progress to 75% after database insert
          setUploadFileStates(prev => prev.map((f, idx) => 
            idx === i ? { ...f, progress: 75, reportId } : f
          ));

          // Start OCR processing
          setUploadFileStates(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'processing', progress: 80 } : f
          ));

          // Call OCR function
          const { error: ocrError } = await supabase.functions.invoke('process-ocr', {
            body: { reportId }
          });

          if (ocrError) {
            console.warn('OCR processing failed:', ocrError);
            // Don't throw error here - file upload succeeded, OCR can be retried
            setUploadFileStates(prev => prev.map((f, idx) => 
              idx === i ? { 
                ...f, 
                status: 'failed', 
                progress: 100,
                error: 'OCR processing failed - can be retried'
              } : f
            ));
          } else {
            // Mark as completed
            setUploadFileStates(prev => prev.map((f, idx) => 
              idx === i ? { ...f, status: 'completed', progress: 100 } : f
            ));
          }

        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          setUploadFileStates(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'failed', 
              progress: 0,
              error: error instanceof Error ? error.message : 'Upload failed'
            } : f
          ));
        }
      }

      // Final progress update
      setUploadProgress(100);

      // Show success message
      if (uploadedReportIds.length > 0) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${uploadedReportIds.length} file(s)`,
        });
        options.onUploadComplete?.(uploadedReportIds);
      }

      if (uploadedReportIds.length < files.length) {
        const failedCount = files.length - uploadedReportIds.length;
        toast({
          title: 'Partial Upload',
          description: `${failedCount} file(s) failed to upload`,
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Upload process error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      options.onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [toast, options, ensureAuthenticated]);

  const resetUpload = useCallback(() => {
    setUploadFileStates([]);
    setUploadProgress(0);
    setIsUploading(false);
  }, []);

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    uploadFileStates,
    resetUpload
  };
}