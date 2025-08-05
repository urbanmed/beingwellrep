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

export function extractPatientAndFacilityData(extractedText: string | null): {
  patient: PatientData | null;
  facility: FacilityData | null;
} {
  if (!extractedText) {
    return { patient: null, facility: null };
  }

  try {
    // Try to parse as JSON
    const data = JSON.parse(extractedText);
    
    // Extract patient data
    const patient: PatientData = {};
    if (data.patient_name) patient.name = data.patient_name;
    if (data.patient_dob || data.dob) patient.dateOfBirth = data.patient_dob || data.dob;
    if (data.patient_id || data.mrn) patient.id = data.patient_id || data.mrn;
    if (data.patient_age || data.age) patient.age = data.patient_age || data.age;
    if (data.patient_gender || data.gender || data.sex) {
      patient.gender = data.patient_gender || data.gender || data.sex;
    }

    // Extract facility data
    const facility: FacilityData = {};
    if (data.facility_name || data.facility) facility.facility = data.facility_name || data.facility;
    if (data.ordering_physician || data.physician_name || data.doctor) {
      facility.orderingPhysician = data.ordering_physician || data.physician_name || data.doctor;
    }
    if (data.collection_date || data.specimen_collection_date) {
      facility.collectionDate = data.collection_date || data.specimen_collection_date;
    }
    if (data.report_date || data.date_reported) {
      facility.reportDate = data.report_date || data.date_reported;
    }

    return {
      patient: Object.keys(patient).length > 0 ? patient : null,
      facility: Object.keys(facility).length > 0 ? facility : null,
    };
  } catch (error) {
    // If JSON parsing fails, try to extract basic info from text
    console.warn('Failed to parse extracted text as JSON:', error);
    return { patient: null, facility: null };
  }
}