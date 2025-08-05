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

  // Handle the specific structure we see in the report
  if (rawData.report_type === 'laboratory' && rawData.test_results) {
    return {
      reportType: 'lab',
      tests: rawData.test_results.map((test: any) => ({
        name: test.test_name || test.name,
        value: test.result || test.value,
        unit: test.unit || '',
        referenceRange: test.reference_range || test.normal_range,
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

  // Handle other potential structures
  if (rawData.tests || rawData.test_results) {
    return {
      reportType: 'lab',
      tests: (rawData.tests || rawData.test_results).map((test: any) => ({
        name: test.test_name || test.name || 'Unknown Test',
        value: test.result || test.value || 'N/A',
        unit: test.unit || '',
        referenceRange: test.reference_range || test.normal_range || '',
        status: determineTestStatus(test),
        notes: test.comments || test.notes || ''
      }))
    };
  }

  return null;
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
  return {
    reportType: 'general',
    sections: [
      {
        title: 'Extracted Information',
        content: typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2),
        category: 'raw_data'
      }
    ]
  };
}