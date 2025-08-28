import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  filePath: string;
  language?: string;
  enhanceText?: boolean;
}

interface OCRResponse {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
  tables?: Array<{
    headers: string[];
    rows: string[][];
    confidence?: number;
  }>;
  forms?: Array<{
    key: string;
    value: string;
    confidence?: number;
  }>;
  metadata?: {
    pageCount?: number;
    detectedLanguage?: string;
    processingTime?: number;
    extractionMethod?: string;
    structuredDataFound?: boolean;
  };
}

// Helper function to convert file to base64
async function fileToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let result = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(result);
}

// Google Vision OCR processing
async function processWithGoogleVision(
  fileBuffer: ArrayBuffer,
  fileName: string,
  language?: string
): Promise<{ text: string; confidence: number; metadata: any }> {
  const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  if (!googleApiKey) {
    throw new Error('Google Vision API key not configured');
  }

  const base64Content = await fileToBase64(fileBuffer);
  const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i);
  const mimeType = isImage ? `image/${isImage[1]}` : 'application/pdf';

  const requestBody = {
    requests: [{
      image: {
        content: base64Content
      },
      features: [{
        type: 'TEXT_DETECTION',
        maxResults: 1
      }],
      imageContext: language ? {
        languageHints: [language]
      } : undefined
    }]
  };

  console.log('Sending request to Google Vision API...');
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Vision API error:', errorText);
    throw new Error(`Google Vision API error: ${response.status}`);
  }

  const result = await response.json();
  console.log('Google Vision API response received');

  if (result.responses?.[0]?.error) {
    throw new Error(`Google Vision error: ${result.responses[0].error.message}`);
  }

  const textAnnotations = result.responses?.[0]?.textAnnotations;
  if (!textAnnotations || textAnnotations.length === 0) {
    return {
      text: '',
      confidence: 0,
      metadata: {
        detectedLanguage: 'unknown',
        pageCount: 1
      }
    };
  }

  const extractedText = textAnnotations[0].description || '';
  const confidence = textAnnotations[0].confidence || 0.8;
  const detectedLanguage = result.responses?.[0]?.textAnnotations?.[0]?.locale || 'en';

  return {
    text: extractedText,
    confidence,
    metadata: {
      detectedLanguage,
      pageCount: 1,
      textLength: extractedText.length
    }
  };
}

// Fallback PDF text extraction
async function extractPDFText(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const { extractText } = await import('https://esm.sh/unpdf@0.11.0');
    const pdfData = new Uint8Array(fileBuffer);
    const result = await extractText(pdfData);
    
    if (result && typeof result === 'object' && 'text' in result) {
      return typeof result.text === 'string' ? result.text : String(result.text || '');
    } else if (typeof result === 'string') {
      return result;
    }
    
    return '';
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

serve(async (req) => {
  console.log('OCR document function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const requestBody: OCRRequest = await req.json();
    console.log('Request body received:', { 
      filePath: requestBody.filePath,
      language: requestBody.language,
      enhanceText: requestBody.enhanceText 
    });
    
    const { filePath, language = 'en', enhanceText = true } = requestBody;
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    console.log('Starting OCR for file:', filePath);

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('medical-documents')
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    
    console.log('File downloaded, size:', fileSize);

    // Check file size limit (20MB)
    const maxFileSize = 20 * 1024 * 1024;
    if (fileSize > maxFileSize) {
      throw new Error('File size too large for OCR processing. Please upload files smaller than 20MB.');
    }

    const fileName = filePath.split('/').pop() || 'unknown';
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    
    let extractedText = '';
    let confidence = 0;
    let metadata = {};
    let tables: any[] = [];
    let forms: any[] = [];

    try {
      // Phase 1: Try AWS Textract (Enhanced OCR with structured data)
      console.log('Starting hybrid OCR pipeline with AWS Textract...');
      try {
        const { data: textractData, error: textractError } = await supabaseClient.functions.invoke('aws-textract-document', {
          body: { filePath, language }
        });

        if (textractError) throw textractError;

        if (textractData?.success) {
          extractedText = textractData.extractedText || '';
          confidence = textractData.confidence || 0.8;
          tables = textractData.tables || [];
          forms = textractData.forms || [];
          
          metadata = {
            detectedLanguage: language,
            pageCount: 1,
            textLength: extractedText.length,
            extractionMethod: 'aws_textract',
            structuredDataFound: (tables.length > 0 || forms.length > 0)
          };
          
          console.log('✅ AWS Textract processing successful:', {
            textLength: extractedText.length,
            tablesFound: tables.length,
            formsFound: forms.length
          });
        } else {
          throw new Error('Textract processing failed');
        }
      } catch (textractError) {
        console.log('⚠️ AWS Textract failed, falling back to secondary methods:', textractError.message);
        
        // Phase 2: Fallback to Google Vision or PDF extraction
        if (isPDF) {
          // For PDFs, try direct text extraction first
          console.log('PDF detected, attempting direct text extraction...');
          try {
            extractedText = await extractPDFText(fileBuffer);
            if (extractedText.trim().length > 50) {
              confidence = 0.9;
              metadata = {
                detectedLanguage: language,
                pageCount: 1,
                textLength: extractedText.length,
                extractionMethod: 'direct_pdf',
                structuredDataFound: false
              };
              console.log('Direct PDF text extraction successful');
            } else {
              throw new Error('Poor quality text extraction, will use OCR');
            }
          } catch (pdfError) {
            console.log('Direct PDF extraction failed, falling back to Google Vision OCR...');
            const ocrResult = await processWithGoogleVision(fileBuffer, fileName, language);
            extractedText = ocrResult.text;
            confidence = ocrResult.confidence;
            metadata = { 
              ...ocrResult.metadata, 
              extractionMethod: 'google_vision_ocr',
              structuredDataFound: false
            };
          }
        } else {
          // For images, use Google Vision OCR
          console.log('Image detected, using Google Vision OCR...');
          const ocrResult = await processWithGoogleVision(fileBuffer, fileName, language);
          extractedText = ocrResult.text;
          confidence = ocrResult.confidence;
          metadata = { 
            ...ocrResult.metadata, 
            extractionMethod: 'google_vision_ocr',
            structuredDataFound: false
          };
        }
      }
    } catch (ocrError) {
      console.error('All OCR methods failed:', ocrError);
      throw new Error(`OCR processing failed: ${ocrError.message}`);
    }

    // Text enhancement (optional)
    if (enhanceText && extractedText.trim()) {
      try {
        console.log('Enhancing extracted text...');
        extractedText = enhanceExtractedText(extractedText);
      } catch (enhanceError) {
        console.warn('Text enhancement failed, using raw text:', enhanceError);
      }
    }

    const processingTime = Date.now() - startTime;
    
    const response: OCRResponse = {
      success: true,
      extractedText,
      confidence,
      tables,
      forms,
      metadata: {
        ...metadata,
        processingTime
      }
    };

    console.log('OCR processing completed successfully:', {
      textLength: extractedText.length,
      confidence,
      processingTime
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in OCR function:', error);
    const processingTime = Date.now() - startTime;
    
    const response: OCRResponse = {
      success: false,
      error: error.message,
      metadata: { processingTime }
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Text enhancement utility
function enhanceExtractedText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // Fix common OCR errors
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/\n{3,}/g, '\n\n')  // Multiple newlines to double
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add spaces between lowercase-uppercase
    .replace(/(\d)([A-Za-z])/g, '$1 $2')  // Add spaces between numbers and letters
    .replace(/([A-Za-z])(\d)/g, '$1 $2')  // Add spaces between letters and numbers
    .replace(/\.\s*([a-z])/g, '. $1')  // Fix periods without proper spacing
    .replace(/,([A-Za-z])/g, ', $1')  // Fix commas without proper spacing
    .trim();
}