import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ExtractedMetadata {
  title: string | null;
  reportType: string | null;
  physicianName: string | null;
  facilityName: string | null;
  description: string | null;
}

export const useMetadataExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractMetadata = async (file: File): Promise<ExtractedMetadata | null> => {
    if (!file) return null;

    setIsExtracting(true);
    
    try {
      // First upload the file temporarily to storage for analysis
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `temp_${Date.now()}.${fileExt}`;
      const filePath = `metadata-extraction/${fileName}`;

      console.log('Uploading file for metadata extraction:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file for analysis');
      }

      // Call the metadata extraction function
      console.log('Calling metadata extraction function...');
      
      const { data, error } = await supabase.functions.invoke('extract-document-metadata', {
        body: { filePath }
      });

      // Clean up the temporary file
      await supabase.storage
        .from('medical-documents')
        .remove([filePath]);

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error('Failed to extract metadata');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract metadata');
      }

      console.log('Extracted metadata:', data.metadata);
      
      toast({
        title: "Document analyzed",
        description: "Form fields have been pre-filled based on document content.",
      });

      return data.metadata;
      
    } catch (error) {
      console.error('Error extracting metadata:', error);
      
      toast({
        title: "Analysis failed",
        description: "Could not analyze document. Please fill form manually.",
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