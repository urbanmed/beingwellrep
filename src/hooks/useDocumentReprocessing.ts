import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function useDocumentReprocessing() {
  const [isReprocessing, setIsReprocessing] = useState(false);
  const { toast } = useToast();

  const reprocessDocument = async (reportId: string) => {
    setIsReprocessing(true);
    try {
      // Reset the report status to trigger reprocessing
      const { error: resetError } = await supabase
        .from('reports')
        .update({
          parsing_status: 'pending',
          processed_data: null,
          confidence_score: null,
          processing_phase: null,
          progress_percentage: 0,
          processing_error: null,
          error_category: null
        })
        .eq('id', reportId);

      if (resetError) {
        throw new Error(`Failed to reset report status: ${resetError.message}`);
      }

      // Trigger the processing function
      const { data, error: processError } = await supabase.functions.invoke(
        'process-medical-document', 
        {
          body: { reportId }
        }
      );

      if (processError) {
        throw new Error(`Processing failed: ${processError.message}`);
      }

      toast({
        title: "Success",
        description: "Document has been reprocessed successfully. Please refresh the page to see updated results.",
      });

      return data;
    } catch (error) {
      console.error('Reprocessing failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reprocess document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsReprocessing(false);
    }
  };

  return {
    reprocessDocument,
    isReprocessing
  };
}