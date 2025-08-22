import { 
  ParsedMedicalData, 
  LabResultData, 
  PrescriptionData, 
  RadiologyData, 
  VitalSignsData, 
  GeneralMedicalData 
} from '@/types/medical-data';
import {
  FHIRPatient,
  FHIRObservation,
  FHIRMedicationRequest,
  FHIRDiagnosticReport,
  FHIREncounter,
  FHIRCarePlan,
  FHIRCodeableConcept,
  FHIRQuantity,
  FHIRReference
} from '@/types/fhir';

// Generate unique FHIR IDs
export function generateFHIRId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}-${random}`;
}

// Convert profile data to FHIR Patient
export function convertProfileToFHIRPatient(
  profile: any,
  userId: string
): FHIRPatient {
  const patientId = generateFHIRId('patient-');
  
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: patientId,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
    },
    identifier: [
      {
        use: 'official',
        system: 'http://beingwell.app/patient-id',
        value: userId
      }
    ],
    active: true
  };

  // Add name if available
  if (profile.first_name || profile.last_name) {
    patient.name = [{
      use: 'official',
      family: profile.last_name || '',
      given: profile.first_name ? [profile.first_name] : []
    }];
  }

  // Add gender if available
  if (profile.gender) {
    const genderMap: Record<string, 'male' | 'female' | 'other' | 'unknown'> = {
      'male': 'male',
      'female': 'female',
      'other': 'other',
      'unknown': 'unknown'
    };
    patient.gender = genderMap[profile.gender.toLowerCase()] || 'unknown';
  }

  // Add birth date if available
  if (profile.date_of_birth) {
    patient.birthDate = profile.date_of_birth;
  }

  // Add phone number if available
  if (profile.phone_number) {
    patient.telecom = patient.telecom || [];
    patient.telecom.push({
      system: 'phone',
      value: profile.phone_number,
      use: 'mobile'
    });
  }

  // Add address if available
  if (profile.address) {
    patient.address = [{
      use: 'home',
      type: 'physical',
      text: profile.address
    }];
  }

  // Add ABHA identifier if available
  if (profile.abha_id) {
    patient.identifier = patient.identifier || [];
    patient.identifier.push({
      use: 'official',
      system: 'https://healthid.abdm.gov.in',
      value: profile.abha_id
    });
  }

  // Add emergency contact if available
  if (profile.emergency_contact_name && profile.emergency_contact_phone) {
    patient.contact = [{
      relationship: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
          code: 'EP',
          display: 'Emergency contact person'
        }]
      }],
      name: {
        text: profile.emergency_contact_name
      },
      telecom: [{
        system: 'phone',
        value: profile.emergency_contact_phone,
        use: 'home'
      }]
    }];
  }

  return patient;
}

// Convert lab results to FHIR Observations
export function convertLabResultsToFHIRObservations(
  labData: LabResultData,
  patientReference: string,
  reportId?: string
): FHIRObservation[] {
  const observations: FHIRObservation[] = [];

  labData.tests.forEach((test, index) => {
    const observationId = generateFHIRId('obs-');
    
    const observation: FHIRObservation = {
      resourceType: 'Observation',
      id: observationId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Observation']
      },
      identifier: [
        {
          system: 'http://beingwell.app/observation-id',
          value: `${reportId}-${index}`
        }
      ],
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory',
          display: 'Laboratory'
        }]
      }],
      code: {
        text: test.name
      },
      subject: {
        reference: `Patient/${patientReference}`
      }
    };

    // Add effective date
    if (labData.collectionDate) {
      observation.effectiveDateTime = labData.collectionDate;
    } else if (labData.reportDate) {
      observation.effectiveDateTime = labData.reportDate;
    }

    // Add value
    if (test.value) {
      if (test.unit && !isNaN(parseFloat(test.value))) {
        observation.valueQuantity = {
          value: parseFloat(test.value),
          unit: test.unit,
          system: 'http://unitsofmeasure.org'
        };
      } else {
        observation.valueString = test.value;
      }
    }

    // Add reference range
    if (test.referenceRange) {
      observation.referenceRange = [{
        text: test.referenceRange
      }];
    }

    // Add interpretation based on status
    if (test.status) {
      const interpretationMap: Record<string, { code: string; display: string }> = {
        'normal': { code: 'N', display: 'Normal' },
        'high': { code: 'H', display: 'High' },
        'low': { code: 'L', display: 'Low' },
        'critical': { code: 'HH', display: 'Critical high' },
        'abnormal': { code: 'A', display: 'Abnormal' }
      };

      const interpretation = interpretationMap[test.status];
      if (interpretation) {
        observation.interpretation = [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: interpretation.code,
            display: interpretation.display
          }]
        }];
      }
    }

    // Add notes
    if (test.notes) {
      observation.note = [{
        text: test.notes
      }];
    }

    // Add performer (lab/facility)
    if (labData.facility) {
      observation.performer = [{
        display: labData.facility
      }];
    }

    observations.push(observation);
  });

  return observations;
}

// Convert prescriptions to FHIR MedicationRequests
export function convertPrescriptionToFHIRMedicationRequest(
  prescriptionData: PrescriptionData,
  patientReference: string,
  reportId?: string
): FHIRMedicationRequest[] {
  const medicationRequests: FHIRMedicationRequest[] = [];

  prescriptionData.medications.forEach((med, index) => {
    const medicationRequestId = generateFHIRId('med-req-');
    
    const medicationRequest: FHIRMedicationRequest = {
      resourceType: 'MedicationRequest',
      id: medicationRequestId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest']
      },
      identifier: [
        {
          system: 'http://beingwell.app/medication-request-id',
          value: `${reportId}-${index}`
        }
      ],
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        text: med.name
      },
      subject: {
        reference: `Patient/${patientReference}`
      }
    };

    // Add authored date
    if (prescriptionData.prescriptionDate) {
      medicationRequest.authoredOn = prescriptionData.prescriptionDate;
    }

    // Add prescriber
    if (prescriptionData.prescriber) {
      medicationRequest.requester = {
        display: prescriptionData.prescriber
      };
    }

    // Add dosage instructions
    if (med.dosage || med.frequency || med.duration || med.instructions) {
      medicationRequest.dosageInstruction = [{
        text: [med.dosage, med.frequency, med.duration, med.instructions]
          .filter(Boolean)
          .join(' - ')
      }];

      // Add structured dosage if available
      if (med.dosage) {
        medicationRequest.dosageInstruction[0].doseAndRate = [{
          doseQuantity: {
            value: parseFloat(med.dosage) || undefined,
            unit: med.dosage.replace(/[\d.]/g, '').trim() || undefined
          }
        }];
      }
    }

    // Add dispense request
    if (med.quantity || med.refills) {
      medicationRequest.dispenseRequest = {};
      
      if (med.quantity) {
        medicationRequest.dispenseRequest.quantity = {
          value: parseFloat(med.quantity) || undefined,
          unit: med.quantity.replace(/[\d.]/g, '').trim() || 'units'
        };
      }
      
      if (med.refills) {
        medicationRequest.dispenseRequest.numberOfRepeatsAllowed = med.refills;
      }
    }

    // Add pharmacy
    if (prescriptionData.pharmacy) {
      medicationRequest.dispenseRequest = medicationRequest.dispenseRequest || {};
      medicationRequest.dispenseRequest.performer = {
        display: prescriptionData.pharmacy
      };
    }

    medicationRequests.push(medicationRequest);
  });

  return medicationRequests;
}

// Convert radiology/imaging to FHIR DiagnosticReport
export function convertRadiologyToFHIRDiagnosticReport(
  radiologyData: RadiologyData,
  patientReference: string,
  reportId?: string
): FHIRDiagnosticReport {
  const diagnosticReportId = generateFHIRId('diag-report-');
  
  const diagnosticReport: FHIRDiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: diagnosticReportId,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport']
    },
    identifier: reportId ? [
      {
        system: 'http://beingwell.app/diagnostic-report-id',
        value: reportId
      }
    ] : undefined,
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'RAD',
        display: 'Radiology'
      }]
    }],
    code: {
      text: radiologyData.study.type || 'Imaging Study'
    },
    subject: {
      reference: `Patient/${patientReference}`
    }
  };

  // Add effective date
  if (radiologyData.studyDate) {
    diagnosticReport.effectiveDateTime = radiologyData.studyDate;
  }

  // Add issued date
  if (radiologyData.reportDate) {
    diagnosticReport.issued = radiologyData.reportDate;
  }

  // Add performer (radiologist/facility)
  if (radiologyData.radiologist || radiologyData.facility) {
    diagnosticReport.performer = [];
    if (radiologyData.radiologist) {
      diagnosticReport.performer.push({
        display: radiologyData.radiologist
      });
    }
    if (radiologyData.facility) {
      diagnosticReport.performer.push({
        display: radiologyData.facility
      });
    }
  }

  // Add conclusion/impression
  if (radiologyData.impression) {
    diagnosticReport.conclusion = radiologyData.impression;
  }

  return diagnosticReport;
}

// Convert vitals to FHIR Observations
export function convertVitalsToFHIRObservations(
  vitalsData: VitalSignsData,
  patientReference: string,
  reportId?: string
): FHIRObservation[] {
  const observations: FHIRObservation[] = [];

  vitalsData.vitals.forEach((vital, index) => {
    const observationId = generateFHIRId('vital-obs-');
    
    const observation: FHIRObservation = {
      resourceType: 'Observation',
      id: observationId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Observation']
      },
      identifier: [
        {
          system: 'http://beingwell.app/vital-observation-id',
          value: `${reportId}-${index}`
        }
      ],
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }]
      }],
      code: {
        text: vital.type.replace('_', ' ')
      },
      subject: {
        reference: `Patient/${patientReference}`
      }
    };

    // Map vital types to LOINC codes
    const vitalTypeMap: Record<string, { code: string; display: string; unit?: string }> = {
      'blood_pressure': { code: '85354-9', display: 'Blood pressure panel with all children optional' },
      'heart_rate': { code: '8867-4', display: 'Heart rate', unit: '/min' },
      'temperature': { code: '8310-5', display: 'Body temperature', unit: 'Cel' },
      'respiratory_rate': { code: '9279-1', display: 'Respiratory rate', unit: '/min' },
      'oxygen_saturation': { code: '2708-6', display: 'Oxygen saturation in Arterial blood', unit: '%' },
      'weight': { code: '29463-7', display: 'Body weight', unit: 'kg' },
      'height': { code: '8302-2', display: 'Body height', unit: 'cm' },
      'bmi': { code: '39156-5', display: 'Body mass index (BMI) [Ratio]', unit: 'kg/m2' }
    };

    const vitalMapping = vitalTypeMap[vital.type];
    if (vitalMapping) {
      observation.code = {
        coding: [{
          system: 'http://loinc.org',
          code: vitalMapping.code,
          display: vitalMapping.display
        }]
      };

      // Add value
      if (vital.value) {
        const numericValue = parseFloat(vital.value);
        if (!isNaN(numericValue)) {
          observation.valueQuantity = {
            value: numericValue,
            unit: vital.unit || vitalMapping.unit || '',
            system: 'http://unitsofmeasure.org'
          };
        } else {
          observation.valueString = vital.value;
        }
      }
    } else {
      // Fallback for unknown vital types
      observation.code = {
        coding: [{
          system: 'http://beingwell.app/vital-types',
          code: vital.type,
          display: vital.type.replace('_', ' ')
        }],
        text: vital.type.replace('_', ' ')
      };
      observation.valueString = vital.value;
    }

    // Add effective date
    if (vital.timestamp) {
      observation.effectiveDateTime = vital.timestamp;
    } else if (vitalsData.recordDate) {
      observation.effectiveDateTime = vitalsData.recordDate;
    }

    // Add performer
    if (vitalsData.recordedBy || vitalsData.facility) {
      observation.performer = [];
      if (vitalsData.recordedBy) {
        observation.performer.push({
          display: vitalsData.recordedBy
        });
      }
      if (vitalsData.facility) {
        observation.performer.push({
          display: vitalsData.facility
        });
      }
    }

    // Add notes
    if (vital.notes) {
      observation.note = [{
        text: vital.notes
      }];
    }

    observations.push(observation);
  });

  return observations;
}

// Convert general medical data to FHIR DiagnosticReport
export function convertGeneralDataToFHIRDiagnosticReport(
  generalData: GeneralMedicalData,
  patientReference: string,
  reportId?: string
): FHIRDiagnosticReport {
  const diagnosticReportId = generateFHIRId('general-report-');
  
  const diagnosticReport: FHIRDiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: diagnosticReportId,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport']
    },
    identifier: reportId ? [
      {
        system: 'http://beingwell.app/general-report-id',
        value: reportId
      }
    ] : undefined,
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'GEN',
        display: 'General'
      }]
    }],
    code: {
      text: 'General Medical Report'
    },
    subject: {
      reference: `Patient/${patientReference}`
    }
  };

  // Add effective date
  if (generalData.visitDate) {
    diagnosticReport.effectiveDateTime = generalData.visitDate;
  }

  // Add issued date
  if (generalData.reportDate) {
    diagnosticReport.issued = generalData.reportDate;
  }

  // Add performer
  if (generalData.provider || generalData.facility) {
    diagnosticReport.performer = [];
    if (generalData.provider) {
      diagnosticReport.performer.push({
        display: generalData.provider
      });
    }
    if (generalData.facility) {
      diagnosticReport.performer.push({
        display: generalData.facility
      });
    }
  }

  // Add conclusion from sections
  if (generalData.sections && generalData.sections.length > 0) {
    const conclusionText = generalData.sections
      .map(section => `${section.title}: ${section.content}`)
      .join('\n\n');
    diagnosticReport.conclusion = conclusionText;
  }

  return diagnosticReport;
}

// Main converter function
export function convertParsedMedicalDataToFHIR(
  data: ParsedMedicalData,
  patientReference: string,
  reportId?: string
): {
  observations?: FHIRObservation[];
  medicationRequests?: FHIRMedicationRequest[];
  diagnosticReports?: FHIRDiagnosticReport[];
} {
  const result: {
    observations?: FHIRObservation[];
    medicationRequests?: FHIRMedicationRequest[];
    diagnosticReports?: FHIRDiagnosticReport[];
  } = {};

  switch (data.reportType) {
    case 'lab':
      result.observations = convertLabResultsToFHIRObservations(data as LabResultData, patientReference, reportId);
      break;
      
    case 'prescription':
      result.medicationRequests = convertPrescriptionToFHIRMedicationRequest(data as PrescriptionData, patientReference, reportId);
      break;
      
    case 'radiology':
      result.diagnosticReports = [convertRadiologyToFHIRDiagnosticReport(data as RadiologyData, patientReference, reportId)];
      break;
      
    case 'vitals':
      result.observations = convertVitalsToFHIRObservations(data as VitalSignsData, patientReference, reportId);
      break;
      
    case 'general':
      result.diagnosticReports = [convertGeneralDataToFHIRDiagnosticReport(data as GeneralMedicalData, patientReference, reportId)];
      break;
  }

  return result;
}