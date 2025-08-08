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
  comprehensive: `Analyze the following medical reports and create a comprehensive health summary. Group findings by priority level. Return ONLY a JSON object (no markdown code blocks) with this exact structure:
{
  "summary": "Brief overall health status",
  "high_priority": {
    "findings": ["Critical finding 1", "Critical finding 2"],
    "recommendations": ["Urgent action 1", "Urgent action 2"]
  },
  "medium_priority": {
    "findings": ["Important finding 1", "Important finding 2"],
    "recommendations": ["Important action 1", "Important action 2"]
  },
  "low_priority": {
    "findings": ["Minor finding 1", "Minor finding 2"],
    "recommendations": ["General recommendation 1", "General recommendation 2"]
  },
  "confidence_score": 0.85
}`,

  abnormal_findings: `Analyze the following medical reports and identify all abnormal findings grouped by severity. Return ONLY a JSON object (no markdown code blocks) with this exact structure:
{
  "summary": "Brief overview of abnormal findings",
  "high_priority": {
    "findings": ["Severe abnormality 1"],
    "severity": "severe",
    "recommendations": ["Immediate action required"]
  },
  "medium_priority": {
    "findings": ["Moderate abnormality 1"],
    "severity": "moderate", 
    "recommendations": ["Follow up needed"]
  },
  "low_priority": {
    "findings": ["Mild abnormality 1"],
    "severity": "mild",
    "recommendations": ["Monitor over time"]
  },
  "overall_concern_level": "mild|moderate|severe",
  "confidence_score": 0.90
}`,

  trend_analysis: `Analyze the following medical reports for trends over time, grouped by priority. Return ONLY a JSON object (no markdown code blocks) with this exact structure:
{
  "summary": "Brief overview of health trends",
  "high_priority": {
    "trends": ["Concerning trend 1"],
    "timeframe": "Recent months",
    "recommendations": ["Immediate attention needed"]
  },
  "medium_priority": {
    "trends": ["Notable trend 1"],
    "timeframe": "Past 6 months",
    "recommendations": ["Monitor closely"]
  },
  "low_priority": {
    "trends": ["Minor improvement 1"],
    "timeframe": "Long term",
    "recommendations": ["Continue current approach"]
  },
  "confidence_score": 0.88
}`,

  doctor_prep: `Prepare talking points for a doctor visit based on these medical reports, prioritized by importance. Return ONLY a JSON object (no markdown code blocks) with this exact structure:
{
  "summary": "Key topics to discuss with doctor",
  "high_priority": {
    "topics": ["Urgent topic 1"],
    "questions": ["Critical question 1"],
    "symptoms": ["Concerning symptom 1"]
  },
  "medium_priority": {
    "topics": ["Important topic 1"],
    "questions": ["Important question 1"],
    "symptoms": ["Notable symptom 1"]
  },
  "low_priority": {
    "topics": ["General topic 1"],
    "questions": ["General question 1"],
    "symptoms": ["Minor symptom 1"]
  },
  "confidence_score": 0.92
}`
};

const COMPREHENSIVE_JSON_SCHEMA = `Return ONLY a JSON object (no markdown code blocks) with this exact structure:\n{\n  "summary": "Brief overall health status",\n  "categories": [\n    {\n      "name": "Category name (e.g., Cardiac, Thyroid, Blood Tests)",\n      "tests_included": ["list of tests"],\n      "key_findings": ["abnormal or borderline results summary"],\n      "interpretation": "brief interpretation",\n      "risk_score": 0,\n      "high_priority": [{ "finding": "...", "recommendation": "..." }],\n      "medium_priority": [{ "finding": "...", "recommendation": "..." }],\n      "low_priority": [{ "finding": "...", "recommendation": "..." }]\n    }\n  ],\n  "overall_health_risk_score": 0,\n  "confidence_score": 0.85\n}`;

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

// Build the system prompt (append JSON schema when using a custom comprehensive prompt)
let systemPrompt: string;
if (customPrompt && summaryType === 'comprehensive') {
  systemPrompt = `${customPrompt}\n\n${COMPREHENSIVE_JSON_SCHEMA}`;
} else {
  systemPrompt = customPrompt || MEDICAL_PROMPTS[summaryType];
}

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