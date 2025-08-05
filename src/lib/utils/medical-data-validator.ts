import type { ParsedMedicalData } from '@/types/medical-data';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Validate extracted medical data for completeness and accuracy
 */
export function validateMedicalData(data: ParsedMedicalData): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    confidence: data.confidence || 0.8,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // Basic validation
  if (!data.reportType) {
    result.errors.push('Missing report type');
    result.isValid = false;
  }

  if (!data.extractedAt) {
    result.warnings.push('Missing extraction timestamp');
  }

  // Type-specific validation
  switch (data.reportType) {
    case 'lab':
      validateLabData(data as any, result);
      break;
    case 'prescription':
      validatePrescriptionData(data as any, result);
      break;
    case 'radiology':
      validateRadiologyData(data as any, result);
      break;
    case 'vitals':
      validateVitalsData(data as any, result);
      break;
    default:
      validateGeneralData(data as any, result);
  }

  // Adjust confidence based on validation results
  if (result.errors.length > 0) {
    result.confidence *= 0.5;
    result.isValid = false;
  } else if (result.warnings.length > 0) {
    result.confidence *= 0.8;
  }

  return result;
}

function validateLabData(data: any, result: ValidationResult) {
  if (!data.tests || !Array.isArray(data.tests) || data.tests.length === 0) {
    result.errors.push('No lab tests found');
    return;
  }

  data.tests.forEach((test: any, index: number) => {
    if (!test.name) {
      result.errors.push(`Test ${index + 1}: Missing test name`);
    }
    if (!test.value) {
      result.warnings.push(`Test ${index + 1}: Missing test value`);
    }
    if (test.status && !['normal', 'abnormal', 'critical', 'high', 'low'].includes(test.status)) {
      result.warnings.push(`Test ${index + 1}: Invalid status value`);
    }
  });
}

function validatePrescriptionData(data: any, result: ValidationResult) {
  if (!data.medications || !Array.isArray(data.medications) || data.medications.length === 0) {
    result.errors.push('No medications found');
    return;
  }

  data.medications.forEach((med: any, index: number) => {
    if (!med.name) {
      result.errors.push(`Medication ${index + 1}: Missing medication name`);
    }
    if (!med.dosage) {
      result.warnings.push(`Medication ${index + 1}: Missing dosage information`);
    }
    if (!med.frequency) {
      result.warnings.push(`Medication ${index + 1}: Missing frequency information`);
    }
  });
}

function validateRadiologyData(data: any, result: ValidationResult) {
  if (!data.study) {
    result.warnings.push('Missing study information');
  }
  
  if (!data.findings || !Array.isArray(data.findings) || data.findings.length === 0) {
    result.warnings.push('No findings documented');
  }

  if (!data.impression) {
    result.warnings.push('Missing radiologist impression');
  }
}

function validateVitalsData(data: any, result: ValidationResult) {
  if (!data.vitals || !Array.isArray(data.vitals) || data.vitals.length === 0) {
    result.errors.push('No vital signs found');
    return;
  }

  const validVitalTypes = [
    'blood_pressure', 'heart_rate', 'temperature', 
    'respiratory_rate', 'oxygen_saturation', 'weight', 'height', 'bmi'
  ];

  data.vitals.forEach((vital: any, index: number) => {
    if (!vital.type) {
      result.errors.push(`Vital ${index + 1}: Missing vital type`);
    } else if (!validVitalTypes.includes(vital.type)) {
      result.warnings.push(`Vital ${index + 1}: Unknown vital type: ${vital.type}`);
    }
    
    if (!vital.value) {
      result.errors.push(`Vital ${index + 1}: Missing value`);
    }
  });
}

function validateGeneralData(data: any, result: ValidationResult) {
  if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
    result.warnings.push('No document sections identified');
  }
}

/**
 * Check for potential duplicate reports based on content similarity
 */
export function checkForDuplicates(newData: ParsedMedicalData, existingReports: any[]): {
  isDuplicate: boolean;
  similarity: number;
  matchedReport?: any;
} {
  // Simple duplicate detection based on patient info and dates
  for (const report of existingReports) {
    if (!report.parsed_data) continue;

    const similarity = calculateSimilarity(newData, report.parsed_data);
    if (similarity > 0.85) {
      return {
        isDuplicate: true,
        similarity,
        matchedReport: report
      };
    }
  }

  return { isDuplicate: false, similarity: 0 };
}

function calculateSimilarity(data1: ParsedMedicalData, data2: any): number {
  let score = 0;
  let comparisons = 0;

  // Compare report types
  if (data1.reportType === data2.reportType) {
    score += 0.3;
  }
  comparisons++;

  // Compare patient info if available
  if (data1.patient && data2.patient) {
    if (data1.patient.name === data2.patient.name) score += 0.2;
    if (data1.patient.dateOfBirth === data2.patient.dateOfBirth) score += 0.2;
    comparisons += 2;
  }

  // Compare dates
  const date1 = getReportDate(data1);
  const date2 = getReportDate(data2);
  if (date1 && date2) {
    const daysDiff = Math.abs(new Date(date1).getTime() - new Date(date2).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff === 0) score += 0.3;
    else if (daysDiff <= 1) score += 0.2;
    else if (daysDiff <= 7) score += 0.1;
    comparisons++;
  }

  return comparisons > 0 ? score / comparisons : 0;
}

function getReportDate(data: any): string | null {
  return data.reportDate || data.studyDate || data.prescriptionDate || data.collectionDate || data.visitDate || null;
}