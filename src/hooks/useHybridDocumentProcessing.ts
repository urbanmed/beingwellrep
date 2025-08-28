import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDocumentProcessing } from '@/hooks/useDocumentProcessing';
import type { DocumentParsingResult } from '@/types/medical-data';
import type { EnhancedDocumentParsingResult } from '@/types/aws-medical-data';

/**
 * Enhanced document processing hook that extends the base hook
 * with hybrid AWS + LLM processing capabilities
 */
export function useHybridDocumentProcessing() {
  const [awsProcessingStage, setAwsProcessingStage] = useState<string | null>(null);
  const [hybridProgress, setHybridProgress] = useState({
    ocrComplete: false,
    awsEntitiesExtracted: false,
    terminologyValidated: false,
    llmEnhanced: false,
    resultsmerged: false
  });
  
  const { toast } = useToast();
  const baseProcessing = useDocumentProcessing();

  /**
   * Enhanced document processing with hybrid AWS + LLM pipeline
   */
  const processDocumentHybrid = async (reportId: string, maxRetries = 3): Promise<EnhancedDocumentParsingResult> => {
    setAwsProcessingStage('initializing');
    resetHybridProgress();
    
    try {
      console.log(`🚀 Starting hybrid AWS+LLM processing for report: ${reportId}`);
      
      // Phase 1: Monitor OCR progress
      setAwsProcessingStage('ocr');
      
      // Use the base processing function which now includes hybrid processing
      const result = await baseProcessing.processDocument(reportId, maxRetries);
      
      // Monitor progress by checking report status
      await monitorHybridProgress(reportId);
      
      if (result.success && result.data) {
        setAwsProcessingStage('completed');
        
        // Check for AWS enhancement indicators in the result data
        const resultData = result.data as any;
        const isHybridResult = resultData && (
          resultData.hybrid === true ||
          resultData.awsEnhanced === true ||
          (Array.isArray(resultData.processingPipeline) && resultData.processingPipeline.includes('aws_textract'))
        );
        
        const enhancedResult: EnhancedDocumentParsingResult = {
          success: true,
          data: resultData as any,
          confidence: result.confidence || 0.8,
          model: result.model,
          processingTime: result.processingTime,
          pipeline: {
            stage1_textract: isHybridResult ? 'completed' : 'failed',
            stage2_comprehend: isHybridResult ? 'completed' : 'failed', 
            stage3_llm: 'completed',
            stage4_validation: isHybridResult ? 'completed' : 'failed'
          },
          errors: result.errors
        };
        
        toast({
          title: 'Processing Complete',
          description: `Document processed using ${isHybridResult ? 'hybrid AWS+LLM' : 'LLM-only'} pipeline`,
        });
        
        return enhancedResult;
      } else {
        throw new Error(result.errors?.[0] || 'Processing failed');
      }
      
    } catch (error: any) {
      console.error('Hybrid processing error:', error);
      setAwsProcessingStage('error');
      
      toast({
        title: 'Processing Error',
        description: error.message || 'Hybrid processing failed',
        variant: 'destructive'
      });
      
      return {
        success: false,
        model: 'hybrid-processing',
        pipeline: {
          stage1_textract: 'failed',
          stage2_comprehend: 'failed',
          stage3_llm: 'failed', 
          stage4_validation: 'failed'
        },
        confidence: 0,
        errors: [error.message]
      };
    } finally {
      setAwsProcessingStage(null);
    }
  };

  /**
   * Monitor the hybrid processing progress by checking report status
   */
  const monitorHybridProgress = async (reportId: string) => {
    const maxChecks = 30; // 30 seconds max
    let checks = 0;
    
    return new Promise<void>((resolve) => {
      const checkProgress = async () => {
        if (checks >= maxChecks) {
          resolve();
          return;
        }
        
        try {
          const { data: report } = await supabase
            .from('reports')
            .select('processing_phase, progress_percentage')
            .eq('id', reportId)
            .single();
          
          if (report) {
            updateHybridProgressFromPhase(report.processing_phase);
            
            if (report.processing_phase === 'completed' || report.progress_percentage >= 100) {
              resolve();
              return;
            }
          }
          
          checks++;
          setTimeout(checkProgress, 1000);
        } catch (error) {
          console.warn('Progress monitoring error:', error);
          resolve();
        }
      };
      
      checkProgress();
    });
  };

  const updateHybridProgressFromPhase = (phase: string | null) => {
    if (!phase) return;
    
    switch (phase) {
      case 'ocr_completed':
        setHybridProgress(prev => ({ ...prev, ocrComplete: true }));
        setAwsProcessingStage('entity_extraction');
        break;
      case 'aws_processing_completed':
        setHybridProgress(prev => ({ 
          ...prev, 
          awsEntitiesExtracted: true,
          terminologyValidated: true
        }));
        setAwsProcessingStage('llm_enhancement');
        break;
      case 'llm_enhancement':
        setHybridProgress(prev => ({ ...prev, llmEnhanced: true }));
        setAwsProcessingStage('merging_results');
        break;
      case 'completed':
        setHybridProgress(prev => ({ ...prev, resultsmerged: true }));
        setAwsProcessingStage('completed');
        break;
    }
  };

  const resetHybridProgress = () => {
    setHybridProgress({
      ocrComplete: false,
      awsEntitiesExtracted: false,
      terminologyValidated: false,
      llmEnhanced: false,
      resultsmerged: false
    });
  };

  /**
   * Check if AWS services are available for processing
   */
  const checkAWSAvailability = async (): Promise<{
    textract: boolean;
    comprehendMedical: boolean;
    terminologyValidation: boolean;
  }> => {
    try {
      // Simple health check by testing with minimal data
      const healthChecks = await Promise.allSettled([
        supabase.functions.invoke('aws-textract-document', { 
          body: { filePath: 'health-check' } 
        }),
        supabase.functions.invoke('aws-comprehend-medical', { 
          body: { text: 'health check' } 
        }),
        supabase.functions.invoke('validate-medical-terminology', { 
          body: { entities: [] } 
        })
      ]);
      
      return {
        textract: healthChecks[0].status === 'fulfilled',
        comprehendMedical: healthChecks[1].status === 'fulfilled',
        terminologyValidation: healthChecks[2].status === 'fulfilled'
      };
    } catch (error) {
      console.warn('AWS availability check failed:', error);
      return {
        textract: false,
        comprehendMedical: false,
        terminologyValidation: false
      };
    }
  };

  return {
    // Enhanced functions
    processDocumentHybrid,
    checkAWSAvailability,
    
    // Hybrid-specific state
    awsProcessingStage,
    hybridProgress,
    
    // Base functions (delegated)
    processDocument: baseProcessing.processDocument,
    checkDuplicateDocument: baseProcessing.checkDuplicateDocument,
    reprocessDocument: baseProcessing.reprocessDocument,
    reprocessAllDocuments: baseProcessing.reprocessAllDocuments,
    
    // Combined state
    isProcessing: baseProcessing.isProcessing,
    retryCount: baseProcessing.retryCount,
    fhirProcessing: baseProcessing.fhirProcessing
  };
}