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

  const uploadFiles = useCallback(async (
    files: File[],
    reportType: string,
    title: string,
    additionalData: Record<string, any> = {}
  ) => {
    if (files.length === 0) return;

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
          // Generate unique filename
          const timestamp = Date.now();
          const fileExtension = file.name.split('.').pop();
          const fileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

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

          // Get current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error('User not authenticated');
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
              ocr_status: 'pending',
              user_id: user.id,
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
  }, [toast, options]);

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