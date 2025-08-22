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

interface FHIRContextData {
  observations: any[];
  medications: any[];
  diagnosticReports: any[];
  encounters: any[];
  carePlans: any[];
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

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client with RLS context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { message, conversation_id }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required', request_id: requestId }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!conversation_id || typeof conversation_id !== 'string') {
      return new Response(JSON.stringify({ error: 'conversation_id is required', request_id: requestId }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Processing message from user ${user.id}: ${message}`);

    // Retrieve relevant medical documents and FHIR data
    const contextDocuments = await findRelevantDocuments(supabase, user.id, message);
    const fhirData = await findRelevantFHIRData(supabase, user.id, message);
    
    console.log(`Found ${contextDocuments.length} relevant documents and FHIR data: ${fhirData.observations.length} observations, ${fhirData.medications.length} medications`);

    // Prepare enhanced context combining documents and FHIR data
    const documentContext = contextDocuments
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

    // Format FHIR data for AI context
    const fhirContext = formatFHIRContext(fhirData);
    
    // Combine all context
    const contextText = [documentContext, fhirContext].filter(Boolean).join('\n\n=== STRUCTURED FHIR DATA ===\n\n');

    // Create enhanced FHIR-aware system prompt for comprehensive analysis
    const systemPrompt = `You are an advanced AI medical assistant with access to both raw medical documents and structured FHIR (Fast Healthcare Interoperability Resources) data. You can analyze longitudinal health trends, correlate medications with lab results, and provide comprehensive insights based on standardized medical data.

ENHANCED CAPABILITIES WITH FHIR DATA:
- Analyze trends over time using structured FHIR Observations (lab values, vital signs)
- Correlate medications (FHIR MedicationRequests) with clinical outcomes
- Track care plan progress and health goals (FHIR CarePlans)
- Compare current results to historical patterns using structured data
- Identify medication adherence patterns and potential interactions
- Provide longitudinal analysis of health trajectories

IMPORTANT GUIDELINES:
- Prioritize structured FHIR data when available for trend analysis
- Always base responses on provided medical documents and FHIR resources
- For blood test reports, analyze ALL test panels and provide trend analysis when historical FHIR data exists
- Never provide medical diagnoses or treatment recommendations
- Suggest consulting healthcare professionals for medical advice
- Reference specific documents, dates, and FHIR resources when providing information
- Use clear, non-technical language while leveraging structured data insights
- When analyzing trends, specify the time periods and number of data points
- Highlight significant changes or patterns in FHIR Observations over time
- Correlate medication changes with subsequent lab result improvements/deteriorations

FHIR-ENHANCED ANALYSIS APPROACH:
- Review structured FHIR Observations for quantitative trend analysis
- Correlate FHIR MedicationRequests with clinical outcomes over time  
- Use FHIR reference ranges and status flags for abnormal value detection
- Analyze medication adherence patterns from FHIR data
- Identify care gaps or follow-up needs from FHIR CarePlans
- Compare current values to personalized baselines from historical FHIR data

Available medical data:
${contextText || 'No relevant medical data found for this query.'}`;

    const userPrompt = `User question: ${message}

Please provide a helpful response based on the available medical documents. If you reference specific information, mention which document it came from.`;

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25000);
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
      signal: controller.signal,
    });
    clearTimeout(t);

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

    console.log(`[ai-medical-assistant:${requestId}] outcome=success user=${user.id} duration_ms=${Date.now() - start} docs=${contextDocuments.length}`);
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
    console.error(`[ai-medical-assistant:${requestId}] outcome=error duration_ms=${Date.now() - start}`, error);
    return new Response(JSON.stringify({ 
      error: (error as any).message,
      response: "I'm sorry, I encountered an error while processing your request. Please try again.",
      request_id: requestId,
      duration_ms: Date.now() - start,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function findRelevantFHIRData(
  supabase: any,
  userId: string,
  query: string
): Promise<FHIRContextData> {
  try {
    const keywords = extractMedicalKeywords(query);
    const dateRange = extractDateRange(query);
    
    console.log(`Searching FHIR data with keywords: ${keywords.join(', ')}, date range: ${dateRange.start} to ${dateRange.end}`);

    // Query FHIR Observations (lab results, vital signs)
    let observationsQuery = supabase
      .from('fhir_observations')
      .select('*')
      .eq('user_id', userId)
      .order('effective_date_time', { ascending: false });

    if (dateRange.start) {
      observationsQuery = observationsQuery.gte('effective_date_time', dateRange.start);
    }
    if (dateRange.end) {
      observationsQuery = observationsQuery.lte('effective_date_time', dateRange.end);
    }

    // Query FHIR MedicationRequests
    let medicationsQuery = supabase
      .from('fhir_medication_requests')
      .select('*')
      .eq('user_id', userId)
      .order('authored_on', { ascending: false });

    if (dateRange.start) {
      medicationsQuery = medicationsQuery.gte('authored_on', dateRange.start);
    }

    // Query FHIR DiagnosticReports
    let reportsQuery = supabase
      .from('fhir_diagnostic_reports')
      .select('*')
      .eq('user_id', userId)
      .order('effective_date_time', { ascending: false });

    // Execute all queries in parallel
    const [
      { data: observations = [] },
      { data: medications = [] },
      { data: diagnosticReports = [] },
      { data: encounters = [] },
      { data: carePlans = [] }
    ] = await Promise.all([
      observationsQuery.limit(20),
      medicationsQuery.limit(10),
      reportsQuery.limit(10),
      supabase.from('fhir_encounters').select('*').eq('user_id', userId).order('period_start', { ascending: false }).limit(5),
      supabase.from('fhir_care_plans').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
    ]);

    // Filter FHIR data by keyword relevance
    const relevantObservations = filterFHIRByKeywords(observations, keywords, 'observation_type');
    const relevantMedications = filterFHIRByKeywords(medications, keywords, 'medication_name');

    console.log(`Found ${relevantObservations.length} relevant FHIR observations, ${relevantMedications.length} medications`);

    return {
      observations: relevantObservations.slice(0, 15),
      medications: relevantMedications.slice(0, 8),
      diagnosticReports: diagnosticReports.slice(0, 5),
      encounters: encounters.slice(0, 3),
      carePlans: carePlans.slice(0, 3)
    };
  } catch (error) {
    console.error('Error finding relevant FHIR data:', error);
    return { observations: [], medications: [], diagnosticReports: [], encounters: [], carePlans: [] };
  }
}

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
  return extractMedicalKeywords(query);
}

function extractMedicalKeywords(query: string): string[] {
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

  // Enhanced medical-specific keyword expansions with LOINC codes and clinical terms
  const medicalKeywords: { [key: string]: string[] } = {
    'blood': ['blood', 'hematology', 'hemoglobin', 'hgb', 'hct', 'rbc', 'wbc', 'platelet', 'cbc'],
    'sugar': ['glucose', 'blood sugar', 'diabetes', 'a1c', 'hemoglobin a1c', 'hba1c', 'fasting glucose', 'random glucose'],
    'pressure': ['blood pressure', 'hypertension', 'bp', 'systolic', 'diastolic', 'arterial pressure'],
    'cholesterol': ['cholesterol', 'lipid', 'hdl', 'ldl', 'triglycerides', 'total cholesterol', 'lipid profile'],
    'heart': ['cardiac', 'cardiology', 'heart', 'ecg', 'ekg', 'echo', 'troponin', 'bnp', 'nt-probnp'],
    'kidney': ['renal', 'kidney', 'creatinine', 'bun', 'gfr', 'urea', 'urinalysis', 'microalbumin'],
    'liver': ['hepatic', 'liver', 'ast', 'alt', 'bilirubin', 'alkaline phosphatase', 'ggt', 'liver function'],
    'thyroid': ['thyroid', 'tsh', 't3', 't4', 'free t4', 'free t3', 'thyroglobulin', 'anti-tpo'],
    'iron': ['iron', 'ferritin', 'tibc', 'transferrin', 'hemoglobin', 'anemia', 'iron deficiency'],
    'vitamin': ['vitamin', 'vit d', 'vitamin d', 'b12', 'folate', 'vitamin b12', '25-oh vitamin d'],
    'inflammation': ['crp', 'c-reactive protein', 'esr', 'sed rate', 'inflammation', 'inflammatory markers'],
    'infection': ['wbc', 'white blood cell', 'neutrophil', 'lymphocyte', 'infection', 'sepsis', 'procalcitonin']
  };

  const expandedKeywords = new Set(words);
  
  words.forEach(word => {
    if (medicalKeywords[word]) {
      medicalKeywords[word].forEach(synonym => expandedKeywords.add(synonym));
    }
  });

  return Array.from(expandedKeywords);
}

function extractDateRange(query: string): { start: string | null; end: string | null } {
  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  // Temporal pattern matching
  const patterns = [
    { regex: /last (\d+) months?/i, months: true },
    { regex: /past (\d+) months?/i, months: true },
    { regex: /last (\d+) weeks?/i, weeks: true },
    { regex: /past (\d+) weeks?/i, weeks: true },
    { regex: /last (\d+) days?/i, days: true },
    { regex: /past (\d+) days?/i, days: true },
    { regex: /last year/i, years: 1 },
    { regex: /past year/i, years: 1 },
    { regex: /last 6 months/i, months: 6 },
    { regex: /past 6 months/i, months: 6 },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (match) {
      const value = match[1] ? parseInt(match[1]) : (pattern as any).years || (pattern as any).months || 6;
      start = new Date(now);
      
      if ((pattern as any).months || pattern.months) {
        start.setMonth(start.getMonth() - value);
      } else if ((pattern as any).weeks || pattern.weeks) {
        start.setDate(start.getDate() - (value * 7));
      } else if ((pattern as any).days || pattern.days) {
        start.setDate(start.getDate() - value);
      }
      
      end = now;
      break;
    }
  }

  return {
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null
  };
}

function filterFHIRByKeywords(resources: any[], keywords: string[], searchField: string): any[] {
  if (!keywords.length) return resources;
  
  return resources.filter(resource => {
    const searchText = (resource[searchField] || '').toLowerCase();
    const resourceData = JSON.stringify(resource.resource_data || {}).toLowerCase();
    
    return keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase()) || 
      resourceData.includes(keyword.toLowerCase())
    );
  });
}

function formatFHIRContext(fhirData: FHIRContextData): string {
  let context = '';

  // Format FHIR Observations (lab results, vitals)
  if (fhirData.observations.length > 0) {
    context += 'STRUCTURED LAB RESULTS & VITAL SIGNS (FHIR Observations):\n';
    fhirData.observations.forEach(obs => {
      const resourceData = obs.resource_data || {};
      const value = resourceData.valueQuantity || resourceData.valueString || 'N/A';
      const unit = resourceData.valueQuantity?.unit || '';
      const referenceRange = resourceData.referenceRange?.[0];
      const date = obs.effective_date_time ? new Date(obs.effective_date_time).toLocaleDateString() : 'Unknown';
      
      context += `- ${obs.observation_type}: ${typeof value === 'object' ? value.value : value} ${unit}`;
      if (referenceRange) {
        context += ` (Ref: ${referenceRange.low?.value || ''}-${referenceRange.high?.value || ''})`;
      }
      context += ` [${date}]\n`;
    });
    context += '\n';
  }

  // Format FHIR Medications
  if (fhirData.medications.length > 0) {
    context += 'CURRENT MEDICATIONS (FHIR MedicationRequests):\n';
    fhirData.medications.forEach(med => {
      const resourceData = med.resource_data || {};
      const dosage = resourceData.dosageInstruction?.[0]?.text || 'Dosage not specified';
      const date = med.authored_on ? new Date(med.authored_on).toLocaleDateString() : 'Unknown';
      
      context += `- ${med.medication_name}: ${dosage} [Prescribed: ${date}]\n`;
    });
    context += '\n';
  }

  // Format Care Plans
  if (fhirData.carePlans.length > 0) {
    context += 'ACTIVE CARE PLANS (FHIR CarePlans):\n';
    fhirData.carePlans.forEach(plan => {
      context += `- ${plan.title}: ${plan.description || 'No description'} [Status: ${plan.status}]\n`;
    });
    context += '\n';
  }

  return context;
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