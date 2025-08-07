import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateMedicalData, checkForDuplicates } from '@/lib/utils/medical-data-validator';
import { generateSmartTags } from '@/lib/prompts/medical-prompts';
import type { DocumentParsingResult } from '@/types/medical-data';

export function useDocumentProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const processDocument = async (reportId: string, maxRetries = 3): Promise<DocumentParsingResult> => {
    setIsProcessing(true);
    setRetryCount(0);
    
    const attemptProcessing = async (attempt: number): Promise<DocumentParsingResult> => {
      try {
        setRetryCount(attempt);
        
        // Add timeout for the function call to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Processing timeout - function took too long')), 60000); // 60 second timeout
        });
        
        const processingPromise = supabase.functions.invoke('process-medical-document', {
          body: { reportId }
        });
        
        const { data, error } = await Promise.race([processingPromise, timeoutPromise]) as any;

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'Document processing failed');
        }

      // Validate the parsed data if available
      let validationResult = null;
      if (data.parsedData) {
        validationResult = validateMedicalData(data.parsedData);
        
        if (!validationResult.isValid) {
          console.warn('Validation issues found:', validationResult.errors);
        }
      }

      // Generate smart tags
      const smartTags = data.parsedData ? generateSmartTags(data.parsedData) : [];

      // Update the report with smart tags if any were generated
      if (smartTags.length > 0) {
        await supabase
          .from('reports')
          .update({ tags: smartTags })
          .eq('id', reportId);
      }

        const result: DocumentParsingResult = {
          success: true,
          data: data.parsedData,
          confidence: data.confidence,
          model: 'gpt-4o-mini',
          processingTime: data.processingTime
        };

        if (validationResult) {
          result.errors = validationResult.errors;
        }

        return result;

      } catch (error) {
        console.error(`Document processing error (attempt ${attempt + 1}):`, error);
        
        // Check if this is a retryable error
        const isRetryable = error.message.includes('API error') || 
                           error.message.includes('timeout') ||
                           error.message.includes('network') ||
                           error.message.includes('500') ||
                           error.message.includes('CPU Time exceeded') ||
                           error.message.includes('Processing timeout');
        
        if (attempt < maxRetries && isRetryable) {
          const retryDelay = Math.min((attempt + 1) * 3000, 10000); // Exponential backoff, max 10s
          console.log(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptProcessing(attempt + 1);
        }
        
        const result: DocumentParsingResult = {
          success: false,
          confidence: 0,
          model: 'gpt-4o-mini',
          errors: [error.message]
        };

        // Provide more helpful error messages based on error type
        let userMessage = 'Failed to process the document. Please try again.';
        if (error.message.includes('CPU Time exceeded')) {
          userMessage = 'Document processing timed out. This document may be too large or complex. Try uploading a smaller section or contact support.';
        } else if (error.message.includes('Processing timeout')) {
          userMessage = 'Processing took too long. Please try again or upload a smaller document.';
        } else if (error.message.includes('Unable to extract text')) {
          userMessage = 'Could not read text from this PDF. Try uploading it as an image instead.';
        } else if (attempt > 0) {
          userMessage = `Failed to process the document after ${attempt + 1} attempts. Please try again later.`;
        }

        toast({
          title: 'Processing Failed',
          description: userMessage,
          variant: 'destructive'
        });

        return result;
      }
    };

    try {
      return await attemptProcessing(0);
    } finally {
      setIsProcessing(false);
      setRetryCount(0);
    }
  };

  const checkDuplicateDocument = async (reportId: string): Promise<{
    isDuplicate: boolean;
    similarity: number;
    matchedReport?: any;
  }> => {
    try {
      // Get the current report
      const { data: currentReport, error: currentError } = await supabase
        .from('reports')
        .select('parsed_data')
        .eq('id', reportId)
        .single();

      if (currentError || !currentReport?.parsed_data) {
        return { isDuplicate: false, similarity: 0 };
      }

      // Get other reports from the same user
      const { data: otherReports, error: otherError } = await supabase
        .from('reports')
        .select('id, title, parsed_data, report_date')
        .neq('id', reportId);

      if (otherError || !otherReports) {
        return { isDuplicate: false, similarity: 0 };
      }

      return checkForDuplicates(currentReport.parsed_data as any, otherReports);

    } catch (error) {
      console.error('Duplicate check error:', error);
      return { isDuplicate: false, similarity: 0 };
    }
  };

  const reprocessDocument = async (reportId: string): Promise<void> => {
    try {
      // Reset the document status
      await supabase
        .from('reports')
        .update({
          parsing_status: 'pending',
          parsed_data: null,
          extraction_confidence: null,
          parsing_confidence: null,
          processing_error: null
        })
        .eq('id', reportId);

      // Start reprocessing
      await processDocument(reportId);

      toast({
        title: 'Success',
        description: 'Document reprocessing started',
      });

    } catch (error) {
      console.error('Reprocessing error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start reprocessing',
        variant: 'destructive'
      });
    }
  };

  const reprocessAllDocuments = async (): Promise<void> => {
    try {
      // Get all documents that need reprocessing
      const { data: reports, error } = await supabase
        .from('reports')
        .select('id, parsing_status')
        .or('parsing_status.eq.failed,parsed_data.is.null,parsed_data->rawResponse.not.is.null');

      if (error) throw error;

      if (!reports || reports.length === 0) {
        toast({
          title: 'No Documents Found',
          description: 'No documents require reprocessing',
        });
        return;
      }

      toast({
        title: 'Reprocessing Started',
        description: `Reprocessing ${reports.length} documents...`,
      });

      // Process each document
      for (const report of reports) {
        try {
          await reprocessDocument(report.id);
          // Add small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to reprocess document ${report.id}:`, error);
        }
      }

      toast({
        title: 'Reprocessing Complete',
        description: `Finished reprocessing ${reports.length} documents`,
      });

    } catch (error) {
      console.error('Bulk reprocessing error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start bulk reprocessing',
        variant: 'destructive'
      });
    }
  };

  return {
    processDocument,
    checkDuplicateDocument,
    reprocessDocument,
    reprocessAllDocuments,
    isProcessing,
    retryCount
  };
}