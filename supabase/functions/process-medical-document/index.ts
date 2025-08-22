import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractText } from 'https://esm.sh/unpdf@0.11.0'

// FHIR converter imports (note: these would need to be available as Deno modules)
// For now we'll implement basic conversion logic directly

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a medical document analysis AI that extracts structured data from medical reports, lab results, prescriptions, and other healthcare documents. 

CRITICAL: You MUST return ONLY valid JSON. No markdown, no explanations, no additional text - just pure JSON.

Your response must include:
1. Structured medical data with proper status determination
2. A suggestedName field for intelligent document naming

For each test/measurement, you MUST determine status by comparing values to reference ranges:
- "critical" for values severely outside normal ranges (>2x upper limit or <50% lower limit)
- "high" for values above normal range
- "low" for values below normal range  
- "normal" for values within reference range

Return valid JSON only.`;

const getActiveCustomPrompt = async (supabaseClient: any): Promise<string | null> => {
  console.log('🔍 CUSTOM PROMPT DEBUG: Starting custom prompt fetch...');
  
  try {
    console.log('🔍 CUSTOM PROMPT DEBUG: Executing database query for active custom prompts...');
    
    const { data, error } = await supabaseClient
      .from('custom_prompts')
      .select('prompt_text, name, created_at, is_active')
      .eq('is_active', true)
      .limit(1);
    
    console.log('🔍 CUSTOM PROMPT DEBUG: Query executed. Error:', error, 'Data count:', data?.length || 0);
    
    if (error) {
      console.error('❌ CUSTOM PROMPT ERROR: Database error fetching custom prompt:', JSON.stringify(error, null, 2));
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ CUSTOM PROMPT DEBUG: No active custom prompts found in database');
      return null;
    }
    
    const customPrompt = data[0];
    console.log('✅ CUSTOM PROMPT DEBUG: Found active custom prompt:', {
      name: customPrompt.name,
      created_at: customPrompt.created_at,
      is_active: customPrompt.is_active,
      prompt_length: customPrompt.prompt_text?.length || 0
    });
    
    return customPrompt.prompt_text;
  } catch (error) {
    console.error('❌ CUSTOM PROMPT FATAL: Exception in custom prompt fetch:', error);
    console.error('❌ CUSTOM PROMPT FATAL: Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
};

const getPromptForReportType = (reportType: string): string => {
  const baseInstructions = `CRITICAL: Return ONLY valid JSON. No markdown formatting, no code blocks, no explanations.

For each test/measurement, determine status by comparing value to reference range:
- "critical": >2x upper limit or <50% lower limit 
- "high": above normal range
- "low": below normal range
- "normal": within normal range

Required JSON structure:`;

  switch (reportType.toLowerCase()) {
    case 'lab_results':
    case 'lab':
      return `${baseInstructions}
{
  "reportType": "lab",
  "suggestedName": "Lab Results - [Primary Test/Panel] - [Date]",
  "patient": {"name": "", "dateOfBirth": "", "id": ""},
  "tests": [
    {
      "name": "Test Name",
      "value": "numeric_value",
      "unit": "unit",
      "referenceRange": "low-high",
      "status": "normal|high|low|critical",
      "notes": ""
    }
  ],
  "orderingPhysician": "",
  "facility": "",
  "collectionDate": "",
  "reportDate": "",
  "confidence": 0.9
}`;
    case 'prescription':
    case 'pharmacy':
      return `${baseInstructions}
{
  "reportType": "prescription",
  "suggestedName": "Prescription - [Primary Medication] - [Date]",
  "patient": {"name": "", "dateOfBirth": "", "id": ""},
  "medications": [
    {
      "name": "Medication Name",
      "dosage": "",
      "frequency": "",
      "duration": "",
      "instructions": "",
      "quantity": "",
      "refills": 0
    }
  ],
  "prescriber": "",
  "pharmacy": "",
  "prescriptionDate": "",
  "confidence": 0.9
}`;
    case 'vitals':
    case 'vital_signs':
      return `${baseInstructions}
{
  "reportType": "vitals",
  "suggestedName": "Vital Signs - [Primary Measurement] - [Date]",
  "patient": {"name": "", "dateOfBirth": "", "id": ""},
  "vitals": [
    {
      "type": "blood_pressure|heart_rate|temperature|respiratory_rate|oxygen_saturation|weight|height|bmi",
      "value": "numeric_value",
      "unit": "",
      "status": "normal|high|low|critical",
      "timestamp": "",
      "notes": ""
    }
  ],
  "recordedBy": "",
  "facility": "",
  "recordDate": "",
  "confidence": 0.9
}`;
    default:
      return `${baseInstructions}
{
  "reportType": "general",
  "suggestedName": "[Document Type] - [Provider/Facility] - [Date]",
  "patient": {"name": "", "dateOfBirth": "", "id": ""},
  "sections": [
    {
      "title": "Section Title",
      "content": "Content text",
      "category": ""
    }
  ],
  "provider": "",
  "facility": "",
  "visitDate": "",
  "reportDate": "",
  "confidence": 0.9
}`;
  }
};

const transformSectionsToFHIRFormat = (data: any): any => {
  if (!data) return data;
  
  // If data already has the expected format, return as-is
  if (data.tests || data.medications || data.vitals) {
    return enhanceStatusDetermination(data);
  }
  
  // Transform sections to expected format based on report type
  if (data.sections && Array.isArray(data.sections)) {
    const reportType = data.reportType?.toLowerCase();
    
    if (reportType === 'lab' || reportType === 'lab_results') {
      // Extract lab tests from sections
      data.tests = [];
      data.sections.forEach(section => {
        if (!section || !section.content) return;
        
        // Handle different content structures
        const processContent = (content: any) => {
          if (content.name && content.value) {
            data.tests.push({
              name: content.name,
              value: content.value,
              unit: content.unit || '',
              referenceRange: content.referenceRange || content.normalRange || '',
              status: content.status || 'normal'
            });
          }
        };

        if (Array.isArray(section.content)) {
          section.content.forEach(processContent);
        } else if (typeof section.content === 'object') {
          processContent(section.content);
        }
      });
      console.log(`Transformed ${data.tests.length} lab tests from sections`);
    }
    
    if (reportType === 'prescription' || reportType === 'pharmacy') {
      // Extract medications from sections
      data.medications = [];
      data.sections.forEach(section => {
        if (!section || !section.content) return;
        
        // Handle different content structures
        const processContent = (content: any) => {
          if (content.medication || content.name) {
            data.medications.push({
              name: content.medication || content.name,
              dosage: content.dosage || content.dose || '',
              frequency: content.frequency || '',
              duration: content.duration || '',
              instructions: content.instructions || ''
            });
          }
        };

        if (Array.isArray(section.content)) {
          section.content.forEach(processContent);
        } else if (typeof section.content === 'object') {
          processContent(section.content);
        }
      });
      console.log(`Transformed ${data.medications.length} medications from sections`);
    }
    
    if (reportType === 'vitals' || reportType === 'vital_signs') {
      // Extract vitals from sections
      data.vitals = [];
      data.sections.forEach(section => {
        if (!section || !section.content) return;
        
        // Handle different content structures
        const processContent = (content: any) => {
          if (content.type && content.value) {
            data.vitals.push({
              type: content.type,
              value: content.value,
              unit: content.unit || '',
              timestamp: content.timestamp || data.recordDate || new Date().toISOString()
            });
          }
        };

        if (Array.isArray(section.content)) {
          section.content.forEach(processContent);
        } else if (typeof section.content === 'object') {
          processContent(section.content);
        }
      });
      console.log(`Transformed ${data.vitals.length} vitals from sections`);
    }
  }
  
  return enhanceStatusDetermination(data);
};

// Enhanced status determination logic
const enhanceStatusDetermination = (data: any): any => {
  if (!data) return data;
  
  // Enhance lab tests
  if (data.tests && Array.isArray(data.tests)) {
    data.tests = data.tests.map((test: any) => {
      if (!test.status && test.value && test.referenceRange) {
        test.status = determineTestStatus(test.value, test.referenceRange, test.unit);
      }
      return test;
    });
  }
  
  // Enhance vitals
  if (data.vitals && Array.isArray(data.vitals)) {
    data.vitals = data.vitals.map((vital: any) => {
      if (!vital.status && vital.value && vital.type) {
        vital.status = determineVitalStatus(vital.type, vital.value, vital.unit);
      }
      return vital;
    });
  }
  
  return data;
};

// Status determination for test values
const determineTestStatus = (value: string, referenceRange: string, unit?: string): string => {
  try {
    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (isNaN(numValue)) return 'normal';
    
    // Parse reference range (e.g., "70-100", "<5", ">10", "70 - 100")
    const range = referenceRange.toLowerCase().trim();
    
    if (range.includes('-')) {
      const parts = range.split('-').map(p => parseFloat(p.trim().replace(/[^\d.-]/g, '')));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const [low, high] = parts;
        if (numValue < low * 0.5) return 'critical'; // <50% of lower limit
        if (numValue > high * 2) return 'critical';   // >200% of upper limit
        if (numValue < low) return 'low';
        if (numValue > high) return 'high';
        return 'normal';
      }
    } else if (range.includes('<')) {
      const limit = parseFloat(range.replace(/[<\s]/g, ''));
      if (!isNaN(limit)) {
        if (numValue >= limit * 2) return 'critical';
        if (numValue >= limit) return 'high';
        return 'normal';
      }
    } else if (range.includes('>')) {
      const limit = parseFloat(range.replace(/[>\s]/g, ''));
      if (!isNaN(limit)) {
        if (numValue <= limit * 0.5) return 'critical';
        if (numValue <= limit) return 'low';
        return 'normal';
      }
    }
    
    return 'normal';
  } catch (error) {
    console.warn('Error determining test status:', error);
    return 'normal';
  }
};

// Status determination for vital signs
const determineVitalStatus = (type: string, value: string, unit?: string): string => {
  try {
    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (isNaN(numValue)) return 'normal';
    
    const vitalType = type.toLowerCase();
    
    // Standard vital sign ranges
    switch (vitalType) {
      case 'heart_rate':
      case 'pulse':
        if (numValue < 40) return 'critical';
        if (numValue > 140) return 'critical';
        if (numValue < 60 || numValue > 100) return 'high';
        return 'normal';
      
      case 'blood_pressure':
      case 'systolic':
        if (numValue > 180) return 'critical';
        if (numValue < 70) return 'critical';
        if (numValue > 140 || numValue < 90) return 'high';
        return 'normal';
      
      case 'temperature':
        if (unit?.toLowerCase().includes('f')) {
          if (numValue > 104 || numValue < 95) return 'critical';
          if (numValue > 100.4 || numValue < 97) return 'high';
        } else {
          if (numValue > 40 || numValue < 35) return 'critical';
          if (numValue > 38 || numValue < 36) return 'high';
        }
        return 'normal';
      
      case 'respiratory_rate':
        if (numValue < 8 || numValue > 30) return 'critical';
        if (numValue < 12 || numValue > 20) return 'high';
        return 'normal';
      
      case 'oxygen_saturation':
        if (numValue < 88) return 'critical';
        if (numValue < 95) return 'high';
        return 'normal';
      
      default:
        return 'normal';
    }
  } catch (error) {
    console.warn('Error determining vital status:', error);
    return 'normal';
  }
};

const extractDataFromTextResponse = (text: string, reportType: string): any => {
  try {
    // Try to find JSON-like content in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse extracted JSON:', e);
      }
    }
    
    // Create a basic structure with raw response
    return {
      reportType: reportType || 'general',
      rawResponse: text,
      extractedAt: new Date().toISOString(),
      confidence: 0.3, // Low confidence since we couldn't parse properly
      parseError: true
    };
  } catch (error) {
    console.error('Error in fallback text extraction:', error);
    return {
      reportType: reportType || 'general',
      rawResponse: text,
      extractedAt: new Date().toISOString(),
      confidence: 0.1,
      parseError: true
    };
  }
};

// Intelligent document naming with CBP detection
const generateIntelligentDocumentName = (
  parsedData: any, 
  reportDate: string
): string => {
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const formattedDate = formatDate(reportDate);

  // Lab results intelligent naming
  if (parsedData?.reportType === 'lab' && parsedData?.tests?.length > 0) {
    const testNames = parsedData.tests.map(t => t.name?.toLowerCase() || '');
    const testCount = parsedData.tests.length;
    
    // Detect comprehensive blood panels (CBP/CBC)
    const bloodTestKeywords = ['hemoglobin', 'hematocrit', 'wbc', 'rbc', 'platelet', 'mcv', 'mch', 'mchc'];
    const bloodTestCount = testNames.filter(name => 
      bloodTestKeywords.some(keyword => name.includes(keyword))
    ).length;
    
    // If 4+ blood tests, likely a CBP/CBC
    if (bloodTestCount >= 4) {
      return `Lab Results - Complete Blood Picture - ${formattedDate}`;
    }
    
    // Check for other comprehensive panels
    if (testCount >= 5) {
      const metabolicKeywords = ['glucose', 'sodium', 'potassium', 'chloride', 'bun', 'creatinine'];
      const metabolicCount = testNames.filter(name => 
        metabolicKeywords.some(keyword => name.includes(keyword))
      ).length;
      
      if (metabolicCount >= 4) {
        return `Lab Results - Comprehensive Metabolic Panel - ${formattedDate}`;
      }
      
      const lipidKeywords = ['cholesterol', 'triglyceride', 'hdl', 'ldl'];
      const lipidCount = testNames.filter(name => 
        lipidKeywords.some(keyword => name.includes(keyword))
      ).length;
      
      if (lipidCount >= 3) {
        return `Lab Results - Lipid Panel - ${formattedDate}`;
      }
    }
    
    // For single or few tests, use the primary test name
    const primaryTest = parsedData.tests[0];
    if (primaryTest?.name) {
      return `Lab Results - ${primaryTest.name} - ${formattedDate}`;
    }
    
    return `Lab Results - ${formattedDate}`;
  }

  return generateFallbackDocumentName(parsedData?.reportType || 'general', parsedData, reportDate);
};

const generateFallbackDocumentName = (
  reportType: string, 
  parsedData: any, 
  reportDate: string
): string => {
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const formattedDate = formatDate(reportDate);

  switch (reportType.toLowerCase()) {
    case 'prescription':
    case 'pharmacy':
      const primaryMed = parsedData?.medications?.[0]?.name;
      if (primaryMed) {
        return `Prescription - ${primaryMed} - ${formattedDate}`;
      }
      return `Prescription - ${formattedDate}`;

    case 'vitals':
    case 'vital_signs':
      const primaryVital = parsedData?.vitals?.[0]?.type;
      if (primaryVital) {
        return `Vital Signs - ${primaryVital.replace('_', ' ')} - ${formattedDate}`;
      }
      return `Vital Signs - ${formattedDate}`;

    case 'radiology':
    case 'imaging':
      return `Radiology Report - ${formattedDate}`;

    case 'pathology':
      return `Pathology Report - ${formattedDate}`;

    case 'discharge':
    case 'discharge_summary':
      return `Discharge Summary - ${formattedDate}`;

    case 'consultation':
    case 'visit':
      const provider = parsedData?.provider || parsedData?.physician;
      if (provider) {
        return `Consultation - ${provider} - ${formattedDate}`;
      }
      return `Medical Consultation - ${formattedDate}`;

    default:
      const facility = parsedData?.facility || parsedData?.provider;
      if (facility) {
        return `Medical Report - ${facility} - ${formattedDate}`;
      }
      return `Medical Document - ${formattedDate}`;
  }
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit

const PROCESSING_CONFIG = {
  SMALL_DOC_THRESHOLD: 2000,     // Use single-pass for docs under 2k chars
  MEDIUM_DOC_THRESHOLD: 8000,    // Use smart truncation for docs 2k-8k chars
  MAX_CHUNK_SIZE: 4000,          // Max chars per chunk for large docs
  MAX_OVERLAP: 200,              // Character overlap between chunks
  MAX_TOKENS: 2000,              // Max tokens for OpenAI
  TEMPERATURE: 0.1,              // Low temperature for consistent results
  MAX_RETRIES: 3                 // Max retries for API calls
};

// Enhanced document processing with robust strategies
const processDocumentContent = async (
  extractedText: string,
  reportType: string,
  openaiApiKey: string,
  prompt: string
): Promise<{ response: string; processingType: string }> => {
  const textLength = extractedText.length;
  console.log(`📊 Document size: ${textLength} characters`);

  // Strategy selection based on document size
  if (textLength <= PROCESSING_CONFIG.SMALL_DOC_THRESHOLD) {
    console.log('📝 Using single-pass processing for small document');
    return await processSingleDocument(extractedText, prompt, openaiApiKey);
  } else if (textLength <= PROCESSING_CONFIG.MEDIUM_DOC_THRESHOLD) {
    console.log('✂️ Using smart truncation for medium document');
    const truncatedText = smartTruncateDocument(extractedText, PROCESSING_CONFIG.MEDIUM_DOC_THRESHOLD - 500);
    return await processSingleDocument(truncatedText, prompt, openaiApiKey);
  } else {
    console.log('🔄 Using limited chunking for large document');
    return await processDocumentWithLimitedChunking(extractedText, prompt, openaiApiKey);
  }
};

// Smart document truncation that preserves key information
const smartTruncateDocument = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  console.log(`Truncating document from ${text.length} to ${maxLength} characters`);
  
  // Key sections to prioritize (medical documents often have these)
  const keyPatterns = [
    /patient\s*name|patient\s*id|date\s*of\s*birth/i,
    /test\s*results?|lab\s*results?|laboratory/i,
    /medication|prescription|drug/i,
    /vital\s*signs?|blood\s*pressure|temperature|pulse/i,
    /diagnosis|impression|assessment/i,
    /normal|abnormal|critical|high|low/i,
    /reference\s*range|normal\s*range/i
  ];
  
  // Split into paragraphs/sections
  const sections = text.split(/\n\s*\n|\r\n\s*\r\n/);
  const prioritizedSections = [];
  const regularSections = [];
  
  // Categorize sections by importance
  sections.forEach(section => {
    const hasKeyInfo = keyPatterns.some(pattern => pattern.test(section));
    if (hasKeyInfo) {
      prioritizedSections.push(section);
    } else {
      regularSections.push(section);
    }
  });
  
  // Rebuild document prioritizing key sections
  let result = prioritizedSections.join('\n\n');
  
  // Add regular sections if space allows
  for (const section of regularSections) {
    if ((result + '\n\n' + section).length <= maxLength) {
      result += '\n\n' + section;
    } else {
      // Add partial section if possible
      const remainingSpace = maxLength - result.length - 10; // Leave some buffer
      if (remainingSpace > 100) {
        result += '\n\n' + section.substring(0, remainingSpace) + '...';
      }
      break;
    }
  }
  
  console.log(`Smart truncation result: ${result.length} characters`);
  return result;
};

// Process small/medium documents in single API call
const processSingleDocument = async (
  text: string,
  prompt: string,
  openaiApiKey: string
): Promise<{ response: string; processingType: string }> => {
  console.log('Processing single document chunk');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${prompt}\n\nDocument content:\n${text}` }
      ],
      max_tokens: PROCESSING_CONFIG.MAX_TOKENS,
      temperature: PROCESSING_CONFIG.TEMPERATURE
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }

  return {
    response: content,
    processingType: 'single-pass'
  };
};

// Process very large documents with limited chunking
const processDocumentWithLimitedChunking = async (
  text: string,
  prompt: string,
  openaiApiKey: string
): Promise<{ response: string; processingType: string }> => {
  console.log('Processing document with limited chunking strategy');
  
  // Create maximum 3 chunks to keep processing manageable
  const chunks = createLimitedChunks(text, 3);
  console.log(`Created ${chunks.length} chunks for processing`);
  
  const chunkResults = [];
  
  // Process chunks sequentially to avoid rate limits
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    
    try {
      const result = await processSingleChunk(chunks[i], prompt, openaiApiKey, i + 1);
      chunkResults.push(result);
      
      // Add delay between requests to respect rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks even if one fails
      chunkResults.push({
        success: false,
        error: error.message,
        chunkIndex: i + 1
      });
    }
  }
  
  // Merge results from all chunks
  const mergedResult = mergeChunkResults(chunkResults);
  
  return {
    response: JSON.stringify(mergedResult),
    processingType: 'limited-chunking'
  };
};

// Process individual chunk
const processSingleChunk = async (
  chunkText: string,
  prompt: string,
  openaiApiKey: string,
  chunkIndex: number
): Promise<any> => {
  const chunkPrompt = `${prompt}\n\nThis is chunk ${chunkIndex} of a larger document. Extract any medical data you find and return it in the specified JSON format. If this chunk doesn't contain complete medical information, extract whatever relevant data you can find.\n\nDocument chunk:\n${chunkText}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: chunkPrompt }
      ],
      max_tokens: PROCESSING_CONFIG.MAX_TOKENS,
      temperature: PROCESSING_CONFIG.TEMPERATURE
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error for chunk ${chunkIndex}: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.warn(`Failed to parse JSON from chunk ${chunkIndex}, returning raw content`);
    return {
      success: false,
      rawContent: content,
      chunkIndex: chunkIndex,
      parseError: parseError.message
    };
  }
};

// Create limited number of chunks from large document
const createLimitedChunks = (text: string, maxChunks: number): string[] => {
  const chunkSize = Math.ceil(text.length / maxChunks);
  const chunks = [];
  
  for (let i = 0; i < maxChunks && i * chunkSize < text.length; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize + PROCESSING_CONFIG.MAX_OVERLAP, text.length);
    chunks.push(text.substring(start, end));
  }
  
  return chunks;
};

// Merge results from multiple chunks into single coherent result
const mergeChunkResults = (chunkResults: any[]): any => {
  console.log(`Merging results from ${chunkResults.length} chunks`);
  
  const successfulResults = chunkResults.filter(result => result.success !== false && !result.error);
  
  if (successfulResults.length === 0) {
    return {
      reportType: 'general',
      confidence: 0.3,
      error: 'Failed to process any chunks successfully',
      chunkErrors: chunkResults.map(r => r.error).filter(Boolean)
    };
  }
  
  // Start with the first successful result as base
  const baseResult = successfulResults[0];
  
  // Merge additional data from other chunks
  successfulResults.slice(1).forEach(result => {
    // Merge tests
    if (result.tests && Array.isArray(result.tests)) {
      baseResult.tests = [...(baseResult.tests || []), ...result.tests];
    }
    
    // Merge medications
    if (result.medications && Array.isArray(result.medications)) {
      baseResult.medications = [...(baseResult.medications || []), ...result.medications];
    }
    
    // Merge vitals
    if (result.vitals && Array.isArray(result.vitals)) {
      baseResult.vitals = [...(baseResult.vitals || []), ...result.vitals];
    }
    
    // Merge sections
    if (result.sections && Array.isArray(result.sections)) {
      baseResult.sections = [...(baseResult.sections || []), ...result.sections];
    }
    
    // Update patient info if missing
    if (!baseResult.patient && result.patient) {
      baseResult.patient = result.patient;
    }
    
    // Update facility/provider info if missing  
    if (!baseResult.facility && result.facility) {
      baseResult.facility = result.facility;
    }
    
    if (!baseResult.orderingPhysician && result.orderingPhysician) {
      baseResult.orderingPhysician = result.orderingPhysician;
    }
  });
  
  // Remove duplicates and calculate average confidence
  if (baseResult.tests) {
    baseResult.tests = removeDuplicateTests(baseResult.tests);
  }
  
  if (baseResult.medications) {
    baseResult.medications = removeDuplicateMedications(baseResult.medications);
  }
  
  const avgConfidence = successfulResults.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / successfulResults.length;
  baseResult.confidence = avgConfidence;
  
  baseResult.processingNote = `Merged from ${successfulResults.length} chunks`;
  
  console.log(`Merge complete: ${baseResult.tests?.length || 0} tests, ${baseResult.medications?.length || 0} medications`);
  
  return baseResult;
};

// Remove duplicate tests based on name similarity
const removeDuplicateTests = (tests: any[]): any[] => {
  const uniqueTests = [];
  const seenNames = new Set();
  
  tests.forEach(test => {
    const normalizedName = test.name?.toLowerCase()?.trim();
    if (normalizedName && !seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      uniqueTests.push(test);
    }
  });
  
  return uniqueTests;
};

// Remove duplicate medications based on name similarity
const removeDuplicateMedications = (medications: any[]): any[] => {
  const uniqueMeds = [];
  const seenNames = new Set();
  
  medications.forEach(med => {
    const normalizedName = med.name?.toLowerCase()?.trim();
    if (normalizedName && !seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      uniqueMeds.push(med);
    }
  });
  
  return uniqueMeds;
};

const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    console.log('Extracting text from PDF using unpdf');
    
    // Convert ArrayBuffer to Uint8Array for unpdf
    const pdfData = new Uint8Array(pdfBuffer);
    
    // Extract text using unpdf
    const result = await extractText(pdfData);
    console.log('Raw extraction result:', typeof result, result);
    
    // Handle different return types from unpdf
    let extractedText: string = '';
    
    if (result && typeof result === 'object') {
      // Check if result has a text property
      if ('text' in result && result.text) {
        extractedText = typeof result.text === 'string' ? result.text : String(result.text || '');
      }
      // Fallback: check if result itself is the text
      else if (typeof result === 'string') {
        extractedText = result;
      }
      // Fallback: stringify the result if it's not empty
      else if (result) {
        extractedText = String(result);
      }
    } else if (typeof result === 'string') {
      extractedText = result;
    } else if (result) {
      // Last resort: convert whatever we got to string
      extractedText = String(result);
    }
    
    // Clean and validate the extracted text
    const cleanedText = extractedText?.trim?.() || '';
    
    if (cleanedText && cleanedText.length > 0) {
      console.log(`Successfully extracted ${cleanedText.length} characters from PDF`);
      return cleanedText;
    } else {
      console.log('No text found in PDF or text is empty');
      return '';
    }
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    // Return empty string to trigger fallback to OpenAI Vision API
    return '';
  }
};

const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

const isPDFFile = (fileType: string): boolean => {
  return fileType === 'application/pdf';
};

// FHIR ID generation function
const generateFHIRId = (prefix: string = ''): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}-${random}`;
};

// Create FHIR resources from parsed medical data
const createFHIRResourcesFromParsedData = async (
  supabaseClient: any,
  parsedData: any,
  report: any,
  reportId: string
): Promise<{ totalCreated: number }> => {
  if (!parsedData || !report.user_id) {
    throw new Error('Missing parsed data or user ID for FHIR creation');
  }

  console.log('Creating FHIR resources for report type:', parsedData.reportType);
  console.log('Available data keys:', Object.keys(parsedData));

  let totalCreated = 0;

  try {
    // Step 1: Ensure FHIR Patient exists
    console.log('🏥 Step 1: Ensuring FHIR Patient exists...');
    const patientFhirId = await ensureFHIRPatient(supabaseClient, parsedData.patient || {}, report.user_id);
    console.log('✅ FHIR Patient ID:', patientFhirId);

    // Step 2: Create FHIR Observations from lab tests
    if (parsedData.tests && Array.isArray(parsedData.tests) && parsedData.tests.length > 0) {
      console.log(`🧪 Step 2: Creating ${parsedData.tests.length} FHIR Observations...`);
      const observationCount = await createFHIRObservationsFromLab(
        supabaseClient,
        parsedData.tests,
        patientFhirId,
        reportId,
        parsedData
      );
      totalCreated += observationCount;
      console.log(`✅ Created ${observationCount} FHIR Observations`);
    }

    // Step 3: Create FHIR MedicationRequests from medications
    if (parsedData.medications && Array.isArray(parsedData.medications) && parsedData.medications.length > 0) {
      console.log(`💊 Step 3: Creating ${parsedData.medications.length} FHIR MedicationRequests...`);
      const medicationCount = await createFHIRMedicationRequestsFromPrescription(
        supabaseClient,
        parsedData.medications,
        patientFhirId,
        reportId,
        parsedData
      );
      totalCreated += medicationCount;
      console.log(`✅ Created ${medicationCount} FHIR MedicationRequests`);
    }

    // Step 4: Create FHIR Observations from vitals
    if (parsedData.vitals && Array.isArray(parsedData.vitals) && parsedData.vitals.length > 0) {
      console.log(`❤️ Step 4: Creating ${parsedData.vitals.length} FHIR Vital Observations...`);
      const vitalCount = await createFHIRObservationsFromVitals(
        supabaseClient,
        parsedData.vitals,
        patientFhirId,
        reportId,
        parsedData
      );
      totalCreated += vitalCount;
      console.log(`✅ Created ${vitalCount} FHIR Vital Observations`);
    }

    // Step 5: Create FHIR DiagnosticReport
    console.log('📋 Step 5: Creating FHIR DiagnosticReport...');
    const diagnosticReportCreated = await createFHIRDiagnosticReportFromParsedData(
      supabaseClient,
      parsedData,
      patientFhirId,
      reportId,
      report
    );
    totalCreated += diagnosticReportCreated;
    console.log(`✅ Created ${diagnosticReportCreated} FHIR DiagnosticReport`);

    console.log(`🎉 FHIR resource creation completed! Total created: ${totalCreated}`);
    return { totalCreated };

  } catch (error) {
    console.error('❌ Error in FHIR resource creation:', error);
    throw new Error(`FHIR resource creation failed: ${error.message}`);
  }
};

// Enhanced FHIR Patient creation/retrieval
const ensureFHIRPatient = async (supabaseClient: any, patientData: any, userId: string): Promise<string> => {
  console.log('Ensuring FHIR Patient exists for user:', userId);
  
  // Check if patient already exists
  const { data: existingPatient, error: fetchError } = await supabaseClient
    .from('fhir_patients')
    .select('fhir_id')
    .eq('user_id', userId)
    .limit(1);

  if (fetchError) {
    console.error('Error fetching existing FHIR patient:', fetchError);
  }

  if (existingPatient && existingPatient.length > 0) {
    console.log('Using existing FHIR Patient:', existingPatient[0].fhir_id);
    return existingPatient[0].fhir_id;
  }

  // Create new FHIR Patient
  const fhirId = generateFHIRId('patient-');
  const fhirPatient = {
    resourceType: 'Patient',
    id: fhirId,
    identifier: [
      {
        use: 'usual',
        system: 'urn:oid:2.16.840.1.113883.2.1.4.1',
        value: userId
      }
    ],
    name: patientData.name ? [
      {
        use: 'official',
        text: patientData.name
      }
    ] : [],
    birthDate: patientData.dateOfBirth || null,
    gender: patientData.gender || 'unknown'
  };

  const { error: insertError } = await supabaseClient
    .from('fhir_patients')
    .insert({
      user_id: userId,
      fhir_id: fhirId,
      resource_data: fhirPatient
    });

  if (insertError) {
    console.error('Error creating FHIR patient:', insertError);
    throw new Error(`Failed to create FHIR patient: ${insertError.message}`);
  }

  console.log('Created new FHIR Patient:', fhirId);
  return fhirId;
};

// Create FHIR Observations from lab test data
const createFHIRObservationsFromLab = async (
  supabaseClient: any,
  tests: any[],
  patientFhirId: string,
  reportId: string,
  parsedData: any
): Promise<number> => {
  let createdCount = 0;

  for (const test of tests) {
    if (!test.name || !test.value) {
      console.warn('Skipping test with missing name or value:', test);
      continue;
    }

    try {
      const fhirId = generateFHIRId('obs-lab-');
      const fhirObservation = {
        resourceType: 'Observation',
        id: fhirId,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
                display: 'Laboratory'
              }
            ]
          }
        ],
        code: {
          text: test.name
        },
        subject: {
          reference: `Patient/${patientFhirId}`
        },
        effectiveDateTime: parsedData.collectionDate || parsedData.reportDate || new Date().toISOString(),
        valueQuantity: {
          value: parseFloat(test.value.toString().replace(/[^\d.-]/g, '')) || 0,
          unit: test.unit || '',
          system: 'http://unitsofmeasure.org'
        },
        referenceRange: test.referenceRange ? [
          {
            text: test.referenceRange
          }
        ] : [],
        interpretation: test.status ? [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: mapStatusToHL7(test.status),
                display: test.status
              }
            ]
          }
        ] : []
      };

      const { error } = await supabaseClient
        .from('fhir_observations')
        .insert({
          user_id: reportId, // This should be user_id from the report
          fhir_id: fhirId,
          patient_fhir_id: patientFhirId,
          source_report_id: reportId,
          observation_type: 'lab_result',
          resource_data: fhirObservation,
          effective_date_time: parsedData.collectionDate || parsedData.reportDate || new Date().toISOString()
        });

      if (error) {
        console.error(`Error creating FHIR observation for test ${test.name}:`, error);
      } else {
        createdCount++;
        console.log(`✅ Created FHIR Observation: ${test.name}`);
      }
    } catch (error) {
      console.error(`Error processing test ${test.name}:`, error);
    }
  }

  return createdCount;
};

// Create FHIR MedicationRequests from prescription data
const createFHIRMedicationRequestsFromPrescription = async (
  supabaseClient: any,
  medications: any[],
  patientFhirId: string,
  reportId: string,
  parsedData: any
): Promise<number> => {
  let createdCount = 0;

  for (const medication of medications) {
    if (!medication.name) {
      console.warn('Skipping medication with missing name:', medication);
      continue;
    }

    try {
      const fhirId = generateFHIRId('medreq-');
      const fhirMedicationRequest = {
        resourceType: 'MedicationRequest',
        id: fhirId,
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          text: medication.name
        },
        subject: {
          reference: `Patient/${patientFhirId}`
        },
        authoredOn: parsedData.prescriptionDate || new Date().toISOString(),
        dosageInstruction: [
          {
            text: `${medication.dosage || ''} ${medication.frequency || ''}`.trim() || medication.instructions || 'As directed',
            timing: medication.frequency ? {
              repeat: {
                frequency: extractFrequencyNumber(medication.frequency) || 1,
                period: 1,
                periodUnit: 'd'
              }
            } : undefined
          }
        ],
        dispenseRequest: medication.quantity ? {
          quantity: {
            value: parseInt(medication.quantity.toString().replace(/[^\d]/g, '')) || 0,
            unit: 'tablet'
          }
        } : undefined
      };

      // Get user_id from the report
      const { data: reportData } = await supabaseClient
        .from('reports')
        .select('user_id')
        .eq('id', reportId)
        .single();

      const { error } = await supabaseClient
        .from('fhir_medication_requests')
        .insert({
          user_id: reportData?.user_id,
          fhir_id: fhirId,
          patient_fhir_id: patientFhirId,
          source_report_id: reportId,
          medication_name: medication.name,
          resource_data: fhirMedicationRequest,
          authored_on: parsedData.prescriptionDate || new Date().toISOString()
        });

      if (error) {
        console.error(`Error creating FHIR medication request for ${medication.name}:`, error);
      } else {
        createdCount++;
        console.log(`✅ Created FHIR MedicationRequest: ${medication.name}`);
      }
    } catch (error) {
      console.error(`Error processing medication ${medication.name}:`, error);
    }
  }

  return createdCount;
};

// Create FHIR Observations from vital signs data
const createFHIRObservationsFromVitals = async (
  supabaseClient: any,
  vitals: any[],
  patientFhirId: string,
  reportId: string,
  parsedData: any
): Promise<number> => {
  let createdCount = 0;

  for (const vital of vitals) {
    if (!vital.type || !vital.value) {
      console.warn('Skipping vital with missing type or value:', vital);
      continue;
    }

    try {
      const fhirId = generateFHIRId('obs-vital-');
      const fhirObservation = {
        resourceType: 'Observation',
        id: fhirId,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs'
              }
            ]
          }
        ],
        code: {
          text: vital.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        },
        subject: {
          reference: `Patient/${patientFhirId}`
        },
        effectiveDateTime: vital.timestamp || parsedData.recordDate || new Date().toISOString(),
        valueQuantity: {
          value: parseFloat(vital.value.toString().replace(/[^\d.-]/g, '')) || 0,
          unit: vital.unit || '',
          system: 'http://unitsofmeasure.org'
        },
        interpretation: vital.status ? [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: mapStatusToHL7(vital.status),
                display: vital.status
              }
            ]
          }
        ] : []
      };

      // Get user_id from the report
      const { data: reportData } = await supabaseClient
        .from('reports')
        .select('user_id')
        .eq('id', reportId)
        .single();

      const { error } = await supabaseClient
        .from('fhir_observations')
        .insert({
          user_id: reportData?.user_id,
          fhir_id: fhirId,
          patient_fhir_id: patientFhirId,
          source_report_id: reportId,
          observation_type: 'vital_signs',
          resource_data: fhirObservation,
          effective_date_time: vital.timestamp || parsedData.recordDate || new Date().toISOString()
        });

      if (error) {
        console.error(`Error creating FHIR observation for vital ${vital.type}:`, error);
      } else {
        createdCount++;
        console.log(`✅ Created FHIR Vital Observation: ${vital.type}`);
      }
    } catch (error) {
      console.error(`Error processing vital ${vital.type}:`, error);
    }
  }

  return createdCount;
};

// Create FHIR DiagnosticReport from parsed data
const createFHIRDiagnosticReportFromParsedData = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string,
  report: any
): Promise<number> => {
  try {
    const fhirId = generateFHIRId('diag-');
    const fhirDiagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: fhirId,
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
              code: getReportCategoryCode(parsedData.reportType || 'general'),
              display: parsedData.reportType || 'General'
            }
          ]
        }
      ],
      code: {
        text: report.title || `${parsedData.reportType || 'Medical'} Report`
      },
      subject: {
        reference: `Patient/${patientFhirId}`
      },
      effectiveDateTime: parsedData.reportDate || parsedData.collectionDate || report.report_date || new Date().toISOString(),
      issued: new Date().toISOString(),
      performer: parsedData.orderingPhysician || parsedData.prescriber || parsedData.provider ? [
        {
          display: parsedData.orderingPhysician || parsedData.prescriber || parsedData.provider
        }
      ] : [],
      conclusion: generateReportConclusion(parsedData)
    };

    const { error } = await supabaseClient
      .from('fhir_diagnostic_reports')
      .insert({
        user_id: report.user_id,
        fhir_id: fhirId,
        patient_fhir_id: patientFhirId,
        source_report_id: reportId,
        report_type: parsedData.reportType || 'general',
        resource_data: fhirDiagnosticReport,
        effective_date_time: parsedData.reportDate || parsedData.collectionDate || report.report_date || new Date().toISOString()
      });

    if (error) {
      console.error('Error creating FHIR diagnostic report:', error);
      return 0;
    } else {
      console.log(`✅ Created FHIR DiagnosticReport: ${fhirId}`);
      return 1;
    }
  } catch (error) {
    console.error('Error processing diagnostic report:', error);
    return 0;
  }
};

// Helper functions
const mapStatusToHL7 = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'high': return 'H';
    case 'low': return 'L';
    case 'critical': return 'HH';
    case 'normal': return 'N';
    default: return 'N';
  }
};

const extractFrequencyNumber = (frequency: string): number => {
  if (!frequency) return 1;
  const match = frequency.match(/(\d+)/);
  return match ? parseInt(match[1]) : 1;
};

const getReportCategoryCode = (reportType: string): string => {
  switch (reportType.toLowerCase()) {
    case 'lab': return 'LAB';
    case 'prescription': return 'PHM';
    case 'vitals': return 'VTL';
    case 'radiology': return 'RAD';
    case 'pathology': return 'PAT';
    default: return 'OTH';
  }
};

const generateReportConclusion = (parsedData: any): string => {
  const parts = [];
  
  if (parsedData.tests && parsedData.tests.length > 0) {
    const abnormalTests = parsedData.tests.filter(t => t.status && t.status !== 'normal');
    if (abnormalTests.length > 0) {
      parts.push(`${abnormalTests.length} abnormal test result(s) found.`);
    } else {
      parts.push('All test results within normal limits.');
    }
  }
  
  if (parsedData.medications && parsedData.medications.length > 0) {
    parts.push(`${parsedData.medications.length} medication(s) prescribed.`);
  }
  
  if (parsedData.vitals && parsedData.vitals.length > 0) {
    const abnormalVitals = parsedData.vitals.filter(v => v.status && v.status !== 'normal');
    if (abnormalVitals.length > 0) {
      parts.push(`${abnormalVitals.length} abnormal vital sign(s) recorded.`);
    }
  }
  
  return parts.join(' ') || 'Medical report processed successfully.';
};

// Enhanced serve function with processing lock integration
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let reportId: string | null = null
  let supabaseClient: any = null

  try {
    const requestBody = await req.json()
    reportId = requestBody.reportId
    console.log('🔄 Starting enhanced processing for report:', reportId)
    
    // Initialize Supabase client with service role for database functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    
    // Phase 1: Update status to extracting_text
    await supabaseClient
      .from('reports')
      .update({
        processing_phase: 'extracting_text',
        progress_percentage: 10
      })
      .eq('id', reportId)

    // Get the report details
    const { data: report, error: reportError } = await supabaseClient
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      throw new Error('Report not found')
    }

    // Phase 2: Update status to classifying_type
    await supabaseClient
      .from('reports')
      .update({
        processing_phase: 'classifying_type',
        progress_percentage: 20
      })
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

    // Phase 3: Update status to extracting_text
    await supabaseClient
      .from('reports')
      .update({
        processing_phase: 'extracting_text',
        progress_percentage: 30
      })
      .eq('id', reportId)

    // Try to get custom prompt first, fallback to default prompts
    console.log('🔍 CUSTOM PROMPT DEBUG: Attempting to fetch custom prompt...');
    let prompt = await getActiveCustomPrompt(supabaseClient);
    let reportType = report.report_type;
    
    if (prompt) {
      console.log('✅ CUSTOM PROMPT DEBUG: Using active custom prompt for document processing');
      // When using custom prompt, set report type to "custom" to trigger custom viewer
      reportType = 'custom';
    } else {
      console.log('⚠️ CUSTOM PROMPT DEBUG: No custom prompt found, using default prompt for report type:', report.report_type);
      prompt = getPromptForReportType(report.report_type);
    }
    let aiResponse: string = ''

    if (isPDFFile(report.file_type)) {
      // Handle PDF files with text extraction
      console.log('Processing PDF file with text extraction')
      
      const arrayBuffer = await fileData.arrayBuffer()
      let extractedText = await extractTextFromPDF(arrayBuffer)
      
      // If text extraction fails or returns empty, throw an error
      if (!extractedText.trim()) {
        throw new Error('Unable to extract text from PDF. Please ensure the PDF contains readable text or try uploading it as an image instead.');
      } else {
        // Phase 4: Update status to parsing_data  
        await supabaseClient
          .from('reports')
          .update({
            processing_phase: 'parsing_data',
            progress_percentage: 50
          })
          .eq('id', reportId)
        
        // Use optimized document processing
        console.log('Using extracted text for optimized processing');
        
        const processingResult = await processDocumentContent(extractedText, report.report_type, openaiApiKey, prompt);
        aiResponse = processingResult.response;
        
        console.log(`Document processing completed using: ${processingResult.processingType}`);
      }
    } else if (isImageFile(report.file_type)) {
      // Handle image files with vision API
      console.log('Processing image file with vision API')
      
      // Phase 4: Update status to parsing_data  
      await supabaseClient
        .from('reports')
        .update({
          processing_phase: 'parsing_data',
          progress_percentage: 50
        })
        .eq('id', reportId)
      
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
          max_tokens: PROCESSING_CONFIG.MAX_TOKENS,
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
    let suggestedName = null

    try {
      // Clean the response to remove potential markdown formatting
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove any leading/trailing whitespace again
      cleanedResponse = cleanedResponse.trim();
      
      console.log('Attempting to parse cleaned response:', cleanedResponse.substring(0, 200) + '...');
      
      parsedData = JSON.parse(cleanedResponse);
      confidence = parsedData.confidence || 0.8;
      suggestedName = parsedData.suggestedName;
      
      // Transform sections to FHIR format and enhance status determination
      parsedData = transformSectionsToFHIRFormat(parsedData);
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI response:', aiResponse);
      
      // Try to extract meaningful data from the text response
      parsedData = extractDataFromTextResponse(aiResponse, report.report_type);
      parsedData = transformSectionsToFHIRFormat(parsedData);
      console.log('Fallback parsing result:', parsedData);
    }

    // Enhanced document type classification
    let enhancedReportType = parsedData?.reportType || 'general'
    if (enhancedReportType === 'custom' || enhancedReportType === 'general') {
      // Improve classification based on content analysis
      const textLower = aiResponse.toLowerCase()
      const testCount = (parsedData?.tests || []).length
      const medCount = (parsedData?.medications || []).length
      const vitalCount = (parsedData?.vitals || []).length
      
      if (testCount >= 2 || textLower.includes('hemoglobin') || textLower.includes('glucose') || textLower.includes('creatinine')) {
        enhancedReportType = 'lab'
      } else if (medCount >= 1 || textLower.includes('prescription') || textLower.includes('pharmacy')) {
        enhancedReportType = 'prescription'
      } else if (vitalCount >= 1 || textLower.includes('blood pressure') || textLower.includes('temperature')) {
        enhancedReportType = 'vitals'
      }
      
      console.log(`📋 Enhanced classification: ${parsedData?.reportType} → ${enhancedReportType}`)
    }

    // Generate intelligent document name with CBP detection
    let finalDocumentName = suggestedName
    if (!finalDocumentName) {
      // Use intelligent naming that can detect CBP and other comprehensive panels
      finalDocumentName = generateIntelligentDocumentName(parsedData, report.report_date)
    }

    // Clean up the suggested name (remove invalid characters, limit length)
    if (finalDocumentName) {
      finalDocumentName = finalDocumentName
        .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid file chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 200) // Limit length
    }

    // Phase 5: Update status to creating_fhir_resources
    await supabaseClient
      .from('reports')
      .update({
        processing_phase: 'creating_fhir_resources',
        progress_percentage: 70
      })
      .eq('id', reportId)

    // Enhanced field-by-field update with data safeguards
    console.log('Starting enhanced database update with validation...');
    
    // Phase 1: Validate and prepare data
    const extractedTextSafe = typeof aiResponse === 'string' ? 
      (aiResponse.length > 50000 ? aiResponse.substring(0, 50000) + '...[truncated]' : aiResponse) : '';
      
    let parsedDataSafe = null;
    try {
      // Validate JSON structure and size
      const jsonString = JSON.stringify(parsedData);
      if (jsonString.length > 1000000) { // 1MB limit
        console.warn('⚠️ Parsed data too large, creating summary version');
        parsedDataSafe = {
          reportType: parsedData?.reportType || 'unknown',
          summary: 'Data truncated due to size - processing completed successfully',
          originalSize: jsonString.length
        };
      } else {
        parsedDataSafe = parsedData;
      }
    } catch (jsonError) {
      console.error('❌ JSON validation failed:', jsonError);
      parsedDataSafe = {
        reportType: enhancedReportType,
        error: 'Invalid JSON structure detected',
        rawDataAvailable: false
      };
    }

    // Phase 2: Update fields one by one with error handling
    const updateSteps = [
      {
        name: 'Basic parsing results',
        fields: {
          parsing_confidence: confidence,
          parsing_model: 'gpt-4o-mini',
          processing_error: null,
          report_type: enhancedReportType,
          progress_percentage: 60
        }
      },
      {
        name: 'Extracted text',
        fields: {
          extracted_text: extractedTextSafe
        }
      },
      {
        name: 'Parsed data',
        fields: {
          parsed_data: parsedDataSafe
        }
      },
      {
        name: 'Document metadata',
        fields: {
          physician_name: parsedData?.orderingPhysician || parsedData?.prescriber || parsedData?.provider || report.physician_name,
          facility_name: parsedData?.facility || parsedData?.pharmacy || report.facility_name,
          title: finalDocumentName && finalDocumentName !== 'Processing...' ? finalDocumentName : report.title,
          progress_percentage: 80
        }
      }
    ];

    for (const step of updateSteps) {
      try {
        console.log(`📝 Updating: ${step.name}`);
        const { error: stepError } = await supabaseClient
          .from('reports')
          .update(step.fields)
          .eq('id', reportId);

        if (stepError) {
          console.error(`❌ Database error in ${step.name}:`, {
            code: stepError.code,
            message: stepError.message,
            details: stepError.details,
            hint: stepError.hint
          });
          
          // Try to continue with other fields unless it's a critical error
          if (stepError.code === '22001' || stepError.code === '22P02') {
            console.warn(`⚠️ Data issue in ${step.name}, skipping this update`);
            continue;
          }
          
          throw new Error(`Database update failed at ${step.name}: ${stepError.message} (Code: ${stepError.code})`);
        }
        
        console.log(`✅ Successfully updated: ${step.name}`);
      } catch (stepError) {
        console.error(`❌ Critical error in ${step.name}:`, stepError);
        throw stepError;
      }
    }

    console.log('Document processing completed successfully')
    
    // Phase 6: Create FHIR resources after successful parsing - CRITICAL STEP
    console.log('Starting FHIR resource creation...');
    
    try {
      const fhirResult = await createFHIRResourcesFromParsedData(
        supabaseClient, 
        parsedData, 
        report, 
        reportId
      );
      
      console.log(`✅ FHIR processing complete. Created ${fhirResult.totalCreated} resources.`);
      
      // Phase 7: Mark as completed
      await supabaseClient
        .from('reports')
        .update({
          parsing_status: 'completed',
          processing_phase: 'completed',
          progress_percentage: 100
        })
        .eq('id', reportId)
      
      // Release processing lock
      await supabaseClient.rpc('release_processing_lock', {
        report_id_param: reportId,
        final_status: 'completed'
      })

      return new Response(
        JSON.stringify({
          success: true,
          parsedData: parsedData,
          confidence: confidence,
          extractedText: aiResponse.substring(0, 500) + '...',
          processingTime: Date.now(),
          fhirResourcesCreated: fhirResult.totalCreated
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
      
    } catch (fhirError) {
      console.error('❌ FHIR creation failed but parsing succeeded:', fhirError)
      
      // Mark parsing as completed even if FHIR fails (partial success)
      await supabaseClient
        .from('reports')
        .update({
          parsing_status: 'completed',
          processing_phase: 'completed',
          progress_percentage: 90, // Not 100% due to FHIR failure
          processing_error: `FHIR creation failed: ${fhirError.message}`
        })
        .eq('id', reportId)
      
      // Release processing lock
      await supabaseClient.rpc('release_processing_lock', {
        report_id_param: reportId,
        final_status: 'completed'
      })

      return new Response(
        JSON.stringify({
          success: true,
          parsedData: parsedData,
          confidence: confidence,
          extractedText: aiResponse.substring(0, 500) + '...',
          processingTime: Date.now(),
          fhirResourcesCreated: 0,
          warning: 'Document parsed successfully but FHIR creation failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('❌ Enhanced processing error:', error)
    
    // Always attempt to release lock and update error state
    if (reportId && supabaseClient) {
      try {
        await supabaseClient
          .from('reports')
          .update({
            parsing_status: 'failed',
            processing_phase: 'failed',
            processing_error: error.message,
            error_category: error.message.includes('timeout') ? 'temporary' : 'permanent'
          })
          .eq('id', reportId)
          
        await supabaseClient.rpc('release_processing_lock', {
          report_id_param: reportId,
          final_status: 'failed'
        })
        
        console.log('🔓 Released processing lock due to error')
      } catch (cleanupError) {
        console.error('Failed to cleanup after error:', cleanupError)
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
