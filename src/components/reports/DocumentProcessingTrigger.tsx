import { useEffect } from 'react';
import { useHybridDocumentProcessing } from '@/hooks/useHybridDocumentProcessing';
import { useToast } from '@/hooks/use-toast';

interface DocumentProcessingTriggerProps {
  reportId: string;
  shouldProcess: boolean;
}

export function DocumentProcessingTrigger({ reportId, shouldProcess }: DocumentProcessingTriggerProps) {
  const { processDocumentHybrid } = useHybridDocumentProcessing();
  const { toast } = useToast();

  useEffect(() => {
    if (shouldProcess && reportId) {
      const triggerProcessing = async () => {
        try {
          console.log(`🚀 Triggering hybrid processing for report: ${reportId}`);
          await processDocumentHybrid(reportId);
          toast({
            title: "Processing Complete",
            description: "Document has been reprocessed successfully. Please refresh the page to see updated results.",
          });
        } catch (error) {
          console.error('Processing failed:', error);
          toast({
            title: "Processing Failed", 
            description: "Failed to reprocess the document. Please try again.",
            variant: "destructive",
          });
        }
      };

      // Delay processing slightly to ensure component mounting
      const timeoutId = setTimeout(triggerProcessing, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [reportId, shouldProcess, processDocumentHybrid, toast]);

  return null; // This is a trigger component with no UI
}