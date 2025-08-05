import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METADATA_EXTRACTION_PROMPT = `You are a medical document analysis expert. Analyze the provided document and extract the following metadata for form auto-completion.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Brief descriptive title for the document",
  "reportType": "lab_results" | "radiology" | "procedure" | "pathology" | "consultation" | "prescription" | "vaccination" | "discharge" | "allergy" | "mental_health" | "general",
  "physicianName": "Doctor's name if mentioned, null if not found",
  "facilityName": "Medical facility/hospital/clinic name if mentioned, null if not found", 
  "description": "Brief 1-2 sentence description of what this document contains"
}

Guidelines:
- title: Create a clear, concise title (e.g., "Blood Test Results - January 2024", "Chest X-Ray Report")
- reportType: Choose the most appropriate category from the available options
- physicianName: Extract full doctor name, include title if present (Dr., MD, etc.)
- facilityName: Extract hospital, clinic, lab, or medical facility name
- description: Summarize the document's purpose and key content briefly
- Use null for any field that cannot be determined from the document`;

// Helper function to convert array buffer to base64 safely
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks to prevent stack overflow
  let result = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(result);
}

serve(async (req) => {
  console.log('Extract document metadata function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    const { filePath } = requestBody;
    
    if (!filePath) {
      console.error('Missing filePath in request');
      throw new Error('File path is required');
    }

    console.log('Extracting metadata for file:', filePath);

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('medical-documents')
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Get file buffer and check size
    const fileBuffer = await fileData.arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    
    console.log('File downloaded, size:', fileSize);

    // Check file size to prevent stack overflow (limit to 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxFileSize) {
      throw new Error('File size too large for metadata extraction. Please upload files smaller than 10MB.');
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Determine file type and create appropriate API call
    const isImage = filePath.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i);
    const isPDF = filePath.toLowerCase().endsWith('.pdf');

    let openAIResponse;

    if (isImage) {
      // For images, use vision API with safe base64 conversion
      const base64Image = arrayBufferToBase64(fileBuffer);
      
      openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: METADATA_EXTRACTION_PROMPT },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/${isImage[1]};base64,${base64Image}`,
                    detail: 'low' // Use low detail to reduce processing overhead
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        }),
      });
    } else if (isPDF) {
      // For PDFs, we need to extract text first since OpenAI Vision API doesn't support PDFs
      console.log('PDF detected, extracting text first...');
      
      // Import unpdf for text extraction
      const { extractText } = await import('https://esm.sh/unpdf@0.11.0');
      
      try {
        const pdfData = new Uint8Array(fileBuffer);
        const result = await extractText(pdfData);
        
        let extractedText = '';
        if (result && typeof result === 'object' && 'text' in result) {
          extractedText = typeof result.text === 'string' ? result.text : String(result.text || '');
        } else if (typeof result === 'string') {
          extractedText = result;
        }
        
        const cleanedText = extractedText?.trim?.() || '';
        
        if (!cleanedText || cleanedText.length < 10) {
          throw new Error('Unable to extract meaningful text from PDF');
        }
        
        console.log(`Extracted ${cleanedText.length} characters from PDF`);
        
        // Use text-based analysis instead of vision
        openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: METADATA_EXTRACTION_PROMPT + '\n\nDocument text to analyze:\n' + cleanedText.substring(0, 8000) // Limit to first 8000 chars
              }
            ],
            max_tokens: 500,
            temperature: 0.1
          }),
        });
      } catch (pdfError) {
        console.error('PDF text extraction failed:', pdfError);
        throw new Error('Failed to extract text from PDF for metadata analysis');
      }
    } else {
      throw new Error('Unsupported file type for metadata extraction');
    }

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorText}`);
    }

    const result = await openAIResponse.json();
    console.log('OpenAI response:', result);

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid OpenAI response format');
    }

    const extractedContent = result.choices[0].message.content;
    console.log('Extracted content:', extractedContent);

    // Parse the JSON response
    let metadata;
    try {
      // Clean up the response to extract JSON
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing extracted metadata:', parseError);
      throw new Error('Failed to parse extracted metadata');
    }

    // Validate the metadata structure
    const requiredFields = ['title', 'reportType', 'physicianName', 'facilityName', 'description'];
    for (const field of requiredFields) {
      if (!(field in metadata)) {
        metadata[field] = null;
      }
    }

    console.log('Successfully extracted metadata:', metadata);

    // Clean up the temporary file
    try {
      await supabaseClient.storage
        .from('medical-documents')
        .remove([filePath]);
      console.log('Temporary file cleaned up:', filePath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
      // Don't fail the whole request for cleanup errors
    }

    return new Response(JSON.stringify({ 
      success: true, 
      metadata 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-document-metadata function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});