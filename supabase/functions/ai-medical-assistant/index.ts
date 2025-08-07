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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Prepare context for AI
    const contextText = contextDocuments
      .map(doc => `Document: ${doc.title} (${doc.report_type}, ${doc.report_date})
Content: ${doc.content.substring(0, 1000)}...
Facility: ${doc.facility_name || 'N/A'}
Physician: ${doc.physician_name || 'N/A'}`)
      .join('\n\n---\n\n');

    // Create system prompt
    const systemPrompt = `You are a helpful AI medical assistant. You have access to the user's medical documents and can provide insights based on their health records.

IMPORTANT GUIDELINES:
- Always base your responses on the provided medical documents
- Never provide medical diagnoses or treatment recommendations
- Suggest consulting healthcare professionals for medical advice
- Be clear about the limitations of your analysis
- Reference specific documents when providing information
- Use clear, non-technical language when possible
- If no relevant documents are found, explain this to the user

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
        max_tokens: 1000,
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