import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MedicalTerminologyRequest {
  entities: Array<{
    text: string;
    category: string;
    type: string;
  }>;
  validateCodes?: boolean;
}

interface ValidationResult {
  originalText: string;
  normalizedText: string;
  category: string;
  codes: {
    snomed?: string;
    loinc?: string;
    rxnorm?: string;
    icd10?: string;
    cpt?: string;
  };
  confidence: number;
  isValid: boolean;
  suggestions?: string[];
}

interface MedicalTerminologyResponse {
  validations: ValidationResult[];
  summary: {
    totalEntities: number;
    validEntities: number;
    validationRate: number;
    processingTime: number;
  };
}

// Medical terminology databases (mock data for demonstration)
const MEDICAL_VOCABULARIES = {
  // SNOMED-CT codes for common conditions
  snomed: new Map([
    ['diabetes', '73211009'],
    ['hypertension', '38341003'],
    ['glucose', '33747000'],
    ['cholesterol', '84698008'],
    ['hemoglobin', '38082009'],
    ['creatinine', '70901006']
  ]),
  
  // LOINC codes for lab tests
  loinc: new Map([
    ['glucose', '2345-7'],
    ['cholesterol', '2093-3'],
    ['hemoglobin', '718-7'],
    ['creatinine', '2160-0'],
    ['blood pressure', '8480-6'],
    ['heart rate', '8867-4']
  ]),
  
  // RxNorm codes for medications
  rxnorm: new Map([
    ['metformin', '6809'],
    ['lisinopril', '29046'],
    ['atorvastatin', '83367'],
    ['amlodipine', '17767'],
    ['levothyroxine', '10582'],
    ['omeprazole', '7646']
  ]),
  
  // ICD-10 codes for diagnoses
  icd10: new Map([
    ['diabetes', 'E11.9'],
    ['hypertension', 'I10'],
    ['hyperlipidemia', 'E78.5'],
    ['hypothyroidism', 'E03.9'],
    ['anemia', 'D64.9']
  ]),
  
  // CPT codes for procedures
  cpt: new Map([
    ['blood draw', '36415'],
    ['ekg', '93000'],
    ['chest x-ray', '71020'],
    ['office visit', '99213'],
    ['physical exam', '99395']
  ])
};

// Drug name normalization
const DRUG_ALIASES = new Map([
  ['metformin hcl', 'metformin'],
  ['metformin hydrochloride', 'metformin'],
  ['lisinopril tablets', 'lisinopril'],
  ['atorvastatin calcium', 'atorvastatin'],
  ['lipitor', 'atorvastatin'],
  ['glucophage', 'metformin'],
  ['zestril', 'lisinopril'],
  ['prinivil', 'lisinopril']
]);

// Unit conversions for lab values
const UNIT_CONVERSIONS = new Map([
  ['mg/dl', 'mg/dL'],
  ['mgdl', 'mg/dL'],
  ['mg/100ml', 'mg/dL'],
  ['mmol/l', 'mmol/L'],
  ['g/dl', 'g/dL'],
  ['gdl', 'g/dL'],
  ['ug/ml', 'μg/mL'],
  ['ng/ml', 'ng/mL']
]);

function normalizeText(text: string): string {
  const normalized = text.toLowerCase().trim();
  
  // Check for drug aliases
  if (DRUG_ALIASES.has(normalized)) {
    return DRUG_ALIASES.get(normalized)!;
  }
  
  return normalized;
}

function validateMedicalEntity(entity: { text: string; category: string; type: string }): ValidationResult {
  const normalizedText = normalizeText(entity.text);
  let codes: ValidationResult['codes'] = {};
  let confidence = 0.5;
  let isValid = false;
  const suggestions: string[] = [];

  // Validate based on category and type
  switch (entity.category.toLowerCase()) {
    case 'medical_condition':
    case 'dx_name':
      if (MEDICAL_VOCABULARIES.snomed.has(normalizedText)) {
        codes.snomed = MEDICAL_VOCABULARIES.snomed.get(normalizedText);
        confidence += 0.3;
        isValid = true;
      }
      if (MEDICAL_VOCABULARIES.icd10.has(normalizedText)) {
        codes.icd10 = MEDICAL_VOCABULARIES.icd10.get(normalizedText);
        confidence += 0.2;
        isValid = true;
      }
      break;

    case 'medication':
    case 'generic_name':
    case 'brand_name':
      if (MEDICAL_VOCABULARIES.rxnorm.has(normalizedText)) {
        codes.rxnorm = MEDICAL_VOCABULARIES.rxnorm.get(normalizedText);
        confidence += 0.4;
        isValid = true;
      }
      break;

    case 'test_treatment_procedure':
    case 'test_name':
      if (MEDICAL_VOCABULARIES.loinc.has(normalizedText)) {
        codes.loinc = MEDICAL_VOCABULARIES.loinc.get(normalizedText);
        confidence += 0.3;
        isValid = true;
      }
      if (MEDICAL_VOCABULARIES.snomed.has(normalizedText)) {
        codes.snomed = MEDICAL_VOCABULARIES.snomed.get(normalizedText);
        confidence += 0.2;
      }
      break;

    case 'procedure':
      if (MEDICAL_VOCABULARIES.cpt.has(normalizedText)) {
        codes.cpt = MEDICAL_VOCABULARIES.cpt.get(normalizedText);
        confidence += 0.4;
        isValid = true;
      }
      break;
  }

  // Add suggestions for partial matches
  if (!isValid) {
    const vocabularies = [
      ...MEDICAL_VOCABULARIES.snomed.keys(),
      ...MEDICAL_VOCABULARIES.loinc.keys(),
      ...MEDICAL_VOCABULARIES.rxnorm.keys(),
      ...MEDICAL_VOCABULARIES.icd10.keys(),
      ...MEDICAL_VOCABULARIES.cpt.keys()
    ];

    const partialMatches = vocabularies.filter(term => 
      term.includes(normalizedText) || normalizedText.includes(term)
    );

    suggestions.push(...partialMatches.slice(0, 3));
  }

  return {
    originalText: entity.text,
    normalizedText,
    category: entity.category,
    codes,
    confidence: Math.min(confidence, 1.0),
    isValid,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Medical terminology validation started');
    const startTime = Date.now();
    
    const { entities, validateCodes = true }: MedicalTerminologyRequest = await req.json();

    if (!entities || !Array.isArray(entities)) {
      throw new Error('Entities array is required');
    }

    console.log(`Validating ${entities.length} medical entities`);

    // Validate each entity
    const validations = entities.map(entity => validateMedicalEntity(entity));

    const validEntities = validations.filter(v => v.isValid).length;
    const processingTime = Date.now() - startTime;

    const response: MedicalTerminologyResponse = {
      validations,
      summary: {
        totalEntities: entities.length,
        validEntities,
        validationRate: entities.length > 0 ? validEntities / entities.length : 0,
        processingTime
      }
    };

    console.log(`Validation completed: ${validEntities}/${entities.length} entities validated successfully`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-medical-terminology function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        validations: [],
        summary: {
          totalEntities: 0,
          validEntities: 0,
          validationRate: 0,
          processingTime: 0
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});