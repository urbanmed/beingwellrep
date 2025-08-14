import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAutoMetadataExtraction } from '@/hooks/useAutoMetadataExtraction';

interface UploadFile {
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'uploaded';
  progress: number;
  reportId?: string;
  error?: string;
  message?: string;
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
  const { extractAndUpdateMetadata } = useAutoMetadataExtraction();

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
    reportType?: string,
    title?: string,
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

          // Verify file was actually uploaded by attempting to download it
          const { error: verifyError } = await supabase.storage
            .from('medical-documents')
            .download(uploadData.path);

          if (verifyError) {
            // Clean up the failed upload record if it exists
            await supabase.storage.from('medical-documents').remove([uploadData.path]);
            throw new Error(`Upload verification failed: File was not properly stored`);
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

          // Create report record with default values if not provided
          const defaultTitle = title || `Document uploaded ${new Date().toLocaleDateString()}`;
          const defaultReportType = reportType || 'general';
          
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .insert({
              title: files.length > 1 ? `${defaultTitle} (${i + 1})` : defaultTitle,
              report_type: defaultReportType,
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

          // Start document processing
          setUploadFileStates(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'processing', progress: 80 } : f
          ));

          // Call optimized document processing function with timeout handling
          console.log('Starting optimized document processing for:', reportId);
          
          const processingTimeoutPromise = new Promise<{ timeout: boolean }>((resolve) => {
            setTimeout(() => {
              console.log('Processing initiated, will continue in background');
              resolve({ timeout: true });
            }, 30000); // 30 second timeout
          });
          
          const processingPromise = supabase.functions.invoke('process-medical-document', {
            body: { reportId }
          });
          
          const processingResult = await Promise.race([processingPromise, processingTimeoutPromise]);
          
          if ('timeout' in processingResult && processingResult.timeout) {
            // Processing is continuing in background
            console.log('Document processing continuing in background for:', reportId);
            setUploadFileStates(prev => prev.map((f, idx) => 
              idx === i ? { 
                ...f, 
                status: 'uploaded',
                progress: 100,
                message: 'Processing in background...'
              } : f
            ));
          } else if ((processingResult as any).error) {
            console.warn('Document processing failed:', (processingResult as any).error);
            // Don't throw error here - file upload succeeded, processing can be retried
            setUploadFileStates(prev => prev.map((f, idx) => 
              idx === i ? { 
                ...f, 
                status: 'failed',
                progress: 100,
                error: 'Processing failed - can be retried'
              } : f
            ));
          } else {
            // Mark as completed
            console.log('Document processing completed quickly for:', reportId);
            setUploadFileStates(prev => prev.map((f, idx) => 
              idx === i ? { ...f, status: 'completed', progress: 100 } : f
            ));
            
            // Trigger automatic metadata extraction in the background
            // Don't await this - let it run in the background
            extractAndUpdateMetadata(reportId, uploadData.path).catch(error => {
              console.warn('Background metadata extraction failed:', error);
            });
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