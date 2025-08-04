import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { reportId } = await req.json()
    console.log('Processing OCR for report:', reportId)

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
      .update({ ocr_status: 'processing' })
      .eq('id', reportId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('medical-documents')
      .download(report.file_url)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file')
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // Call Google Vision API
    const visionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    if (!visionApiKey) {
      throw new Error('Google Vision API key not configured')
    }

    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }]
        }]
      })
    })

    if (!visionResponse.ok) {
      throw new Error(`Vision API error: ${visionResponse.status}`)
    }

    const visionData = await visionResponse.json()
    console.log('Vision API response:', visionData)

    let ocrText = ''
    let confidence = 0

    if (visionData.responses?.[0]?.fullTextAnnotation) {
      ocrText = visionData.responses[0].fullTextAnnotation.text || ''
      // Calculate average confidence from detected text
      const pages = visionData.responses[0].fullTextAnnotation.pages || []
      if (pages.length > 0) {
        const allWords = pages.flatMap((page: any) => 
          page.blocks?.flatMap((block: any) => 
            block.paragraphs?.flatMap((para: any) => 
              para.words || []
            ) || []
          ) || []
        )
        if (allWords.length > 0) {
          confidence = allWords.reduce((sum: number, word: any) => sum + (word.confidence || 0), 0) / allWords.length
        }
      }
    }

    // Update report with OCR results
    const { error: updateError } = await supabaseClient
      .from('reports')
      .update({
        ocr_status: 'completed',
        ocr_text: ocrText,
        ocr_confidence: confidence,
        processing_error: null
      })
      .eq('id', reportId)

    if (updateError) {
      throw new Error('Failed to update report with OCR results')
    }

    console.log('OCR processing completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        text: ocrText, 
        confidence: confidence 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('OCR processing error:', error)
    
    // Try to update report with error status if we have reportId
    try {
      const { reportId } = await req.json()
      if (reportId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
        
        await supabaseClient
          .from('reports')
          .update({
            ocr_status: 'failed',
            processing_error: error.message
          })
          .eq('id', reportId)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
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