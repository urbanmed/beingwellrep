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
  "reportType": "lab_results" | "prescription" | "radiology" | "vitals" | "consultation" | "general",
  "physicianName": "Doctor's name if mentioned, null if not found",
  "facilityName": "Medical facility/hospital/clinic name if mentioned, null if not found", 
  "description": "Brief 1-2 sentence description of what this document contains"
}

Guidelines:
- title: Create a clear, concise title (e.g., "Blood Test Results - January 2024", "Chest X-Ray Report")
- reportType: Choose the most appropriate category
- physicianName: Extract full doctor name, include title if present (Dr., MD, etc.)
- facilityName: Extract hospital, clinic, lab, or medical facility name
- description: Summarize the document's purpose and key content briefly
- Use null for any field that cannot be determined from the document`;

serve(async (req) => {
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

    const { filePath } = await req.json();
    
    if (!filePath) {
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

    // Get file buffer
    const fileBuffer = await fileData.arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    
    console.log('File downloaded, size:', fileSize);

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
      // For images, use vision API
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
      
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
                    detail: 'high'
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
      // For PDFs, convert to image and use vision API
      const base64PDF = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
      
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
                    url: `data:application/pdf;base64,${base64PDF}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        }),
      });
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