/**
 * Enhanced utility functions for parsing and cleaning extracted text data
 * with improved hierarchical structure handling
 */

// Remove markdown code blocks from text
export function stripMarkdownCodeBlocks(text: string): string {
  if (!text) return '';
  
  // Remove markdown code blocks with language specifiers (more comprehensive)
  let cleaned = text.replace(/```(?:json|javascript|js|typescript|ts)?\s*\n?/gi, '');
  
  // Remove any remaining markdown formatting
  cleaned = cleaned.replace(/```/g, '');
  
  // Remove markdown backticks for inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove common markdown artifacts
  cleaned = cleaned.replace(/^\s*#+\s*/gm, ''); // Headers
  cleaned = cleaned.replace(/^\s*[-*]\s*/gm, ''); // List items
  
  // Remove extra whitespace and normalize line breaks
  cleaned = cleaned.trim().replace(/\n\s*\n/g, '\n');
  
  return cleaned;
}

// Attempt to parse JSON from extracted text with resilience for truncated/corrupted data
export function parseExtractedTextAsJSON(extractedText: string): any | null {
  if (!extractedText || typeof extractedText !== 'string') {
    return null;
  }

  console.log('Parsing extracted text, length:', extractedText.length);

  // Enhanced cleaning approach
  let cleanedText = stripMarkdownCodeBlocks(extractedText);
  
  // Additional cleaning for common issues
  cleanedText = cleanedText.replace(/^\s*.*?({[\s\S]*})\s*.*?$/s, '$1'); // Extract main JSON object
  cleanedText = cleanedText.replace(/,\s*}/g, '}'); // Remove trailing commas before closing braces
  cleanedText = cleanedText.replace(/,\s*]/g, ']'); // Remove trailing commas before closing brackets
  
  // Remove any trailing content after the last valid JSON character
  const lastBrace = cleanedText.lastIndexOf('}');
  const lastBracket = cleanedText.lastIndexOf(']');
  const lastValidChar = Math.max(lastBrace, lastBracket);
  
  if (lastValidChar > 0 && lastValidChar < cleanedText.length - 1) {
    console.log('Truncating text at last valid JSON character');
    cleanedText = cleanedText.substring(0, lastValidChar + 1);
  }
  
  // Try standard JSON parsing first
  try {
    const result = JSON.parse(cleanedText);
    console.log('Standard JSON parsing successful');
    return result;
  } catch (error) {
    console.warn('Standard JSON parsing failed:', error.message);
  }

  // Try chunked parsing for large JSON
  const chunkResult = attemptChunkedParsing(cleanedText);
  if (chunkResult) {
    console.log('Chunked parsing successful');
    return chunkResult;
  }

  // Try to repair truncated JSON
  const repairedJson = repairTruncatedJson(cleanedText);
  if (repairedJson) {
    try {
      const result = JSON.parse(repairedJson);
      console.log('Repaired JSON parsing successful');
      return result;
    } catch (error) {
      console.warn('Repaired JSON parsing failed:', error.message);
    }
  }

  // Try partial parsing strategies
  const partialResult = attemptPartialParsing(cleanedText);
  if (partialResult) {
    console.log('Partial parsing successful');
    return partialResult;
  }

  // Final fallback: try to extract any JSON-like structures
  const extractedJson = extractJsonStructures(cleanedText);
  if (extractedJson) {
    console.log('JSON structure extraction successful');
    return extractedJson;
  }

  console.warn('All JSON parsing attempts failed for text:', cleanedText.substring(0, 200) + '...');
  return null;
}

// Attempt chunked parsing for large JSON that might be partially corrupt
function attemptChunkedParsing(text: string): any | null {
  // Look for the start of a JSON object or array
  const startIndex = Math.max(text.indexOf('{'), text.indexOf('['));
  if (startIndex === -1) return null;

  // Try parsing progressively smaller chunks from the start
  const maxLength = Math.min(text.length, 50000); // Limit chunk size
  
  for (let length = maxLength; length >= 1000; length -= 1000) {
    const chunk = text.substring(startIndex, startIndex + length);
    const repairedChunk = repairTruncatedJson(chunk);
    
    if (repairedChunk) {
      try {
        return JSON.parse(repairedChunk);
      } catch {
        // Continue to smaller chunk
      }
    }
  }
  
  return null;
}

// Repair truncated JSON by adding missing closing brackets/braces
function repairTruncatedJson(text: string): string | null {
  try {
    let cleaned = text.trim();
    
    // Count open/close brackets and braces
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    
    // Add missing closing characters
    let repaired = cleaned;
    
    // Add missing closing brackets first (arrays)
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']';
    }
    
    // Add missing closing braces (objects)
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}';
    }
    
    // Remove trailing commas that might cause issues
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    return repaired;
  } catch (error) {
    console.warn('JSON repair failed:', error);
    return null;
  }
}

// Try to parse partial JSON structures
function attemptPartialParsing(text: string): any | null {
  // Look for complete JSON objects within the text - improved pattern
  const patterns = [
    // Complete objects with nested structures
    /\{(?:[^{}]|(?:\{[^{}]*\}))*\}/g,
    // Arrays of objects
    /\[(?:[^\[\]]|(?:\[[^\[\]]*\]))*\]/g,
    // Simple key-value objects
    /\{[^{}]+\}/g
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    
    if (matches && matches.length > 0) {
      // Sort by length descending to try larger, more complete objects first
      const sortedMatches = matches.sort((a, b) => b.length - a.length);
      
      for (const match of sortedMatches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed && typeof parsed === 'object') {
            console.log('Partial parsing found valid object, size:', Object.keys(parsed).length);
            return parsed;
          }
        } catch (error) {
          // Try repairing this match
          const repaired = repairTruncatedJson(match);
          if (repaired) {
            try {
              const parsed = JSON.parse(repaired);
              if (parsed && typeof parsed === 'object') {
                console.log('Partial parsing with repair successful');
                return parsed;
              }
            } catch {
              // Continue to next match
            }
          }
        }
      }
    }
  }
  
  return null;
}

// Extract JSON-like structures and convert to valid JSON
function extractJsonStructures(text: string): any | null {
  try {
    // Look for key-value patterns that look like JSON
    const keyValuePattern = /"([^"]+)"\s*:\s*("([^"]*)"|[\d.]+|true|false|null)/g;
    const matches = [];
    let match;
    
    while ((match = keyValuePattern.exec(text)) !== null) {
      const key = match[1];
      const value = match[2];
      matches.push({ key, value });
    }
    
    if (matches.length > 0) {
      const extracted: any = {};
      for (const { key, value } of matches) {
        try {
          // Try to parse the value
          const parsedValue = JSON.parse(value);
          extracted[key] = parsedValue;
        } catch {
          // If parsing fails, use as string
          extracted[key] = value.replace(/^"(.*)"$/, '$1');
        }
      }
      return extracted;
    }
  } catch (error) {
    console.warn('JSON structure extraction failed:', error);
  }
  
  return null;
}

// Enhanced hierarchical test processing that preserves structure
export function processHierarchicalTests(tests: any[]): any[] {
  const processed: any[] = [];
  
  console.log('Processing tests with enhanced hierarchy:', tests);
  
  for (const test of tests) {
    // Handle properly structured hierarchical data (GPT-4.1 output)
    if (test.isProfileHeader && test.subTests && Array.isArray(test.subTests)) {
      console.log('Found structured test profile:', test.name);
      
      // Add the profile header
      processed.push({
        name: test.name,
        isProfileHeader: true,
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        notes: test.notes || ''
      });
      
      // Add all sub-tests with proper hierarchy markers
      test.subTests.forEach((subTest: any) => {
        processed.push({
          name: subTest.name,
          value: subTest.value || 'N/A',
          unit: subTest.unit || '',
          referenceRange: formatReferenceRange(subTest.referenceRange),
          status: determineTestStatus(subTest),
          notes: subTest.notes || '',
          isSubTest: true
        });
      });
      continue;
    }
    
    // Handle legacy nested structure - convert to hierarchical
    if (test.test_name && test.results && typeof test.results === 'object' && !Array.isArray(test.results)) {
      const resultKeys = Object.keys(test.results);
      
      // Multiple nested results = test profile
      if (resultKeys.length > 1 && !test.results.value && !test.results.result) {
        console.log('Converting legacy nested structure to hierarchy:', test.test_name);
        
        // Add profile header
        processed.push({
          name: test.test_name,
          isProfileHeader: true,
          value: '',
          unit: '',
          referenceRange: '',
          status: 'normal',
          notes: ''
        });
        
        // Convert nested results to sub-tests
        Object.entries(test.results).forEach(([testKey, testData]: [string, any]) => {
          if (typeof testData === 'object' && testData !== null) {
            processed.push({
              name: formatTestName(testKey),
              value: testData.result || testData.value || testData.level || testData.measurement || 'N/A',
              unit: testData.units || testData.unit || '',
              referenceRange: formatReferenceRange(testData.reference_range || testData.normal_range),
              status: determineTestStatus(testData),
              notes: testData.interpretation || testData.comments || testData.notes || '',
              isSubTest: true
            });
          }
        });
        continue;
      }
    }
    
    // Handle array-based profiles
    if (test.profile && test.results && Array.isArray(test.results)) {
      console.log('Processing array-based profile:', test.profile);
      
      processed.push({
        name: test.profile,
        isProfileHeader: true,
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        notes: test.interpretation || ''
      });
      
      test.results.forEach((subTest: any) => {
        processed.push({
          name: subTest.test || subTest.test_name || subTest.name || 'Sub-test',
          value: subTest.result || subTest.value || 'N/A',
          unit: subTest.unit || subTest.units || '',
          referenceRange: formatReferenceRange(subTest.reference_range || subTest.normal_range),
          status: determineTestStatus(subTest),
          notes: subTest.interpretation || subTest.comments || subTest.notes || '',
          isSubTest: true
        });
      });
      continue;
    }
    
    // Handle standalone tests (no grouping)
    processed.push({
      name: test.name || test.test || test.test_name || 'Unknown Test',
      value: test.value || test.result || 'N/A',
      unit: test.unit || test.units || '',
      referenceRange: formatReferenceRange(test.referenceRange || test.reference_range || test.normal_range),
      status: determineTestStatus(test),
      notes: test.notes || test.interpretation || test.comments || ''
    });
  }
  
  return processed;
}

// Transform lab report JSON to structured format with enhanced hierarchy handling
export function transformLabReportData(rawData: any): any {
  if (!rawData || typeof rawData !== 'object') {
    return null;
  }

  console.log('Transforming lab report data with enhanced processing:', rawData);

  // Helper to safely extract nested values
  const safeExtract = (obj: any, paths: string[]) => {
    for (const path of paths) {
      const value = path.split('.').reduce((o, key) => o?.[key], obj);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return null;
  };

  // Enhanced lab data recognition
  const isLabData = (data: any): boolean => {
    const labIndicators = [
      'tests', 'testResults', 'test_results', 'lab_tests', 'lab_results', 'laboratory_results',
      'patient', 'patientInfo', 'patient_info', 'demographics', 'collection_date', 'report_date',
      'ordering_physician', 'facility', 'laboratory', 'sections'
    ];
    
    const medicalTerms = [
      'hemoglobin', 'glucose', 'cholesterol', 'creatinine', 'bilirubin',
      'platelet', 'wbc', 'rbc', 'sodium', 'potassium', 'chloride',
      'chemistry', 'hematology', 'lipid', 'metabolic', 'cbc'
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Check for direct field indicators
    const hasIndicators = labIndicators.some(indicator => 
      data.hasOwnProperty(indicator) || 
      (data.data && data.data.hasOwnProperty(indicator))
    );
    
    // Check for medical terms in the data
    const hasMedicalTerms = medicalTerms.some(term => dataString.includes(term));
    
    return hasIndicators || hasMedicalTerms;
  };

  if (!isLabData(rawData)) {
    console.log('Data does not appear to be lab report format');
    return null;
  }

  // Find test data arrays
  const testArrayCandidates = [
    rawData.tests,
    rawData.test_results,
    rawData.lab_tests,
    rawData.results,
    rawData.lab_results,
    rawData.laboratory_results,
    rawData.data?.tests,
    rawData.data?.test_results
  ].filter(Boolean);

  // Find patient data
  const patientCandidates = [
    rawData.patient,
    rawData.patient_info,
    rawData.demographics,
    rawData.data?.patient,
    rawData.patient_data
  ].filter(Boolean);

  if (patientCandidates.length > 0 || testArrayCandidates.length > 0) {
    const patient = patientCandidates[0] || {};
    const testArray = testArrayCandidates[0] || [];
    
    console.log('Processing with enhanced hierarchy - patient:', patient);
    console.log('Processing with enhanced hierarchy - tests:', testArray);
    
    // Process tests with enhanced hierarchical handling
    let tests: any[] = [];
    try {
      if (Array.isArray(testArray) && testArray.length > 0) {
        tests = processHierarchicalTests(testArray);
        console.log('Successfully processed hierarchical tests:', tests.length, 'items');
      }
    } catch (error) {
      console.warn('Error processing hierarchical tests:', error);
      tests = attemptTestRecovery(testArray);
    }
    
    const labData = {
      reportType: 'lab',
      patient: {
        name: safeExtract(patient, ['name', 'patient_name', 'full_name']),
        dateOfBirth: safeExtract(patient, ['date_of_birth', 'dob', 'birth_date', 'dateOfBirth']),
        id: safeExtract(patient, ['id', 'patient_id', 'mrn', 'medical_record_number']),
        age: safeExtract(patient, ['age']),
        gender: safeExtract(patient, ['gender', 'sex'])
      },
      tests: tests,
      facility: safeExtract(rawData, ['facility', 'facility_name', 'lab_name', 'laboratory', 'clinic']),
      orderingPhysician: safeExtract(rawData, ['ordering_physician', 'physician', 'doctor', 'ordering_doctor', 'orderingPhysician']),
      collectionDate: safeExtract(rawData, ['collection_date', 'date_collected', 'sample_date', 'collectionDate']),
      reportDate: safeExtract(rawData, ['report_date', 'date_reported', 'result_date', 'reportDate']),
      confidence: tests.length > 0 ? 0.9 : 0.5,
      extractedAt: new Date().toISOString()
    };
    
    console.log('Created enhanced lab data structure:', labData);
    return labData;
  }

  return null;
}

// Helper functions for formatting
function formatTestName(testKey: string): string {
  return testKey
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, str => str.toUpperCase());
}

function formatReferenceRange(range: any): string {
  if (!range) return '';
  
  if (typeof range === 'string') {
    return range;
  }
  
  if (typeof range === 'object' && range !== null) {
    if (range.min !== undefined && range.max !== undefined) {
      return `${range.min}-${range.max}`;
    }
    if (range.low !== undefined && range.high !== undefined) {
      return `${range.low}-${range.high}`;
    }
    if (range.lower !== undefined && range.upper !== undefined) {
      return `${range.lower}-${range.upper}`;
    }
  }
  
  return String(range);
}

function determineTestStatus(test: any): string {
  if (!test) return 'normal';
  
  // Check explicit status fields
  const statusFields = ['status', 'flag', 'abnormal_flag', 'result_flag'];
  for (const field of statusFields) {
    if (test[field]) {
      const status = String(test[field]).toLowerCase();
      if (status.includes('critical') || status.includes('panic')) return 'critical';
      if (status.includes('high') || status.includes('elevated')) return 'high';
      if (status.includes('low') || status.includes('decreased')) return 'low';
      if (status.includes('abnormal') || status.includes('flag')) return 'abnormal';
      if (status.includes('normal')) return 'normal';
    }
  }
  
  // Check for numeric range comparisons
  if (test.value && test.reference_range) {
    try {
      const value = parseFloat(test.value);
      const range = test.reference_range;
      
      if (typeof range === 'string' && range.includes('-')) {
        const [min, max] = range.split('-').map(parseFloat);
        if (!isNaN(value) && !isNaN(min) && !isNaN(max)) {
          if (value < min) return 'low';
          if (value > max) return 'high';
          return 'normal';
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }
  
  return 'normal';
}

// Attempt to recover test data from corrupted or incomplete structures
function attemptTestRecovery(testData: any): any[] {
  const recovered: any[] = [];
  
  try {
    if (!Array.isArray(testData)) {
      if (typeof testData === 'object' && testData !== null) {
        Object.entries(testData).forEach(([key, value]) => {
          recovered.push({
            name: formatTestName(key),
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            unit: '',
            referenceRange: '',
            status: 'normal',
            notes: ''
          });
        });
      }
      return recovered;
    }

    testData.forEach((item: any, index: number) => {
      if (typeof item === 'object' && item !== null) {
        recovered.push({
          name: item.test_name || item.name || item.test || `Test ${index + 1}`,
          value: item.result || item.value || item.measurement || 'N/A',
          unit: item.unit || item.units || '',
          referenceRange: formatReferenceRange(item.reference_range || item.normal_range),
          status: determineTestStatus(item),
          notes: item.comments || item.notes || item.interpretation || ''
        });
      } else {
        recovered.push({
          name: `Item ${index + 1}`,
          value: String(item),
          unit: '',
          referenceRange: '',
          status: 'normal',
          notes: ''
        });
      }
    });
  } catch (error) {
    console.warn('Test recovery failed:', error);
    return [{
      name: 'Data Recovery Failed',
      value: 'Unable to parse test data',
      unit: '',
      referenceRange: '',
      status: 'unknown',
      notes: 'Original data may be corrupted or incomplete'
    }];
  }

  return recovered;
}

// Create fallback data structure for general documents
export function createFallbackDataStructure(rawData: any): any {
  if (!rawData || typeof rawData !== 'object') {
    return null;
  }

  console.log('Creating fallback data structure');

  // Try to identify if this might be lab data
  const possibleLabData = Object.values(rawData).find(value => 
    Array.isArray(value) && value.length > 0 && 
    typeof value[0] === 'object' && value[0] !== null
  );

  if (possibleLabData) {
    console.log('Found possible lab data in fallback, attempting lab transformation');
    const labTransform = transformLabReportData({ tests: possibleLabData });
    if (labTransform) return labTransform;
  }

  // General document structure
  const sections: any[] = [];
  
  Object.entries(rawData).forEach(([key, value]) => {
    if (key === 'extracted_text') return; // Skip this meta field
    
    let content = '';
    let category = 'general';
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        content = value.map((item, index) => 
          typeof item === 'object' ? `${index + 1}. ${JSON.stringify(item)}` : `${index + 1}. ${item}`
        ).join('\n');
        category = 'list';
      } else {
        content = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n');
        category = 'object';
      }
    } else {
      content = String(value);
      category = 'text';
    }
    
    sections.push({
      title: formatTestName(key),
      content,
      category
    });
  });

  return {
    reportType: 'general',
    sections,
    confidence: 0.3,
    extractedAt: new Date().toISOString()
  };
}