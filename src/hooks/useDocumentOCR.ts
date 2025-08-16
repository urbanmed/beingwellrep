import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OCRResult {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
  metadata?: {
    pageCount?: number;
    detectedLanguage?: string;
    processingTime?: number;
    extractionMethod?: string;
  };
}

interface UseDocumentOCROptions {
  language?: string;
  enhanceText?: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: (result: OCRResult) => void;
  onError?: (error: string) => void;
}

export const useDocumentOCR = (options: UseDocumentOCROptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const { toast } = useToast();

  const {
    language = 'en',
    enhanceText = true,
    onProgress,
    onComplete,
    onError
  } = options;

  const processDocument = useCallback(async (filePath: string): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      // Update progress
      setProgress(25);
      onProgress?.(25);

      console.log('Starting OCR processing for:', filePath);

      // Call the OCR edge function
      const { data, error } = await supabase.functions.invoke('ocr-document', {
        body: {
          filePath,
          language,
          enhanceText
        }
      });

      setProgress(75);
      onProgress?.(75);

      if (error) {
        console.error('OCR function error:', error);
        throw new Error(error.message || 'OCR processing failed');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'OCR processing failed');
      }

      setProgress(100);
      onProgress?.(100);

      const ocrResult: OCRResult = {
        success: true,
        extractedText: data.extractedText,
        confidence: data.confidence,
        metadata: data.metadata
      };

      setResult(ocrResult);
      onComplete?.(ocrResult);

      toast({
        title: "OCR Complete",
        description: `Successfully extracted ${data.extractedText?.length || 0} characters with ${Math.round((data.confidence || 0) * 100)}% confidence`,
      });

      console.log('OCR processing completed:', {
        textLength: data.extractedText?.length,
        confidence: data.confidence,
        method: data.metadata?.extractionMethod
      });

      return ocrResult;

    } catch (error) {
      console.error('OCR processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'OCR processing failed';
      
      const errorResult: OCRResult = {
        success: false,
        error: errorMessage
      };

      setResult(errorResult);
      onError?.(errorMessage);

      toast({
        title: "OCR Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, [language, enhanceText, onProgress, onComplete, onError, toast]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setResult(null);
  }, []);

  return {
    processDocument,
    isProcessing,
    progress,
    result,
    reset
  };
};