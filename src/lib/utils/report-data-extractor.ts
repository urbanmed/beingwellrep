interface PatientData {
  name?: string;
  dateOfBirth?: string;
  id?: string;
  age?: string | number;
  gender?: string;
}

interface FacilityData {
  facility?: string;
  orderingPhysician?: string;
  collectionDate?: string;
  reportDate?: string;
}

function stripMarkdownCodeBlocks(text: string): string {
  // Remove markdown code blocks
  return text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
}

export function extractPatientAndFacilityData(extractedText: string | null): {
  patient: PatientData | null;
  facility: FacilityData | null;
} {
  if (!extractedText) {
    return { patient: null, facility: null };
  }

  try {
    // Strip markdown code blocks first
    const cleanedText = stripMarkdownCodeBlocks(extractedText);
    console.log('Attempting to parse cleaned text:', cleanedText.substring(0, 200) + '...');
    
    // Try to parse as JSON
    const data = JSON.parse(cleanedText);
    console.log('Parsed data structure:', Object.keys(data));
    
    // Extract patient data - check nested structures first
    const patient: PatientData = {};
    const patientInfo = data.patient_information || data.patient || data;
    
    if (patientInfo) {
      // Check various field names for patient data
      if (patientInfo.name || patientInfo.patient_name) {
        patient.name = patientInfo.name || patientInfo.patient_name;
      }
      if (patientInfo.age || patientInfo.patient_age) {
        patient.age = patientInfo.age || patientInfo.patient_age;
      }
      if (patientInfo.gender || patientInfo.sex || patientInfo.patient_gender) {
        patient.gender = patientInfo.gender || patientInfo.sex || patientInfo.patient_gender;
      }
      if (patientInfo.patient_id || patientInfo.id || patientInfo.mrn) {
        patient.id = patientInfo.patient_id || patientInfo.id || patientInfo.mrn;
      }
      if (patientInfo.date_of_birth || patientInfo.dob || patientInfo.patient_dob) {
        patient.dateOfBirth = patientInfo.date_of_birth || patientInfo.dob || patientInfo.patient_dob;
      }
    }

    // Extract facility data - check nested structures first
    const facility: FacilityData = {};
    const labInfo = data.lab_information || data.facility_information || data.facility || data;
    
    if (labInfo) {
      // Check various field names for facility data
      if (labInfo.facility_name || labInfo.lab_name || labInfo.facility) {
        facility.facility = labInfo.facility_name || labInfo.lab_name || labInfo.facility;
      }
      if (labInfo.referring_doctor || labInfo.ordering_physician || labInfo.physician_name || labInfo.doctor) {
        facility.orderingPhysician = labInfo.referring_doctor || labInfo.ordering_physician || labInfo.physician_name || labInfo.doctor;
      }
      if (labInfo.collection_date || labInfo.specimen_collection_date || labInfo.sample_collection_date) {
        facility.collectionDate = labInfo.collection_date || labInfo.specimen_collection_date || labInfo.sample_collection_date;
      }
      if (labInfo.report_date || labInfo.date_reported || labInfo.test_date) {
        facility.reportDate = labInfo.report_date || labInfo.date_reported || labInfo.test_date;
      }
    }

    console.log('Extracted patient data:', patient);
    console.log('Extracted facility data:', facility);

    return {
      patient: Object.keys(patient).length > 0 ? patient : null,
      facility: Object.keys(facility).length > 0 ? facility : null,
    };
  } catch (error) {
    console.error('Failed to parse extracted text as JSON:', error);
    console.log('Raw extracted text:', extractedText?.substring(0, 500));
    return { patient: null, facility: null };
  }
}