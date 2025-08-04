import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummaryRequest {
  reportIds: string[];
  summaryType: 'comprehensive' | 'abnormal_findings' | 'trend_analysis' | 'doctor_prep';
  customPrompt?: string;
}

const MEDICAL_PROMPTS = {
  comprehensive: `You are a medical AI assistant helping patients understand their health reports. Analyze the provided medical report(s) and create a comprehensive, patient-friendly summary.

Please structure your response as a JSON object with these exact fields:
{
  "summary": "A clear, easy-to-understand explanation of the key findings",
  "abnormal_findings": ["List of any abnormal or concerning findings"],
  "normal_findings": ["List of normal findings for reassurance"],
  "recommended_actions": ["Specific actions the patient should consider"],
  "doctor_questions": ["5-7 specific questions the patient should ask their doctor"],
  "severity_level": "low|moderate|high",
  "confidence_score": 0.85
}

Guidelines:
- Use simple, non-medical language
- Explain medical terms when necessary
- Be reassuring about normal findings
- Be clear but not alarming about concerning findings
- Focus on actionable information
- Provide specific, relevant questions for the doctor`,

  abnormal_findings: `You are a medical AI assistant. Focus specifically on identifying and explaining abnormal findings in the medical report(s).

Respond with a JSON object:
{
  "abnormal_findings": [
    {
      "finding": "Brief description",
      "explanation": "Patient-friendly explanation",
      "significance": "What this might mean",
      "urgency": "low|moderate|high"
    }
  ],
  "overall_concern_level": "low|moderate|high",
  "immediate_action_needed": true/false,
  "confidence_score": 0.85
}`,

  trend_analysis: `You are a medical AI assistant analyzing health trends across multiple reports. Compare findings across time periods.

Respond with a JSON object:
{
  "trends": [
    {
      "parameter": "What is being tracked",
      "trend": "improving|stable|worsening",
      "details": "Explanation of the trend"
    }
  ],
  "overall_health_trajectory": "improving|stable|declining",
  "key_insights": ["Important observations about health progression"],
  "confidence_score": 0.85
}`,

  doctor_prep: `You are a medical AI assistant helping patients prepare for their doctor visit. Based on the medical report(s), generate specific questions and talking points.

Respond with a JSON object:
{
  "key_topics": ["Main topics to discuss"],
  "specific_questions": ["Detailed questions about findings"],
  "symptoms_to_mention": ["Related symptoms to bring up"],
  "preparation_tips": ["How to prepare for the appointment"],
  "confidence_score": 0.85
}`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { reportIds, summaryType, customPrompt }: SummaryRequest = await req.json();

    console.log('Generating summary for reports:', reportIds, 'Type:', summaryType);

    // Get the user from the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    // Fetch the reports with OCR text
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .in('id', reportIds)
      .eq('user_id', user.id);

    if (reportsError) {
      throw new Error(`Failed to fetch reports: ${reportsError.message}`);
    }

    if (!reports || reports.length === 0) {
      throw new Error('No reports found');
    }

    // Check if all reports have OCR text
    const reportsWithoutOCR = reports.filter(r => !r.ocr_text || r.ocr_text.trim() === '');
    if (reportsWithoutOCR.length > 0) {
      const reportTitles = reportsWithoutOCR.map(r => r.title).join(', ');
      throw new Error(`The following reports do not have processed OCR text yet: ${reportTitles}. Please wait for OCR processing to complete or retry OCR processing for these reports.`);
    }

    // Combine all OCR text
    const combinedText = reports.map(r => 
      `Report: ${r.title} (${r.report_date})\n${r.ocr_text}`
    ).join('\n\n---\n\n');

    // Get the appropriate prompt
    const systemPrompt = customPrompt || MEDICAL_PROMPTS[summaryType];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: combinedText }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      // If JSON parsing fails, create a basic structure
      parsedResponse = {
        summary: aiResponse,
        confidence_score: 0.7
      };
    }

    // Generate a title based on the summary type
    const titleMap = {
      comprehensive: 'Comprehensive Health Summary',
      abnormal_findings: 'Abnormal Findings Analysis',
      trend_analysis: 'Health Trends Analysis',
      doctor_prep: 'Doctor Visit Preparation'
    };

    // Save the summary to the database
    const { data: summary, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        user_id: user.id,
        title: titleMap[summaryType],
        summary_type: summaryType,
        content: JSON.stringify(parsedResponse),
        source_report_ids: reportIds,
        generated_at: new Date().toISOString(),
        ai_model_used: 'gpt-4o',
        confidence_score: parsedResponse.confidence_score || 0.8
      })
      .select()
      .single();

    if (summaryError) {
      throw new Error(`Failed to save summary: ${summaryError.message}`);
    }

    console.log('Summary generated successfully:', summary.id);

    return new Response(JSON.stringify({
      success: true,
      summary: summary,
      content: parsedResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-summary function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});