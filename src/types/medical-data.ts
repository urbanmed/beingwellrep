// Enhanced patient information structure
export interface Patient {
  name?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  id?: string;
  mrn?: string; // Medical Record Number
  address?: string;
  phone?: string;
  email?: string;
  insurance?: {
    provider?: string;
    policyNumber?: string;
    groupNumber?: string;
  };
}

// Enhanced doctor/provider information structure
export interface Provider {
  name?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  specialty?: string;
  npi?: string; // National Provider Identifier
  license?: string;
  phone?: string;
  email?: string;
}

// Enhanced facility information structure
export interface Facility {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  department?: string;
  accreditation?: string[];
}

// Enhanced test result structure with hierarchy support
export interface TestResult {
  id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  value?: string | number;
  unit?: string;
  referenceRange?: string;
  status?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low' | 'pending';
  flags?: string[];
  notes?: string;
  methodology?: string;
  subTests?: TestResult[]; // For hierarchical results
  collectedAt?: string;
  reportedAt?: string;
}

// Enhanced medication structure
export interface Medication {
  name: string;
  genericName?: string;
  dosage?: string;
  strength?: string;
  form?: string; // tablet, capsule, liquid, etc.
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: string;
  refills?: number;
  prescribedDate?: string;
  startDate?: string;
  endDate?: string;
  indication?: string;
  route?: string; // oral, IV, topical, etc.
}

// Base interface for all medical data
export interface MedicalDataBase {
  reportType: string;
  confidence?: number;
  extractedAt?: string;
  documentId?: string;
  version?: string;
}

// Enhanced Lab Results Data Structure
export interface LabResultData extends MedicalDataBase {
  reportType: 'lab';
  patient?: Patient;
  orderingProvider?: Provider;
  performingProvider?: Provider;
  facility?: Facility;
  collectionDate?: string;
  receivedDate?: string;
  reportDate?: string;
  accessionNumber?: string;
  specimenType?: string;
  testPanels?: Array<{
    name: string;
    category?: string;
    tests: TestResult[];
  }>;
  tests?: TestResult[];
  clinicalInfo?: string;
  comments?: string;
}

// Enhanced Prescription Data Structure
export interface PrescriptionData extends MedicalDataBase {
  reportType: 'prescription';
  patient?: Patient;
  prescribingProvider?: Provider;
  facility?: Facility;
  prescriptionDate?: string;
  prescriptionNumber?: string;
  medications?: Medication[];
  diagnosis?: string[];
  clinicalNotes?: string;
  pharmacyInstructions?: string;
  dea?: string; // DEA number
}

// Enhanced Radiology Data Structure
export interface RadiologyData extends MedicalDataBase {
  reportType: 'radiology';
  patient?: Patient;
  radiologist?: Provider;
  orderingProvider?: Provider;
  technologist?: Provider;
  facility?: Facility;
  studyDate?: string;
  reportDate?: string;
  accessionNumber?: string;
  studyType?: string;
  modality?: string; // CT, MRI, X-ray, etc.
  bodyPart?: string;
  technique?: string;
  contrast?: {
    used?: boolean;
    type?: string;
    amount?: string;
  };
  clinicalHistory?: string;
  findings?: string;
  impression?: string;
  recommendations?: string[];
  urgency?: 'routine' | 'urgent' | 'stat';
}

// Enhanced Vital Signs Data Structure
export interface VitalSignsData extends MedicalDataBase {
  reportType: 'vitals';
  patient?: Patient;
  measuredBy?: Provider;
  facility?: Facility;
  measurementDate?: string;
  vitals?: {
    bloodPressure?: {
      systolic?: number;
      diastolic?: number;
      unit?: string;
      position?: string; // sitting, standing, lying
      cuff?: string; // adult, pediatric, large
    };
    heartRate?: {
      value?: number;
      unit?: string;
      rhythm?: string;
    };
    temperature?: {
      value?: number;
      unit?: string;
      method?: string; // oral, rectal, axillary, temporal
    };
    respiratoryRate?: {
      value?: number;
      unit?: string;
      effort?: string;
    };
    oxygenSaturation?: {
      value?: number;
      unit?: string;
      roomAir?: boolean;
      supplementalO2?: string;
    };
    weight?: {
      value?: number;
      unit?: string;
      method?: string;
    };
    height?: {
      value?: number;
      unit?: string;
    };
    bmi?: {
      value?: number;
      category?: string;
    };
    painScale?: {
      value?: number;
      scale?: string; // 0-10, Wong-Baker, etc.
    };
  };
  notes?: string;
}

// Enhanced General Medical Document Data Structure
export interface GeneralMedicalData extends MedicalDataBase {
  reportType: 'general';
  patient?: Patient;
  provider?: Provider;
  facility?: Facility;
  documentDate?: string;
  documentType?: string;
  visitType?: string; // consultation, follow-up, emergency, etc.
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  medications?: Medication[];
  allergies?: Array<{
    allergen: string;
    reaction?: string;
    severity?: string;
  }>;
  socialHistory?: string;
  familyHistory?: string;
  reviewOfSystems?: string;
  physicalExamination?: string;
  assessment?: string;
  plan?: string;
  diagnosis?: Array<{
    code?: string;
    description: string;
    type?: 'primary' | 'secondary';
  }>;
  procedures?: Array<{
    code?: string;
    description: string;
    date?: string;
  }>;
  followUp?: string;
  notes?: string;
}

// Union type for all parsed medical data
export type ParsedMedicalData = 
  | LabResultData 
  | PrescriptionData 
  | RadiologyData 
  | VitalSignsData 
  | GeneralMedicalData;

// Enhanced document parsing result structure
export interface DocumentParsingResult {
  success: boolean;
  data?: ParsedMedicalData;
  confidence?: number;
  modelUsed?: string;
  processingTime?: number;
  errors?: string[];
  warnings?: string[];
  extractionMethod?: 'ocr' | 'text' | 'structured';
}