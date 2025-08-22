export const SYSTEM_PROMPT = `You are an advanced medical document analysis expert with deep understanding of clinical data organization. Your task is to extract and structure medical information with clinical precision, maintaining proper hierarchical organization of complex medical data. Use your medical knowledge to group related tests, normalize units, and provide clinically meaningful interpretations.

CRITICAL: You must also generate an intelligent document name based on the content. The document name should be concise, informative, and follow these patterns:
- Lab Reports: "Lab Results - [Primary Test/Panel] - [Date]" (e.g., "Lab Results - Complete Blood Count - 2024-01-15")
- Prescriptions: "Prescription - [Primary Medication] - [Date]" (e.g., "Prescription - Lisinopril - 2024-01-15")
- Radiology: "[Study Type] - [Body Part] - [Date]" (e.g., "CT Scan - Chest - 2024-01-15")
- Vitals: "Vital Signs - [Primary Measurement] - [Date]" (e.g., "Vital Signs - Blood Pressure - 2024-01-15")
- General: "[Document Type] - [Provider/Facility] - [Date]" (e.g., "Medical Record - Dr. Smith - 2024-01-15")

The document name must be included in your JSON response under the "suggestedName" field.`;

export const LAB_RESULTS_PROMPT = `Extract ALL structured data from this lab results document with comprehensive medical analysis.

CRITICAL: YOU MUST FIND AND EXTRACT ALL TEST RESULTS - DO NOT MISS ANY!

MANDATORY TEST CATEGORIES TO SEARCH FOR:
- Complete Blood Count/Picture (CBC/CBP): WBC, RBC, Hemoglobin, Hematocrit, Platelets, MCV, MCH, MCHC, RDW
- Lipid Profile: Total Cholesterol, HDL, LDL, Triglycerides, VLDL, Cholesterol ratios
- Electrolytes/Serum: Sodium, Potassium, Chloride, CO2, Anion Gap
- Kidney Function: BUN, Creatinine, eGFR, BUN/Creatinine ratio
- Liver Function: ALT, AST, ALP, Bilirubin, GGT, Albumin, Total Protein
- Metabolic Panel: Glucose, A1C, Fasting glucose
- Thyroid Function: TSH, T3, T4, Free T3, Free T4
- Cardiac Markers: Troponin, CK-MB, LDH
- Inflammatory Markers: ESR, CRP, hs-CRP
- Vitamins/Minerals: B12, D3, Folate, Iron, TIBC, Ferritin, Calcium, Phosphorus, Magnesium
- Hormones: Insulin, Cortisol, Testosterone, Estradiol
- Coagulation: PT, PTT, INR
- Urinalysis: Protein, Glucose, Ketones, Blood, Specific gravity, Microscopy
- Immunology: ANA, RF, Anti-CCP
- Tumor Markers: PSA, CEA, CA 19-9, CA 125

CRITICAL NAMING RULES:
- For COMPREHENSIVE panels (CBC, CBP, CMP, BMP, Lipid Panel, etc.) with 4+ related tests, name after the PANEL
- For CBP/Complete Blood Picture/Complete Blood Count: Always use "Complete Blood Picture" or "Complete Blood Count" as primary name
- Look for blood test indicators: hemoglobin, hematocrit, WBC, RBC, platelets, MCV, MCH, MCHC
- If 4+ blood-related tests are present, it's likely a CBP/CBC regardless of individual test names
- For single/few tests: Use the specific test name
- Prioritize test QUANTITY, medical comprehensiveness, and clinical panel recognition over individual mentions

DOCUMENT SCANNING INSTRUCTIONS:
- Scan the ENTIRE document from beginning to end
- Look for test results in tables, lists, and narrative text
- Check for multiple test sections/departments (e.g., Clinical Chemistry, Hematology, Immunology)
- Extract tests even if they appear in different formats or sections
- Pay attention to reference ranges, units, and status indicators
- Don't skip any test results - capture everything you can find

Return JSON in this exact format:

{
  "reportType": "lab",
  "confidence": 0.95,
  "extractedAt": "2024-01-01T00:00:00Z",
  "suggestedName": "Lab Results - Complete Blood Count - 2024-01-01",
  "patient": {
    "name": "John Doe",
    "dateOfBirth": "1980-01-01",
    "id": "12345",
    "age": "44",
    "gender": "Male"
  },
  "tests": [
    {
      "name": "Complete Blood Count",
      "isProfileHeader": true,
      "subTests": [
        {
          "name": "White Blood Cell Count",
          "value": "7.2",
          "unit": "10^3/uL",
          "referenceRange": "4.8-10.8",
          "status": "normal",
          "notes": "Within normal limits",
          "isSubTest": true
        },
        {
          "name": "Red Blood Cell Count",
          "value": "4.5",
          "unit": "10^6/uL", 
          "referenceRange": "4.7-6.1",
          "status": "low",
          "notes": "",
          "isSubTest": true
        }
      ]
    },
    {
      "name": "Glucose",
      "value": "95",
      "unit": "mg/dL",
      "referenceRange": "70-99",
      "status": "normal",
      "notes": "Fasting"
    }
  ],
  "orderingPhysician": "Dr. Smith",
  "facility": "City Hospital Lab",
  "collectionDate": "2024-01-01",
  "reportDate": "2024-01-02"
}

CRITICAL INSTRUCTIONS:
1. Group related tests into panels/profiles with "isProfileHeader": true
2. Individual tests within panels should have "isSubTest": true
3. Standalone tests should not have isProfileHeader or isSubTest flags
4. Always extract patient demographics completely
5. Normalize reference ranges to consistent format (e.g., "4.8-10.8")
6. Determine status accurately: normal, high, low, critical, abnormal
7. Preserve clinical context in notes field
8. Maintain proper hierarchical structure that reflects how tests appear in the original document

Focus on extracting all test results with proper grouping, values, units, reference ranges, and status indicators.`;

export const PRESCRIPTION_PROMPT = `Extract structured data from this prescription document. Return JSON in this exact format:

{
  "reportType": "prescription",
  "confidence": 0.95,
  "extractedAt": "2024-01-01T00:00:00Z",
  "suggestedName": "Prescription - Lisinopril - 2024-01-01",
  "patient": {
    "name": "John Doe",
    "dateOfBirth": "1980-01-01",
    "id": "12345"
  },
  "medications": [
    {
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "Take with food",
      "quantity": "30 tablets",
      "refills": 2,
      "ndc": "12345-678-90"
    }
  ],
  "prescriber": "Dr. Smith",
  "pharmacy": "City Pharmacy",
  "prescriptionDate": "2024-01-01",
  "fillDate": "2024-01-02"
}

Focus on extracting all medications with dosages, frequencies, and instructions clearly.`;

export const RADIOLOGY_PROMPT = `Extract structured data from this radiology report. Return JSON in this exact format:

{
  "reportType": "radiology",
  "confidence": 0.95,
  "extractedAt": "2024-01-01T00:00:00Z",
  "suggestedName": "CT Scan - Chest - 2024-01-01",
  "patient": {
    "name": "John Doe",
    "dateOfBirth": "1980-01-01",
    "id": "12345"
  },
  "study": {
    "type": "CT Scan",
    "bodyPart": "Chest",
    "technique": "With contrast",
    "contrast": true
  },
  "findings": [
    {
      "category": "Lungs",
      "description": "Clear bilateral lung fields",
      "severity": "normal"
    }
  ],
  "impression": "Normal chest CT",
  "radiologist": "Dr. Johnson",
  "facility": "City Imaging Center",
  "studyDate": "2024-01-01",
  "reportDate": "2024-01-02"
}

Focus on extracting the study details, all findings with their categories and descriptions, and the radiologist's impression.`;

export const VITALS_PROMPT = `Extract structured data from this vital signs document. Return JSON in this exact format:

{
  "reportType": "vitals",
  "confidence": 0.95,
  "extractedAt": "2024-01-01T00:00:00Z",
  "suggestedName": "Vital Signs - Blood Pressure - 2024-01-01",
  "patient": {
    "name": "John Doe",
    "dateOfBirth": "1980-01-01",
    "id": "12345"
  },
  "vitals": [
    {
      "type": "blood_pressure",
      "value": "120/80",
      "unit": "mmHg",
      "timestamp": "2024-01-01T09:00:00Z",
      "notes": "Patient at rest"
    }
  ],
  "recordedBy": "Nurse Smith",
  "facility": "City Clinic",
  "recordDate": "2024-01-01"
}

Focus on extracting all vital signs with their values, units, and timestamps. Vital types include: blood_pressure, heart_rate, temperature, respiratory_rate, oxygen_saturation, weight, height, bmi.`;

export const GENERAL_MEDICAL_PROMPT = `Extract structured data from this general medical document. Return JSON in this exact format:

{
  "reportType": "general",
  "confidence": 0.95,
  "extractedAt": "2024-01-01T00:00:00Z",
  "suggestedName": "Medical Record - Dr. Smith - 2024-01-01",
  "patient": {
    "name": "John Doe",
    "dateOfBirth": "1980-01-01",
    "id": "12345"
  },
  "sections": [
    {
      "title": "Chief Complaint",
      "content": "Patient reports chest pain",
      "category": "subjective"
    },
    {
      "title": "Assessment",
      "content": "Rule out cardiac causes",
      "category": "assessment"
    }
  ],
  "provider": "Dr. Smith",
  "facility": "City Medical Center",
  "visitDate": "2024-01-01",
  "reportDate": "2024-01-02"
}

Focus on identifying distinct sections of the medical document and categorizing them appropriately.`;

export function getPromptForReportType(reportType: string): string {
  switch (reportType.toLowerCase()) {
    case 'lab_results':
    case 'lab':
      return LAB_RESULTS_PROMPT;
    case 'prescription':
    case 'pharmacy':
      return PRESCRIPTION_PROMPT;
    case 'radiology':
    case 'imaging':
    case 'xray':
    case 'mri':
    case 'ct':
      return RADIOLOGY_PROMPT;
    case 'vitals':
    case 'vital_signs':
      return VITALS_PROMPT;
    default:
      return GENERAL_MEDICAL_PROMPT;
  }
}

export function generateSmartTags(parsedData: any): string[] {
  const tags: Set<string> = new Set();
  
  if (!parsedData) return [];
  
  // Add report type tag
  tags.add(parsedData.reportType || 'general');
  
  // Add specific tags based on content
  switch (parsedData.reportType) {
    case 'lab':
      parsedData.tests?.forEach((test: any) => {
        if (test.status === 'abnormal' || test.status === 'critical') {
          tags.add('abnormal');
        }
        if (test.status === 'critical') {
          tags.add('critical');
        }
        // Add specific lab test categories
        const testName = test.name?.toLowerCase() || '';
        if (testName.includes('blood') || testName.includes('cbc')) tags.add('blood-work');
        if (testName.includes('glucose') || testName.includes('a1c')) tags.add('diabetes');
        if (testName.includes('cholesterol') || testName.includes('lipid')) tags.add('lipids');
        if (testName.includes('liver') || testName.includes('alt') || testName.includes('ast')) tags.add('liver-function');
        if (testName.includes('kidney') || testName.includes('creatinine') || testName.includes('bun')) tags.add('kidney-function');
      });
      break;
      
    case 'prescription':
      parsedData.medications?.forEach((med: any) => {
        if (med.name) {
          const medName = med.name.toLowerCase();
          // Diabetes medications
          if (medName.includes('insulin') || medName.includes('metformin') || medName.includes('glipizide')) {
            tags.add('diabetes');
          }
          // Blood pressure medications
          if (medName.includes('lisinopril') || medName.includes('amlodipine') || medName.includes('losartan')) {
            tags.add('hypertension');
          }
          // Cholesterol medications
          if (medName.includes('statin') || medName.includes('atorvastatin') || medName.includes('simvastatin')) {
            tags.add('cholesterol');
          }
          // Pain medications
          if (medName.includes('ibuprofen') || medName.includes('acetaminophen') || medName.includes('naproxen')) {
            tags.add('pain-management');
          }
          // Antibiotics
          if (medName.includes('amoxicillin') || medName.includes('azithromycin') || medName.includes('cephalexin')) {
            tags.add('antibiotics');
          }
        }
      });
      break;
      
    case 'radiology':
      if (parsedData.study?.type) {
        const studyType = parsedData.study.type.toLowerCase();
        if (studyType.includes('ct')) tags.add('ct-scan');
        if (studyType.includes('mri')) tags.add('mri');
        if (studyType.includes('x-ray') || studyType.includes('xray')) tags.add('x-ray');
        if (studyType.includes('ultrasound')) tags.add('ultrasound');
        if (studyType.includes('mammogram')) tags.add('mammogram');
      }
      
      parsedData.findings?.forEach((finding: any) => {
        if (finding.severity === 'abnormal' || finding.severity === 'severe') {
          tags.add('abnormal');
        }
        if (finding.category) {
          tags.add(finding.category.toLowerCase().replace(/\s+/g, '-'));
        }
      });
      break;
      
    case 'vitals':
      parsedData.vitals?.forEach((vital: any) => {
        if (vital.type) {
          tags.add(vital.type.replace('_', '-'));
        }
      });
      break;
  }
  
  // Add facility type tags
  if (parsedData.facility) {
    const facility = parsedData.facility.toLowerCase();
    if (facility.includes('emergency') || facility.includes('er')) tags.add('emergency');
    if (facility.includes('lab')) tags.add('laboratory');
    if (facility.includes('imaging') || facility.includes('radiology')) tags.add('imaging');
    if (facility.includes('hospital')) tags.add('hospital');
    if (facility.includes('clinic')) tags.add('clinic');
  }
  
  // Add provider specialty tags
  if (parsedData.provider || parsedData.prescriber || parsedData.orderingPhysician) {
    const provider = (parsedData.provider || parsedData.prescriber || parsedData.orderingPhysician || '').toLowerCase();
    if (provider.includes('cardiologist')) tags.add('cardiology');
    if (provider.includes('endocrinologist')) tags.add('endocrinology');
    if (provider.includes('neurologist')) tags.add('neurology');
    if (provider.includes('orthopedic')) tags.add('orthopedics');
    if (provider.includes('dermatologist')) tags.add('dermatology');
  }
  
  return Array.from(tags);
}

// Intelligent document naming with CBP detection
export function generateIntelligentDocumentName(
  parsedData: any, 
  reportDate: string
): string {
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
    
    // Detect comprehensive blood panels (CBP/CBC) - Enhanced detection
    const bloodTestKeywords = [
      'hemoglobin', 'hematocrit', 'wbc', 'rbc', 'platelet', 'mcv', 'mch', 'mchc',
      'white blood cell', 'red blood cell', 'hgb', 'hct', 'plt', 'neutrophil',
      'lymphocyte', 'monocyte', 'eosinophil', 'basophil', 'rdw', 'mpv'
    ];
    
    // Check for comprehensive blood work indicators
    const bloodTestCount = testNames.filter(name => 
      bloodTestKeywords.some(keyword => name.includes(keyword)) ||
      name.includes('blood') ||
      /^(wbc|rbc|hgb|hct|plt|mcv|mch|mchc)$/i.test(name.trim())
    ).length;
    
    // Check for explicit CBP/CBC mention in test names
    const explicitCBP = testNames.some(name => 
      name.includes('complete blood') || 
      name.includes('cbc') || 
      name.includes('cbp') ||
      name.includes('full blood count') ||
      name.includes('hemogram')
    );
    
    // If 4+ blood tests OR explicit CBP mention, it's a comprehensive blood panel
    if (bloodTestCount >= 4 || explicitCBP) {
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
}

export function generateFallbackDocumentName(
  reportType: string, 
  parsedData: any, 
  reportDate: string
): string {
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
}