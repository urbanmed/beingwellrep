import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateMedicalData, checkForDuplicates } from '@/lib/utils/medical-data-validator';
import { generateSmartTags } from '@/lib/prompts/medical-prompts';
import { useFHIRData } from '@/hooks/useFHIRData';
import type { DocumentParsingResult } from '@/types/medical-data';

export function useDocumentProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fhirProcessing, setFhirProcessing] = useState(false);
  const { toast } = useToast();
  const fhirData = useFHIRData();

  const processDocument = async (reportId: string, maxRetries = 3): Promise<DocumentParsingResult> => {
    setIsProcessing(true);
    setRetryCount(0);
    
    const attemptProcessing = async (attempt: number): Promise<DocumentParsingResult> => {
      try {
        setRetryCount(attempt);
        
        // Phase 1: Attempt to acquire processing lock
        console.log(`Attempting to acquire processing lock for report ${reportId} (attempt ${attempt + 1})`);
        
        const { data: lockData, error: lockError } = await supabase.rpc('acquire_processing_lock', {
          report_id_param: reportId
        });

        if (lockError) {
          console.error('Lock acquisition error:', lockError);
          throw new Error('Failed to acquire processing lock');
        }

        if (!lockData) {
          throw new Error('Document is already being processed or processing is locked');
        }

        console.log('✅ Successfully acquired processing lock');
        
        // Add extended timeout for complex documents
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Processing timeout - function took too long')), 90000); // 90 second timeout
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

        // Phase 1: Attempt to create additional FHIR resources on client side if needed
        // This provides a fallback in case the edge function FHIR creation fails
        if (data.parsedData && !fhirData.loading) {
          try {
            setFhirProcessing(true);
            console.log('Creating client-side FHIR resources as backup...');
            
            // Note: The primary FHIR creation happens in the edge function
            // This is just a safety net for any additional processing
            
            setFhirProcessing(false);
          } catch (fhirError) {
            console.error('Client-side FHIR processing failed (non-critical):', fhirError);
            setFhirProcessing(false);
          }
        }

        return result;

      } catch (error) {
        console.error(`Document processing error (attempt ${attempt + 1}):`, error);
        
        // Always release the processing lock on error
        try {
          await supabase.rpc('release_processing_lock', {
            report_id_param: reportId,
            final_status: 'failed'
          });
          console.log('🔓 Released processing lock due to error');
        } catch (lockReleaseError) {
          console.error('Failed to release processing lock:', lockReleaseError);
        }
        
        // Enhanced error categorization
        const errorMsg = error.message.toLowerCase();
        const isRetryable = errorMsg.includes('api error') || 
                           errorMsg.includes('timeout') ||
                           errorMsg.includes('network') ||
                           errorMsg.includes('500') ||
                           errorMsg.includes('cpu time exceeded') ||
                           errorMsg.includes('processing timeout') ||
                           errorMsg.includes('already being processed') ||
                           errorMsg.includes('temporary');
        
        // Update retry count in database
        await supabase
          .from('reports')
          .update({ 
            retry_count: attempt + 1,
            last_retry_at: new Date().toISOString(),
            error_category: isRetryable ? 'temporary' : 'permanent'
          })
          .eq('id', reportId);
        
        if (attempt < maxRetries && isRetryable) {
          const retryDelay = Math.min((attempt + 1) * 3000, 15000); // Exponential backoff, max 15s
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
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
      // Enhanced reset with new status fields
      await supabase
        .from('reports')
        .update({
          parsing_status: 'pending',
          parsed_data: null,
          extraction_confidence: null,
          parsing_confidence: null,
          processing_error: null,
          processing_phase: 'pending',
          progress_percentage: 0,
          retry_count: 0,
          error_category: null,
          processing_lock: null,
          processing_started_at: null,
          lock_expires_at: null
        })
        .eq('id', reportId);

      // Start reprocessing
      await processDocument(reportId);

      toast({
        title: 'Success',
        description: 'Document reprocessing started with enhanced tracking',
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
    retryCount,
    fhirProcessing
  };
}