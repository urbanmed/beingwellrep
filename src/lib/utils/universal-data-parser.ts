// Universal data parser for extracting patient and medical information from various formats
interface PatientInfo {
  name?: string;
  age?: string;
  gender?: string;
  dob?: string;
  id?: string;
  contact?: string;
  address?: string;
}

interface MedicalInfo {
  facilityName?: string;
  physicianName?: string;
  collectionDate?: string;
  reportDate?: string;
  labName?: string;
  contact?: string;
  address?: string;
}

interface TestResult {
  testName: string;
  result?: string;
  units?: string;
  referenceRange?: string;
  status?: string;
  category?: string;
}

interface ParsedMedicalDocument {
  patientInfo: PatientInfo;
  medicalInfo: MedicalInfo;
  testResults: TestResult[];
  sections: Array<{
    title: string;
    category: string;
    content: string;
  }>;
}

// Field mapping dictionaries for flexible parsing
const PATIENT_FIELD_MAPPINGS = {
  name: ['patient name', 'name', 'patient', 'pt name', 'subject name', 'full name'],
  age: ['age', 'patient age', 'pt age', 'years', 'age (years)', 'age(years)'],
  gender: ['gender', 'sex', 'patient gender', 'pt gender', 'male/female', 'm/f'],
  dob: ['dob', 'date of birth', 'birth date', 'patient dob', 'pt dob', 'born'],
  id: ['patient id', 'id', 'patient no', 'registration no', 'mrn', 'uhid', 'patient number'],
  contact: ['phone', 'mobile', 'contact', 'phone no', 'mobile no', 'contact no'],
  address: ['address', 'patient address', 'pt address', 'location', 'residence']
};

const MEDICAL_FIELD_MAPPINGS = {
  facilityName: ['facility name', 'hospital', 'lab name', 'laboratory', 'clinic', 'medical center', 'health center'],
  physicianName: ['doctor', 'physician', 'dr', 'referring doctor', 'consultant', 'ordered by', 'requested by'],
  collectionDate: ['collection date', 'sample date', 'collected on', 'sample collected', 'specimen date'],
  reportDate: ['report date', 'reported on', 'date', 'test date', 'result date'],
  contact: ['phone', 'contact', 'lab contact', 'facility contact'],
  address: ['address', 'lab address', 'facility address', 'location']
};

const TEST_FIELD_MAPPINGS = {
  testName: ['test', 'test name', 'parameter', 'investigation', 'analyte', 'component'],
  result: ['result', 'value', 'finding', 'measurement', 'outcome'],
  units: ['units', 'unit', 'uom', 'measure'],
  referenceRange: ['reference range', 'normal range', 'range', 'ref range', 'normal', 'reference'],
  status: ['status', 'flag', 'interpretation', 'result status', 'abnormal']
};

export function parseUniversalMedicalDocument(content: string | any): ParsedMedicalDocument {
  // Initialize result structure
  const result: ParsedMedicalDocument = {
    patientInfo: {},
    medicalInfo: {},
    testResults: [],
    sections: []
  };

  let textContent = '';
  
  // Handle different input types
  if (typeof content === 'string') {
    textContent = content;
  } else if (typeof content === 'object' && content !== null) {
    // Check for new extractedData format with separate markdown tables
    if (content.extractedData) {
      const { patientInformation, hospitalLabInformation, labTestResults } = content.extractedData;
      
      if (patientInformation) {
        result.patientInfo = parsePatientMarkdownTable(patientInformation);
      }
      
      if (hospitalLabInformation) {
        result.medicalInfo = parseMedicalMarkdownTable(hospitalLabInformation);
      }
      
      if (labTestResults) {
        result.testResults = parseLabResultsMarkdownTable(labTestResults);
      }
      
      // If we got structured data from markdown tables, return early
      if (Object.keys(result.patientInfo).length > 0 || Object.keys(result.medicalInfo).length > 0 || result.testResults.length > 0) {
        return result;
      }
    }
    
    // Try to extract text from various object structures
    textContent = extractTextFromObject(content);
  }

  if (!textContent) {
    return result;
  }

  // Clean and normalize text
  const cleanedText = cleanText(textContent);
  
  // Parse different sections
  result.patientInfo = extractPatientInfo(cleanedText);
  result.medicalInfo = extractMedicalInfo(cleanedText);
  result.testResults = extractTestResults(cleanedText);
  result.sections = extractSections(cleanedText);

  return result;
}

function extractTextFromObject(obj: any): string {
  if (!obj) return '';
  
  let text = '';
  
  // Handle common object structures
  if (obj.extractedText) text += obj.extractedText + '\n';
  if (obj.content) text += obj.content + '\n';
  if (obj.text) text += obj.text + '\n';
  
  // Handle nested objects
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      text += value + '\n';
    } else if (typeof value === 'object' && value !== null) {
      text += extractTextFromObject(value) + '\n';
    }
  }
  
  return text;
}

function cleanText(text: string): string {
  return text
    .replace(/```[^`]*```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/[-*+]\s+/g, '') // Remove list markers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function extractPatientInfo(text: string): PatientInfo {
  const patientInfo: PatientInfo = {};
  
  // Enhanced pattern matching for lab reports
  // Look for patterns like "Patient Name : : : : : Mr.PRAVEEN" or "Mr.PRAVEEN"
  const namePatterns = [
    /Patient Name\s*:?\s*:?\s*:?\s*:?\s*:?\s*([A-Za-z\.\s]+)/i,
    /Name\s*:?\s*([A-Za-z\.\s]+)/i,
    /Mr\.([A-Za-z\s]+)/i,
    /Mrs\.([A-Za-z\s]+)/i,
    /Ms\.([A-Za-z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      patientInfo.name = match[1].trim();
      break;
    }
  }
  
  // Enhanced age/gender extraction for patterns like "45 Y(s) / Male"
  const ageGenderPattern = /(\d+)\s*Y\(s\)\s*\/\s*(Male|Female|M|F)/i;
  const ageGenderMatch = text.match(ageGenderPattern);
  if (ageGenderMatch) {
    patientInfo.age = ageGenderMatch[1];
    patientInfo.gender = ageGenderMatch[2];
  }
  
  // Separate age extraction if combined pattern didn't work
  if (!patientInfo.age) {
    const agePattern = /(?:Age|age)\s*:?\s*(\d+)/i;
    const ageMatch = text.match(agePattern);
    if (ageMatch) {
      patientInfo.age = ageMatch[1];
    }
  }
  
  // Separate gender extraction
  if (!patientInfo.gender) {
    const genderPattern = /(?:Gender|Sex)\s*:?\s*(Male|Female|M|F)/i;
    const genderMatch = text.match(genderPattern);
    if (genderMatch) {
      patientInfo.gender = genderMatch[1];
    }
  }
  
  // Extract patient ID/registration number
  const idPatterns = [
    /LAB\s+(\d+)/i,
    /Patient\s*ID\s*:?\s*([A-Za-z0-9]+)/i,
    /Registration\s*No\s*:?\s*([A-Za-z0-9-]+)/i
  ];
  
  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      patientInfo.id = match[1].trim();
      break;
    }
  }
  
  // Try to extract from tables first (existing logic)
  const tableInfo = extractFromTables(text, PATIENT_FIELD_MAPPINGS);
  Object.assign(patientInfo, { ...tableInfo, ...patientInfo }); // Prioritize new extractions
  
  // Try to extract from key-value pairs
  const kvInfo = extractFromKeyValuePairs(text, PATIENT_FIELD_MAPPINGS);
  Object.assign(patientInfo, { ...kvInfo, ...patientInfo }); // Prioritize new extractions
  
  return patientInfo;
}

function extractMedicalInfo(text: string): MedicalInfo {
  const medicalInfo: MedicalInfo = {};
  
  // Enhanced facility name extraction
  const facilityPatterns = [
    /Simplify Wellness India/i,
    /centrallab@luciddiagnostics/i,
    /Lucid Diagnostics/i,
    /(?:Facility|Hospital|Lab|Laboratory)\s*:?\s*([^\n]+)/i,
    /Processing Location\s*:?\s*([^\n]+)/i
  ];
  
  for (const pattern of facilityPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('Simplify Wellness India')) {
        medicalInfo.facilityName = 'Simplify Wellness India';
        break;
      } else if (match[0].includes('luciddiagnostics')) {
        medicalInfo.facilityName = 'Lucid Diagnostics';
        break;
      } else if (match[1]) {
        medicalInfo.facilityName = match[1].trim();
        break;
      }
    }
  }
  
  // Enhanced doctor/physician extraction
  const physicianPatterns = [
    /Dr\.([A-Za-z\s\.]+),?\s*[A-Z]{2,}/i,
    /Dr\s+([A-Za-z\s\.]+)\s+[A-Z]{2,}/i,
    /(?:Consultant|Doctor|Physician)\s+([A-Za-z\s\.]+)/i,
    /Ref\.Dr\.\s*:?\s*([A-Za-z\s\.]+)/i
  ];
  
  for (const pattern of physicianPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const doctorName = match[1].trim();
      // Clean up the name - remove extra spaces and qualifications
      const cleanName = doctorName.replace(/\s+/g, ' ').trim();
      if (cleanName.length > 2) {
        medicalInfo.physicianName = `Dr. ${cleanName}`;
        break;
      }
    }
  }
  
  // Extract report dates
  const reportDatePatterns = [
    /Reported On\s*:?\s*([0-9-]+\s+[0-9:]+)/i,
    /Report Date\s*:?\s*([0-9-]+)/i,
    /([0-9]{2}-[0-9]{2}-[0-9]{4}\s+[0-9]{2}:[0-9]{2})/i
  ];
  
  for (const pattern of reportDatePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      medicalInfo.reportDate = match[1].trim();
      break;
    }
  }
  
  // Extract collection dates
  const collectionPatterns = [
    /Collected On\s*:?\s*([0-9-]+\s+[0-9:]+)/i,
    /Collection Date\s*:?\s*([0-9-]+)/i,
    /Sample Date\s*:?\s*([0-9-]+)/i
  ];
  
  for (const pattern of collectionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      medicalInfo.collectionDate = match[1].trim();
      break;
    }
  }
  
  // Try to extract from tables first (existing logic as fallback)
  const tableInfo = extractFromTables(text, MEDICAL_FIELD_MAPPINGS);
  Object.assign(medicalInfo, { ...tableInfo, ...medicalInfo }); // Prioritize new extractions
  
  // Try to extract from key-value pairs
  const kvInfo = extractFromKeyValuePairs(text, MEDICAL_FIELD_MAPPINGS);
  Object.assign(medicalInfo, { ...kvInfo, ...medicalInfo }); // Prioritize new extractions
  
  return medicalInfo;
}

function extractFromTables(text: string, fieldMappings: Record<string, string[]>): Record<string, string> {
  const result: Record<string, string> = {};
  
  // Find all tables in the text
  const tableRegex = /\|[^|]+\|[^|]+\|/g;
  const tables = text.match(tableRegex);
  
  if (!tables) return result;
  
  for (const table of tables) {
    const rows = table.split('\n').filter(row => row.includes('|'));
    
    for (const row of rows) {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      
      if (cells.length >= 2) {
        const field = cells[0].toLowerCase();
        const value = cells[1];
        
        // Match field against mappings
        for (const [targetField, variations] of Object.entries(fieldMappings)) {
          if (variations.some(variation => field.includes(variation))) {
            result[targetField] = value;
            break;
          }
        }
      }
    }
  }
  
  return result;
}

function extractFromKeyValuePairs(text: string, fieldMappings: Record<string, string[]>): Record<string, string> {
  const result: Record<string, string> = {};
  
  // Look for key-value patterns like "Field: Value" or "Field - Value"
  const kvRegex = /([^:\n-]+)[:–-]\s*([^\n]+)/g;
  let match;
  
  while ((match = kvRegex.exec(text)) !== null) {
    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();
    
    // Match field against mappings
    for (const [targetField, variations] of Object.entries(fieldMappings)) {
      if (variations.some(variation => field.includes(variation))) {
        result[targetField] = value;
        break;
      }
    }
  }
  
  return result;
}

function extractTestResults(text: string): TestResult[] {
  const results: TestResult[] = [];
  
  console.log('🔍 Extracting test results from text length:', text.length);
  
  // Enhanced test result extraction patterns for specific lab report format
  const specificPatterns = [
    // Pattern 1: "Uric Acid Method : Uricase PAP(Phenyl Amino Phenazone) : 5.71 mg/d L 3.5-7.2"
    /([A-Za-z][A-Za-z\s,]+?)\s*Method\s*:\s*([^:]+?)\s*:\s*([\d\.<>\/=]+)\s*mg\/d?\s*L\s*([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)/gi,
    
    // Pattern 2: "Fasting Plasma Glucose Method : Hexokinase : 76 mg/d L Normal : 70 - 100"
    /([A-Za-z][A-Za-z\s,]+?)\s*Method\s*:\s*([^:]+?)\s*:\s*([\d\.<>\/=]+)\s*mg\/d?\s*L\s*(?:Normal|Reference|Ref)?\s*:?\s*([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)/gi,
    
    // Pattern 3: Simple "Test Name : Value Unit Range" format
    /(?:^|\n)\s*([A-Za-z][A-Za-z\s,]+?)\s*:\s*([\d\.<>\/=]+)\s*([A-Za-z\/\sd]*?)\s+([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)/gm,
    
    // Pattern 4: Test results in lines with specific indicators
    /([A-Za-z][A-Za-z\s,]+?)\s*(?:Result|Value)?\s*:\s*([\d\.<>\/=]+)\s*([A-Za-z\/\sd]*?)\s*(?:Reference|Normal|Range)?\s*:?\s*([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)/gi
  ];
  
  // Look for lab test sections first
  const labSections = [
    'BIOCHEMISTRY',
    'HAEMATOLOGY', 
    'LIPID PROFILE',
    'LIVER FUNCTION TEST',
    'KIDNEY FUNCTION TEST',
    'CARDIAC MARKERS',
    'DIABETES MARKERS'
  ];
  
  for (const pattern of specificPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      console.log('🧪 Found test match:', match);
      
      let testName, result, units, referenceRange;
      
      if (match[0].includes('Method :')) {
        // Format: "Test Method : Method : Result Units Range"
        testName = match[1]?.trim().replace(/\s+/g, ' ');
        result = match[3]?.trim();
        units = 'mg/dL'; // Fixed units for this pattern
        referenceRange = match[4]?.trim();
      } else {
        // Format: "Test : Result Units Range"
        testName = match[1]?.trim().replace(/\s+/g, ' ');
        result = match[2]?.trim();
        units = match[3]?.trim().replace(/\s+/g, ' ');
        referenceRange = match[4]?.trim();
      }
      
      if (testName && result && testName.length > 2 && result.match(/[\d\.<>]/)) {
        // Clean up test name - remove common prefixes/suffixes
        testName = testName.replace(/^(TEST NAME|RESULT|UNITS|Parameter)\s*/i, '').trim();
        
        const testResult: TestResult = {
          testName: testName,
          result: result,
          units: units || '',
          referenceRange: referenceRange || '',
          status: calculateEnhancedTestStatus(result, referenceRange || ''),
          category: 'Laboratory'
        };
        
        // Avoid duplicates
        if (!results.find(r => r.testName?.toLowerCase() === testName.toLowerCase())) {
          console.log('✅ Added test:', testResult);
          results.push(testResult);
        }
      }
    }
  }
  
  console.log('📊 Found', results.length, 'test results with enhanced patterns');
  
  // Enhanced fallback: Parse raw text line by line for test results  
  if (results.length === 0) {
    console.log('🔄 Enhanced patterns found no results, trying line-by-line parsing...');
    
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and headers
      if (!line || line.length < 5) continue;
      
      // Look for test patterns in individual lines
      const linePatterns = [
        // "Test Name Result Units Reference"
        /^([A-Za-z][A-Za-z\s,()]+?)\s+([\d\.<>\/=]+)\s+([A-Za-z\/\sd]*?)\s+([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)$/,
        // "Test Name : Result Units" (no reference range)
        /^([A-Za-z][A-Za-z\s,()]+?)\s*:\s*([\d\.<>\/=]+)\s*([A-Za-z\/\sd]*)$/,
        // Test with Method followed by result on same line
        /^([A-Za-z][A-Za-z\s,()]+?)\s*Method\s*:\s*[^0-9]*?([\d\.<>\/=]+)\s*([A-Za-z\/\sd]*?)\s*([\d\.-<>\/=]+(?:\s*-\s*[\d\.-<>\/=]+)?)?$/
      ];
      
      for (const pattern of linePatterns) {
        const match = line.match(pattern);
        if (match) {
          const testName = match[1]?.trim().replace(/\s+/g, ' ');
          const result = match[2]?.trim();
          const units = match[3]?.trim();
          const referenceRange = match[4]?.trim() || '';
          
          if (testName && result && testName.length > 3 && !testName.match(/^(test|name|result|unit|reference|normal|range)/i)) {
            const testResult: TestResult = {
              testName: testName,
              result: result,
              units: units || '',
              referenceRange: referenceRange,
              status: calculateEnhancedTestStatus(result, referenceRange),
              category: 'Laboratory'
            };
            
            if (!results.find(r => r.testName?.toLowerCase() === testName.toLowerCase())) {
              console.log('✅ Line parsing found test:', testResult);
              results.push(testResult);
            }
          }
        }
      }
    }
  }

  // If still no results, fall back to table parsing
  if (results.length === 0) {
    const lines = text.split('\n');
    let inTable = false;
    let headers: string[] = [];
    
    for (const line of lines) {
      if (line.includes('|') && line.trim()) {
        if (!inTable) {
          // This might be a header row
          headers = line.split('|').map(h => h.trim()).filter(h => h);
          inTable = true;
          continue;
        }
        
        // Skip separator rows
        if (line.includes('---') || line.includes('===')) {
          continue;
        }
        
        // Parse data row
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        
        if (cells.length >= 2) {
          const testData: TestResult = { testName: '' };
          
          // Map cells to test data based on headers
          headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase();
            const value = cells[index] || '';
            
            // Use field mappings to identify columns
            if (TEST_FIELD_MAPPINGS.testName.some(field => normalizedHeader.includes(field))) {
              testData.testName = value;
            } else if (TEST_FIELD_MAPPINGS.result.some(field => normalizedHeader.includes(field))) {
              testData.result = value;
            } else if (TEST_FIELD_MAPPINGS.units.some(field => normalizedHeader.includes(field))) {
              testData.units = value;
            } else if (TEST_FIELD_MAPPINGS.referenceRange.some(field => normalizedHeader.includes(field))) {
              testData.referenceRange = value;
            } else if (TEST_FIELD_MAPPINGS.status.some(field => normalizedHeader.includes(field))) {
              testData.status = normalizeStatus(value);
            }
          });
          
          // Calculate status if not provided
          if (testData.testName && testData.result && !testData.status && testData.referenceRange) {
            testData.status = calculateTestStatus(testData.result, testData.referenceRange);
          }
          
          // Set default status
          if (testData.testName && !testData.status) {
            testData.status = testData.result ? 'Normal' : 'Pending';
          }
          
          if (testData.testName) {
            results.push(testData);
          }
        }
      } else if (inTable && line.trim() === '') {
        // End of table
        inTable = false;
        headers = [];
      }
    }
  }
  
  return results;
}

function extractSections(text: string): Array<{ title: string; category: string; content: string }> {
  const sections = [];
  
  // Check if content is primarily markdown tables - if so, skip section extraction
  // and let structured parsers handle it
  if (isContentPrimarilyMarkdownTables(text)) {
    return sections; // Return empty array to avoid raw markdown display
  }
  
  // Look for section headers (lines that might be titles)
  const lines = text.split('\n');
  let currentSection = { title: 'General Information', category: 'general', content: '' };
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if line looks like a section header
    if (isLikelySectionHeader(trimmedLine)) {
      // Save previous section if it has content and it's not just markdown tables
      if (currentSection.content.trim() && !isContentPrimarilyMarkdownTables(currentSection.content)) {
        sections.push({ ...currentSection });
      }
      
      // Start new section
      currentSection = {
        title: trimmedLine,
        category: categorizeSectionTitle(trimmedLine),
        content: ''
      };
    } else {
      currentSection.content += line + '\n';
    }
  }
  
  // Add final section only if it has meaningful content (not just markdown tables)
  if (currentSection.content.trim() && !isContentPrimarilyMarkdownTables(currentSection.content)) {
    sections.push(currentSection);
  }
  
  return sections;
}

function isContentPrimarilyMarkdownTables(content: string): boolean {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return false;
  
  // Count lines that are part of markdown tables
  let tableLines = 0;
  let headerSeparatorLines = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Table rows (contain |)
    if (trimmed.includes('|')) {
      tableLines++;
    }
    // Table header separators (contain | and -)
    if (trimmed.includes('|') && trimmed.includes('-')) {
      headerSeparatorLines++;
    }
  }
  
  // Consider content to be primarily tables if:
  // 1. More than 70% of lines are table lines, OR
  // 2. There are header separator lines (strong indicator of markdown tables)
  const tableLineRatio = tableLines / lines.length;
  return tableLineRatio > 0.7 || headerSeparatorLines > 0;
}

function isLikelySectionHeader(line: string): boolean {
  // Check if line looks like a section header
  return line.length > 0 && 
         line.length < 100 && 
         !line.includes('|') && 
         !line.includes(':') &&
         line === line.toUpperCase() || 
         /^[A-Z][a-z\s]+$/.test(line);
}

function categorizeSectionTitle(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('patient') || lowerTitle.includes('demographic')) {
    return 'patient';
  } else if (lowerTitle.includes('lab') || lowerTitle.includes('test') || lowerTitle.includes('result')) {
    return 'laboratory';
  } else if (lowerTitle.includes('medical') || lowerTitle.includes('clinical')) {
    return 'medical';
  } else {
    return 'general';
  }
}

function calculateTestStatus(result: string, referenceRange: string): string {
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

// Enhanced parsing functions for new markdown table format
export function parsePatientMarkdownTable(markdownTable: string): PatientInfo {
  const patientInfo: PatientInfo = {};
  
  // Parse markdown table format: | Field | Value |
  const lines = markdownTable.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('|') && !line.includes('---')) {
      const parts = line.split('|').map(part => part.trim()).filter(part => part);
      if (parts.length >= 2) {
        const field = parts[0].toLowerCase();
        const value = parts[1];
        
        if (field.includes('name') || field.includes('patient')) {
          patientInfo.name = value;
        } else if (field.includes('age')) {
          // Handle combined age/gender like "45 Y(s) / Male"
          const ageMatch = value.match(/(\d+)\s*(?:Y\(s\)|years?|y)/i);
          if (ageMatch) {
            patientInfo.age = ageMatch[1];
            // Extract gender from the same field
            const genderMatch = value.match(/(?:male|female|m|f)/i);
            if (genderMatch && !patientInfo.gender) {
              patientInfo.gender = genderMatch[0];
            }
          } else {
            patientInfo.age = value;
          }
        } else if (field.includes('gender') || field.includes('sex')) {
          patientInfo.gender = value;
        } else if (field.includes('collection') && field.includes('date')) {
          patientInfo.dob = value;
        } else if (field.includes('report') && field.includes('date')) {
          // Store report date in contact field temporarily (will be moved later)
          patientInfo.contact = value;
        } else if (field.includes('referring') || field.includes('doctor')) {
          patientInfo.address = value; // Store doctor in address field temporarily
        } else if (field.includes('id') || field.includes('number')) {
          patientInfo.id = value;
        }
      }
    }
  }
  
  return patientInfo;
}

export function parseMedicalMarkdownTable(markdownTable: string): MedicalInfo {
  const medicalInfo: MedicalInfo = {};
  
  // Parse markdown table format: | Field | Value |
  const lines = markdownTable.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('|') && !line.includes('---')) {
      const parts = line.split('|').map(part => part.trim()).filter(part => part);
      if (parts.length >= 2) {
        const field = parts[0].toLowerCase();
        const value = parts[1];
        
        if (field.includes('lab') || field.includes('laboratory') || field.includes('hospital') || field.includes('facility')) {
          medicalInfo.facilityName = value;
        } else if (field.includes('address')) {
          medicalInfo.address = value;
        } else if (field.includes('phone') || field.includes('contact')) {
          medicalInfo.contact = value;
        } else if (field.includes('report') && field.includes('date')) {
          medicalInfo.reportDate = value;
        } else if (field.includes('collection') && field.includes('date')) {
          medicalInfo.collectionDate = value;
        }
      }
    }
  }
  
  return medicalInfo;
}

export function parseLabResultsMarkdownTable(markdownTable: string): TestResult[] {
  const testResults: TestResult[] = [];
  const lines = markdownTable.split('\n').filter(line => line.trim());
  
  let headers: string[] = [];
  let headerFound = false;
  
  for (const line of lines) {
    if (line.includes('|') && !line.includes('---')) {
      const parts = line.split('|').map(part => part.trim()).filter(part => part);
      
      if (!headerFound && parts.length >= 3) {
        // Check if this looks like a header row
        const firstPart = parts[0].toLowerCase();
        if (firstPart.includes('test') || firstPart.includes('parameter') || firstPart.includes('name')) {
          headers = parts;
          headerFound = true;
          continue;
        }
      }
      
      if (headerFound && parts.length >= 3) {
        const testName = parts[0];
        const result = parts[1];
        const unit = parts[2];
        const referenceRange = parts.length > 3 ? parts[3] : '';
        
        if (testName && result && testName !== 'Test Name') {
          const status = calculateEnhancedTestStatus(result, referenceRange);
          
          testResults.push({
            testName: testName,
            result: result,
            units: unit || '',
            referenceRange: referenceRange || '',
            status: status
          });
        }
      }
    }
  }
  
  return testResults;
}

export function calculateEnhancedTestStatus(result: string, referenceRange: string): string {
  if (!result || !referenceRange) return 'Normal';
  
  // Clean up the inputs
  const cleanResult = result.replace(/[<>=≤≥]/g, '').trim();
  const cleanRange = referenceRange.replace(/[<>=≤≥]/g, '').trim();
  
  // Parse numeric result
  const numResult = parseFloat(cleanResult);
  if (isNaN(numResult)) return 'Normal';
  
  // Handle complex range formats
  const rangePatterns = [
    // Standard range: "3.5-7.2" or "70 - 100"
    /([\d.]+)\s*[-–—to]\s*([\d.]+)/i,
    // Desirable/Borderline/High format: "Desirable: < 200 Borderline: 200–239 High: >= 240"
    /desirable:\s*[<≤]?\s*([\d.]+)[\s\w]*borderline:\s*([\d.]+)[-–—]\s*([\d.]+)[\s\w]*high:\s*[>≥]?\s*([\d.]+)/i,
    // Normal format: "Normal: 70 - 100"
    /normal:\s*([\d.]+)\s*[-–—]\s*([\d.]+)/i,
    // Single threshold: "< 150" or "> 60"
    /^([<>≤≥])\s*([\d.]+)/
  ];
  
  for (const pattern of rangePatterns) {
    const match = cleanRange.match(pattern);
    if (match) {
      if (pattern.toString().includes('desirable')) {
        // Complex range with desirable/borderline/high
        const desirable = parseFloat(match[1]);
        const borderlineLow = parseFloat(match[2]);
        const borderlineHigh = parseFloat(match[3]);
        const high = parseFloat(match[4]);
        
        if (numResult < desirable) return 'Normal';
        if (numResult >= desirable && numResult < high) return 'Borderline';
        if (numResult >= high) return 'High';
      } else if (match.length === 3 && !match[0].includes('<') && !match[0].includes('>')) {
        // Standard range
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        
        if (!isNaN(min) && !isNaN(max)) {
          if (numResult < min) return 'Low';
          if (numResult > max) return 'High';
          return 'Normal';
        }
      } else if (match.length === 3) {
        // Single threshold
        const operator = match[1];
        const threshold = parseFloat(match[2]);
        
        if (!isNaN(threshold)) {
          if ((operator === '<' || operator === '≤') && numResult >= threshold) return 'High';
          if ((operator === '>' || operator === '≥') && numResult <= threshold) return 'Low';
        }
      }
    }
  }
  
  return 'Normal';
}

function normalizeStatus(status: string): string {
  if (!status) return 'Normal';
  
  const lowerStatus = status.toLowerCase().trim();
  
  if (lowerStatus.includes('high') || lowerStatus.includes('elevated') || lowerStatus.includes('above')) {
    return 'High';
  } else if (lowerStatus.includes('low') || lowerStatus.includes('below') || lowerStatus.includes('decreased')) {
    return 'Low';
  } else if (lowerStatus.includes('normal') || lowerStatus.includes('within') || lowerStatus.includes('acceptable')) {
    return 'Normal';
  } else if (lowerStatus.includes('critical') || lowerStatus.includes('panic') || lowerStatus.includes('alert')) {
    return 'Critical';
  } else if (lowerStatus.includes('pending') || lowerStatus.includes('processing')) {
    return 'Pending';
  } else {
    return status || 'Normal';
  }
}
