// FHIR R4 Resource Types for Healthcare Interoperability

export interface FHIRResource {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
}

export interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary';
  type?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  system?: string;
  value?: string;
}

export interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  text?: string;
}

export interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
}

export interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FHIRCodeableConcept {
  coding?: Array<{
    system?: string;
    version?: string;
    code?: string;
    display?: string;
    userSelected?: boolean;
  }>;
  text?: string;
}

export interface FHIRQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

// FHIR Patient Resource
export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: FHIRIdentifier[];
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: FHIRAddress[];
  contact?: Array<{
    relationship?: FHIRCodeableConcept[];
    name?: FHIRHumanName;
    telecom?: FHIRContactPoint[];
    address?: FHIRAddress;
    gender?: 'male' | 'female' | 'other' | 'unknown';
  }>;
}

// FHIR Observation Resource
export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  identifier?: FHIRIdentifier[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject?: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  issued?: string;
  performer?: FHIRReference[];
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FHIRRange;
  dataAbsentReason?: FHIRCodeableConcept;
  interpretation?: FHIRCodeableConcept[];
  note?: Array<{
    authorReference?: FHIRReference;
    authorString?: string;
    time?: string;
    text: string;
  }>;
  bodySite?: FHIRCodeableConcept;
  method?: FHIRCodeableConcept;
  device?: FHIRReference;
  referenceRange?: Array<{
    low?: FHIRQuantity;
    high?: FHIRQuantity;
    type?: FHIRCodeableConcept;
    appliesTo?: FHIRCodeableConcept[];
    age?: FHIRRange;
    text?: string;
  }>;
  component?: Array<{
    code: FHIRCodeableConcept;
    valueQuantity?: FHIRQuantity;
    valueCodeableConcept?: FHIRCodeableConcept;
    valueString?: string;
    valueBoolean?: boolean;
    valueInteger?: number;
    valueRange?: FHIRRange;
    dataAbsentReason?: FHIRCodeableConcept;
    interpretation?: FHIRCodeableConcept[];
    referenceRange?: Array<{
      low?: FHIRQuantity;
      high?: FHIRQuantity;
      type?: FHIRCodeableConcept;
      appliesTo?: FHIRCodeableConcept[];
      age?: FHIRRange;
      text?: string;
    }>;
  }>;
}

// FHIR MedicationRequest Resource
export interface FHIRMedicationRequest extends FHIRResource {
  resourceType: 'MedicationRequest';
  identifier?: FHIRIdentifier[];
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FHIRCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  medicationCodeableConcept?: FHIRCodeableConcept;
  medicationReference?: FHIRReference;
  subject: FHIRReference;
  encounter?: FHIRReference;
  authoredOn?: string;
  requester?: FHIRReference;
  performer?: FHIRReference;
  performerType?: FHIRCodeableConcept;
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  note?: Array<{
    authorReference?: FHIRReference;
    authorString?: string;
    time?: string;
    text: string;
  }>;
  dosageInstruction?: Array<{
    sequence?: number;
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
      };
    };
    route?: FHIRCodeableConcept;
    method?: FHIRCodeableConcept;
    doseAndRate?: Array<{
      type?: FHIRCodeableConcept;
      doseRange?: FHIRRange;
      doseQuantity?: FHIRQuantity;
    }>;
  }>;
  dispenseRequest?: {
    initialFill?: {
      quantity?: FHIRQuantity;
      duration?: {
        value?: number;
        unit?: string;
        system?: string;
        code?: string;
      };
    };
    dispenseInterval?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    validityPeriod?: FHIRPeriod;
    numberOfRepeatsAllowed?: number;
    quantity?: FHIRQuantity;
    expectedSupplyDuration?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    performer?: FHIRReference;
  };
}

// FHIR DiagnosticReport Resource
export interface FHIRDiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  identifier?: FHIRIdentifier[];
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject?: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  issued?: string;
  performer?: FHIRReference[];
  resultsInterpreter?: FHIRReference[];
  specimen?: FHIRReference[];
  result?: FHIRReference[];
  conclusion?: string;
  conclusionCode?: FHIRCodeableConcept[];
}

// FHIR Encounter Resource
export interface FHIREncounter extends FHIRResource {
  resourceType: 'Encounter';
  identifier?: FHIRIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  class: {
    system?: string;
    code?: string;
    display?: string;
  };
  type?: FHIRCodeableConcept[];
  serviceType?: FHIRCodeableConcept;
  priority?: FHIRCodeableConcept;
  subject?: FHIRReference;
  participant?: Array<{
    type?: FHIRCodeableConcept[];
    period?: FHIRPeriod;
    individual?: FHIRReference;
  }>;
  period?: FHIRPeriod;
  length?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  diagnosis?: Array<{
    condition: FHIRReference;
    use?: FHIRCodeableConcept;
    rank?: number;
  }>;
  serviceProvider?: FHIRReference;
}

// FHIR CarePlan Resource
export interface FHIRCarePlan extends FHIRResource {
  resourceType: 'CarePlan';
  identifier?: FHIRIdentifier[];
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  category?: FHIRCodeableConcept[];
  title?: string;
  description?: string;
  subject: FHIRReference;
  encounter?: FHIRReference;
  period?: FHIRPeriod;
  created?: string;
  author?: FHIRReference;
  contributor?: FHIRReference[];
  careTeam?: FHIRReference[];
  addresses?: FHIRReference[];
  supportingInfo?: FHIRReference[];
  goal?: FHIRReference[];
  activity?: Array<{
    outcomeCodeableConcept?: FHIRCodeableConcept[];
    outcomeReference?: FHIRReference[];
    progress?: Array<{
      authorReference?: FHIRReference;
      authorString?: string;
      time?: string;
      text: string;
    }>;
    reference?: FHIRReference;
    detail?: {
      kind?: 'Appointment' | 'CommunicationRequest' | 'DeviceRequest' | 'MedicationRequest' | 'NutritionOrder' | 'Task' | 'ServiceRequest' | 'VisionPrescription';
      instantiatesCanonical?: string[];
      instantiatesUri?: string[];
      code?: FHIRCodeableConcept;
      reasonCode?: FHIRCodeableConcept[];
      reasonReference?: FHIRReference[];
      goal?: FHIRReference[];
      status: 'not-started' | 'scheduled' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled' | 'stopped' | 'unknown' | 'entered-in-error';
      statusReason?: FHIRCodeableConcept;
      doNotPerform?: boolean;
      scheduledTiming?: {
        repeat?: {
          frequency?: number;
          period?: number;
          periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
        };
      };
      scheduledPeriod?: FHIRPeriod;
      scheduledString?: string;
      location?: FHIRReference;
      performer?: FHIRReference[];
      productCodeableConcept?: FHIRCodeableConcept;
      productReference?: FHIRReference;
      dailyAmount?: FHIRQuantity;
      quantity?: FHIRQuantity;
      description?: string;
    };
  }>;
  note?: Array<{
    authorReference?: FHIRReference;
    authorString?: string;
    time?: string;
    text: string;
  }>;
}

// Database types for FHIR resources
export interface DBFHIRPatient {
  id: string;
  user_id: string;
  fhir_id: string;
  resource_data: FHIRPatient;
  created_at: string;
  updated_at: string;
}

export interface DBFHIRObservation {
  id: string;
  user_id: string;
  fhir_id: string;
  patient_fhir_id: string;
  source_report_id?: string;
  observation_type: 'vital_signs' | 'lab_result' | 'measurement';
  resource_data: FHIRObservation;
  effective_date_time?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DBFHIRMedicationRequest {
  id: string;
  user_id: string;
  fhir_id: string;
  patient_fhir_id: string;
  source_prescription_id?: string;
  source_report_id?: string;
  medication_name: string;
  resource_data: FHIRMedicationRequest;
  authored_on?: string;
  status: string;
  intent: string;
  created_at: string;
  updated_at: string;
}

export interface DBFHIRDiagnosticReport {
  id: string;
  user_id: string;
  fhir_id: string;
  patient_fhir_id: string;
  source_report_id?: string;
  report_type: string;
  resource_data: FHIRDiagnosticReport;
  effective_date_time?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DBFHIREncounter {
  id: string;
  user_id: string;
  fhir_id: string;
  patient_fhir_id: string;
  source_note_id?: string;
  encounter_type: string;
  resource_data: FHIREncounter;
  period_start?: string;
  period_end?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DBFHIRCarePlan {
  id: string;
  user_id: string;
  fhir_id: string;
  patient_fhir_id: string;
  title: string;
  description?: string;
  resource_data: FHIRCarePlan;
  period_start?: string;
  period_end?: string;
  status: string;
  intent: string;
  created_at: string;
  updated_at: string;
}

// ABHA-related types
export interface ABHAProfile {
  abha_id?: string;
  abha_linked_at?: string;
  abha_consent_given: boolean;
  abha_consent_date?: string;
  abha_sync_status: 'not_linked' | 'linking' | 'linked' | 'sync_pending' | 'synced' | 'error';
  abha_last_sync?: string;
}

export interface ABHALinkingRequest {
  abha_id: string;
  otp_method: 'aadhaar' | 'mobile';
  consent_given: boolean;
}

export interface ABHAVerificationResponse {
  success: boolean;
  patient_reference?: string;
  error_message?: string;
}