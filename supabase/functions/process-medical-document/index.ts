import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const base64 = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))

    console.log(`Processing file of size: ${bytes.length} bytes, type: ${report.file_type}`)

    // Call OpenAI API for document analysis
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = getPromptForReportType(report.report_type)
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices?.[0]?.message?.content

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
        confidence 
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