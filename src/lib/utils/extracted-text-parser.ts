/**
 * Utility functions for parsing and cleaning extracted text data
 */

// Remove markdown code blocks from text
export function stripMarkdownCodeBlocks(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').trim();
}

// Attempt to parse JSON from extracted text with resilience for truncated/corrupted data
export function parseExtractedTextAsJSON(extractedText: string): any | null {
  if (!extractedText || typeof extractedText !== 'string') {
    return null;
  }

  console.log('Parsing extracted text, length:', extractedText.length);

  // Clean up markdown code blocks more thoroughly
  let cleanedText = stripMarkdownCodeBlocks(extractedText);
  
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

// Transform lab report JSON to structured format with enhanced error handling
export function transformLabReportData(rawData: any): any {
  if (!rawData || typeof rawData !== 'object') {
    return null;
  }

  console.log('Transforming lab report data:', rawData);

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

  // Enhanced lab data recognition - look for lab indicators
  const isLabData = (data: any): boolean => {
    const labIndicators = [
      'tests', 'test_results', 'lab_tests', 'lab_results', 'laboratory_results',
      'patient', 'patient_info', 'demographics', 'collection_date', 'report_date',
      'ordering_physician', 'facility', 'laboratory'
    ];
    
    const hasLabIndicators = labIndicators.some(indicator => 
      data.hasOwnProperty(indicator) || 
      (data.data && data.data.hasOwnProperty(indicator))
    );
    
    // Also check for nested test data structures
    const hasNestedTests = Object.values(data).some((value: any) => 
      Array.isArray(value) && value.length > 0 && 
      typeof value[0] === 'object' && value[0] !== null &&
      (value[0].test_name || value[0].test || value[0].name || value[0].results)
    );
    
    return hasLabIndicators || hasNestedTests;
  };

  // Check if this looks like lab data
  if (!isLabData(rawData)) {
    console.log('Data does not appear to be lab report format');
    return null;
  }

  // Try multiple data structure patterns with enhanced detection
  const testArrayCandidates = [
    rawData.tests,
    rawData.test_results,
    rawData.lab_tests,
    rawData.results,
    rawData.lab_results,
    rawData.laboratory_results,
    rawData.data?.tests,
    rawData.data?.test_results,
    // Look for any array that might contain test data
    ...Object.values(rawData).filter((value: any) => 
      Array.isArray(value) && value.length > 0 && 
      typeof value[0] === 'object' && value[0] !== null &&
      (value[0].test_name || value[0].test || value[0].name || value[0].results)
    )
  ].filter(Boolean);

  const patientCandidates = [
    rawData.patient,
    rawData.patient_info,
    rawData.demographics,
    rawData.data?.patient,
    rawData.patient_data
  ].filter(Boolean);

  console.log('Found test array candidates:', testArrayCandidates.length);
  console.log('Found patient candidates:', patientCandidates.length);

  // Handle the most common structure we see in extracted data
  if (patientCandidates.length > 0 || testArrayCandidates.length > 0) {
    const patient = patientCandidates[0] || {};
    const testArray = testArrayCandidates[0] || [];
    
    console.log('Processing patient data:', patient);
    console.log('Processing test array:', testArray);
    
    // Process tests with error handling
    let tests: any[] = [];
    try {
      if (Array.isArray(testArray) && testArray.length > 0) {
        tests = flattenTestResults(testArray);
        console.log('Successfully flattened tests:', tests.length, 'tests found');
      }
    } catch (error) {
      console.warn('Error flattening test results, attempting recovery:', error);
      tests = attemptTestRecovery(testArray);
    }
    
    const labData = {
      reportType: 'lab',
      patient: {
        name: safeExtract(patient, ['name', 'patient_name', 'full_name']),
        dateOfBirth: safeExtract(patient, ['date_of_birth', 'dob', 'birth_date']),
        id: safeExtract(patient, ['id', 'patient_id', 'mrn', 'medical_record_number']),
        age: safeExtract(patient, ['age']),
        gender: safeExtract(patient, ['gender', 'sex'])
      },
      tests: tests,
      facility: safeExtract(rawData, ['facility', 'facility_name', 'lab_name', 'laboratory', 'clinic']),
      orderingPhysician: safeExtract(rawData, ['ordering_physician', 'physician', 'doctor', 'ordering_doctor']),
      collectionDate: safeExtract(rawData, ['collection_date', 'date_collected', 'sample_date']),
      reportDate: safeExtract(rawData, ['report_date', 'date_reported', 'result_date']),
      confidence: tests.length > 0 ? 0.9 : 0.5,
      extractedAt: new Date().toISOString()
    };
    
    console.log('Created lab data structure:', labData);
    return labData;
  }

  // Handle legacy structures for backward compatibility
  if (rawData.report_type === 'laboratory' && rawData.test_results) {
    return {
      reportType: 'lab',
      tests: (rawData.test_results || []).map((test: any) => ({
        name: test.test_name || test.name || 'Unknown Test',
        value: test.result || test.value || 'N/A',
        unit: test.unit || '',
        referenceRange: formatReferenceRange(test.reference_range || test.normal_range),
        status: determineTestStatus(test),
        notes: test.comments || test.notes || ''
      })),
      metadata: {
        facility: rawData.facility_name,
        physician: rawData.ordering_physician,
        date: rawData.collection_date || rawData.report_date
      }
    };
  }

  // Handle simple test arrays with flexible field mapping
  if (testArrayCandidates.length > 0) {
    const testArray = testArrayCandidates[0];
    return {
      reportType: 'lab',
      tests: (Array.isArray(testArray) ? testArray : []).map((test: any) => ({
        name: safeExtract(test, ['test_name', 'name', 'test', 'parameter']) || 'Unknown Test',
        value: safeExtract(test, ['result', 'value', 'measurement', 'level']) || 'N/A',
        unit: safeExtract(test, ['unit', 'units', 'measure_unit']) || '',
        referenceRange: formatReferenceRange(test.reference_range || test.normal_range || test.ref_range),
        status: determineTestStatus(test),
        notes: safeExtract(test, ['comments', 'notes', 'interpretation', 'remarks']) || ''
      })),
      confidence: Array.isArray(testArray) ? 0.8 : 0.5
    };
  }

  // Final attempt: look for any array-like data that might contain tests
  const possibleTestData = Object.values(rawData).find(value => 
    Array.isArray(value) && value.length > 0 && 
    typeof value[0] === 'object' && value[0] !== null
  );

  if (possibleTestData) {
    console.log('Found possible test data in fallback:', possibleTestData);
    return {
      reportType: 'lab',
      tests: (possibleTestData as any[]).map((item: any, index: number) => ({
        name: safeExtract(item, ['test_name', 'name', 'test', 'parameter']) || `Test ${index + 1}`,
        value: safeExtract(item, ['result', 'value', 'measurement', 'level']) || 'N/A',
        unit: safeExtract(item, ['unit', 'units']) || '',
        referenceRange: formatReferenceRange(item.reference_range || item.normal_range),
        status: determineTestStatus(item),
        notes: safeExtract(item, ['comments', 'notes', 'interpretation']) || ''
      })),
      confidence: 0.6
    };
  }

  return null;
}

// Attempt to recover test data from corrupted or incomplete structures
function attemptTestRecovery(testData: any): any[] {
  const recovered: any[] = [];
  
  try {
    // If it's not an array, try to convert it
    if (!Array.isArray(testData)) {
      if (typeof testData === 'object' && testData !== null) {
        // Convert object to array of key-value pairs
        Object.entries(testData).forEach(([key, value]) => {
          recovered.push({
            name: key.replace(/_/g, ' '),
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

    // Process each item in the array
    testData.forEach((item: any, index: number) => {
      if (typeof item === 'object' && item !== null) {
        // Try to extract meaningful test information
        const testName = item.test_name || item.name || item.test || `Test ${index + 1}`;
        const testValue = item.result || item.value || item.measurement || 'N/A';
        
        recovered.push({
          name: String(testName),
          value: String(testValue),
          unit: String(item.unit || item.units || ''),
          referenceRange: formatReferenceRange(item.reference_range || item.normal_range) || '',
          status: determineTestStatus(item),
          notes: String(item.comments || item.notes || item.interpretation || '')
        });
      } else {
        // Handle primitive values
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
    // Return a basic structure to avoid complete failure
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

// Flatten nested test results (handles test profiles with sub-tests)
function flattenTestResults(tests: any[]): any[] {
  const flattened: any[] = [];
  
  console.log('Flattening test results:', tests);
  
  for (const test of tests) {
    console.log('Processing test:', test);
    
    // Handle different data structures we encounter
    
    // Structure 1: test has test_name and results object with nested properties
    if (test.test_name && test.results && typeof test.results === 'object' && !Array.isArray(test.results)) {
      console.log('Structure 1: test_name with results object', test.test_name);
      
      // Check if results object contains multiple test results as key-value pairs
      if (Object.keys(test.results).length > 1 && !test.results.value && !test.results.result) {
        console.log('Multiple nested test results found, keys:', Object.keys(test.results));
        // This is a nested structure where each key in results is a separate test
        Object.entries(test.results).forEach(([testKey, testData]: [string, any]) => {
          if (typeof testData === 'object' && testData !== null) {
            console.log(`Processing nested test: ${testKey}`, testData);
            flattened.push({
              name: `${test.test_name} - ${testKey.replace(/_/g, ' ')}`,
              value: testData.result || testData.value || testData.level || testData.measurement || 'N/A',
              unit: testData.units || testData.unit || '',
              referenceRange: formatReferenceRange(testData.reference_interval || testData.reference_range || testData.normal_range || testData.ref_range),
              status: determineTestStatus(testData),
              notes: Array.isArray(testData.interpretation) ? testData.interpretation.join(', ') : 
                     testData.interpretation || testData.comments || testData.notes || testData.flag || ''
            });
          } else {
            // Simple key-value pair
            console.log(`Processing simple test: ${testKey} = ${testData}`);
            flattened.push({
              name: `${test.test_name} - ${testKey.replace(/_/g, ' ')}`,
              value: String(testData),
              unit: '',
              referenceRange: '',
              status: 'normal',
              notes: ''
            });
          }
        });
      } else {
        console.log('Single result object found');
        // Standard single result object
        flattened.push({
          name: test.test_name,
          value: test.results.result || test.results.value || test.results.measurement || 'N/A',
          unit: test.results.units || test.results.unit || test.unit || '',
          referenceRange: formatReferenceRange(test.results.reference_interval || test.results.reference_range || test.results.normal_range || test.reference_range),
          status: determineTestStatus(test.results || test),
          notes: Array.isArray(test.results.interpretation) ? test.results.interpretation.join(', ') : 
                 test.results.interpretation || test.results.comments || test.results.notes || 
                 Array.isArray(test.interpretation) ? test.interpretation.join(', ') : test.interpretation || ''
        });
      }
    }
    // Structure 2: test profiles with sub-results array
    else if (test.profile && test.results && Array.isArray(test.results)) {
      console.log('Structure 2: test profile with sub-results array');
      
      // Add the profile header
      flattened.push({
        name: test.profile,
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        notes: Array.isArray(test.interpretation) ? test.interpretation.join(', ') : test.interpretation || '',
        isProfileHeader: true
      });
      
      // Add sub-tests
      for (const subTest of test.results) {
        flattened.push({
          name: `  ${subTest.test || subTest.test_name || subTest.name}`, // Indent sub-tests
          value: subTest.result || subTest.value || 'N/A',
          unit: subTest.unit || subTest.units || '',
          referenceRange: formatReferenceRange(subTest.reference_range || subTest.normal_range),
          status: determineTestStatus(subTest),
          notes: Array.isArray(subTest.interpretation) ? subTest.interpretation.join(', ') : 
                 subTest.interpretation || subTest.comments || subTest.notes || '',
          isSubTest: true
        });
      }
    }
    // Structure 3: Test with nested structure where test_name exists at top level and results is deeply nested
    else if (test.test_name && test.results && Array.isArray(test.results)) {
      console.log('Structure 3: test_name with results array');
      
      // Add profile header for the main test
      flattened.push({
        name: test.test_name,
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        notes: Array.isArray(test.interpretation) ? test.interpretation.join(', ') : test.interpretation || '',
        isProfileHeader: true
      });
      
      // Process each result in the array
      for (const result of test.results) {
        if (typeof result === 'object' && result !== null) {
          flattened.push({
            name: `  ${result.test || result.test_name || result.name || 'Sub-test'}`,
            value: result.result || result.value || result.level || 'N/A',
            unit: result.unit || result.units || '',
            referenceRange: formatReferenceRange(result.reference_range || result.normal_range),
            status: determineTestStatus(result),
            notes: Array.isArray(result.interpretation) ? result.interpretation.join(', ') : 
                   result.interpretation || result.comments || result.notes || '',
            isSubTest: true
          });
        }
      }
    }
    // Structure 4: Simple test object with direct properties
    else {
      console.log('Structure 4: simple test object');
      
      flattened.push({
        name: test.test || test.name || test.test_name || 'Unknown Test',
        value: test.result || test.value || 'N/A',
        unit: test.unit || test.units || '',
        referenceRange: formatReferenceRange(test.reference_range || test.normal_range),
        status: determineTestStatus(test),
        notes: Array.isArray(test.interpretation) ? test.interpretation.join(', ') : 
               test.interpretation || test.comments || test.notes || ''
      });
    }
  }
  
  console.log('Flattened results:', flattened);
  return flattened;
}

// Format reference range from various input types
function formatReferenceRange(range: any): string {
  if (!range) return '';
  
  if (typeof range === 'string') {
    return range;
  }
  
  if (typeof range === 'object' && range !== null) {
    // Handle different object structures
    const { min, max, low, high, lower_limit, upper_limit, minimum, maximum } = range;
    
    // Try different field combinations
    const minVal = min || low || lower_limit || minimum;
    const maxVal = max || high || upper_limit || maximum;
    
    if (minVal !== undefined && maxVal !== undefined) {
      return `${minVal} - ${maxVal}`;
    }
    
    // Handle single-value ranges
    if (minVal !== undefined && maxVal === undefined) {
      return `> ${minVal}`;
    }
    
    if (maxVal !== undefined && minVal === undefined) {
      return `< ${maxVal}`;
    }
    
    // Handle nested objects with units
    if (range.value) {
      return formatReferenceRange(range.value);
    }
    
    // Handle array format [min, max]
    if (Array.isArray(range) && range.length === 2) {
      return `${range[0]} - ${range[1]}`;
    }
    
    // Fallback for complex objects - try to extract meaningful text
    const rangeStr = JSON.stringify(range);
    // Look for numeric patterns
    const numericPattern = /(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/;
    const match = rangeStr.match(numericPattern);
    if (match) {
      return `${match[1]} - ${match[2]}`;
    }
    
    return rangeStr.replace(/[{}",]/g, ' ').trim();
  }
  
  return String(range);
}

// Determine test status based on various indicators
function determineTestStatus(test: any): string {
  // Check explicit status field
  if (test.status) {
    const status = test.status.toLowerCase();
    // Normalize common status variations
    if (status.includes('high') || status.includes('elevated')) return 'high';
    if (status.includes('low') || status.includes('decreased')) return 'low';
    if (status.includes('critical') || status.includes('panic')) return 'critical';
    if (status.includes('abnormal') || status.includes('abnorm')) return 'abnormal';
    return status;
  }

  // Check abnormal flags
  if (test.abnormal_flag || test.abnormal) {
    return 'abnormal';
  }

  // Check critical flags
  if (test.critical || test.critical_flag) {
    return 'critical';
  }

  // Check high/low flags
  if (test.high_flag || test.high) {
    return 'high';
  }
  
  if (test.low_flag || test.low) {
    return 'low';
  }

  // Check result value vs reference range for numeric values
  const value = test.value || test.result;
  const refRange = test.reference_range || test.normal_range;
  
  if (value && refRange && typeof refRange === 'string') {
    const numericValue = parseFloat(String(value));
    if (!isNaN(numericValue)) {
      // Try to parse range like "10-20", "< 5", "> 100", etc.
      const rangeMatch = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (rangeMatch) {
        const [, min, max] = rangeMatch;
        const minVal = parseFloat(min);
        const maxVal = parseFloat(max);
        if (numericValue < minVal) return 'low';
        if (numericValue > maxVal) return 'high';
      }
      
      // Handle "< X" format
      const lessThanMatch = refRange.match(/<\s*(\d+\.?\d*)/);
      if (lessThanMatch && numericValue >= parseFloat(lessThanMatch[1])) {
        return 'high';
      }
      
      // Handle "> X" format
      const greaterThanMatch = refRange.match(/>\s*(\d+\.?\d*)/);
      if (greaterThanMatch && numericValue <= parseFloat(greaterThanMatch[1])) {
        return 'low';
      }
    }
  }

  return 'normal';
}

// Create a fallback renderer for unstructured data
export function createFallbackDataStructure(rawData: any): any {
  console.log('Creating fallback data structure for:', rawData);
  
  // If we have extracted_text, try to parse it for test results
  if (rawData.extracted_text) {
    console.log('Attempting to extract test data from extracted_text');
    
    // Try to find test-like patterns in the text
    const testPattern = /(\w+(?:\s+\w+)*)\s*[:=]\s*([^\n\r]+)(?:\s*(?:ref|reference|normal)[:=]\s*([^\n\r]+))?/gi;
    const matches = [...rawData.extracted_text.matchAll(testPattern)];
    
    if (matches.length > 5) { // If we find enough test-like patterns, treat as lab data
      console.log('Found test-like patterns, creating lab fallback structure');
      const tests = matches.slice(0, 20).map((match, index) => ({
        name: match[1].trim(),
        value: match[2].trim(),
        unit: '',
        referenceRange: match[3] ? match[3].trim() : '',
        status: 'normal',
        notes: ''
      }));
      
      return {
        reportType: 'lab',
        patient: null,
        tests: tests,
        confidence: 0.4,
        source: 'text_pattern_extraction'
      };
    }
  }
  
  // If rawData is a string, try to extract basic information
  if (typeof rawData === 'string') {
    return {
      reportType: 'general',
      sections: [{
        title: 'Extracted Text',
        content: rawData,
        category: 'text'
      }],
      confidence: 0.3,
      extractedAt: new Date().toISOString()
    };
  }

  if (!rawData || typeof rawData !== 'object') {
    return {
      reportType: 'general',
      sections: [{
        title: 'No Data Available',
        content: 'Unable to extract meaningful data from the document.',
        category: 'error'
      }],
      confidence: 0.1,
      extractedAt: new Date().toISOString()
    };
  }

  // Check if this might be lab data that we can still process
  if (rawData.results || rawData.tests || (rawData.lab_tests && Array.isArray(rawData.lab_tests))) {
    console.log('Attempting to transform as lab data in fallback');
    const labData = transformLabReportData(rawData);
    if (labData && labData.tests && labData.tests.length > 0) {
      return labData;
    }
  }

  // Try to identify patient information for grouping
  const patientKeys = ['patient', 'patient_info', 'demographics', 'name', 'patient_name', 'full_name'];
  const patientData: any = {};
  const sections: any[] = [];

  // Extract patient information first - be more intelligent about it
  Object.entries(rawData).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (patientKeys.some(pk => lowerKey.includes(pk))) {
      if (typeof value === 'object' && value !== null) {
        // If it's an object, merge its properties
        Object.assign(patientData, value);
      } else {
        // If it's a primitive value, map it to a standard field
        if (lowerKey.includes('name')) {
          patientData.name = value;
        } else {
          patientData[key] = value;
        }
      }
    }
  });

  // Process remaining data into sections, avoiding repetitive patient data
  Object.entries(rawData).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    
    // Skip patient data that's already been processed
    if (patientKeys.some(pk => lowerKey.includes(pk))) {
      return;
    }

    // Skip common metadata fields that aren't useful for display
    if (['confidence', 'extractedAt', 'reportType'].includes(key)) {
      return;
    }

    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Handle arrays more intelligently
        if (value.length > 0) {
          const content = value.map((item, index) => {
            if (typeof item === 'object' && item !== null) {
              // For objects, create a more readable format
              const formatted = Object.entries(item)
                .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1')}: ${String(v)}`)
                .join(', ');
              return `${index + 1}. ${formatted}`;
            } else {
              return `${index + 1}. ${String(item)}`;
            }
          }).join('\n');
          
          sections.push({
            title: formattedKey,
            content: content,
            category: 'list'
          });
        }
      } else {
        // Handle objects more intelligently
        const content = Object.entries(value)
          .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== '')
          .map(([k, v]) => {
            const formattedSubKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return `${formattedSubKey}: ${String(v)}`;
          })
          .join('\n');
          
        if (content) {
          sections.push({
            title: formattedKey,
            content: content,
            category: 'object'
          });
        }
      }
    } else if (value !== null && value !== undefined && String(value).trim() !== '') {
      sections.push({
        title: formattedKey,
        content: String(value),
        category: 'field'
      });
    }
  });

  return {
    reportType: 'general',
    patient: Object.keys(patientData).length > 0 ? patientData : null,
    sections: sections,
    confidence: 0.4,
    extractedAt: new Date().toISOString()
  };
}

// Helper function to format objects as readable text
function formatObjectAsText(obj: any): string {
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, index) => 
      typeof item === 'object' 
        ? `${index + 1}. ${JSON.stringify(item, null, 2)}`
        : `${index + 1}. ${item}`
    ).join('\n\n');
  }
  
  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj)
      .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
      .join('\n');
  }
  
  return String(obj);
}