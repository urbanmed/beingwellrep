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

    // Extract facility data - check multiple sections and field variations
    const facility: FacilityData = {};
    
    // Primary sources for facility data
    const labInfo = data.lab_information || data.facility_information || data.facility || {};
    const facilityFromPatient = patientInfo || {};
    
    console.log('Lab information available:', Object.keys(labInfo));
    console.log('Patient info keys for facility data:', Object.keys(facilityFromPatient));
    
    // Check for facility name in multiple locations and field names
    if (!facility.facility) {
      // Check lab information first
      if (labInfo.facility_name || labInfo.lab_name || labInfo.facility) {
        facility.facility = labInfo.facility_name || labInfo.lab_name || labInfo.facility;
      }
      // Check patient information section (where it was actually found)
      else if (facilityFromPatient.facility_name || facilityFromPatient.lab_name || facilityFromPatient.facility) {
        facility.facility = facilityFromPatient.facility_name || facilityFromPatient.lab_name || facilityFromPatient.facility;
      }
      // Check root level
      else if (data.facility_name || data.lab_name || data.facility) {
        facility.facility = data.facility_name || data.lab_name || data.facility;
      }
    }
    
    // Check for ordering physician in multiple locations
    if (!facility.orderingPhysician) {
      // Check lab information
      if (labInfo.referring_doctor || labInfo.ordering_physician || labInfo.physician_name || labInfo.doctor) {
        facility.orderingPhysician = labInfo.referring_doctor || labInfo.ordering_physician || labInfo.physician_name || labInfo.doctor;
      }
      // Check patient information section (where referring doctor was found)
      else if (facilityFromPatient.referring_doctor || facilityFromPatient.ordering_physician || facilityFromPatient.physician_name || facilityFromPatient.doctor) {
        facility.orderingPhysician = facilityFromPatient.referring_doctor || facilityFromPatient.ordering_physician || facilityFromPatient.physician_name || facilityFromPatient.doctor;
      }
      // Check root level
      else if (data.referring_doctor || data.ordering_physician || data.physician_name || data.doctor) {
        facility.orderingPhysician = data.referring_doctor || data.ordering_physician || data.physician_name || data.doctor;
      }
    }
    
    // Check for collection date with specific field name from the actual data
    if (!facility.collectionDate) {
      // Check for the specific field name found in the actual data
      if (labInfo.sample_collection_datetime || labInfo.collection_date || labInfo.specimen_collection_date || labInfo.sample_collection_date) {
        facility.collectionDate = labInfo.sample_collection_datetime || labInfo.collection_date || labInfo.specimen_collection_date || labInfo.sample_collection_date;
      }
      // Check patient information section as fallback
      else if (facilityFromPatient.sample_collection_datetime || facilityFromPatient.collection_date) {
        facility.collectionDate = facilityFromPatient.sample_collection_datetime || facilityFromPatient.collection_date;
      }
      // Check root level
      else if (data.sample_collection_datetime || data.collection_date || data.specimen_collection_date) {
        facility.collectionDate = data.sample_collection_datetime || data.collection_date || data.specimen_collection_date;
      }
    }
    
    // Check for report date
    if (!facility.reportDate) {
      if (labInfo.report_date || labInfo.date_reported || labInfo.test_date) {
        facility.reportDate = labInfo.report_date || labInfo.date_reported || labInfo.test_date;
      }
      else if (facilityFromPatient.report_date || facilityFromPatient.date_reported) {
        facility.reportDate = facilityFromPatient.report_date || facilityFromPatient.date_reported;
      }
      else if (data.report_date || data.date_reported || data.test_date) {
        facility.reportDate = data.report_date || data.date_reported || data.test_date;
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