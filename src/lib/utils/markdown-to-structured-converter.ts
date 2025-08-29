import { parseUniversalMedicalDocument } from './universal-data-parser';

interface ParsedSection {
  title: string;
  category: string;
  content: any;
}

interface StructuredData {
  patientInformation?: Record<string, any>;
  facilityInformation?: Record<string, any>;
  patient?: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
    age?: string;
    gender?: string;
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
}, rawExtractedText?: string): StructuredData {
  const result: StructuredData = {
    patientInformation: {},
    facilityInformation: {},
    reportDate: '',
    visitDate: '',
    sections: []
  };

  console.log('🔄 Converting markdown to structured format:', { extractedData });

  try {
    // DIRECT MARKDOWN TABLE PARSING - prioritize this over universal parser
    // Parse lab test results from markdown table first
    if (typeof extractedData.labTestResults === 'string' && extractedData.labTestResults.includes('|')) {
      console.log('📊 Found markdown table in labTestResults, parsing directly...');
      const labTests = parseMarkdownTable(extractedData.labTestResults);
      console.log('📊 Parsed lab tests:', labTests.length, 'tests found');
      
      if (labTests.length > 0) {
        result.sections.push({
          title: 'Laboratory Results',
          category: 'laboratory',
          content: labTests
        });
      }
    }

    // Parse patient information
    if (typeof extractedData.patientInformation === 'string') {
      const patientData = parsePatientInformation(extractedData.patientInformation);
      result.patient = patientData.patient;
      result.reportDate = patientData.reportDate;
      result.visitDate = patientData.visitDate;
      if (Object.keys(patientData.additionalContent).length > 0) {
        result.sections.push({ 
          title: 'Patient Details', 
          category: 'Patient Information', 
          content: patientData.additionalContent 
        });
      }
    }

    // Parse facility information
    if (typeof extractedData.hospitalLabInformation === 'string') {
      const medicalData = parseMedicalInformation(extractedData.hospitalLabInformation);
      result.facility = medicalData.facility;
      result.provider = medicalData.provider;
      if (Object.keys(medicalData.additionalContent).length > 0) {
        result.sections.push({ 
          title: 'Medical Information', 
          category: 'Facility & Provider', 
          content: medicalData.additionalContent 
        });
      }
    }

    // Fallback: Use universal parser if direct parsing didn't work or if labTestResults indicates no extraction
    const noTestResults = typeof extractedData.labTestResults === 'string' && 
                          extractedData.labTestResults.toLowerCase().includes('no test results extracted');
    
    console.info('🔍 Fallback analysis:', {
      sectionsCount: result.sections.length,
      noTestResults,
      hasRawText: !!rawExtractedText,
      rawTextLength: rawExtractedText?.length,
      labTestResults: extractedData.labTestResults
    });
    
    if (result.sections.length === 0 || noTestResults) {
      console.info('🔄 Fallback to universal parser...');
      
      // Use raw extracted text if available and structured extraction failed
      let contentToParse = '';
      if (rawExtractedText && rawExtractedText.length > 0 && noTestResults) {
        console.info('📄 Using raw extracted_text for parsing:', rawExtractedText.length, 'characters');
        console.info('📄 Raw text preview:', rawExtractedText.substring(0, 500) + '...');
        contentToParse = rawExtractedText;
      } else {
        console.info('📄 Using structured extractedData fields for parsing');
        // Fallback to combining extractedData fields
        contentToParse = [
          extractedData.patientInformation,
          extractedData.hospitalLabInformation,
          extractedData.labTestResults
        ].filter(Boolean).join('\n\n');
        console.info('📄 Combined content length:', contentToParse.length);
      }

      console.info('🔍 About to parse with universal parser, content length:', contentToParse.length);
      const universalData = parseUniversalMedicalDocument(contentToParse);
      console.info('🔍 Universal parser result:', {
        testResultsCount: universalData.testResults?.length || 0,
        sectionsCount: universalData.sections?.length || 0,
        hasPatientInfo: !!universalData.patientInfo?.name,
        hasMedicalInfo: !!universalData.medicalInfo?.facilityName
      });
      
      // Map universal data to display structure
      result.patient = {
        name: universalData.patientInfo.name,
        dateOfBirth: universalData.patientInfo.dob,
        id: universalData.patientInfo.id,
        age: universalData.patientInfo.age,
        gender: universalData.patientInfo.gender,
      };
      
      result.facility = universalData.medicalInfo.facilityName || universalData.medicalInfo.labName;
      result.provider = universalData.medicalInfo.physicianName;
      result.reportDate = universalData.medicalInfo.reportDate;
      result.visitDate = universalData.medicalInfo.collectionDate || '';
      
      // Add sections from universal parser
      result.sections = universalData.sections;
      
      // Add lab results as structured data if we have test results
      if (universalData.testResults.length > 0) {
        const existingLabSection = result.sections.find(s => s.category === 'laboratory');
        if (existingLabSection) {
          existingLabSection.content = universalData.testResults;
        } else {
          result.sections.push({
            title: 'Laboratory Results',
            category: 'laboratory',
            content: universalData.testResults
          });
        }
      }
    }

    // Fallback to original parsing if universal parser didn't extract much
    if (Object.keys(result.patientInformation).length === 0 && Object.keys(result.facilityInformation).length === 0) {
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
    }

  } catch (error) {
    console.error('Error converting markdown to structured data:', error);
  }

  return result;
}

function parsePatientInformation(content: string) {
  const result: any = {
    patient: {},
    additionalContent: {},
    reportDate: '',
    visitDate: ''
  };

  // Enhanced patient name extraction for lab reports
  const namePatterns = [
    /Patient Name\s*:?\s*:?\s*:?\s*:?\s*:?\s*([A-Za-z\.\s]+)/i,
    /Name\s*:?\s*([A-Za-z\.\s]+)/i,
    /Mr\.([A-Za-z\s]+)/i,
    /Mrs\.([A-Za-z\s]+)/i,
    /Ms\.([A-Za-z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      result.patient.name = match[1].trim();
      break;
    }
  }

  // Enhanced age/gender extraction for patterns like "45 Y(s) / Male"
  const ageGenderPattern = /(\d+)\s*Y\(s\)\s*\/\s*(Male|Female|M|F)/i;
  const ageGenderMatch = content.match(ageGenderPattern);
  if (ageGenderMatch) {
    result.patient.age = ageGenderMatch[1];
    result.patient.gender = ageGenderMatch[2];
  }

  // Extract patient ID patterns
  const idPatterns = [
    /LAB\s+(\d+)/i,
    /Patient\s*ID\s*:?\s*([A-Za-z0-9]+)/i,
    /Registration\s*No\s*:?\s*([A-Za-z0-9-]+)/i,
    /Client Req\.No\s*:?\s*([A-Za-z0-9-]+)/i
  ];
  
  for (const pattern of idPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      result.patient.id = match[1].trim();
      break;
    }
  }

  // Enhanced date extraction
  const reportDatePatterns = [
    /Reported On\s*:?\s*([0-9-]+\s+[0-9:]+)/i,
    /Print Date\s*:?\s*([0-9-]+\s+[0-9:]+)/i,
    /Report Date\s*:?\s*([0-9-]+)/i
  ];
  
  for (const pattern of reportDatePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      result.reportDate = match[1].trim();
      break;
    }
  }

  const collectionPatterns = [
    /Collected On\s*:?\s*([0-9-]+\s+[0-9:]+)/i,
    /Collection Date\s*:?\s*([0-9-]+)/i,
    /Sample Date\s*:?\s*([0-9-]+)/i
  ];
  
  for (const pattern of collectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      result.visitDate = match[1].trim();
      break;
    }
  }

  // Fallback to original patterns
  const originalNameMatch = content.match(/(?:Patient Name|Name):\s*([^\n\r]+)/i);
  if (!result.patient.name && originalNameMatch) {
    result.patient.name = originalNameMatch[1].trim();
  }

  const originalIdMatch = content.match(/(?:Patient ID|ID|MRN):\s*([^\n\r]+)/i);
  if (!result.patient.id && originalIdMatch) {
    result.patient.id = originalIdMatch[1].trim();
  }

  const originalReportDateMatch = content.match(/(?:Report Date|Date of Report):\s*([^\n\r]+)/i);
  if (!result.reportDate && originalReportDateMatch) {
    result.reportDate = originalReportDateMatch[1].trim();
  }

  const originalVisitDateMatch = content.match(/(?:Visit Date|Date of Visit|Service Date):\s*([^\n\r]+)/i);
  if (!result.visitDate && originalVisitDateMatch) {
    result.visitDate = originalVisitDateMatch[1].trim();
  }

  // Parse remaining content into key-value pairs
  const lines = content.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.includes(':') && !line.match(/(?:Patient Name|Name|Patient ID|ID|MRN|Date of Birth|DOB|Birth Date|Report Date|Date of Report|Visit Date|Date of Visit|Service Date|Collected On|Reported On):/i)) {
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
    facility: '',
    provider: '',
    additionalContent: {}
  };

  // Enhanced facility extraction for lab reports - look for exact facility name
  const facilityPatterns = [
    /(Simplify Wellness India)/i,
    /(?:Lab Name|Laboratory|Facility|Hospital)\s*:?\s*([A-Za-z\s]+)/i,
    /(?:Processing Location|Lab Location)\s*:?\s*([^\n\r]+)/i
  ];
  
  for (const pattern of facilityPatterns) {
    const match = content.match(pattern);
    if (match) {
      if (match[0].toLowerCase().includes('simplify wellness india')) {
        result.facility = 'Simplify Wellness India';
        break;
      } else if (match[1] && match[1].trim().length > 3) {
        result.facility = match[1].trim();
        break;
      }
    }
  }

  // Enhanced doctor/physician extraction - specifically look for the doctor pattern
  const physicianPatterns = [
    /Dr\.([A-Za-z\s\.]+?),?\s*([A-Z]{2,}[A-Z\s\.]*)/i,
    /Dr\s+([A-Za-z\s\.]+?)\s+([A-Z]{2,}[A-Z\s\.]*)/i,
    /(?:Consultant|Doctor|Physician|Ref\.Dr\.?)\s*:?\s*Dr\.?\s*([A-Za-z\s\.]+?)(?:,\s*([A-Z]{2,}[A-Z\s\.]*))?/i,
    /(?:Provider|Ordering Provider)\s*:?\s*([^\n\r]+)/i
  ];
  
  for (const pattern of physicianPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const doctorName = match[1].trim();
      const qualifications = match[2]?.trim() || '';
      
      // Clean up the name
      let cleanName = doctorName.replace(/\s+/g, ' ').trim();
      if (cleanName.length > 2) {
        // Add qualifications if present
        const fullName = qualifications ? 
          `Dr. ${cleanName}, ${qualifications}` : 
          (cleanName.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`);
        result.provider = fullName;
        break;
      }
    }
  }

  // Parse remaining content into key-value pairs
  const lines = content.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.includes(':') && !line.match(/(?:Facility|Hospital|Lab|Laboratory|Provider|Doctor|Physician|Ordering Provider|Ref\.Dr|Processing Location):/i)) {
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

  console.log('🧪 Parsing lab results from content length:', content.length);

  // Check if content indicates "No test results extracted"
  if (content.toLowerCase().includes('no test results extracted') || content.toLowerCase().includes('no results found')) {
    console.log('⚠️ Content indicates no test results, skipping table parsing');
    return sections;
  }

  // Try to parse table format first
  const tableMatch = content.match(/\|[^|]+\|[^|]+\|/);
  if (tableMatch) {
    const parsedTable = parseMarkdownTable(content);
    if (parsedTable.length > 0) {
      console.log('✅ Found', parsedTable.length, 'tests from table parsing');
      sections.push({
        title: "Laboratory Results",
        category: "laboratory",
        content: parsedTable
      });
      return sections;
    }
  }

  // Enhanced parsing for specific lab report format
  const tests: any[] = [];
  
  // Enhanced patterns for complex lab report formats
  const methodPatterns = [
    // Pattern 1: "Uric Acid Method : Uricase PAP(Phenyl Amino Phenazone) : 5.71 mg/d L 3.5-7.2"
    /([A-Za-z][A-Za-z\s,]+?)\s*Method\s*:\s*([^:]+?)\s*:\s*([\d\.<>\/=]+)\s*([A-Za-z\/\sd]*?)\s*([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)/gi,
    
    // Pattern 2: Direct test results "Test Name : Result Units Range"
    /(?:^|\n)\s*([A-Za-z][A-Za-z\s,]+?)\s*:\s*([\d\.<>\/=]+)\s*([A-Za-z\/\sd]*?)\s+([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)/gm,
  ];
  
  for (const pattern of methodPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      console.log('🔍 Lab pattern match:', match);
      
      let testName, result, units, referenceRange;
      
      if (match[0].includes('Method :')) {
        // Format: "Test Method : Method : Result Units Range"
        testName = match[1]?.trim().replace(/\s+/g, ' ');
        result = match[3]?.trim();
        units = match[4]?.trim().replace(/\s+/g, ' ');
        referenceRange = match[5]?.trim();
      } else {
        // Format: "Test : Result Units Range"
        testName = match[1]?.trim().replace(/\s+/g, ' ');
        result = match[2]?.trim();
        units = match[3]?.trim().replace(/\s+/g, ' ');
        referenceRange = match[4]?.trim();
      }
      
      if (testName && result && testName.length > 2 && result.match(/[\d\.<>]/)) {
        const testResult = {
          testName: testName,
          result: result,
          units: units || '',
          referenceRange: referenceRange || '',
          status: calculateStatus(result, referenceRange || '')
        };
        
        // Avoid duplicates
        if (!tests.find(t => t.testName?.toLowerCase() === testName.toLowerCase())) {
          console.log('✅ Found lab test:', testResult);
          tests.push(testResult);
        }
      }
    }
  }

  // If no tests found with patterns, try to parse raw content
  if (tests.length === 0) {
    console.log('🔄 No tests found with patterns, trying raw content parsing...');
    
    // Look for any content that might contain lab data
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Skip obviously non-test lines
      if (line.length < 5 || line.match(/^(test|name|result|unit|reference|normal|range|patient|doctor|lab)/i)) {
        continue;
      }
      
      // Try to extract test data from any line that looks like it has test info
      const testMatch = line.match(/([A-Za-z][A-Za-z\s,]+?)\s+([\d\.<>\/=]+)\s*([A-Za-z\/\sd]*?)\s*([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)?/);
      if (testMatch) {
        const testName = testMatch[1]?.trim();
        const result = testMatch[2]?.trim();
        const units = testMatch[3]?.trim();
        const referenceRange = testMatch[4]?.trim() || '';
        
        if (testName && result && testName.length > 3) {
          const testResult = {
            testName: testName,
            result: result,
            units: units || '',
            referenceRange: referenceRange,
            status: calculateStatus(result, referenceRange)
          };
          
          if (!tests.find(t => t.testName?.toLowerCase() === testName.toLowerCase())) {
            console.log('✅ Raw parsing found test:', testResult);
            tests.push(testResult);
          }
        }
      }
    }
  }

  if (tests.length > 0) {
    console.log('🎉 Successfully parsed', tests.length, 'lab tests');
    sections.push({
      title: "Laboratory Results",
      category: "laboratory",
      content: tests
    });
  } else {
    console.log('❌ No lab tests could be extracted');
  }

  return sections;
}

function parseMarkdownTable(content: string): any[] {
  console.log('📋 Parsing markdown table, content length:', content.length);
  const lines = content.split('\n').filter(line => line.includes('|'));
  console.log('📋 Found table lines:', lines.length);
  
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
  console.log('📋 Table headers:', headers);
  
  const results: any[] = [];
  
  for (let i = 2; i < lines.length; i++) { // Skip header and separator
    const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 2) { // At least test name and result
      const testData: any = {
        testName: '',
        result: '',
        units: '',
        referenceRange: '',
        status: 'Normal'
      };
      
      // Map cells to expected format - be more flexible with mapping
      if (cells.length >= 4) {
        // Standard format: | Test Name | Result | Units | Reference Range |
        testData.testName = cells[0];
        testData.result = cells[1];
        testData.units = cells[2];
        testData.referenceRange = cells[3];
      } else if (cells.length === 3) {
        // Format: | Test Name | Result Units | Reference Range |
        testData.testName = cells[0];
        const resultWithUnits = cells[1];
        testData.referenceRange = cells[2];
        
        // Extract result and units from combined string
        const resultMatch = resultWithUnits.match(/^([\d.,<>]+)\s*(.*)$/);
        if (resultMatch) {
          testData.result = resultMatch[1];
          testData.units = resultMatch[2];
        } else {
          testData.result = resultWithUnits;
        }
      } else if (cells.length === 2) {
        // Minimal format: | Test Name | Result |
        testData.testName = cells[0];
        testData.result = cells[1];
      }
      
      // Calculate status based on result and reference range
      if (testData.result && testData.referenceRange) {
        testData.status = calculateStatus(testData.result, testData.referenceRange);
      }
      
      // Clean up the data
      testData.testName = testData.testName.trim();
      testData.result = testData.result.trim();
      testData.units = testData.units.trim();
      testData.referenceRange = testData.referenceRange.trim();
      
      // Only add if we have meaningful data
      if (testData.testName && testData.testName !== '--' && testData.testName !== '') {
        results.push(testData);
        console.log('📋 Added test:', testData.testName, '=', testData.result, testData.units);
      }
    }
  }
  
  console.log('📋 Successfully parsed', results.length, 'tests from markdown table');
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