import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContextDocument {
  id: string;
  title: string;
  content: string;
  parsed_data?: any;
  report_type: string;
  report_date: string;
  facility_name?: string;
  physician_name?: string;
  confidence: number;
}

interface ChatRequest {
  message: string;
  conversation_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const start = Date.now();
  const requestId = crypto.randomUUID();
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { message, conversation_id }: ChatRequest = await req.json();

    if (!message?.trim()) {
      throw new Error('Message is required');
    }

    console.log(`Processing message from user ${user.id}: ${message}`);

    // Retrieve relevant medical documents using vector similarity or keyword search
    const contextDocuments = await findRelevantDocuments(supabase, user.id, message);
    
    console.log(`Found ${contextDocuments.length} relevant documents`);

    // Prepare context for AI with enhanced content extraction
    const contextText = contextDocuments
      .map(doc => {
        // Prioritize parsed_data over raw extracted_text for better analysis
        let content = '';
        
        if (doc.parsed_data && typeof doc.parsed_data === 'object') {
          // Extract structured data from parsed results
          content = formatParsedData(doc.parsed_data, doc.report_type);
        } else {
          // Fallback to extracted text with increased limit
          content = doc.content.substring(0, 4500);
        }
        
        return `Document: ${doc.title} (${doc.report_type}, ${doc.report_date})
Report Content:
${content}
Facility: ${doc.facility_name || 'N/A'}
Physician: ${doc.physician_name || 'N/A'}`;
      })
      .join('\n\n---\n\n');

    // Create enhanced system prompt for comprehensive analysis
    const systemPrompt = `You are a helpful AI medical assistant specialized in analyzing medical documents, particularly blood test reports and lab results. You have access to the user's medical documents and can provide comprehensive insights based on their health records.

IMPORTANT GUIDELINES:
- Always base your responses on the provided medical documents
- For blood test reports, analyze ALL test panels and sections (thyroid, lipids, iron studies, complete blood count, etc.)
- Never provide medical diagnoses or treatment recommendations
- Suggest consulting healthcare professionals for medical advice
- Be clear about the limitations of your analysis
- Reference specific documents and test results when providing information
- Use clear, non-technical language when possible
- If no relevant documents are found, explain this to the user
- When summarizing lab results, include all relevant test panels and highlight any abnormal values
- Compare values to reference ranges when available
- Present information in a structured, easy-to-understand format

ANALYSIS APPROACH FOR BLOOD TESTS:
- Review all test panels comprehensively (don't focus on just one section)
- Identify normal vs abnormal values
- Provide context for what different test results mean
- Highlight trends if multiple reports are available
- Organize findings by test category (e.g., thyroid function, lipid profile, etc.)

Available medical documents:
${contextText || 'No relevant documents found for this query.'}`;

    const userPrompt = `User question: ${message}

Please provide a helpful response based on the available medical documents. If you reference specific information, mention which document it came from.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;

    console.log('AI response generated successfully');

    // Prepare citations from context documents
    const citations = contextDocuments.map(doc => ({
      report_id: doc.id,
      title: doc.title,
      report_type: doc.report_type,
      report_date: doc.report_date,
      facility_name: doc.facility_name,
      physician_name: doc.physician_name,
      confidence: doc.confidence,
    }));

    return new Response(JSON.stringify({
      response: aiResponse,
      context_documents: contextDocuments,
      citations: citations,
      request_id: requestId,
      duration_ms: Date.now() - start,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI medical assistant:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm sorry, I encountered an error while processing your request. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function findRelevantDocuments(
  supabase: any, 
  userId: string, 
  query: string
): Promise<ContextDocument[]> {
  try {
    // First, try to find documents using keyword matching
    const keywords = extractKeywords(query);
    
    console.log(`Searching for documents with keywords: ${keywords.join(', ')}`);

    // Search in reports table for relevant documents
    let queryBuilder = supabase
      .from('reports')
      .select(`
        id,
        title,
        extracted_text,
        report_type,
        report_date,
        facility_name,
        physician_name,
        parsing_confidence,
        parsed_data
      `)
      .eq('user_id', userId)
      .not('extracted_text', 'is', null)
      .order('report_date', { ascending: false });

    const { data: reports, error } = await queryBuilder.limit(20);

    if (error) {
      console.error('Error fetching reports:', error);
      return [];
    }

    if (!reports || reports.length === 0) {
      console.log('No reports found for user');
      return [];
    }

    // Score and filter documents based on relevance
    const scoredDocuments = reports
      .map(report => {
        const content = report.extracted_text || '';
        const title = report.title || '';
        const reportType = report.report_type || '';
        
        let score = 0;
        
        // Score based on keyword matches
        keywords.forEach(keyword => {
          const regex = new RegExp(keyword, 'gi');
          score += (content.match(regex) || []).length * 2;
          score += (title.match(regex) || []).length * 3;
          score += (reportType.match(regex) || []).length * 2;
        });

        // Boost recent documents
        const daysSinceReport = Math.floor(
          (Date.now() - new Date(report.report_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceReport < 30) score += 2;
        if (daysSinceReport < 90) score += 1;

        // Boost high-confidence parsing
        if (report.parsing_confidence && report.parsing_confidence > 0.8) {
          score += 1;
        }

        return {
          ...report,
          relevanceScore: score,
        };
      })
      .filter(doc => doc.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5 most relevant documents

    console.log(`Returning ${scoredDocuments.length} relevant documents`);

    return scoredDocuments.map(doc => ({
      id: doc.id,
      title: doc.title || 'Untitled Document',
      content: doc.extracted_text || '',
      parsed_data: doc.parsed_data,
      report_type: doc.report_type || 'general',
      report_date: doc.report_date,
      facility_name: doc.facility_name,
      physician_name: doc.physician_name,
      confidence: doc.relevanceScore,
    }));

  } catch (error) {
    console.error('Error finding relevant documents:', error);
    return [];
  }
}

function extractKeywords(query: string): string[] {
  // Remove common stop words and extract meaningful keywords
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'what', 'how', 'when', 'where',
    'why', 'who', 'my', 'me', 'i', 'you', 'your', 'can', 'could', 'should',
    'would', 'do', 'does', 'did', 'have', 'had', 'this', 'these', 'those'
  ]);

  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Add some medical-specific keyword expansions
  const medicalKeywords: { [key: string]: string[] } = {
    'blood': ['blood', 'hematology', 'hemoglobin', 'hgb', 'hct'],
    'sugar': ['glucose', 'blood sugar', 'diabetes', 'a1c', 'hemoglobin a1c'],
    'pressure': ['blood pressure', 'hypertension', 'bp', 'systolic', 'diastolic'],
    'cholesterol': ['cholesterol', 'lipid', 'hdl', 'ldl', 'triglycerides'],
    'heart': ['cardiac', 'cardiology', 'heart', 'ecg', 'ekg', 'echo'],
    'kidney': ['renal', 'kidney', 'creatinine', 'bun', 'gfr'],
    'liver': ['hepatic', 'liver', 'ast', 'alt', 'bilirubin'],
  };

  const expandedKeywords = new Set(words);
  
  words.forEach(word => {
    if (medicalKeywords[word]) {
      medicalKeywords[word].forEach(synonym => expandedKeywords.add(synonym));
    }
  });

  return Array.from(expandedKeywords);
}

function formatParsedData(parsedData: any, reportType: string): string {
  try {
    if (!parsedData || typeof parsedData !== 'object') {
      return 'No structured data available';
    }

    let formattedContent = '';
    let actualData = parsedData;

    // Parse the rawResponse if it exists and is a string
    if (parsedData.rawResponse && typeof parsedData.rawResponse === 'string') {
      try {
        actualData = JSON.parse(parsedData.rawResponse);
        console.log('Successfully parsed rawResponse');
      } catch (parseError) {
        console.log('Failed to parse rawResponse, using original data');
        actualData = parsedData;
      }
    }

    // Handle lab results with comprehensive formatting
    if (reportType === 'lab_results' || reportType === 'blood_test') {
      // Check for the correct data structure: reports array
      if (actualData.reports && Array.isArray(actualData.reports)) {
        formattedContent += 'BLOOD TEST RESULTS - ALL PANELS:\n';
        
        actualData.reports.forEach((report: any, reportIndex: number) => {
          if (report.panel) {
            formattedContent += `\n${reportIndex + 1}. ${report.panel}:\n`;
          }
          
          if (report.tests && Array.isArray(report.tests)) {
            report.tests.forEach((test: any) => {
              const testName = test.test_name || test.name || 'Unknown Test';
              const value = test.value || test.result || 'N/A';
              const unit = test.unit || test.units || '';
              const range = test.reference_range || test.ref_range || test.normal_range || '';
              const status = test.status || test.flag || '';
              
              formattedContent += `   - ${testName}: ${value}`;
              if (unit) formattedContent += ` ${unit}`;
              if (range) formattedContent += ` (Ref: ${range})`;
              if (status && status.toLowerCase() !== 'normal') {
                formattedContent += ` [${status.toUpperCase()}]`;
              }
              formattedContent += '\n';
            });
          }
        });
      }
      
      // Fallback: Check for legacy data structures
      else if (actualData.test_panels && Array.isArray(actualData.test_panels)) {
        formattedContent += 'TEST PANELS:\n';
        actualData.test_panels.forEach((panel: any, index: number) => {
          formattedContent += `\n${index + 1}. ${panel.panel_name || 'Unknown Panel'}:\n`;
          if (panel.tests && Array.isArray(panel.tests)) {
            panel.tests.forEach((test: any) => {
              const value = test.value || 'N/A';
              const unit = test.unit || '';
              const range = test.reference_range || '';
              const status = test.status || '';
              formattedContent += `   - ${test.test_name}: ${value} ${unit}`;
              if (range) formattedContent += ` (Ref: ${range})`;
              if (status && status !== 'normal') formattedContent += ` [${status.toUpperCase()}]`;
              formattedContent += '\n';
            });
          }
        });
      }

      // Add individual test results if not in panels
      else if (actualData.test_results && Array.isArray(actualData.test_results)) {
        formattedContent += 'INDIVIDUAL TEST RESULTS:\n';
        actualData.test_results.forEach((test: any) => {
          const value = test.value || 'N/A';
          const unit = test.unit || '';
          const range = test.reference_range || '';
          const status = test.status || '';
          formattedContent += `- ${test.test_name}: ${value} ${unit}`;
          if (range) formattedContent += ` (Ref: ${range})`;
          if (status && status !== 'normal') formattedContent += ` [${status.toUpperCase()}]`;
          formattedContent += '\n';
        });
      }
    }

    // Handle other report types
    if (actualData.medications && Array.isArray(actualData.medications)) {
      formattedContent += '\nMEDICATIONS:\n';
      actualData.medications.forEach((med: any) => {
        formattedContent += `- ${med.name || med.medication_name}: ${med.dosage || 'N/A'} ${med.frequency || ''}\n`;
      });
    }

    if (actualData.findings && Array.isArray(actualData.findings)) {
      formattedContent += '\nFINDINGS:\n';
      actualData.findings.forEach((finding: any) => {
        formattedContent += `- ${finding.description || finding}\n`;
      });
    }

    if (actualData.recommendations && Array.isArray(actualData.recommendations)) {
      formattedContent += '\nRECOMMENDATIONS:\n';
      actualData.recommendations.forEach((rec: any) => {
        formattedContent += `- ${rec.description || rec}\n`;
      });
    }

    // Add summary or impression
    if (actualData.summary) {
      formattedContent += `\nSUMMARY: ${actualData.summary}\n`;
    }

    if (actualData.impression) {
      formattedContent += `\nIMPRESSION: ${actualData.impression}\n`;
    }

    // If no structured content was found, return raw JSON with increased limit
    if (!formattedContent.trim()) {
      console.log('No structured content found, returning raw JSON');
      return JSON.stringify(actualData, null, 2).substring(0, 6000);
    }

    // Increase content limit to ensure all panels are included
    return formattedContent.substring(0, 8000);
  } catch (error) {
    console.error('Error formatting parsed data:', error);
    return 'Error processing structured data';
  }
}