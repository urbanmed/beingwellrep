export interface MedicalDataBase {
  reportType: string;
  confidence: number;
  extractedAt: string;
}

export interface LabResultData extends MedicalDataBase {
  reportType: 'lab';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
  };
  tests: Array<{
    name: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    status?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low';
    notes?: string;
  }>;
  orderingPhysician?: string;
  facility?: string;
  collectionDate?: string;
  reportDate?: string;
}

export interface PrescriptionData extends MedicalDataBase {
  reportType: 'prescription';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
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
  }>;
  prescriber?: string;
  pharmacy?: string;
  prescriptionDate?: string;
  fillDate?: string;
}

export interface RadiologyData extends MedicalDataBase {
  reportType: 'radiology';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
  };
  study: {
    type?: string;
    bodyPart?: string;
    technique?: string;
    contrast?: boolean;
  };
  findings: Array<{
    category: string;
    description: string;
    severity?: 'normal' | 'mild' | 'moderate' | 'severe';
  }>;
  impression?: string;
  radiologist?: string;
  facility?: string;
  studyDate?: string;
  reportDate?: string;
}

export interface VitalSignsData extends MedicalDataBase {
  reportType: 'vitals';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
  };
  vitals: Array<{
    type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'respiratory_rate' | 'oxygen_saturation' | 'weight' | 'height' | 'bmi';
    value: string;
    unit?: string;
    timestamp?: string;
    notes?: string;
  }>;
  recordedBy?: string;
  facility?: string;
  recordDate?: string;
}

export interface GeneralMedicalData extends MedicalDataBase {
  reportType: 'general';
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
  };
  sections: Array<{
    title: string;
    content: string;
    category?: string;
  }>;
  provider?: string;
  facility?: string;
  visitDate?: string;
  reportDate?: string;
}

export type ParsedMedicalData = 
  | LabResultData 
  | PrescriptionData 
  | RadiologyData 
  | VitalSignsData 
  | GeneralMedicalData;

export interface DocumentParsingResult {
  success: boolean;
  data?: ParsedMedicalData;
  extractedText?: string;
  confidence: number;
  model: string;
  errors?: string[];
  processingTime?: number;
}