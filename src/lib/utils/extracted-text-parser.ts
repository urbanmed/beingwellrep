/**
 * Utility functions for parsing and cleaning extracted text data
 */

// Remove markdown code blocks from text
export function stripMarkdownCodeBlocks(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').trim();
}

// Attempt to parse JSON from extracted text
export function parseExtractedTextAsJSON(extractedText: string): any | null {
  try {
    // Clean up markdown code blocks
    const cleanedText = stripMarkdownCodeBlocks(extractedText);
    
    // Try to parse as JSON
    return JSON.parse(cleanedText);
  } catch (error) {
    console.warn('Failed to parse extracted text as JSON:', error);
    return null;
  }
}

// Transform lab report JSON to structured format
export function transformLabReportData(rawData: any): any {
  if (!rawData || typeof rawData !== 'object') {
    return null;
  }

  // Handle the actual structure we see in extracted data
  if (rawData.patient || rawData.tests) {
    const tests = flattenTestResults(rawData.tests || []);
    
    return {
      reportType: 'lab',
      patient: {
        name: rawData.patient?.name,
        dateOfBirth: rawData.patient?.date_of_birth || rawData.patient?.dob,
        id: rawData.patient?.id || rawData.patient?.patient_id
      },
      tests: tests,
      facility: rawData.facility || rawData.facility_name,
      orderingPhysician: rawData.ordering_physician || rawData.physician,
      collectionDate: rawData.collection_date || rawData.date_collected,
      reportDate: rawData.report_date || rawData.date_reported,
      confidence: 0.9,
      extractedAt: new Date().toISOString()
    };
  }

  // Handle legacy structures for backward compatibility
  if (rawData.report_type === 'laboratory' && rawData.test_results) {
    return {
      reportType: 'lab',
      tests: rawData.test_results.map((test: any) => ({
        name: test.test_name || test.name,
        value: test.result || test.value,
        unit: test.unit || '',
        referenceRange: formatReferenceRange(test.reference_range || test.normal_range),
        status: determineTestStatus(test),
        notes: test.comments || test.notes
      })),
      metadata: {
        facility: rawData.facility_name,
        physician: rawData.ordering_physician,
        date: rawData.collection_date || rawData.report_date
      }
    };
  }

  // Handle simple test arrays
  if (rawData.tests || rawData.test_results) {
    return {
      reportType: 'lab',
      tests: (rawData.tests || rawData.test_results).map((test: any) => ({
        name: test.test_name || test.name || 'Unknown Test',
        value: test.result || test.value || 'N/A',
        unit: test.unit || '',
        referenceRange: formatReferenceRange(test.reference_range || test.normal_range),
        status: determineTestStatus(test),
        notes: test.comments || test.notes || ''
      }))
    };
  }

  return null;
}

// Flatten nested test results (handles test profiles with sub-tests)
function flattenTestResults(tests: any[]): any[] {
  const flattened: any[] = [];
  
  for (const test of tests) {
    // Handle test profiles with sub-results
    if (test.profile && test.results && Array.isArray(test.results)) {
      // Add the profile header
      flattened.push({
        name: test.profile,
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        notes: '',
        isProfileHeader: true
      });
      
      // Add sub-tests
      for (const subTest of test.results) {
        flattened.push({
          name: `  ${subTest.test}`, // Indent sub-tests
          value: subTest.result || subTest.value || 'N/A',
          unit: subTest.unit || '',
          referenceRange: formatReferenceRange(subTest.reference_range || subTest.normal_range),
          status: determineTestStatus(subTest),
          notes: subTest.interpretation || subTest.comments || subTest.notes || '',
          isSubTest: true
        });
      }
    } else {
      // Handle regular tests
      flattened.push({
        name: test.test || test.name || test.test_name || 'Unknown Test',
        value: test.result || test.value || 'N/A',
        unit: test.unit || '',
        referenceRange: formatReferenceRange(test.reference_range || test.normal_range),
        status: determineTestStatus(test),
        notes: test.interpretation || test.comments || test.notes || ''
      });
    }
  }
  
  return flattened;
}

// Format reference range from various input types
function formatReferenceRange(range: any): string {
  if (!range) return '';
  
  if (typeof range === 'string') {
    return range;
  }
  
  if (typeof range === 'object' && range !== null) {
    const { min, max, low, high } = range;
    const minVal = min || low;
    const maxVal = max || high;
    
    if (minVal !== undefined && maxVal !== undefined) {
      return `${minVal} - ${maxVal}`;
    }
    
    // Handle other object structures
    return JSON.stringify(range);
  }
  
  return String(range);
}

// Determine test status based on various indicators
function determineTestStatus(test: any): string {
  // Check explicit status field
  if (test.status) {
    return test.status.toLowerCase();
  }

  // Check abnormal flags
  if (test.abnormal_flag || test.abnormal) {
    return 'abnormal';
  }

  // Check critical flags
  if (test.critical || test.critical_flag) {
    return 'critical';
  }

  // Check if result is outside reference range (basic logic)
  if (test.reference_range && test.result) {
    const result = parseFloat(test.result);
    if (!isNaN(result) && typeof test.reference_range === 'string') {
      const rangeMatch = test.reference_range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (rangeMatch) {
        const [, min, max] = rangeMatch;
        const minVal = parseFloat(min);
        const maxVal = parseFloat(max);
        if (result < minVal || result > maxVal) {
          return 'abnormal';
        }
      }
    }
  }

  return 'normal';
}

// Create a fallback renderer for unstructured data
export function createFallbackDataStructure(rawData: any): any {
  if (typeof rawData === 'string') {
    return {
      reportType: 'general',
      sections: [
        {
          title: 'Extracted Text',
          content: rawData,
          category: 'text_data'
        }
      ]
    };
  }

  // Try to extract meaningful sections from JSON data
  const sections = [];
  
  // Extract patient info if available
  if (rawData.patient) {
    sections.push({
      title: 'Patient Information',
      content: formatObjectAsText(rawData.patient),
      category: 'patient_info'
    });
  }

  // Extract other meaningful sections
  Object.keys(rawData).forEach(key => {
    if (key !== 'patient' && rawData[key]) {
      sections.push({
        title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        content: formatObjectAsText(rawData[key]),
        category: key
      });
    }
  });

  return {
    reportType: 'general',
    patient: rawData.patient || null,
    sections: sections.length > 0 ? sections : [
      {
        title: 'Raw Data',
        content: JSON.stringify(rawData, null, 2),
        category: 'raw_data'
      }
    ]
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