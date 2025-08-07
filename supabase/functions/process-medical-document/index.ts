import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractText } from 'https://esm.sh/unpdf@0.11.0'

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

const generateFallbackDocumentName = (
  reportType: string, 
  parsedData: any, 
  reportDate: string
): string => {
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const formattedDate = formatDate(reportDate);

  switch (reportType?.toLowerCase()) {
    case 'lab_results':
    case 'lab':
      if (parsedData?.tests?.length > 0) {
        const primaryTest = parsedData.tests[0];
        if (primaryTest.isProfileHeader && primaryTest.name) {
          return `Lab Results - ${primaryTest.name} - ${formattedDate}`;
        } else if (primaryTest.name) {
          return `Lab Results - ${primaryTest.name} - ${formattedDate}`;
        }
      }
      return `Lab Results - ${formattedDate}`;

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

// Document chunking configuration
const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 2500, // Characters per chunk
  OVERLAP_SIZE: 200,    // Overlap between chunks
  MIN_DOCUMENT_SIZE_FOR_CHUNKING: 8000, // Only chunk if document is larger than this
  MAX_TOKENS: 12000     // Increased from 8000
};

// Document chunk interface
interface DocumentChunk {
  id: number;
  content: string;
  startPos: number;
  endPos: number;
  sectionHeader?: string;
}

// Smart document segmentation based on medical document patterns
const segmentDocument = (text: string): DocumentChunk[] => {
  const chunks: DocumentChunk[] = [];
  
  // Check if document needs chunking
  if (text.length <= CHUNK_CONFIG.MIN_DOCUMENT_SIZE_FOR_CHUNKING) {
    console.log('Document too small for chunking, processing as single chunk');
    return [{
      id: 0,
      content: text,
      startPos: 0,
      endPos: text.length
    }];
  }

  console.log(`Document size: ${text.length} chars - applying intelligent segmentation`);

  // Common medical document section patterns
  const sectionPatterns = [
    /(?:^|\n)\s*(?:DEPARTMENT|LAB|TEST|REPORT|SECTION|FINDINGS|IMPRESSION|CONCLUSION|RECOMMENDATIONS?|MEDICATION|PRESCRIPTION|VITAL|BLOOD|CHEMISTRY|HEMATOLOGY|IMMUNOLOGY|MICROBIOLOGY|PATHOLOGY|RADIOLOGY|IMAGING|THYROID|LIVER|KIDNEY|CARDIAC|LIPID|GLUCOSE|COMPLETE BLOOD COUNT|CBC|CMP|BMP)\s*[:\-\s]/gmi,
    /(?:^|\n)\s*(?:TEST NAME|RESULT|UNITS|REFERENCE|BIOLOGICAL REFERENCE|METHOD|INTERPRETATION|NOTE|REMARK)\s*[:\-\s]/gmi,
    /(?:^|\n)\s*(?:\*{2,}|#{2,}|={2,}|-{3,})\s*(?:END|REPORT|PAGE)/mi,
    /(?:^|\n)\s*Page \d+/mi
  ];

  // Find all potential split points
  const splitPoints: Array<{pos: number, type: string, priority: number}> = [];
  
  // Add section headers as split points
  sectionPatterns.forEach((pattern, patternIndex) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      splitPoints.push({
        pos: match.index,
        type: `section_${patternIndex}`,
        priority: patternIndex === 0 ? 3 : 2 // Department/Lab sections get higher priority
      });
    }
  });

  // Add natural paragraph breaks as lower priority split points
  const paragraphPattern = /\n\s*\n\s*(?=[A-Z])/g;
  let match;
  while ((match = paragraphPattern.exec(text)) !== null) {
    splitPoints.push({
      pos: match.index,
      type: 'paragraph',
      priority: 1
    });
  }

  // Sort split points by position
  splitPoints.sort((a, b) => a.pos - b.pos);

  let currentPos = 0;
  let chunkId = 0;

  while (currentPos < text.length) {
    const targetEndPos = Math.min(currentPos + CHUNK_CONFIG.MAX_CHUNK_SIZE, text.length);
    
    // Find the best split point within our target range
    let bestSplitPos = targetEndPos;
    let bestSplitPriority = 0;
    
    for (const split of splitPoints) {
      if (split.pos > currentPos && split.pos <= targetEndPos) {
        if (split.priority > bestSplitPriority || 
            (split.priority === bestSplitPriority && split.pos > bestSplitPos)) {
          bestSplitPos = split.pos;
          bestSplitPriority = split.priority;
        }
      }
    }

    // If no good split point found, try to split at sentence boundary
    if (bestSplitPriority === 0 && targetEndPos < text.length) {
      const sentenceEnd = text.lastIndexOf('.', targetEndPos);
      if (sentenceEnd > currentPos + CHUNK_CONFIG.MAX_CHUNK_SIZE * 0.7) {
        bestSplitPos = sentenceEnd + 1;
      }
    }

    const chunkEnd = bestSplitPos;
    const chunkContent = text.slice(currentPos, chunkEnd).trim();
    
    if (chunkContent.length > 0) {
      // Extract section header if present
      const headerMatch = chunkContent.match(/^(?:DEPARTMENT|LAB|TEST|REPORT|SECTION)[^:\n]*[:\-\s]?([^\n]*)/i);
      const sectionHeader = headerMatch ? headerMatch[0].trim() : undefined;

      chunks.push({
        id: chunkId++,
        content: chunkContent,
        startPos: currentPos,
        endPos: chunkEnd,
        sectionHeader
      });
    }

    // Move to next chunk with overlap
    currentPos = Math.max(chunkEnd - CHUNK_CONFIG.OVERLAP_SIZE, chunkEnd);
    
    // Prevent infinite loop
    if (currentPos >= text.length) break;
  }

  console.log(`Document segmented into ${chunks.length} chunks`);
  chunks.forEach((chunk, index) => {
    console.log(`Chunk ${index}: ${chunk.content.length} chars, section: ${chunk.sectionHeader || 'N/A'}`);
  });

  return chunks;
};

// Process multiple chunks in parallel
const processDocumentChunks = async (
  chunks: DocumentChunk[],
  reportType: string,
  openaiApiKey: string
): Promise<any[]> => {
  console.log(`Processing ${chunks.length} chunks in parallel`);

  // Create promises for parallel processing
  const chunkPromises = chunks.map(async (chunk, index) => {
    try {
      console.log(`Processing chunk ${index + 1}/${chunks.length} (${chunk.content.length} chars)`);
      
      const chunkPrompt = getChunkPromptForReportType(reportType, chunk.sectionHeader);
      
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
            { role: 'user', content: `${chunkPrompt}\n\nDocument chunk (${index + 1}/${chunks.length}):\n${chunk.content}` }
          ],
          max_tokens: CHUNK_CONFIG.MAX_TOKENS,
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
        sectionHeader: chunk.sectionHeader,
        rawResponse: aiResponse,
        parsedData,
        processed: true
      };
    } catch (error) {
      console.error(`Error processing chunk ${index}:`, error);
      return {
        chunkId: chunk.id,
        chunkIndex: index,
        sectionHeader: chunk.sectionHeader,
        error: error.message,
        processed: false
      };
    }
  });

  // Wait for all chunks to complete
  const results = await Promise.all(chunkPromises);
  console.log(`Completed processing ${results.length} chunks`);
  
  return results;
};

// Generate chunk-specific prompts
const getChunkPromptForReportType = (reportType: string, sectionHeader?: string): string => {
  const basePrompt = getPromptForReportType(reportType);
  
  if (sectionHeader) {
    return `${basePrompt}\n\nThis chunk contains data from section: "${sectionHeader}"\nFocus on extracting relevant data from this specific section.`;
  }
  
  return `${basePrompt}\n\nThis is a partial document chunk. Extract all relevant medical data from this section.`;
};

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

    const prompt = getPromptForReportType(report.report_type)
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
        // Apply intelligent document chunking for large documents
        console.log('Using extracted text for processing')
        
        const chunks = segmentDocument(extractedText);
        
        if (chunks.length === 1) {
          // Single chunk - use traditional processing
          console.log('Processing single chunk with traditional approach');
          
          const textResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `${prompt}\n\nDocument text:\n${extractedText}` }
              ],
              max_tokens: CHUNK_CONFIG.MAX_TOKENS,
              temperature: 0.1
            })
          });

          if (!textResponse.ok) {
            const errorText = await textResponse.text();
            throw new Error(`OpenAI Text API error: ${textResponse.status} - ${errorText}`);
          }

          const textData = await textResponse.json();
          aiResponse = textData.choices?.[0]?.message?.content || '';
        } else {
          // Multiple chunks - use parallel processing
          console.log(`Processing ${chunks.length} chunks with parallel approach`);
          
          const chunkResults = await processDocumentChunks(chunks, report.report_type, openaiApiKey);
          const mergedData = mergeChunkResults(chunkResults, report.report_type);
          
          // Convert merged data back to string format for compatibility
          aiResponse = JSON.stringify(mergedData);
          console.log('Multi-chunk processing completed, merged results ready');
        }
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
          max_tokens: CHUNK_CONFIG.MAX_TOKENS,
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
      
      // Enhance status determination if missing
      parsedData = enhanceStatusDetermination(parsedData);
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI response:', aiResponse);
      
      // Try to extract meaningful data from the text response
      parsedData = extractDataFromTextResponse(aiResponse, report.report_type);
      console.log('Fallback parsing result:', parsedData);
    }

    // Generate intelligent document name
    let finalDocumentName = suggestedName
    if (!finalDocumentName) {
      // Fallback to our own naming logic if AI didn't provide a name
      finalDocumentName = generateFallbackDocumentName(report.report_type, parsedData, report.report_date)
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
      processing_error: null
    }

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