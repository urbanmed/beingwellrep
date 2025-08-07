// Medical data enhancement utilities for processing and improving extracted data

export interface EnhancedTestResult {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  notes?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface EnhancedVitalSign {
  type: string;
  value: string;
  unit?: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  timestamp?: string;
  notes?: string;
  severity?: 'critical' | 'warning' | 'info';
}

// Enhanced data structure extraction from various parsed data formats
export const extractEnhancedTestResults = (data: any): EnhancedTestResult[] => {
  const results: EnhancedTestResult[] = [];
  
  if (!data) return results;
  
  // Handle different data structures
  if (data.tests && Array.isArray(data.tests)) {
    data.tests.forEach((test: any) => {
      if (test.name && test.value) {
        results.push({
          name: test.name,
          value: test.value,
          unit: test.unit,
          referenceRange: test.referenceRange || test.reference_range || test.refRange,
          status: normalizeStatus(test.status),
          notes: test.notes,
          severity: determineSeverity(test.status)
        });
      }
    });
  }
  
  // Handle raw response parsing
  if (data.rawResponse && typeof data.rawResponse === 'string') {
    const extracted = parseTestsFromText(data.rawResponse);
    results.push(...extracted);
  }
  
  // Handle nested structures
  if (data.sections && Array.isArray(data.sections)) {
    data.sections.forEach((section: any) => {
      if (section.content) {
        const extracted = parseTestsFromText(section.content);
        results.push(...extracted);
      }
    });
  }
  
  return results;
};

export const extractEnhancedVitalSigns = (data: any): EnhancedVitalSign[] => {
  const vitals: EnhancedVitalSign[] = [];
  
  if (!data) return vitals;
  
  // Handle dedicated vitals section
  if (data.vitals && Array.isArray(data.vitals)) {
    data.vitals.forEach((vital: any) => {
      if (vital.type && vital.value) {
        vitals.push({
          type: vital.type,
          value: vital.value,
          unit: vital.unit,
          status: normalizeStatus(vital.status),
          timestamp: vital.timestamp,
          notes: vital.notes,
          severity: determineSeverity(vital.status)
        });
      }
    });
  }
  
  // Extract vitals from test results
  if (data.tests && Array.isArray(data.tests)) {
    data.tests.forEach((test: any) => {
      const vitalType = classifyAsVital(test.name);
      if (vitalType && test.value) {
        vitals.push({
          type: vitalType,
          value: test.value,
          unit: test.unit,
          status: normalizeStatus(test.status),
          notes: test.notes,
          severity: determineSeverity(test.status)
        });
      }
    });
  }
  
  // Handle raw response parsing
  if (data.rawResponse && typeof data.rawResponse === 'string') {
    const extracted = parseVitalsFromText(data.rawResponse);
    vitals.push(...extracted);
  }
  
  return vitals;
};

// Normalize status values to standard format
const normalizeStatus = (status: string | undefined): 'normal' | 'high' | 'low' | 'critical' => {
  if (!status) return 'normal';
  
  const normalized = status.toLowerCase().trim();
  
  if (normalized.includes('critical') || normalized.includes('severe')) return 'critical';
  if (normalized.includes('high') || normalized.includes('elevated') || normalized.includes('abnormal')) return 'high';
  if (normalized.includes('low') || normalized.includes('decreased')) return 'low';
  
  return 'normal';
};

// Determine severity for UI display
const determineSeverity = (status: string | undefined): 'critical' | 'warning' | 'info' => {
  const normalized = normalizeStatus(status);
  
  switch (normalized) {
    case 'critical': return 'critical';
    case 'high':
    case 'low': return 'warning';
    default: return 'info';
  }
};

// Classify test name as vital sign type
const classifyAsVital = (testName: string): string | null => {
  if (!testName) return null;
  
  const name = testName.toLowerCase();
  
  const vitalMap: Record<string, string> = {
    'blood pressure': 'blood_pressure',
    'systolic': 'blood_pressure',
    'diastolic': 'blood_pressure',
    'bp': 'blood_pressure',
    'heart rate': 'heart_rate',
    'pulse': 'heart_rate',
    'hr': 'heart_rate',
    'bpm': 'heart_rate',
    'temperature': 'temperature',
    'temp': 'temperature',
    'respiratory rate': 'respiratory_rate',
    'breathing rate': 'respiratory_rate',
    'rr': 'respiratory_rate',
    'oxygen saturation': 'oxygen_saturation',
    'spo2': 'oxygen_saturation',
    'o2 sat': 'oxygen_saturation',
    'weight': 'weight',
    'wt': 'weight',
    'height': 'height',
    'ht': 'height',
    'bmi': 'bmi',
    'body mass index': 'bmi'
  };
  
  for (const [keyword, type] of Object.entries(vitalMap)) {
    if (name.includes(keyword)) {
      return type;
    }
  }
  
  return null;
};

// Parse test results from raw text
const parseTestsFromText = (text: string): EnhancedTestResult[] => {
  const results: EnhancedTestResult[] = [];
  
  // Simple pattern matching for test results
  // This is a basic implementation - could be enhanced with more sophisticated parsing
  const lines = text.split('\n');
  
  for (const line of lines) {
    const testMatch = line.match(/([A-Za-z\s]+):\s*([0-9.]+)\s*([A-Za-z/%]*)/);
    if (testMatch) {
      const [, name, value, unit] = testMatch;
      
      results.push({
        name: name.trim(),
        value: value,
        unit: unit || undefined,
        status: 'normal', // Default - would need reference ranges to determine
        severity: 'info'
      });
    }
  }
  
  return results;
};

// Parse vital signs from raw text
const parseVitalsFromText = (text: string): EnhancedVitalSign[] => {
  const vitals: EnhancedVitalSign[] = [];
  
  // Simple pattern matching for vital signs
  const lines = text.split('\n');
  
  for (const line of lines) {
    const vitalMatch = line.match(/([A-Za-z\s]+):\s*([0-9.]+)\s*([A-Za-z/%]*)/);
    if (vitalMatch) {
      const [, name, value, unit] = vitalMatch;
      const vitalType = classifyAsVital(name);
      
      if (vitalType) {
        vitals.push({
          type: vitalType,
          value: value,
          unit: unit || undefined,
          status: 'normal', // Default - would need ranges to determine
          severity: 'info'
        });
      }
    }
  }
  
  return vitals;
}

// Re-process existing report data to enhance status determination
export const reprocessReportData = (reportData: any): any => {
  if (!reportData) return reportData;
  
  let enhanced = { ...reportData };
  
  // Enhance test results
  if (enhanced.tests) {
    enhanced.tests = enhanced.tests.map((test: any) => ({
      ...test,
      status: test.status || determineStatusFromValue(test.value, test.referenceRange),
      severity: determineSeverity(test.status)
    }));
  }
  
  // Enhance vitals
  if (enhanced.vitals) {
    enhanced.vitals = enhanced.vitals.map((vital: any) => ({
      ...vital,
      status: vital.status || determineVitalStatusFromValue(vital.type, vital.value, vital.unit),
      severity: determineSeverity(vital.status)
    }));
  }
  
  return enhanced;
};

// Determine status from value and reference range
const determineStatusFromValue = (value: string, referenceRange?: string): string => {
  if (!value || !referenceRange) return 'normal';
  
  try {
    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (isNaN(numValue)) return 'normal';
    
    const range = referenceRange.toLowerCase().trim();
    
    if (range.includes('-')) {
      const parts = range.split('-').map(p => parseFloat(p.trim().replace(/[^\d.-]/g, '')));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const [low, high] = parts;
        if (numValue < low * 0.5 || numValue > high * 2) return 'critical';
        if (numValue < low) return 'low';
        if (numValue > high) return 'high';
        return 'normal';
      }
    }
    
    return 'normal';
  } catch (error) {
    return 'normal';
  }
};

// Determine vital status from type and value
const determineVitalStatusFromValue = (type: string, value: string, unit?: string): string => {
  try {
    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (isNaN(numValue)) return 'normal';
    
    switch (type.toLowerCase()) {
      case 'heart_rate':
      case 'pulse':
        if (numValue < 40 || numValue > 140) return 'critical';
        if (numValue < 60 || numValue > 100) return 'high';
        return 'normal';
      
      case 'blood_pressure':
      case 'systolic':
        if (numValue > 180 || numValue < 70) return 'critical';
        if (numValue > 140 || numValue < 90) return 'high';
        return 'normal';
      
      case 'temperature':
        if (unit?.toLowerCase().includes('f')) {
          if (numValue > 104 || numValue < 95) return 'critical';
          if (numValue > 100.4 || numValue < 97) return 'high';
        } else {
          if (numValue > 40 || numValue < 35) return 'critical';
          if (numValue > 38 || numValue < 36) return 'high';
        }
        return 'normal';
      
      default:
        return 'normal';
    }
  } catch (error) {
    return 'normal';
  }
};