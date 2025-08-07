import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractText } from 'https://esm.sh/unpdf@0.11.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a medical document analysis AI that extracts structured data from medical reports, lab results, prescriptions, and other healthcare documents. Along with extracting medical information, you must also generate an intelligent document name based on the content. Return valid JSON that includes both the extracted data AND a suggested document name.`;

// Enhanced prompts with intelligent naming
const getPromptForReportType = (reportType: string): string => {
  switch (reportType.toLowerCase()) {
    case 'lab_results':
    case 'lab':
      return `Extract structured data from this lab results document with proper hierarchical organization. You MUST include a "suggestedName" field following the pattern "Lab Results - [Primary Test/Panel] - [Date]" (e.g., "Lab Results - Complete Blood Count - 2024-01-15"). Return valid JSON only.`;
    case 'prescription':
    case 'pharmacy':
      return `Extract structured data from this prescription document. You MUST include a "suggestedName" field following the pattern "Prescription - [Primary Medication] - [Date]" (e.g., "Prescription - Lisinopril - 2024-01-15"). Return valid JSON only.`;
    case 'radiology':
    case 'imaging':
    case 'xray':
    case 'mri':
    case 'ct':
      return `Extract structured data from this radiology report. You MUST include a "suggestedName" field following the pattern "[Study Type] - [Body Part] - [Date]" (e.g., "CT Scan - Chest - 2024-01-15"). Return valid JSON only.`;
    case 'vitals':
    case 'vital_signs':
      return `Extract structured data from this vital signs document. You MUST include a "suggestedName" field following the pattern "Vital Signs - [Primary Measurement] - [Date]" (e.g., "Vital Signs - Blood Pressure - 2024-01-15"). Return valid JSON only.`;
    default:
      return `Extract structured data from this general medical document. You MUST include a "suggestedName" field following the pattern "[Document Type] - [Provider/Facility] - [Date]" (e.g., "Medical Record - Dr. Smith - 2024-01-15"). Return valid JSON only.`;
  }
};

const generateFallbackDocumentName = (
  reportType: string, 
  parsedData: any, 
  reportDate: string
): string => {
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const formattedDate = formatDate(reportDate);

  switch (reportType?.toLowerCase()) {
    case 'lab_results':
    case 'lab':
      if (parsedData?.tests?.length > 0) {
        const primaryTest = parsedData.tests[0];
        if (primaryTest.isProfileHeader && primaryTest.name) {
          return `Lab Results - ${primaryTest.name} - ${formattedDate}`;
        } else if (primaryTest.name) {
          return `Lab Results - ${primaryTest.name} - ${formattedDate}`;
        }
      }
      return `Lab Results - ${formattedDate}`;

    case 'prescription':
    case 'pharmacy':
      if (parsedData?.medications?.length > 0) {
        const primaryMed = parsedData.medications[0];
        if (primaryMed.name) {
          return `Prescription - ${primaryMed.name} - ${formattedDate}`;
        }
      }
      return `Prescription - ${formattedDate}`;

    case 'radiology':
    case 'imaging':
    case 'xray':
    case 'mri':
    case 'ct':
      if (parsedData?.study) {
        const studyType = parsedData.study.type || reportType.toUpperCase();
        const bodyPart = parsedData.study.bodyPart || '';
        if (bodyPart) {
          return `${studyType} - ${bodyPart} - ${formattedDate}`;
        }
        return `${studyType} - ${formattedDate}`;
      }
      return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Scan - ${formattedDate}`;

    case 'vitals':
    case 'vital_signs':
      if (parsedData?.vitals?.length > 0) {
        const primaryVital = parsedData.vitals[0];
        if (primaryVital.type) {
          const vitalType = primaryVital.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `Vital Signs - ${vitalType} - ${formattedDate}`;
        }
      }
      return `Vital Signs - ${formattedDate}`;

    default:
      const provider = parsedData?.provider || parsedData?.prescriber || parsedData?.orderingPhysician;
      const facility = parsedData?.facility;
      
      if (provider) {
        return `Medical Record - ${provider} - ${formattedDate}`;
      } else if (facility) {
        return `Medical Record - ${facility} - ${formattedDate}`;
      }
      return `Medical Document - ${formattedDate}`;
  }
};

// File size limit: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    console.log('Extracting text from PDF using unpdf');
    
    // Convert ArrayBuffer to Uint8Array for unpdf
    const pdfData = new Uint8Array(pdfBuffer);
    
    // Extract text using unpdf
    const result = await extractText(pdfData);
    console.log('Raw extraction result:', typeof result, result);
    
    // Handle different return types from unpdf
    let extractedText: string = '';
    
    if (result && typeof result === 'object') {
      // Check if result has a text property
      if ('text' in result && result.text) {
        extractedText = typeof result.text === 'string' ? result.text : String(result.text || '');
      }
      // Fallback: check if result itself is the text
      else if (typeof result === 'string') {
        extractedText = result;
      }
      // Fallback: stringify the result if it's not empty
      else if (result) {
        extractedText = String(result);
      }
    } else if (typeof result === 'string') {
      extractedText = result;
    } else if (result) {
      // Last resort: convert whatever we got to string
      extractedText = String(result);
    }
    
    // Clean and validate the extracted text
    const cleanedText = extractedText?.trim?.() || '';
    
    if (cleanedText && cleanedText.length > 0) {
      console.log(`Successfully extracted ${cleanedText.length} characters from PDF`);
      return cleanedText;
    } else {
      console.log('No text found in PDF or text is empty');
      return '';
    }
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    // Return empty string to trigger fallback to OpenAI Vision API
    return '';
  }
};

const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

const isPDFFile = (fileType: string): boolean => {
  return fileType === 'application/pdf';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let reportId: string | null = null

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const requestBody = await req.json()
    reportId = requestBody.reportId
    console.log('Processing medical document for report:', reportId)

    // Get the report details
    const { data: report, error: reportError } = await supabaseClient
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      throw new Error('Report not found')
    }

    // Update status to processing
    await supabaseClient
      .from('reports')
      .update({ parsing_status: 'processing' })
      .eq('id', reportId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('medical-documents')
      .download(report.file_url)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file')
    }

    // Check file size
    const fileSize = fileData.size
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum limit of 20MB`)
    }

    console.log(`Processing file of size: ${fileSize} bytes, type: ${report.file_type}`)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = getPromptForReportType(report.report_type)
    let aiResponse: string = ''

    if (isPDFFile(report.file_type)) {
      // Handle PDF files with text extraction
      console.log('Processing PDF file with text extraction')
      
      const arrayBuffer = await fileData.arrayBuffer()
      let extractedText = await extractTextFromPDF(arrayBuffer)
      
      // If text extraction fails or returns empty, throw an error
      if (!extractedText.trim()) {
        throw new Error('Unable to extract text from PDF. Please ensure the PDF contains readable text or try uploading it as an image instead.');
      } else {
        // Use text-based completion for extracted PDF text
        console.log('Using extracted text for processing')
        
        const textResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: `${prompt}\n\nDocument text:\n${extractedText}` }
            ],
            max_tokens: 8000,
            temperature: 0.1
          })
        })

        if (!textResponse.ok) {
          const errorText = await textResponse.text()
          throw new Error(`OpenAI Text API error: ${textResponse.status} - ${errorText}`)
        }

        const textData = await textResponse.json()
        aiResponse = textData.choices?.[0]?.message?.content || ''
      }
    } else if (isImageFile(report.file_type)) {
      // Handle image files with vision API
      console.log('Processing image file with vision API')
      
      const arrayBuffer = await fileData.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const base64 = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))

      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: prompt },
                { 
                  type: 'image_url', 
                  image_url: { url: `data:${report.file_type};base64,${base64}` }
                }
              ]
            }
          ],
          max_tokens: 8000,
          temperature: 0.1
        })
      })

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text()
        throw new Error(`OpenAI Vision API error: ${visionResponse.status} - ${errorText}`)
      }

      const visionData = await visionResponse.json()
      aiResponse = visionData.choices?.[0]?.message?.content || ''
    } else {
      throw new Error(`Unsupported file type: ${report.file_type}`)
    }

    if (!aiResponse) {
      throw new Error('No response from AI model')
    }

    let parsedData = null
    let confidence = 0.8
    let suggestedName = null

    try {
      parsedData = JSON.parse(aiResponse)
      confidence = parsedData.confidence || 0.8
      suggestedName = parsedData.suggestedName
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, storing as text')
      // Store the raw response if JSON parsing fails
      parsedData = { rawResponse: aiResponse }
    }

    // Generate intelligent document name
    let finalDocumentName = suggestedName
    if (!finalDocumentName) {
      // Fallback to our own naming logic if AI didn't provide a name
      finalDocumentName = generateFallbackDocumentName(report.report_type, parsedData, report.report_date)
    }

    // Clean up the suggested name (remove invalid characters, limit length)
    if (finalDocumentName) {
      finalDocumentName = finalDocumentName
        .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid file chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 200) // Limit length
    }

    // Update report with results including the intelligent name
    const updateFields: any = {
      parsing_status: 'completed',
      extracted_text: aiResponse,
      parsed_data: parsedData,
      parsing_confidence: confidence,
      parsing_model: 'gpt-4o-mini',
      processing_error: null
    }

    // Only update title if we have a meaningful name
    if (finalDocumentName && finalDocumentName !== 'Processing...') {
      updateFields.title = finalDocumentName
    }

    const { error: updateError } = await supabaseClient
      .from('reports')
      .update(updateFields)
      .eq('id', reportId)

    if (updateError) {
      throw new Error('Failed to update report with parsing results')
    }

    console.log('Document processing completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        parsedData,
        confidence,
        processingTime: Date.now()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Document processing error:', error)
    
    if (reportId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
        
        await supabaseClient
          .from('reports')
          .update({
            parsing_status: 'failed',
            processing_error: error.message
          })
          .eq('id', reportId)
      } catch (updateError) {
        console.error('Failed to update error status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})