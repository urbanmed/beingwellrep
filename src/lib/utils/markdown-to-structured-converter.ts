interface ParsedSection {
  title: string;
  category: string;
  content: any;
}

interface StructuredData {
  patient?: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
  };
  facility?: string;
  provider?: string;
  reportDate?: string;
  visitDate?: string;
  sections: ParsedSection[];
}

/**
 * Converts markdown content from extractedData into structured format
 */
export function convertMarkdownToStructured(extractedData: {
  patientInformation?: string;
  hospitalLabInformation?: string;
  labTestResults?: string;
}): StructuredData {
  const result: StructuredData = {
    sections: []
  };

  // Parse patient information
  if (extractedData.patientInformation) {
    const patientData = parsePatientInformation(extractedData.patientInformation);
    result.patient = patientData.patient;
    result.reportDate = patientData.reportDate;
    result.visitDate = patientData.visitDate;
    
    if (patientData.additionalContent) {
      result.sections.push({
        title: "Patient Details",
        category: "Patient Information",
        content: patientData.additionalContent
      });
    }
  }

  // Parse medical/facility information
  if (extractedData.hospitalLabInformation) {
    const medicalData = parseMedicalInformation(extractedData.hospitalLabInformation);
    result.facility = medicalData.facility;
    result.provider = medicalData.provider;
    
    if (medicalData.additionalContent) {
      result.sections.push({
        title: "Medical Information",
        category: "Facility & Provider",
        content: medicalData.additionalContent
      });
    }
  }

  // Parse lab test results
  if (extractedData.labTestResults) {
    const labSections = parseLabResults(extractedData.labTestResults);
    result.sections.push(...labSections);
  }

  return result;
}

function parsePatientInformation(content: string) {
  const result: any = {
    patient: {},
    additionalContent: {}
  };

  // Extract structured patient data
  const nameMatch = content.match(/(?:Patient Name|Name):\s*([^\n\r]+)/i);
  if (nameMatch) {
    result.patient.name = nameMatch[1].trim();
  }

  const idMatch = content.match(/(?:Patient ID|ID|MRN):\s*([^\n\r]+)/i);
  if (idMatch) {
    result.patient.id = idMatch[1].trim();
  }

  const dobMatch = content.match(/(?:Date of Birth|DOB|Birth Date):\s*([^\n\r]+)/i);
  if (dobMatch) {
    result.patient.dateOfBirth = dobMatch[1].trim();
  }

  const reportDateMatch = content.match(/(?:Report Date|Date of Report):\s*([^\n\r]+)/i);
  if (reportDateMatch) {
    result.reportDate = reportDateMatch[1].trim();
  }

  const visitDateMatch = content.match(/(?:Visit Date|Date of Visit|Service Date):\s*([^\n\r]+)/i);
  if (visitDateMatch) {
    result.visitDate = visitDateMatch[1].trim();
  }

  // Parse remaining content into key-value pairs
  const lines = content.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.includes(':') && !line.match(/(?:Patient Name|Name|Patient ID|ID|MRN|Date of Birth|DOB|Birth Date|Report Date|Date of Report|Visit Date|Date of Visit|Service Date):/i)) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (key.trim() && value) {
        const cleanKey = key.trim().replace(/[*-]/g, '').trim();
        result.additionalContent[cleanKey] = value;
      }
    }
  }

  return result;
}

function parseMedicalInformation(content: string) {
  const result: any = {
    additionalContent: {}
  };

  // Extract facility information
  const facilityMatch = content.match(/(?:Facility|Hospital|Lab|Laboratory):\s*([^\n\r]+)/i);
  if (facilityMatch) {
    result.facility = facilityMatch[1].trim();
  }

  const providerMatch = content.match(/(?:Provider|Doctor|Physician|Ordering Provider):\s*([^\n\r]+)/i);
  if (providerMatch) {
    result.provider = providerMatch[1].trim();
  }

  // Parse remaining content into key-value pairs
  const lines = content.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.includes(':') && !line.match(/(?:Facility|Hospital|Lab|Laboratory|Provider|Doctor|Physician|Ordering Provider):/i)) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (key.trim() && value) {
        const cleanKey = key.trim().replace(/[*-]/g, '').trim();
        result.additionalContent[cleanKey] = value;
      }
    }
  }

  return result;
}

function parseLabResults(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // Try to parse table format first
  const tableMatch = content.match(/\|[^|]+\|[^|]+\|/);
  if (tableMatch) {
    const parsedTable = parseMarkdownTable(content);
    if (parsedTable.length > 0) {
      sections.push({
        title: "Laboratory Results",
        category: "Lab Tests",
        content: parsedTable
      });
      return sections;
    }
  }

  // Try to parse structured test results
  const testPattern = /(?:^|\n)([A-Za-z][^:\n]*?):\s*([^\n]+?)(?:\s+(?:Reference|Ref|Normal):\s*([^\n]+))?(?:\s+(?:Status|Flag):\s*([^\n]+))?/gm;
  const tests: any[] = [];
  let match;

  while ((match = testPattern.exec(content)) !== null) {
    const testName = match[1].trim();
    const resultWithUnits = match[2].trim();
    const referenceRange = match[3]?.trim();
    const status = match[4]?.trim() || 'Normal';

    // Extract numeric result and units
    const resultMatch = resultWithUnits.match(/^([\d.,]+)\s*(.*)$/);
    const result = resultMatch ? resultMatch[1] : resultWithUnits;
    const units = resultMatch ? resultMatch[2] : '';

    tests.push({
      testName,
      result,
      units,
      referenceRange: referenceRange || '',
      status: normalizeStatus(status)
    });
  }

  if (tests.length > 0) {
    sections.push({
      title: "Laboratory Results",
      category: "Lab Tests",
      content: tests
    });
  } else {
    // Fallback: parse as key-value pairs
    const keyValuePairs: any = {};
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        if (key.trim() && value) {
          const cleanKey = key.trim().replace(/[*-]/g, '').trim();
          keyValuePairs[cleanKey] = value;
        }
      }
    }

    if (Object.keys(keyValuePairs).length > 0) {
      sections.push({
        title: "Test Results",
        category: "Lab Data",
        content: keyValuePairs
      });
    }
  }

  return sections;
}

function parseMarkdownTable(content: string): any[] {
  const lines = content.split('\n').filter(line => line.includes('|'));
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
  
  const results: any[] = [];
  
  for (let i = 2; i < lines.length; i++) { // Skip header and separator
    const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= headers.length) {
      const testData: any = {};
      
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase();
        const value = cells[index] || '';
        
        if (normalizedHeader.includes('test') || normalizedHeader.includes('name')) {
          testData.testName = value;
        } else if (normalizedHeader.includes('result') || normalizedHeader.includes('value')) {
          // Extract numeric result and units
          const resultMatch = value.match(/^([\d.,]+)\s*(.*)$/);
          testData.result = resultMatch ? resultMatch[1] : value;
          testData.units = resultMatch ? resultMatch[2] : '';
        } else if (normalizedHeader.includes('reference') || normalizedHeader.includes('range')) {
          testData.referenceRange = value;
        } else if (normalizedHeader.includes('status') || normalizedHeader.includes('flag')) {
          testData.status = normalizeStatus(value);
        }
      });
      
      if (testData.testName) {
        results.push(testData);
      }
    }
  }
  
  return results;
}

function normalizeStatus(status: string): string {
  const normalized = status.toLowerCase().trim();
  
  if (normalized.includes('high') || normalized.includes('elevated') || normalized.includes('↑')) {
    return 'High';
  } else if (normalized.includes('low') || normalized.includes('decreased') || normalized.includes('↓')) {
    return 'Low';
  } else if (normalized.includes('critical') || normalized.includes('panic')) {
    return 'Critical';
  } else if (normalized.includes('normal') || normalized.includes('within') || normalized === '' || normalized === '-') {
    return 'Normal';
  }
  
  return status || 'Normal';
}