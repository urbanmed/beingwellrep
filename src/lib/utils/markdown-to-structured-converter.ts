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
  patientInformation?: unknown;
  hospitalLabInformation?: unknown;
  labTestResults?: unknown;
}): StructuredData {
  const result: StructuredData = {
    sections: []
  };

  const isPlainObject = (val: unknown): val is Record<string, unknown> =>
    !!val && typeof val === 'object' && !Array.isArray(val);

  const normalize = (value: unknown): string | null => {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(v => (typeof v === 'string' ? v : String(v))).join('\n');
    if (typeof value === 'object') {
      // Try common shapes {content: "..."} or join values
      // @ts-ignore
      if (typeof (value as any).content === 'string') return (value as any).content as string;
      const pieces = Object.values(value as Record<string, unknown>)
        .map(v => (typeof v === 'string' ? v : ''))
        .filter(Boolean);
      return pieces.length ? pieces.join('\n') : null;
    }
    try {
      return String(value);
    } catch {
      return null;
    }
  };

  // Handle object-based patient information directly
  if (isPlainObject(extractedData.patientInformation)) {
    const p = extractedData.patientInformation as Record<string, any>;
    result.patient = {
      name: p.name || p.patient_name,
      dateOfBirth: p.dateOfBirth || p.dob || p.date_of_birth,
      id: p.id || p.patient_id || p.mrn,
    };
    const additional: Record<string, string> = {};
    Object.entries(p).forEach(([k, v]) => {
      const key = String(k);
      if (!['name','patient_name','dateOfBirth','dob','date_of_birth','id','patient_id','mrn'].includes(key) && v != null && v !== '') {
        additional[key] = String(v);
      }
    });
    if (Object.keys(additional).length) {
      result.sections.push({ title: 'Patient Details', category: 'Patient Information', content: additional });
    }
  }

  // Handle object-based medical/facility information directly
  if (isPlainObject(extractedData.hospitalLabInformation)) {
    const m = extractedData.hospitalLabInformation as Record<string, any>;
    result.facility = m.facility || m.facility_name || m.lab || m.lab_name;
    result.provider = m.provider || m.doctor || m.physician || m.ordering_provider || m.ordering_physician;
    const additional: Record<string, string> = {};
    Object.entries(m).forEach(([k, v]) => {
      const key = String(k);
      if (!['facility','facility_name','lab','lab_name','provider','doctor','physician','ordering_provider','ordering_physician'].includes(key) && v != null && v !== '') {
        additional[key] = String(v);
      }
    });
    if (Object.keys(additional).length) {
      result.sections.push({ title: 'Medical Information', category: 'Facility & Provider', content: additional });
    }
  }

  // Handle array/object-based lab results directly
  const mapTest = (t: any) => ({
    testName: t.testName || t.test || t.name || t.parameter || t.analyte || '',
    result: t.result != null ? String(t.result) : (t.value != null ? String(t.value) : ''),
    units: t.units || t.unit || '',
    referenceRange: t.referenceRange || t.reference || t.referenceInterval || t.normalRange || '',
    status: normalizeStatus(t.status || t.flag || t.interpretation || ''),
  });

  let labHandled = false;
  if (Array.isArray(extractedData.labTestResults)) {
    const tests = (extractedData.labTestResults as any[])
      .map(mapTest)
      .filter(t => t.testName || t.result);
    if (tests.length) {
      result.sections.push({ title: 'Laboratory Results', category: 'Lab Tests', content: tests });
      labHandled = true;
    }
  } else if (isPlainObject(extractedData.labTestResults)) {
    const entries = Object.entries(extractedData.labTestResults as Record<string, any>);
    const tests = entries.map(([name, val]) => {
      if (isPlainObject(val)) return mapTest({ name, ...val });
      return { testName: name, result: String(val), units: '', referenceRange: '', status: normalizeStatus('') };
    }).filter(t => t.testName || t.result);
    if (tests.length) {
      result.sections.push({ title: 'Laboratory Results', category: 'Lab Tests', content: tests });
      labHandled = true;
    }
  }

  // Parse patient information (string-based)
  const patientInfo = normalize(extractedData.patientInformation);
  if (patientInfo && !result.patient) {
    const patientData = parsePatientInformation(patientInfo);
    result.patient = patientData.patient;
    result.reportDate = patientData.reportDate;
    result.visitDate = patientData.visitDate;
    if (patientData.additionalContent) {
      result.sections.push({ title: 'Patient Details', category: 'Patient Information', content: patientData.additionalContent });
    }
  }

  // Parse medical/facility information (string-based)
  const medicalInfo = normalize(extractedData.hospitalLabInformation);
  if (medicalInfo && !(result.facility || result.provider)) {
    const medicalData = parseMedicalInformation(medicalInfo);
    result.facility = medicalData.facility || result.facility;
    result.provider = medicalData.provider || result.provider;
    if (medicalData.additionalContent) {
      result.sections.push({ title: 'Medical Information', category: 'Facility & Provider', content: medicalData.additionalContent });
    }
  }

  // Parse lab test results (string-based)
  const labInfo = !labHandled ? normalize(extractedData.labTestResults) : null;
  if (labInfo) {
    const labSections = parseLabResults(labInfo);
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
        
        if (normalizedHeader.includes('test') || normalizedHeader.includes('name') || normalizedHeader.includes('parameter')) {
          testData.testName = value;
        } else if (normalizedHeader.includes('result') || normalizedHeader.includes('value')) {
          // Handle empty/pending results
          if (!value || value === '' || value === '-' || value.toLowerCase().includes('pending') || value.toLowerCase().includes('awaiting')) {
            testData.result = '';
            testData.units = '';
            testData.status = 'Pending';
          } else {
            // Extract numeric result and units
            const resultMatch = value.match(/^([\d.,]+)\s*(.*)$/);
            testData.result = resultMatch ? resultMatch[1] : value;
            testData.units = resultMatch ? resultMatch[2] : '';
            
            // Calculate status based on result and reference range if not explicitly provided
            if (!testData.status && testData.referenceRange) {
              testData.status = calculateStatus(testData.result, testData.referenceRange);
            }
          }
        } else if (normalizedHeader.includes('reference') || normalizedHeader.includes('range') || normalizedHeader.includes('normal')) {
          testData.referenceRange = value;
        } else if (normalizedHeader.includes('status') || normalizedHeader.includes('flag')) {
          testData.status = normalizeStatus(value);
        }
      });
      
      // Calculate status after all data is parsed if not already set
      if (testData.testName && testData.result && !testData.status && testData.referenceRange) {
        testData.status = calculateStatus(testData.result, testData.referenceRange);
      }
      
      // Include tests even if they have no results (requisition forms)
      if (testData.testName) {
        // Set default status if not already set
        if (!testData.status) {
          if (!testData.result || testData.result === '') {
            testData.status = 'Pending';
          } else {
            testData.status = 'Normal';
          }
        }
        results.push(testData);
      }
    }
  }
  
  return results;
}

function calculateStatus(result: string, referenceRange: string): string {
  if (!result || !referenceRange || result === '' || referenceRange === '') {
    return 'Normal';
  }
  
  // Extract numeric value from result
  const resultMatch = result.match(/([\d.,]+)/);
  if (!resultMatch) return 'Normal';
  
  const numericResult = parseFloat(resultMatch[1].replace(',', ''));
  if (isNaN(numericResult)) return 'Normal';
  
  // Parse reference range (e.g., "2.5-5.0", "< 10", "> 5", "2.5 - 5.0")
  const rangeMatch = referenceRange.match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
  if (rangeMatch) {
    const lowerBound = parseFloat(rangeMatch[1].replace(',', ''));
    const upperBound = parseFloat(rangeMatch[2].replace(',', ''));
    
    if (!isNaN(lowerBound) && !isNaN(upperBound)) {
      if (numericResult < lowerBound) return 'Low';
      if (numericResult > upperBound) return 'High';
      return 'Normal';
    }
  }
  
  // Handle "< value" format
  const lessThanMatch = referenceRange.match(/[<≤]\s*([\d.,]+)/);
  if (lessThanMatch) {
    const threshold = parseFloat(lessThanMatch[1].replace(',', ''));
    if (!isNaN(threshold)) {
      return numericResult >= threshold ? 'High' : 'Normal';
    }
  }
  
  // Handle "> value" format
  const greaterThanMatch = referenceRange.match(/[>≥]\s*([\d.,]+)/);
  if (greaterThanMatch) {
    const threshold = parseFloat(greaterThanMatch[1].replace(',', ''));
    if (!isNaN(threshold)) {
      return numericResult <= threshold ? 'Low' : 'Normal';
    }
  }
  
  return 'Normal';
}

function normalizeStatus(status: string): string {
  if (!status) return 'Normal';
  
  const normalized = status.toLowerCase().trim();
  
  if (normalized.includes('pending') || normalized.includes('awaiting') || normalized.includes('ordered')) {
    return 'Pending';
  } else if (normalized.includes('high') || normalized.includes('elevated') || normalized.includes('↑')) {
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