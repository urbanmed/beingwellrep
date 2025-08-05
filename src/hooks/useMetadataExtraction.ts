import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ExtractedMetadata {
  title: string | null;
  reportType: string | null;
  physicianName: string | null;
  facilityName: string | null;
  description: string | null;
}

export const useMetadataExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const { user } = useAuth();

  const extractMetadata = async (file: File): Promise<ExtractedMetadata | null> => {
    if (!file) return null;
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to analyze documents.",
        variant: "destructive",
      });
      return null;
    }

    setIsExtracting(true);
    
    try {
      console.log('Starting metadata extraction for file:', file.name, 'size:', file.size, 'type:', file.type);
      
      // First upload the file temporarily to storage for analysis
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `temp_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/metadata-extraction/${fileName}`;

      console.log('Uploading file for metadata extraction:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded successfully, calling extraction function...');
      
      const { data, error } = await supabase.functions.invoke('extract-document-metadata', {
        body: { filePath }
      });

      console.log('Function response:', { data, error });

      // Clean up the temporary file
      const { error: deleteError } = await supabase.storage
        .from('medical-documents')
        .remove([filePath]);
      
      if (deleteError) {
        console.warn('Failed to clean up temporary file:', deleteError);
      }

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data?.success) {
        console.error('Extraction failed with error:', data?.error);
        throw new Error(data?.error || 'Unknown extraction error');
      }

      console.log('Successfully extracted metadata:', data.metadata);
      
      toast({
        title: "Document analyzed",
        description: "Form fields have been pre-filled based on document content.",
      });

      return data.metadata;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error extracting metadata:', error);
      
      toast({
        title: "Analysis failed",
        description: `Could not analyze document: ${errorMessage}. Please fill form manually.`,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    extractMetadata,
    isExtracting
  };
};