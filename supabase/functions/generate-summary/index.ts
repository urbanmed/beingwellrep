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
  comprehensive: `Analyze the following medical reports and create a comprehensive health summary. YOU MUST return STRICT JSON (no markdown). Add risk scoring.
Schema:
{
  "summary": string,
  "high_priority": { "findings": Array<string | { "text": string, "risk_score": number, "category": string }> , "recommendations": string[] },
  "medium_priority": { "findings": Array<string | { "text": string, "risk_score": number, "category": string }>, "recommendations": string[] },
  "low_priority": { "findings": Array<string | { "text": string, "risk_score": number, "category": string }>, "recommendations": string[] },
  "risk": {
    "overall_score": number,           // 1-100
    "level": "low" | "moderate" | "high",
    "category_breakdown": Array<{ "category": "cardiovascular"|"renal"|"metabolic"|"hematology"|"endocrine"|"pulmonary"|"neurology"|"gastroenterology"|"infectious"|"musculoskeletal"|"oncology"|"other", "score": number, "level": "low"|"moderate"|"high" }>
  },
  "confidence_score": number
}
Rules:
- Use category that best matches each finding.
- Compute overall_score as weighted by high>medium>low priority.
- Only return the JSON object.
`,

  abnormal_findings: `Analyze the following medical reports and identify abnormal findings grouped by severity. STRICT JSON ONLY. Include risk scoring.
Schema:
{
  "summary": string,
  "high_priority": { "findings": Array<string | { "text": string, "risk_score": number, "category": string }>, "severity": "severe", "recommendations": string[] },
  "medium_priority": { "findings": Array<string | { "text": string, "risk_score": number, "category": string }>, "severity": "moderate", "recommendations": string[] },
  "low_priority": { "findings": Array<string | { "text": string, "risk_score": number, "category": string }>, "severity": "mild", "recommendations": string[] },
  "overall_concern_level": "mild"|"moderate"|"severe",
  "risk": {
    "overall_score": number,
    "level": "low"|"moderate"|"high",
    "category_breakdown": Array<{ "category": "cardiovascular"|"renal"|"metabolic"|"hematology"|"endocrine"|"pulmonary"|"neurology"|"gastroenterology"|"infectious"|"musculoskeletal"|"oncology"|"other", "score": number, "level": "low"|"moderate"|"high" }>
  },
  "confidence_score": number
}
- Only return the JSON object.
`,

  trend_analysis: `Analyze the following medical reports for trends over time, grouped by priority. STRICT JSON ONLY. Include risk scoring.
Schema:
{
  "summary": string,
  "high_priority": { "trends": string[], "timeframe": string, "recommendations": string[] },
  "medium_priority": { "trends": string[], "timeframe": string, "recommendations": string[] },
  "low_priority": { "trends": string[], "timeframe": string, "recommendations": string[] },
  "risk": {
    "overall_score": number,
    "level": "low"|"moderate"|"high",
    "category_breakdown": Array<{ "category": "cardiovascular"|"renal"|"metabolic"|"hematology"|"endocrine"|"pulmonary"|"neurology"|"gastroenterology"|"infectious"|"musculoskeletal"|"oncology"|"other", "score": number, "level": "low"|"moderate"|"high" }>
  },
  "confidence_score": number
}
- Only return the JSON object.
`,

  doctor_prep: `Prepare talking points for a doctor visit based on these medical reports, prioritized by importance. STRICT JSON ONLY. Include risk scoring.
Schema:
{
  "summary": string,
  "high_priority": { "topics": string[], "questions": string[], "symptoms": string[] },
  "medium_priority": { "topics": string[], "questions": string[], "symptoms": string[] },
  "low_priority": { "topics": string[], "questions": string[], "symptoms": string[] },
  "risk": {
    "overall_score": number,
    "level": "low"|"moderate"|"high",
    "category_breakdown": Array<{ "category": "cardiovascular"|"renal"|"metabolic"|"hematology"|"endocrine"|"pulmonary"|"neurology"|"gastroenterology"|"infectious"|"musculoskeletal"|"oncology"|"other", "score": number, "level": "low"|"moderate"|"high" }>
  },
  "confidence_score": number
}
- Only return the JSON object.
`
};

serve(async (req) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
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

    // Check if all reports have extracted text
    const reportsWithoutText = reports.filter(r => !r.extracted_text || r.extracted_text.trim() === '');
    if (reportsWithoutText.length > 0) {
      const reportTitles = reportsWithoutText.map(r => r.title).join(', ');
      throw new Error(`The following reports do not have processed OCR text yet: ${reportTitles}. Please wait for OCR processing to complete or retry OCR processing for these reports.`);
    }

    // Combine all extracted text
    const combinedText = reports.map(r => 
      `Report: ${r.title} (${r.report_date})\n${r.extracted_text}`
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
        model: 'gpt-4.1-2025-04-14',
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
    let aiResponse = data.choices[0].message.content;

    console.log('Raw AI response:', aiResponse);

    // Enhanced content cleaning to handle various response formats
    aiResponse = aiResponse.trim();
    
    // Remove markdown code blocks (multiple patterns)
    aiResponse = aiResponse.replace(/```json\s*/g, '');
    aiResponse = aiResponse.replace(/```\s*/g, '');
    aiResponse = aiResponse.replace(/`{3,}/g, '');
    
    // Remove any leading/trailing whitespace and newlines
    aiResponse = aiResponse.trim();
    
    let parsedResponse;
    try {
      // First attempt: direct parsing
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      console.log('Direct JSON parse failed, attempting content extraction...');
      
      try {
        // Second attempt: find JSON object in the text
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON object found');
        }
      } catch (secondParseError) {
        console.error('Failed to parse AI response as JSON:', secondParseError);
        console.error('Raw content:', aiResponse);
        
        // Fallback: create structured content from text
        parsedResponse = {
          summary: aiResponse,
          high_priority: { findings: [], recommendations: [] },
          medium_priority: { findings: [], recommendations: [] },
          low_priority: { findings: [], recommendations: [] },
          confidence_score: 0.5
        };
      }
    }

    console.log('Parsed response:', parsedResponse);

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
        ai_model_used: 'gpt-4.1-2025-04-14',
        confidence_score: parsedResponse.confidence_score || 0.8
      })
      .select()
      .single();

    if (summaryError) {
      throw new Error(`Failed to save summary: ${summaryError.message}`);
    }

    console.log(`[generate-summary:${requestId}] success in ${Date.now() - start}ms`, { count: reportIds.length });
    return new Response(JSON.stringify({
      success: true,
      summary: summary,
      content: parsedResponse,
      request_id: requestId,
      duration_ms: Date.now() - start
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[generate-summary:${requestId}] error after ${Date.now() - start}ms`, error);
    return new Response(JSON.stringify({ 
      error: (error as any).message || 'An unexpected error occurred',
      request_id: requestId,
      duration_ms: Date.now() - start
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});