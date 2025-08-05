// Enhanced lab results prompt with comprehensive structure
const ENHANCED_LAB_RESULTS_PROMPT = `
Extract comprehensive lab result information from this medical document. Return a JSON object with this exact structure:

{
  "reportType": "lab",
  "confidence": <number 0-100>,
  "patient": {
    "name": "<full name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "dateOfBirth": "<YYYY-MM-DD format>",
    "age": <number>,
    "gender": "<M/F/Other>",
    "id": "<patient ID>",
    "mrn": "<medical record number>",
    "address": "<full address>",
    "phone": "<phone number>",
    "email": "<email address>"
  },
  "orderingProvider": {
    "name": "<full name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "title": "<Dr., MD, DO, etc.>",
    "specialty": "<medical specialty>",
    "npi": "<national provider identifier>",
    "phone": "<phone number>"
  },
  "facility": {
    "name": "<facility/lab name>",
    "address": "<full address>",
    "phone": "<phone number>",
    "department": "<specific department>",
    "accreditation": ["<accreditation bodies>"]
  },
  "collectionDate": "<YYYY-MM-DD HH:mm format>",
  "receivedDate": "<YYYY-MM-DD HH:mm format>",
  "reportDate": "<YYYY-MM-DD HH:mm format>",
  "accessionNumber": "<accession/specimen number>",
  "specimenType": "<blood, urine, etc.>",
  "testPanels": [
    {
      "name": "<panel name like 'Complete Blood Count'>",
      "category": "<category like 'Hematology'>",
      "tests": [
        {
          "name": "<test name>",
          "value": "<numeric value or text result>",
          "unit": "<unit of measurement>",
          "referenceRange": "<normal range>",
          "status": "<normal/abnormal/critical/high/low>",
          "flags": ["<H, L, *, etc.>"],
          "notes": "<any additional notes>",
          "subTests": [
            {
              "name": "<sub-test name>",
              "value": "<value>",
              "unit": "<unit>",
              "referenceRange": "<range>",
              "status": "<status>"
            }
          ]
        }
      ]
    }
  ],
  "clinicalInfo": "<clinical indication/reason for test>",
  "comments": "<any lab comments or notes>"
}

Instructions:
- Extract ALL tests, including sub-components of panels (e.g., for CBC: WBC, RBC, Hemoglobin, Hematocrit, etc.)
- Maintain hierarchical structure (panels contain tests, tests may contain sub-tests)
- Convert all dates to proper formats
- Determine test status based on reference ranges and flags
- Include all provider and facility information found
- Set confidence based on completeness and clarity of extracted data`;

const ENHANCED_PRESCRIPTION_PROMPT = `
Extract comprehensive prescription information from this medical document. Return a JSON object with this exact structure:

{
  "reportType": "prescription",
  "confidence": <number 0-100>,
  "patient": {
    "name": "<full name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "dateOfBirth": "<YYYY-MM-DD format>",
    "age": <number>,
    "gender": "<M/F/Other>",
    "id": "<patient ID>",
    "mrn": "<medical record number>",
    "address": "<full address>",
    "phone": "<phone number>"
  },
  "prescribingProvider": {
    "name": "<full name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "title": "<Dr., MD, DO, etc.>",
    "specialty": "<medical specialty>",
    "npi": "<national provider identifier>",
    "license": "<license number>",
    "phone": "<phone number>",
    "email": "<email address>"
  },
  "facility": {
    "name": "<clinic/hospital name>",
    "address": "<full address>",
    "phone": "<phone number>",
    "department": "<specific department>"
  },
  "prescriptionDate": "<YYYY-MM-DD format>",
  "prescriptionNumber": "<prescription number>",
  "medications": [
    {
      "name": "<medication name>",
      "genericName": "<generic name if available>",
      "dosage": "<dosage amount>",
      "strength": "<medication strength>",
      "form": "<tablet/capsule/liquid/injection/etc.>",
      "frequency": "<how often to take>",
      "duration": "<how long to take>",
      "instructions": "<detailed instructions>",
      "quantity": "<amount prescribed>",
      "refills": <number of refills>,
      "indication": "<reason for prescription>",
      "route": "<oral/IV/topical/etc.>"
    }
  ],
  "diagnosis": ["<diagnosis codes and descriptions>"],
  "clinicalNotes": "<any clinical notes>",
  "dea": "<DEA number if present>"
}

Instructions:
- Extract ALL medications with complete details
- Include both brand and generic names when available
- Parse dosage, frequency, and duration carefully
- Include all provider credentials and contact information
- Convert dates to proper formats
- Set confidence based on completeness of extraction`;

const ENHANCED_RADIOLOGY_PROMPT = `
Extract comprehensive radiology report information from this medical document. Return a JSON object with this exact structure:

{
  "reportType": "radiology",
  "confidence": <number 0-100>,
  "patient": {
    "name": "<full name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "dateOfBirth": "<YYYY-MM-DD format>",
    "age": <number>,
    "gender": "<M/F/Other>",
    "id": "<patient ID>",
    "mrn": "<medical record number>"
  },
  "radiologist": {
    "name": "<radiologist name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "title": "<Dr., MD, etc.>",
    "specialty": "<radiology subspecialty>",
    "npi": "<national provider identifier>"
  },
  "orderingProvider": {
    "name": "<ordering physician name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "title": "<Dr., MD, etc.>",
    "specialty": "<medical specialty>"
  },
  "facility": {
    "name": "<hospital/imaging center name>",
    "address": "<full address>",
    "phone": "<phone number>",
    "department": "<radiology department>"
  },
  "studyDate": "<YYYY-MM-DD HH:mm format>",
  "reportDate": "<YYYY-MM-DD HH:mm format>",
  "accessionNumber": "<accession number>",
  "studyType": "<type of study>",
  "modality": "<CT/MRI/X-ray/Ultrasound/etc.>",
  "bodyPart": "<anatomical area studied>",
  "technique": "<imaging technique details>",
  "contrast": {
    "used": <true/false>,
    "type": "<contrast type>",
    "amount": "<amount given>"
  },
  "clinicalHistory": "<clinical indication>",
  "findings": "<detailed findings>",
  "impression": "<radiologist impression>",
  "recommendations": ["<follow-up recommendations>"],
  "urgency": "<routine/urgent/stat>"
}

Instructions:
- Extract all provider information including radiologist and ordering physician
- Include complete study details and technical parameters
- Separate findings from impression clearly
- Include all clinical context and recommendations
- Convert dates and times to proper formats
- Set confidence based on report completeness`;

const ENHANCED_VITALS_PROMPT = `
Extract comprehensive vital signs information from this medical document. Return a JSON object with this exact structure:

{
  "reportType": "vitals",
  "confidence": <number 0-100>,
  "patient": {
    "name": "<full name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "dateOfBirth": "<YYYY-MM-DD format>",
    "age": <number>,
    "gender": "<M/F/Other>",
    "id": "<patient ID>",
    "mrn": "<medical record number>"
  },
  "measuredBy": {
    "name": "<healthcare provider name>",
    "title": "<RN/MD/CNA/etc.>",
    "department": "<department/unit>"
  },
  "facility": {
    "name": "<facility name>",
    "department": "<specific unit/department>",
    "room": "<room number>"
  },
  "measurementDate": "<YYYY-MM-DD HH:mm format>",
  "vitals": {
    "bloodPressure": {
      "systolic": <number>,
      "diastolic": <number>,
      "unit": "mmHg",
      "position": "<sitting/standing/lying>",
      "cuff": "<adult/pediatric/large>"
    },
    "heartRate": {
      "value": <number>,
      "unit": "bpm",
      "rhythm": "<regular/irregular>"
    },
    "temperature": {
      "value": <number>,
      "unit": "<F/C>",
      "method": "<oral/rectal/axillary/temporal>"
    },
    "respiratoryRate": {
      "value": <number>,
      "unit": "breaths/min",
      "effort": "<normal/labored>"
    },
    "oxygenSaturation": {
      "value": <number>,
      "unit": "%",
      "roomAir": <true/false>,
      "supplementalO2": "<liters/type>"
    },
    "weight": {
      "value": <number>,
      "unit": "<lbs/kg>",
      "method": "<scale/estimated>"
    },
    "height": {
      "value": <number>,
      "unit": "<in/cm>"
    },
    "bmi": {
      "value": <number>,
      "category": "<underweight/normal/overweight/obese>"
    },
    "painScale": {
      "value": <number>,
      "scale": "<0-10/Wong-Baker/etc.>"
    }
  },
  "notes": "<any additional notes about measurements>"
}

Instructions:
- Extract ALL vital signs measurements with complete details
- Include measurement conditions and methods
- Calculate BMI if height and weight are available
- Include provider and facility information
- Convert all units consistently
- Set confidence based on completeness of vital signs data`;

const ENHANCED_GENERAL_MEDICAL_PROMPT = `
Extract comprehensive medical document information. Return a JSON object with this exact structure:

{
  "reportType": "general",
  "confidence": <number 0-100>,
  "patient": {
    "name": "<full name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "dateOfBirth": "<YYYY-MM-DD format>",
    "age": <number>,
    "gender": "<M/F/Other>",
    "id": "<patient ID>",
    "mrn": "<medical record number>",
    "address": "<full address>",
    "phone": "<phone number>"
  },
  "provider": {
    "name": "<provider name>",
    "firstName": "<first name>",
    "lastName": "<last name>",
    "title": "<Dr., MD, DO, etc.>",
    "specialty": "<medical specialty>",
    "npi": "<national provider identifier>"
  },
  "facility": {
    "name": "<facility name>",
    "address": "<full address>",
    "phone": "<phone number>",
    "department": "<specific department>"
  },
  "documentDate": "<YYYY-MM-DD format>",
  "documentType": "<consultation/progress note/discharge summary/etc.>",
  "visitType": "<consultation/follow-up/emergency/etc.>",
  "chiefComplaint": "<patient's main concern>",
  "historyOfPresentIllness": "<HPI details>",
  "pastMedicalHistory": "<PMH>",
  "medications": [
    {
      "name": "<medication name>",
      "dosage": "<dosage>",
      "frequency": "<frequency>",
      "instructions": "<instructions>"
    }
  ],
  "allergies": [
    {
      "allergen": "<allergen>",
      "reaction": "<reaction>",
      "severity": "<mild/moderate/severe>"
    }
  ],
  "socialHistory": "<social history>",
  "familyHistory": "<family history>",
  "reviewOfSystems": "<ROS>",
  "physicalExamination": "<physical exam findings>",
  "assessment": "<clinical assessment>",
  "plan": "<treatment plan>",
  "diagnosis": [
    {
      "code": "<ICD code>",
      "description": "<diagnosis description>",
      "type": "<primary/secondary>"
    }
  ],
  "procedures": [
    {
      "code": "<CPT code>",
      "description": "<procedure description>",
      "date": "<YYYY-MM-DD format>"
    }
  ],
  "followUp": "<follow-up instructions>",
  "notes": "<additional notes>"
}

Instructions:
- Extract ALL available medical information
- Maintain clinical accuracy and terminology
- Include complete provider and facility details
- Separate different sections of the medical record
- Convert dates to proper formats
- Set confidence based on document completeness`;

// Simple smart tag generation function for edge function use
function generateEnhancedSmartTags(parsedData: any): string[] {
  const tags: string[] = [];
  
  if (!parsedData) return tags;
  
  // Add report type
  if (parsedData.reportType) {
    tags.push(parsedData.reportType);
  }
  
  // Add facility name
  if (parsedData.facility?.name) {
    tags.push(parsedData.facility.name);
  }
  
  // Add provider names
  const providers = [
    parsedData.provider,
    parsedData.orderingProvider,
    parsedData.prescribingProvider,
    parsedData.radiologist,
    parsedData.measuredBy
  ].filter(Boolean);
  
  providers.forEach(provider => {
    if (provider?.name) tags.push(provider.name);
    if (provider?.specialty) tags.push(provider.specialty);
  });
  
  return [...new Set(tags)].filter(tag => tag && tag.length > 0);
}