export const SYSTEM_PROMPT = `You are a medical document analysis AI that extracts structured data from medical reports, lab results, prescriptions, and other healthcare documents.

Your task is to:
1. Analyze the provided medical document text/image
2. Extract relevant medical information accurately
3. Structure the data according to the provided JSON schema
4. Maintain high confidence in your extractions
5. Flag any unclear or ambiguous information

Always respond with valid JSON in the exact format requested. If information is not available, use null values. Be precise and conservative in your extractions.`;

export const LAB_RESULTS_PROMPT = `Extract structured data from this lab results document. Return JSON in this exact format:

{
  "reportType": "lab",
  "confidence": 0.95,
  "extractedAt": "2024-01-01T00:00:00Z",
  "patient": {
    "name": "John Doe",
    "dateOfBirth": "1980-01-01",
    "id": "12345"
  },
  "tests": [
    {
      "name": "Complete Blood Count",
      "value": "Normal",
      "unit": "cells/mcL",
      "referenceRange": "4.5-11.0",
      "status": "normal",
      "notes": "Within normal limits"
    }
  ],
  "orderingPhysician": "Dr. Smith",
  "facility": "City Hospital Lab",
  "collectionDate": "2024-01-01",
  "reportDate": "2024-01-02"
}

Focus on extracting all test results with their values, units, reference ranges, and status indicators (normal/abnormal/critical/high/low).`;

export const PRESCRIPTION_PROMPT = `Extract structured data from this prescription document. Return JSON in this exact format:

{
  "reportType": "prescription",
  "confidence": 0.95,
  "extractedAt": "2024-01-01T00:00:00Z",
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
      });
      break;
      
    case 'prescription':
      parsedData.medications?.forEach((med: any) => {
        if (med.name) {
          const medName = med.name.toLowerCase();
          if (medName.includes('insulin')) tags.add('diabetes');
          if (medName.includes('lisinopril') || medName.includes('amlodipine')) tags.add('hypertension');
          if (medName.includes('metformin')) tags.add('diabetes');
          if (medName.includes('statin') || medName.includes('atorvastatin')) tags.add('cholesterol');
        }
      });
      break;
      
    case 'radiology':
      parsedData.findings?.forEach((finding: any) => {
        if (finding.severity === 'abnormal' || finding.severity === 'severe') {
          tags.add('abnormal');
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
  }
  
  return Array.from(tags);
}