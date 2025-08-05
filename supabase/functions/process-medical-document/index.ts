import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as pdfjs from 'https://esm.sh/pdfjs-dist@4.0.379'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a medical document analysis AI that extracts structured data from medical reports, lab results, prescriptions, and other healthcare documents. Analyze the provided document and extract relevant medical information accurately. Structure the data according to medical document standards and return valid JSON only.`;

const getPromptForReportType = (reportType: string) => {
  const prompts = {
    'lab_results': 'Extract lab test results with values, units, reference ranges, and status indicators.',
    'prescription': 'Extract medications with dosages, frequencies, instructions, and prescriber information.',
    'radiology': 'Extract study details, findings, and radiologist impressions.',
    'vitals': 'Extract vital signs measurements with values, units, and timestamps.',
  };
  return prompts[reportType] || 'Extract relevant medical information and structure it appropriately.';
};

// File size limit: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const convertPDFToImages = async (pdfBuffer: ArrayBuffer): Promise<string[]> => {
  try {
    console.log('Converting PDF to images using PDF.js');
    
    // Load PDF document
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
    const numPages = pdf.numPages;
    console.log(`PDF has ${numPages} pages`);
    
    const images: string[] = [];
    const maxPages = Math.min(numPages, 5); // Limit to first 5 pages for memory optimization
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // High resolution for better OCR
        
        // Optimize dimensions for OpenAI Vision API (max 2048x2048)
        const maxDimension = 2048;
        let scale = 2.0;
        if (viewport.width > maxDimension || viewport.height > maxDimension) {
          scale = Math.min(maxDimension / viewport.width, maxDimension / viewport.height) * 2.0;
        }
        
        const finalViewport = page.getViewport({ scale });
        
        // Create canvas
        const canvas = new OffscreenCanvas(finalViewport.width, finalViewport.height);
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Failed to get canvas context');
        }
        
        // Render page to canvas
        await page.render({
          canvasContext: context,
          viewport: finalViewport
        }).promise;
        
        // Convert to JPEG with 85% quality for optimal balance
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const base64 = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
        
        images.push(`data:image/jpeg;base64,${base64}`);
        console.log(`Converted page ${pageNum} to image (${bytes.length} bytes)`);
        
        // Clean up page resources
        page.cleanup();
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    // Clean up PDF resources
    pdf.destroy();
    
    if (images.length === 0) {
      throw new Error('No pages could be converted to images');
    }
    
    console.log(`Successfully converted ${images.length} pages to images`);
    return images;
  } catch (error) {
    console.error('PDF to image conversion failed:', error);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
};

const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  // For now, return empty string to force image conversion fallback
  console.log('Using PDF-to-image conversion for better processing');
  return '';
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
      
      // If text extraction fails or returns empty, fall back to vision API with image conversion
      if (!extractedText.trim()) {
        console.log('Converting PDF to images for vision API processing')
        const images = await convertPDFToImages(arrayBuffer)
        
        // Process all converted images (for multi-page PDFs)
        const imageContents = images.map(imageBase64 => ({
          type: 'image_url',
          image_url: { url: imageBase64 }
        }))
        
        // Create message content with text prompt and all images
        const messageContent = [
          { type: 'text', text: `${prompt}\n\nThis document has ${images.length} page(s). Please analyze all pages and provide a comprehensive extraction.` },
          ...imageContents
        ]
        
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
                content: messageContent
              }
            ],
            max_tokens: 4000, // Increased for multi-page processing
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
            max_tokens: 2000,
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
          max_tokens: 2000,
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

    try {
      parsedData = JSON.parse(aiResponse)
      confidence = parsedData.confidence || 0.8
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, storing as text')
      // Store the raw response if JSON parsing fails
      parsedData = { rawResponse: aiResponse }
    }

    // Update report with results
    const { error: updateError } = await supabaseClient
      .from('reports')
      .update({
        parsing_status: 'completed',
        extracted_text: aiResponse,
        parsed_data: parsedData,
        parsing_confidence: confidence,
        parsing_model: 'gpt-4o-mini',
        processing_error: null
      })
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