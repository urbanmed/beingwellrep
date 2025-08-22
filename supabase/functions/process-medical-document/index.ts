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

// Fetch active custom prompt from database with comprehensive logging
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

// Enhanced prompts with intelligent naming
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

// Transform sections-based data to expected FHIR format
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

// Fallback text parsing for when JSON parsing fails
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

  switch (reportType?.toLowerCase()) {
    case 'prescription':
    case 'pharmacy':
      if (parsedData?.medications?.length > 0) {
        const primaryMed = parsedData.medications[0];
        if (primaryMed.name) {
          return `Prescription - ${primaryMed.name} - ${formattedDate}`;
        }
      }
      return `Prescription - ${formattedDate}`;

    case 'radiology':
    case 'imaging':
    case 'xray':
    case 'mri':
    case 'ct':
      if (parsedData?.study) {
        const studyType = parsedData.study.type || reportType.toUpperCase();
        const bodyPart = parsedData.study.bodyPart || '';
        if (bodyPart) {
          return `${studyType} - ${bodyPart} - ${formattedDate}`;
        }
        return `${studyType} - ${formattedDate}`;
      }
      return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Scan - ${formattedDate}`;

    case 'vitals':
    case 'vital_signs':
      if (parsedData?.vitals?.length > 0) {
        const primaryVital = parsedData.vitals[0];
        if (primaryVital.type) {
          const vitalType = primaryVital.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `Vital Signs - ${vitalType} - ${formattedDate}`;
        }
      }
      return `Vital Signs - ${formattedDate}`;

    default:
      const provider = parsedData?.provider || parsedData?.prescriber || parsedData?.orderingPhysician;
      const facility = parsedData?.facility;
      
      if (provider) {
        return `Medical Record - ${provider} - ${formattedDate}`;
      } else if (facility) {
        return `Medical Record - ${facility} - ${formattedDate}`;
      }
      return `Medical Document - ${formattedDate}`;
  }
};

// File size limit: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Document processing configuration - Optimized for performance
const PROCESSING_CONFIG = {
  MAX_SINGLE_PASS_SIZE: 15000,  // Process documents up to 15k chars in single pass
  MAX_TRUNCATED_SIZE: 12000,    // Truncate larger documents to this size
  MAX_TOKENS: 8000,             // Reduced token limit for faster processing
  MIN_CHUNK_SIZE: 8000,         // Only chunk documents larger than this
  CHUNK_SIZE: 6000,             // Smaller chunks for faster parallel processing
  MAX_CHUNKS: 3                 // Limit to max 3 chunks to prevent timeout
};

// Document chunk interface
interface DocumentChunk {
  id: number;
  content: string;
  startPos: number;
  endPos: number;
  sectionHeader?: string;
}

// Optimized document processing strategy
const processDocumentContent = async (
  text: string, 
  reportType: string, 
  openaiApiKey: string,
  customPrompt?: string
): Promise<{ response: string, processingType: string }> => {
  
  // Strategy 1: Single pass for smaller documents
  if (text.length <= PROCESSING_CONFIG.MAX_SINGLE_PASS_SIZE) {
    console.log(`Document size: ${text.length} chars - processing in single pass`);
    return await processSingleDocument(text, reportType, openaiApiKey, customPrompt);
  }
  
  // Strategy 2: Smart truncation for moderately large documents
  if (text.length <= PROCESSING_CONFIG.MAX_TRUNCATED_SIZE * 2) {
    console.log(`Document size: ${text.length} chars - using smart truncation`);
    const truncatedText = smartTruncateDocument(text, PROCESSING_CONFIG.MAX_TRUNCATED_SIZE);
    return await processSingleDocument(truncatedText, reportType, openaiApiKey, customPrompt);
  }
  
  // Strategy 3: Limited chunking for very large documents
  console.log(`Document size: ${text.length} chars - using limited chunking`);
  return await processDocumentWithLimitedChunking(text, reportType, openaiApiKey, customPrompt);
};

// Smart truncation that preserves important medical information
const smartTruncateDocument = (text: string, maxSize: number): string => {
  if (text.length <= maxSize) return text;
  
  // Priority patterns to preserve (in order of importance)
  const prioritySections = [
    /(?:DEPARTMENT|LAB|TEST|REPORT)[^:]*:[\s\S]*?(?=\n\s*(?:DEPARTMENT|LAB|TEST|REPORT|$))/gi,
    /(?:RESULT|VALUE|FINDING)[^:]*:[\s\S]*?(?=\n\s*(?:RESULT|VALUE|FINDING|$))/gi,
    /(?:MEDICATION|PRESCRIPTION|DRUG)[^:]*:[\s\S]*?(?=\n\s*(?:MEDICATION|PRESCRIPTION|DRUG|$))/gi
  ];
  
  let preservedContent = '';
  let remainingSize = maxSize;
  
  // Try to preserve priority sections first
  for (const pattern of prioritySections) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      if (match.length <= remainingSize && !preservedContent.includes(match.substring(0, 50))) {
        preservedContent += match + '\n\n';
        remainingSize -= match.length;
      }
    }
  }
  
  // Fill remaining space with beginning of document if we have room
  if (remainingSize > 500) {
    const remainingText = text.substring(0, remainingSize);
    if (!preservedContent.includes(remainingText.substring(0, 50))) {
      preservedContent = remainingText + '\n\n' + preservedContent;
    }
  }
  
  return preservedContent.trim().substring(0, maxSize);
};

// Process single document without chunking
const processSingleDocument = async (
  text: string, 
  reportType: string, 
  openaiApiKey: string,
  customPrompt?: string
): Promise<{ response: string, processingType: string }> => {
  
  const prompt = customPrompt || getPromptForReportType(reportType);
  
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
        { role: 'user', content: `${prompt}\n\nDocument text:\n${text}` }
      ],
      max_tokens: PROCESSING_CONFIG.MAX_TOKENS,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || '';
  
  return { response: aiResponse, processingType: 'single_pass' };
};

// Limited chunking with sequential processing to avoid timeouts
const processDocumentWithLimitedChunking = async (
  text: string, 
  reportType: string, 
  openaiApiKey: string,
  customPrompt?: string
): Promise<{ response: string, processingType: string }> => {
  
  const chunks = createLimitedChunks(text);
  console.log(`Processing ${chunks.length} chunks sequentially`);
  
  const chunkResults: any[] = [];
  
  // Process chunks sequentially to avoid CPU timeout
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.content.length} chars)`);
    
    try {
      const result = await processSingleChunk(chunk, reportType, openaiApiKey, i);
      chunkResults.push(result);
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
      chunkResults.push({
        chunkId: chunk.id,
        error: error.message,
        processed: false
      });
    }
  }
  
  // Merge results
  const mergedData = mergeChunkResults(chunkResults, reportType);
  const response = JSON.stringify(mergedData);
  
  return { response, processingType: 'limited_chunking' };
};

// Create limited number of chunks
const createLimitedChunks = (text: string): DocumentChunk[] => {
  const totalLength = text.length;
  const chunkSize = Math.min(PROCESSING_CONFIG.CHUNK_SIZE, Math.ceil(totalLength / PROCESSING_CONFIG.MAX_CHUNKS));
  const chunks: DocumentChunk[] = [];
  
  let currentPos = 0;
  let chunkId = 0;
  
  while (currentPos < totalLength && chunkId < PROCESSING_CONFIG.MAX_CHUNKS) {
    const endPos = Math.min(currentPos + chunkSize, totalLength);
    
    // Try to break at sentence boundary
    let actualEndPos = endPos;
    if (endPos < totalLength) {
      const sentenceEnd = text.lastIndexOf('.', endPos);
      if (sentenceEnd > currentPos + chunkSize * 0.7) {
        actualEndPos = sentenceEnd + 1;
      }
    }
    
    const chunkContent = text.slice(currentPos, actualEndPos).trim();
    
    if (chunkContent.length > 0) {
      chunks.push({
        id: chunkId++,
        content: chunkContent,
        startPos: currentPos,
        endPos: actualEndPos
      });
    }
    
    currentPos = actualEndPos;
  }
  
  console.log(`Created ${chunks.length} limited chunks, max size: ${chunkSize} chars`);
  return chunks;
};

// Process a single chunk
const processSingleChunk = async (
  chunk: DocumentChunk,
  reportType: string,
  openaiApiKey: string,
  index: number
): Promise<any> => {
  
  const prompt = getPromptForReportType(reportType);
  
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
        { role: 'user', content: `${prompt}\n\nDocument chunk (${index + 1}):\n${chunk.content}` }
      ],
      max_tokens: PROCESSING_CONFIG.MAX_TOKENS,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error for chunk ${index}: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || '';
  
  // Parse the response
  let parsedData = null;
  try {
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    parsedData = JSON.parse(cleanedResponse.trim());
  } catch (parseError) {
    console.warn(`Failed to parse chunk ${index} response as JSON:`, parseError);
    parsedData = extractDataFromTextResponse(aiResponse, reportType);
  }

  return {
    chunkId: chunk.id,
    chunkIndex: index,
    rawResponse: aiResponse,
    parsedData,
    processed: true
  };
};

// This function has been replaced by the optimized processDocumentContent function above

// This function is no longer needed with the optimized approach

// Merge results from multiple chunks
const mergeChunkResults = (chunkResults: any[], reportType: string): any => {
  console.log('Merging results from chunks...');
  
  const successfulResults = chunkResults.filter(r => r.processed && r.parsedData);
  
  if (successfulResults.length === 0) {
    console.warn('No successful chunk processing results to merge');
    return {
      reportType: reportType || 'general',
      confidence: 0.1,
      parseError: true,
      mergeError: 'No chunks processed successfully'
    };
  }

  // Initialize merged result with first successful result as base
  const baseResult = successfulResults[0].parsedData;
  const mergedResult: any = {
    reportType: baseResult.reportType || reportType,
    suggestedName: baseResult.suggestedName,
    patient: baseResult.patient || {},
    confidence: 0.8,
    processedChunks: successfulResults.length,
    totalChunks: chunkResults.length
  };

  // Merge arrays of medical data
  const mergeArrays = (fieldName: string) => {
    const allItems: any[] = [];
    const seenItems = new Set<string>();

    successfulResults.forEach(result => {
      const items = result.parsedData[fieldName];
      if (Array.isArray(items)) {
        items.forEach(item => {
          // Create a unique key for deduplication
          const key = JSON.stringify({
            name: item.name || item.type || item.title,
            value: item.value,
            dosage: item.dosage
          });
          
          if (!seenItems.has(key)) {
            seenItems.add(key);
            allItems.push(item);
          }
        });
      }
    });

    return allItems;
  };

  // Merge specific field types based on report type
  switch (reportType?.toLowerCase()) {
    case 'lab_results':
    case 'lab':
      mergedResult.tests = mergeArrays('tests');
      mergedResult.orderingPhysician = baseResult.orderingPhysician;
      mergedResult.facility = baseResult.facility;
      mergedResult.collectionDate = baseResult.collectionDate;
      mergedResult.reportDate = baseResult.reportDate;
      break;

    case 'prescription':
      mergedResult.medications = mergeArrays('medications');
      mergedResult.prescriber = baseResult.prescriber;
      mergedResult.pharmacy = baseResult.pharmacy;
      mergedResult.prescriptionDate = baseResult.prescriptionDate;
      break;

    case 'vitals':
      mergedResult.vitals = mergeArrays('vitals');
      mergedResult.recordedBy = baseResult.recordedBy;
      mergedResult.facility = baseResult.facility;
      mergedResult.recordDate = baseResult.recordDate;
      break;

    default:
      mergedResult.sections = mergeArrays('sections');
      mergedResult.provider = baseResult.provider;
      mergedResult.facility = baseResult.facility;
      mergedResult.visitDate = baseResult.visitDate;
      mergedResult.reportDate = baseResult.reportDate;
  }

  // Use the most complete suggested name found
  const names = successfulResults
    .map(r => r.parsedData.suggestedName)
    .filter(name => name && name.length > 10)
    .sort((a, b) => b.length - a.length);
  
  if (names.length > 0) {
    mergedResult.suggestedName = names[0];
  }

  console.log(`Merged results: ${Object.keys(mergedResult).length} fields`);
  return enhanceStatusDetermination(mergedResult);
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
): Promise<void> => {
  if (!parsedData || !report.user_id) {
    throw new Error('Missing parsed data or user ID for FHIR creation');
  }

  console.log('Creating FHIR resources for report type:', parsedData.reportType);
  console.log('Available data keys:', Object.keys(parsedData));

  try {
    // 1. Ensure FHIR Patient exists
    const patientFhirId = await ensureFHIRPatient(supabaseClient, report.user_id);

    // 2. Create appropriate FHIR resources based on report type
    const reportType = parsedData.reportType?.toLowerCase();
    let fhirResourcesCreated = 0;
    
    switch (reportType) {
      case 'lab':
      case 'lab_results':
        if (parsedData.tests && parsedData.tests.length > 0) {
          await createFHIRObservationsFromLab(supabaseClient, parsedData, patientFhirId, reportId);
          fhirResourcesCreated++;
          console.log(`Created FHIR observations for ${parsedData.tests.length} lab tests`);
        } else {
          console.warn('No lab tests found in parsed data for lab report');
        }
        break;

      case 'prescription':
      case 'pharmacy':
        if (parsedData.medications && parsedData.medications.length > 0) {
          await createFHIRMedicationRequestsFromPrescription(supabaseClient, parsedData, patientFhirId, reportId);
          fhirResourcesCreated++;
          console.log(`Created FHIR medication requests for ${parsedData.medications.length} medications`);
        } else {
          console.warn('No medications found in parsed data for prescription report');
        }
        break;

      case 'vitals':
      case 'vital_signs':
        if (parsedData.vitals && parsedData.vitals.length > 0) {
          await createFHIRObservationsFromVitals(supabaseClient, parsedData, patientFhirId, reportId);
          fhirResourcesCreated++;
          console.log(`Created FHIR vital observations for ${parsedData.vitals.length} vitals`);
        } else {
          console.warn('No vitals found in parsed data for vitals report');
        }
        break;

      case 'radiology':
      case 'imaging':
        await createFHIRDiagnosticReportFromRadiology(supabaseClient, parsedData, patientFhirId, reportId);
        fhirResourcesCreated++;
        console.log('Created FHIR diagnostic report for radiology');
        break;

      default:
        // For general medical documents, create a basic DiagnosticReport
        await createFHIRDiagnosticReportFromGeneral(supabaseClient, parsedData, patientFhirId, reportId);
        fhirResourcesCreated++;
        console.log('Created FHIR diagnostic report for general document');
        
        // Also check if there are any extractable lab tests or medications in sections
        if (parsedData.sections && Array.isArray(parsedData.sections) && parsedData.sections.length > 0) {
          try {
            // Safe validation for lab data with proper array checking
            const hasLabData = parsedData.sections.some(s => {
              if (!s || !s.content) return false;
              
              // Handle different content types
              if (Array.isArray(s.content)) {
                return s.content.some(c => c && c.name && c.value);
              } else if (typeof s.content === 'object') {
                return s.content.name && s.content.value;
              }
              return false;
            });

            // Safe validation for medication data with proper array checking
            const hasMedData = parsedData.sections.some(s => {
              if (!s || !s.content) return false;
              
              // Handle different content types
              if (Array.isArray(s.content)) {
                return s.content.some(c => c && (c.medication || c.name));
              } else if (typeof s.content === 'object') {
                return s.content.medication || s.content.name;
              }
              return false;
            });
            
            if (hasLabData) {
              console.log('Found lab-like data in general document sections, creating observations...');
              // Transform and create lab observations
              const transformedData = { ...parsedData, reportType: 'lab' };
              const labData = transformSectionsToFHIRFormat(transformedData);
              if (labData.tests && labData.tests.length > 0) {
                await createFHIRObservationsFromLab(supabaseClient, labData, patientFhirId, reportId);
                fhirResourcesCreated++;
                console.log(`Created ${labData.tests.length} additional FHIR observations from general document`);
              }
            }
          } catch (sectionError) {
            console.warn('Error processing sections for additional FHIR resources:', sectionError);
            // Continue processing - don't fail the entire document for section parsing issues
          }
        }
        break;
    }
    
    if (fhirResourcesCreated === 0) {
      console.warn(`No FHIR resources created for report ${reportId} with type ${reportType}`);
    } else {
      console.log(`Successfully created ${fhirResourcesCreated} FHIR resource type(s) for report ${reportId}`);
    }
    
  } catch (error) {
    console.error('FHIR resource creation failed:', error);
    throw new Error(`FHIR creation failed: ${error.message}`);
  }
};

// Ensure FHIR Patient exists, create if necessary
const ensureFHIRPatient = async (supabaseClient: any, userId: string): Promise<string> => {
  // Check if patient already exists
  const { data: existingPatient } = await supabaseClient
    .from('fhir_patients')
    .select('fhir_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingPatient) {
    return existingPatient.fhir_id;
  }

  // Get user profile for patient data
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const patientFhirId = generateFHIRId('patient-');
  
  // Create basic FHIR Patient resource
  const fhirPatient = {
    resourceType: 'Patient',
    id: patientFhirId,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
    },
    identifier: [
      {
        use: 'official',
        system: 'http://beingwell.app/patient-id',
        value: userId
      }
    ],
    active: true
  };

  // Add profile data if available
  if (profile) {
    if (profile.first_name || profile.last_name) {
      fhirPatient.name = [{
        use: 'official',
        family: profile.last_name || '',
        given: profile.first_name ? [profile.first_name] : []
      }];
    }

    if (profile.gender) {
      fhirPatient.gender = profile.gender.toLowerCase();
    }

    if (profile.date_of_birth) {
      fhirPatient.birthDate = profile.date_of_birth;
    }

    if (profile.phone_number) {
      fhirPatient.telecom = [{
        system: 'phone',
        value: profile.phone_number,
        use: 'mobile'
      }];
    }

    if (profile.abha_id) {
      fhirPatient.identifier.push({
        use: 'official',
        system: 'https://healthid.abdm.gov.in',
        value: profile.abha_id
      });
    }
  }

  // Insert FHIR Patient into database
  const { error } = await supabaseClient
    .from('fhir_patients')
    .insert({
      user_id: userId,
      fhir_id: patientFhirId,
      resource_data: fhirPatient
    });

  if (error) {
    throw new Error(`Failed to create FHIR Patient: ${error.message}`);
  }

  console.log('Created FHIR Patient:', patientFhirId);
  return patientFhirId;
};

// Create FHIR Observations from lab test data
const createFHIRObservationsFromLab = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string
): Promise<void> => {
  if (!parsedData.tests || !Array.isArray(parsedData.tests)) {
    throw new Error(`No tests array found in lab data. Available keys: ${Object.keys(parsedData)}`);
  }
  
  console.log(`Processing ${parsedData.tests.length} lab tests for FHIR creation`);

  for (let i = 0; i < parsedData.tests.length; i++) {
    const test = parsedData.tests[i];
    const observationId = generateFHIRId('obs-');

    const fhirObservation = {
      resourceType: 'Observation',
      id: observationId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Observation']
      },
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory',
          display: 'Laboratory'
        }]
      }],
      code: {
        text: test.name || 'Unknown Test'
      },
      subject: {
        reference: `Patient/${patientFhirId}`
      },
      effectiveDateTime: parsedData.collectionDate || parsedData.reportDate || new Date().toISOString()
    };

    // Add value
    if (test.value) {
      if (test.unit && !isNaN(parseFloat(test.value))) {
        fhirObservation.valueQuantity = {
          value: parseFloat(test.value),
          unit: test.unit,
          system: 'http://unitsofmeasure.org'
        };
      } else {
        fhirObservation.valueString = test.value;
      }
    }

    // Add reference range
    if (test.referenceRange) {
      fhirObservation.referenceRange = [{
        text: test.referenceRange
      }];
    }

    // Add interpretation based on status
    if (test.status) {
      const interpretationMap = {
        'normal': { code: 'N', display: 'Normal' },
        'high': { code: 'H', display: 'High' },
        'low': { code: 'L', display: 'Low' },
        'critical': { code: 'HH', display: 'Critical high' }
      };

      const interpretation = interpretationMap[test.status];
      if (interpretation) {
        fhirObservation.interpretation = [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: interpretation.code,
            display: interpretation.display
          }]
        }];
      }
    }

    // Insert into database
    const { error } = await supabaseClient
      .from('fhir_observations')
      .insert({
        user_id: (await getUserIdFromReport(supabaseClient, reportId)),
        fhir_id: observationId,
        patient_fhir_id: patientFhirId,
        source_report_id: reportId,
        observation_type: 'lab_result',
        resource_data: fhirObservation,
        effective_date_time: fhirObservation.effectiveDateTime,
        status: 'final'
      });

    if (error) {
      console.error('Failed to create FHIR Observation:', error);
      throw new Error(`FHIR Observation creation failed: ${error.message}`);
    } else {
      console.log('Created FHIR Observation:', observationId);
    }
  }
};

// Create FHIR MedicationRequests from prescription data
const createFHIRMedicationRequestsFromPrescription = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string
): Promise<void> => {
  if (!parsedData.medications || !Array.isArray(parsedData.medications)) {
    throw new Error(`No medications array found in prescription data. Available keys: ${Object.keys(parsedData)}`);
  }
  
  console.log(`Processing ${parsedData.medications.length} medications for FHIR creation`);

  for (let i = 0; i < parsedData.medications.length; i++) {
    const med = parsedData.medications[i];
    const medicationRequestId = generateFHIRId('med-req-');

    const fhirMedicationRequest = {
      resourceType: 'MedicationRequest',
      id: medicationRequestId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest']
      },
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        text: med.name || 'Unknown Medication'
      },
      subject: {
        reference: `Patient/${patientFhirId}`
      },
      authoredOn: parsedData.prescriptionDate || new Date().toISOString()
    };

    // Add prescriber
    if (parsedData.prescriber) {
      fhirMedicationRequest.requester = {
        display: parsedData.prescriber
      };
    }

    // Add dosage instructions
    if (med.dosage || med.frequency || med.duration || med.instructions) {
      fhirMedicationRequest.dosageInstruction = [{
        text: [med.dosage, med.frequency, med.duration, med.instructions]
          .filter(Boolean)
          .join(' - ')
      }];
    }

    // Insert into database
    const { error } = await supabaseClient
      .from('fhir_medication_requests')
      .insert({
        user_id: (await getUserIdFromReport(supabaseClient, reportId)),
        fhir_id: medicationRequestId,
        patient_fhir_id: patientFhirId,
        source_report_id: reportId,
        medication_name: med.name || 'Unknown Medication',
        resource_data: fhirMedicationRequest,
        authored_on: fhirMedicationRequest.authoredOn,
        status: 'active',
        intent: 'order'
      });

    if (error) {
      console.error('Failed to create FHIR MedicationRequest:', error);
      throw new Error(`FHIR MedicationRequest creation failed: ${error.message}`);
    } else {
      console.log('Created FHIR MedicationRequest:', medicationRequestId);
    }
  }
};

// Create FHIR Observations from vital signs
const createFHIRObservationsFromVitals = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string
): Promise<void> => {
  if (!parsedData.vitals || !Array.isArray(parsedData.vitals)) {
    console.log('No vitals found in data');
    return;
  }

  for (let i = 0; i < parsedData.vitals.length; i++) {
    const vital = parsedData.vitals[i];
    const observationId = generateFHIRId('vital-obs-');

    const fhirObservation = {
      resourceType: 'Observation',
      id: observationId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Observation']
      },
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }]
      }],
      code: {
        text: vital.type?.replace('_', ' ') || 'Vital Sign'
      },
      subject: {
        reference: `Patient/${patientFhirId}`
      },
      effectiveDateTime: vital.timestamp || parsedData.recordDate || new Date().toISOString()
    };

    // Map vital types to LOINC codes
    const vitalTypeMap = {
      'heart_rate': { code: '8867-4', display: 'Heart rate', unit: '/min' },
      'blood_pressure': { code: '85354-9', display: 'Blood pressure panel' },
      'temperature': { code: '8310-5', display: 'Body temperature', unit: 'Cel' },
      'respiratory_rate': { code: '9279-1', display: 'Respiratory rate', unit: '/min' },
      'oxygen_saturation': { code: '2708-6', display: 'Oxygen saturation', unit: '%' }
    };

    const vitalMapping = vitalTypeMap[vital.type];
    if (vitalMapping) {
      fhirObservation.code = {
        coding: [{
          system: 'http://loinc.org',
          code: vitalMapping.code,
          display: vitalMapping.display
        }]
      };
    }

    // Add value
    if (vital.value) {
      const numericValue = parseFloat(vital.value);
      if (!isNaN(numericValue)) {
        fhirObservation.valueQuantity = {
          value: numericValue,
          unit: vital.unit || vitalMapping?.unit || '',
          system: 'http://unitsofmeasure.org'
        };
      } else {
        fhirObservation.valueString = vital.value;
      }
    }

    // Insert into database
    const { error } = await supabaseClient
      .from('fhir_observations')
      .insert({
        user_id: (await getUserIdFromReport(supabaseClient, reportId)),
        fhir_id: observationId,
        patient_fhir_id: patientFhirId,
        source_report_id: reportId,
        observation_type: 'vital_signs',
        resource_data: fhirObservation,
        effective_date_time: fhirObservation.effectiveDateTime,
        status: 'final'
      });

    if (error) {
      console.error('Failed to create FHIR Vital Observation:', error);
    } else {
      console.log('Created FHIR Vital Observation:', observationId);
    }
  }
};

// Create FHIR DiagnosticReport for general documents
const createFHIRDiagnosticReportFromGeneral = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string
): Promise<void> => {
  const diagnosticReportId = generateFHIRId('diag-report-');

  const fhirDiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: diagnosticReportId,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport']
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'GE',
        display: 'Genetics'
      }]
    }],
    code: {
      text: parsedData.reportType || 'General Medical Document'
    },
    subject: {
      reference: `Patient/${patientFhirId}`
    },
    effectiveDateTime: parsedData.reportDate || parsedData.visitDate || new Date().toISOString()
  };

  // Add performer if available
  if (parsedData.provider || parsedData.facility) {
    fhirDiagnosticReport.performer = [];
    if (parsedData.provider) {
      fhirDiagnosticReport.performer.push({ display: parsedData.provider });
    }
    if (parsedData.facility) {
      fhirDiagnosticReport.performer.push({ display: parsedData.facility });
    }
  }

  // Insert into database
  const { error } = await supabaseClient
    .from('fhir_diagnostic_reports')
    .insert({
      user_id: (await getUserIdFromReport(supabaseClient, reportId)),
      fhir_id: diagnosticReportId,
      patient_fhir_id: patientFhirId,
      source_report_id: reportId,
      report_type: parsedData.reportType || 'general',
      resource_data: fhirDiagnosticReport,
      effective_date_time: fhirDiagnosticReport.effectiveDateTime,
      status: 'final'
    });

  if (error) {
    console.error('Failed to create FHIR DiagnosticReport:', error);
  } else {
    console.log('Created FHIR DiagnosticReport:', diagnosticReportId);
  }
};

// Create FHIR DiagnosticReport from radiology data
const createFHIRDiagnosticReportFromRadiology = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string
): Promise<void> => {
  const diagnosticReportId = generateFHIRId('diag-report-');

  const fhirDiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: diagnosticReportId,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport']
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'RAD',
        display: 'Radiology'
      }]
    }],
    code: {
      text: parsedData.study?.type || 'Radiology Report'
    },
    subject: {
      reference: `Patient/${patientFhirId}`
    },
    effectiveDateTime: parsedData.studyDate || parsedData.reportDate || new Date().toISOString()
  };

  // Add performer
  if (parsedData.radiologist || parsedData.facility) {
    fhirDiagnosticReport.performer = [];
    if (parsedData.radiologist) {
      fhirDiagnosticReport.performer.push({ display: parsedData.radiologist });
    }
    if (parsedData.facility) {
      fhirDiagnosticReport.performer.push({ display: parsedData.facility });
    }
  }

  // Add conclusion
  if (parsedData.impression) {
    fhirDiagnosticReport.conclusion = parsedData.impression;
  }

  // Insert into database
  const { error } = await supabaseClient
    .from('fhir_diagnostic_reports')
    .insert({
      user_id: (await getUserIdFromReport(supabaseClient, reportId)),
      fhir_id: diagnosticReportId,
      patient_fhir_id: patientFhirId,
      source_report_id: reportId,
      report_type: 'radiology',
      resource_data: fhirDiagnosticReport,
      effective_date_time: fhirDiagnosticReport.effectiveDateTime,
      status: 'final'
    });

  if (error) {
    console.error('Failed to create FHIR Radiology DiagnosticReport:', error);
  } else {
    console.log('Created FHIR Radiology DiagnosticReport:', diagnosticReportId);
  }
};

// Helper function to get user ID from report
const getUserIdFromReport = async (supabaseClient: any, reportId: string): Promise<string> => {
  const { data: report } = await supabaseClient
    .from('reports')
    .select('user_id')
    .eq('id', reportId)
    .single();
  
  return report?.user_id;
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
        // Use optimized document processing
        console.log('Using extracted text for optimized processing');
        
        const processingResult = await processDocumentContent(extractedText, report.report_type, openaiApiKey, prompt);
        aiResponse = processingResult.response;
        
        console.log(`Document processing completed using: ${processingResult.processingType}`);
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

    // Update report with results including the intelligent name
    const updateFields: any = {
      parsing_status: 'completed',
      extracted_text: aiResponse,
      parsed_data: parsedData,
      parsing_confidence: confidence,
      parsing_model: 'gpt-4o-mini',
      processing_error: null,
      report_type: reportType  // Ensure report type is updated (will be "custom" if using custom prompt)
    }
    
    console.log('🔍 CUSTOM PROMPT DEBUG: Updating report with fields:', {
      report_type: reportType,
      parsing_status: 'completed',
      has_parsed_data: !!parsedData,
      confidence: confidence
    });

    // Only update title if we have a meaningful name
    if (finalDocumentName && finalDocumentName !== 'Processing...') {
      updateFields.title = finalDocumentName
    }

    const { error: updateError } = await supabaseClient
      .from('reports')
      .update(updateFields)
      .eq('id', reportId)

    if (updateError) {
      throw new Error('Failed to update report with parsing results')
    }

    console.log('Document processing completed successfully')
    
    // Phase 1: Create FHIR resources after successful parsing - CRITICAL STEP
    console.log('Starting FHIR resource creation...');
    await createFHIRResourcesFromParsedData(
      supabaseClient, 
      parsedData, 
      report, 
      reportId
    );
    console.log('FHIR resources created successfully');
    
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