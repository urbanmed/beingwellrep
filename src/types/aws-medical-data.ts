// AWS Comprehend Medical and Textract enhanced types

export interface AWSMedicalEntity {
  id: number;
  text: string;
  category: 'MEDICAL_CONDITION' | 'MEDICATION' | 'TEST_TREATMENT_PROCEDURE' | 'ANATOMY' | 'PROTECTED_HEALTH_INFORMATION';
  type: string;
  score: number;
  beginOffset: number;
  endOffset: number;
  attributes: Array<{
    type: string;
    score: number;
    relationshipScore: number;
    text: string;
  }>;
  traits: Array<{
    name: string;
    score: number;
  }>;
}

export interface AWSMedicalRelationship {
  id: number;
  type: string;
  score: number;
  arg1: { entityId: number };
  arg2: { entityId: number };
}

export interface TextractTable {
  cells: Array<{
    text: string;
    rowIndex: number;
    columnIndex: number;
    confidence: number;
  }>;
}

export interface TextractForm {
  key: string;
  value: string;
  confidence: number;
}

export interface TextractLayout {
  pages: number;
  sections: Array<{
    type: 'HEADER' | 'FOOTER' | 'TABLE' | 'PARAGRAPH' | 'LIST';
    text: string;
    confidence: number;
  }>;
}

export interface MedicalCodes {
  snomed?: string;
  loinc?: string;
  rxnorm?: string;
  icd10?: string;
  cpt?: string;
}

export interface ValidatedMedicalEntity extends AWSMedicalEntity {
  normalizedText: string;
  codes: MedicalCodes;
  validationConfidence: number;
  isValid: boolean;
  suggestions?: string[];
}

export interface EnhancedMedicalData {
  // Original LLM extracted data
  originalData?: any;
  
  // AWS Comprehend Medical results
  medicalEntities: ValidatedMedicalEntity[];
  medicalRelationships: AWSMedicalRelationship[];
  
  // AWS Textract results
  extractedText: string;
  tables: TextractTable[];
  forms: TextractForm[];
  layout: TextractLayout;
  
  // Confidence and validation metrics
  confidence: {
    textract: number;
    comprehendMedical: number;
    terminology: number;
    overall: number;
  };
  
  // Medical coding and standardization
  standardizedCodes: MedicalCodes[];
  
  // Processing metadata
  processingStages: {
    textract: { completed: boolean; processingTime: number; error?: string };
    comprehendMedical: { completed: boolean; processingTime: number; error?: string };
    terminology: { completed: boolean; processingTime: number; error?: string };
    llmEnhancement: { completed: boolean; processingTime: number; error?: string };
  };
  
  // Quality metrics
  quality: {
    completeness: number; // 0-1 scale
    consistency: number;  // 0-1 scale
    accuracy: number;     // 0-1 scale
    medicalValidity: number; // 0-1 scale
  };
  
  extractedAt: string;
}

// Enhanced lab result data with AWS medical NLP
export interface EnhancedLabResultData extends EnhancedMedicalData {
  reportType: 'lab';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
    mrn?: string; // Medical Record Number
  };
  tests: Array<{
    name: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    status?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low';
    notes?: string;
    // Enhanced with medical codes
    loincCode?: string;
    snomedCode?: string;
    confidence: number;
    // Validation against reference ranges
    isWithinRange?: boolean;
    riskLevel?: 'normal' | 'borderline' | 'high' | 'critical';
  }>;
  orderingPhysician?: string;
  facility?: string;
  collectionDate?: string;
  reportDate?: string;
}

// Enhanced prescription data with AWS medical NLP
export interface EnhancedPrescriptionData extends EnhancedMedicalData {
  reportType: 'prescription';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
    mrn?: string;
  };
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    quantity?: string;
    refills?: number;
    ndc?: string;
    // Enhanced with medical codes
    rxnormCode?: string;
    genericName?: string;
    brandNames?: string[];
    drugClass?: string;
    confidence: number;
    // Drug interaction and validation
    interactions?: string[];
    contraindications?: string[];
    isValidDosage?: boolean;
  }>;
  prescriber?: string;
  pharmacy?: string;
  prescriptionDate?: string;
  fillDate?: string;
}

// Enhanced radiology data with AWS medical NLP
export interface EnhancedRadiologyData extends EnhancedMedicalData {
  reportType: 'radiology';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
    mrn?: string;
  };
  study: {
    type?: string;
    bodyPart?: string;
    technique?: string;
    contrast?: boolean;
    // Enhanced with medical codes
    cptCode?: string;
    snomedCode?: string;
    dicomStudyId?: string;
  };
  findings: Array<{
    category: string;
    description: string;
    severity?: 'normal' | 'mild' | 'moderate' | 'severe';
    confidence: number;
    // Enhanced with medical codes
    snomedCode?: string;
    location?: string;
    measurements?: Array<{
      type: string;
      value: number;
      unit: string;
    }>;
  }>;
  impression?: string;
  radiologist?: string;
  facility?: string;
  studyDate?: string;
  reportDate?: string;
}

// Enhanced vital signs data
export interface EnhancedVitalSignsData extends EnhancedMedicalData {
  reportType: 'vitals';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
    mrn?: string;
  };
  vitals: Array<{
    type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'respiratory_rate' | 'oxygen_saturation' | 'weight' | 'height' | 'bmi';
    value: string;
    unit?: string;
    timestamp?: string;
    notes?: string;
    confidence: number;
    // Enhanced with validation
    loincCode?: string;
    isNormal?: boolean;
    riskLevel?: 'normal' | 'borderline' | 'abnormal' | 'critical';
    ageAdjustedRange?: string;
  }>;
  recordedBy?: string;
  facility?: string;
  recordDate?: string;
}

// Enhanced general medical data
export interface EnhancedGeneralMedicalData extends EnhancedMedicalData {
  reportType: 'general';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
    mrn?: string;
  };
  sections: Array<{
    title: string;
    content: string;
    category?: string;
    confidence: number;
    // Enhanced with medical entity extraction
    medicalEntities?: ValidatedMedicalEntity[];
    keyFindings?: string[];
    icd10Codes?: string[];
  }>;
  provider?: string;
  facility?: string;
  visitDate?: string;
  reportDate?: string;
}

// Union type for all enhanced medical data
export type EnhancedParsedMedicalData = 
  | EnhancedLabResultData 
  | EnhancedPrescriptionData 
  | EnhancedRadiologyData 
  | EnhancedVitalSignsData 
  | EnhancedGeneralMedicalData;

// Enhanced document parsing result
export interface EnhancedDocumentParsingResult {
  success: boolean;
  data?: EnhancedParsedMedicalData;
  extractedText?: string;
  confidence: number;
  model: string;
  errors?: string[];
  processingTime?: number;
  // Enhanced with AWS processing results
  awsResults?: {
    textract?: any;
    comprehendMedical?: any;
    terminology?: any;
  };
  // Processing pipeline status
  pipeline: {
    stage1_textract: 'pending' | 'processing' | 'completed' | 'failed';
    stage2_comprehend: 'pending' | 'processing' | 'completed' | 'failed';
    stage3_llm: 'pending' | 'processing' | 'completed' | 'failed';
    stage4_validation: 'pending' | 'processing' | 'completed' | 'failed';
  };
}