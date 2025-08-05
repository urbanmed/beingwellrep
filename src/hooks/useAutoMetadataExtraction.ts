import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExtractedMetadata {
  title?: string;
  reportType?: string;
  physicianName?: string;
  facilityName?: string;
  description?: string;
}

export function useAutoMetadataExtraction() {
  const { toast } = useToast();

  const extractAndUpdateMetadata = useCallback(async (reportId: string, filePath: string) => {
    try {
      console.log(`Starting metadata extraction for report ${reportId}`);
      
      // Call the metadata extraction function
      const { data: extractionData, error: extractionError } = await supabase.functions.invoke(
        'extract-document-metadata',
        {
          body: { filePath }
        }
      );

      if (extractionError) {
        console.error('Metadata extraction failed:', extractionError);
        throw new Error(`Metadata extraction failed: ${extractionError.message}`);
      }

      const metadata = extractionData as ExtractedMetadata;
      console.log('Extracted metadata:', metadata);

      // Update the report with extracted metadata
      const updateData: Record<string, any> = {};
      
      // Only update fields that were successfully extracted and are not just defaults
      if (metadata.title && metadata.title !== 'Untitled Document') {
        updateData.title = metadata.title;
      }
      
      if (metadata.reportType && 
          metadata.reportType !== 'general' && 
          metadata.reportType !== 'unknown' &&
          ['lab_results', 'radiology', 'procedure', 'pathology', 'consultation', 'prescription', 'vaccination', 'discharge', 'allergy', 'mental_health', 'general'].includes(metadata.reportType)) {
        updateData.report_type = metadata.reportType;
      }
      
      if (metadata.physicianName) {
        updateData.physician_name = metadata.physicianName;
      }
      
      if (metadata.facilityName) {
        updateData.facility_name = metadata.facilityName;
      }
      
      if (metadata.description) {
        updateData.description = metadata.description;
      }

      // Only update if we have meaningful extracted data
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('reports')
          .update(updateData)
          .eq('id', reportId);

        if (updateError) {
          console.error('Failed to update report with metadata:', updateError);
          throw new Error(`Failed to update report: ${updateError.message}`);
        }

        console.log(`Successfully updated report ${reportId} with metadata`);
        
        toast({
          title: 'Document Details Extracted',
          description: `Automatically detected: ${Object.keys(updateData).join(', ')}`,
        });
      } else {
        console.log('No meaningful metadata extracted, keeping defaults');
      }

    } catch (error) {
      console.error('Auto metadata extraction error:', error);
      
      // Don't show error toast for metadata extraction failures
      // The file upload still succeeded, this is just a nice-to-have feature
      console.warn(`Metadata extraction failed for report ${reportId}, will use defaults`);
    }
  }, [toast]);

  return {
    extractAndUpdateMetadata
  };
}