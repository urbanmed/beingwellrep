import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DBFHIRPatient,
  DBFHIRObservation,
  DBFHIRMedicationRequest,
  DBFHIRDiagnosticReport,
  DBFHIREncounter,
  DBFHIRCarePlan,
  FHIRPatient,
  FHIRObservation,
  FHIRMedicationRequest,
  FHIRDiagnosticReport,
  FHIREncounter,
  FHIRCarePlan
} from '@/types/fhir';

export function useFHIRData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FHIR Patient management
  const [fhirPatient, setFhirPatient] = useState<DBFHIRPatient | null>(null);

  // Create or get FHIR Patient
  const ensureFHIRPatient = async (patientData: FHIRPatient): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    // Check if patient already exists
    const { data: existingPatient, error: fetchError } = await supabase
      .from('fhir_patients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching FHIR patient:', fetchError);
      throw fetchError;
    }

    if (existingPatient) {
      return existingPatient.fhir_id;
    }

    // Create new FHIR patient
    const { data: newPatient, error: createError } = await supabase
      .from('fhir_patients')
      .insert({
        user_id: user.id,
        fhir_id: patientData.id,
        resource_data: patientData as any
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating FHIR patient:', createError);
      throw createError;
    }

    setFhirPatient(newPatient as any);
    return newPatient.fhir_id;
  };

  // Create FHIR Observation
  const createFHIRObservation = async (
    observationData: FHIRObservation,
    patientFhirId: string,
    sourceReportId?: string,
    observationType: 'vital_signs' | 'lab_result' | 'measurement' = 'lab_result'
  ) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('fhir_observations')
      .insert({
        user_id: user.id,
        fhir_id: observationData.id,
        patient_fhir_id: patientFhirId,
        source_report_id: sourceReportId,
        observation_type: observationType,
        resource_data: observationData as any,
        effective_date_time: observationData.effectiveDateTime,
        status: observationData.status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating FHIR observation:', error);
      throw error;
    }

    return data;
  };

  // Create FHIR MedicationRequest
  const createFHIRMedicationRequest = async (
    medicationRequestData: FHIRMedicationRequest,
    patientFhirId: string,
    sourcePrescriptionId?: string,
    sourceReportId?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    // Extract medication name from the resource
    const medicationName = medicationRequestData.medicationCodeableConcept?.text || 
                          medicationRequestData.medicationCodeableConcept?.coding?.[0]?.display || 
                          'Unknown Medication';

    const { data, error } = await supabase
      .from('fhir_medication_requests')
      .insert({
        user_id: user.id,
        fhir_id: medicationRequestData.id,
        patient_fhir_id: patientFhirId,
        source_prescription_id: sourcePrescriptionId,
        source_report_id: sourceReportId,
        medication_name: medicationName,
        resource_data: medicationRequestData as any,
        authored_on: medicationRequestData.authoredOn,
        status: medicationRequestData.status,
        intent: medicationRequestData.intent
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating FHIR medication request:', error);
      throw error;
    }

    return data;
  };

  // Create FHIR DiagnosticReport
  const createFHIRDiagnosticReport = async (
    diagnosticReportData: FHIRDiagnosticReport,
    patientFhirId: string,
    sourceReportId?: string,
    reportType: string = 'general'
  ) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('fhir_diagnostic_reports')
      .insert({
        user_id: user.id,
        fhir_id: diagnosticReportData.id,
        patient_fhir_id: patientFhirId,
        source_report_id: sourceReportId,
        report_type: reportType,
        resource_data: diagnosticReportData as any,
        effective_date_time: diagnosticReportData.effectiveDateTime,
        status: diagnosticReportData.status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating FHIR diagnostic report:', error);
      throw error;
    }

    return data;
  };

  // Create FHIR Encounter
  const createFHIREncounter = async (
    encounterData: FHIREncounter,
    patientFhirId: string,
    sourceNoteId?: string,
    encounterType: string = 'consultation'
  ) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('fhir_encounters')
      .insert({
        user_id: user.id,
        fhir_id: encounterData.id,
        patient_fhir_id: patientFhirId,
        source_note_id: sourceNoteId,
        encounter_type: encounterType,
        resource_data: encounterData as any,
        period_start: encounterData.period?.start,
        period_end: encounterData.period?.end,
        status: encounterData.status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating FHIR encounter:', error);
      throw error;
    }

    return data;
  };

  // Create FHIR CarePlan
  const createFHIRCarePlan = async (
    carePlanData: FHIRCarePlan,
    patientFhirId: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('fhir_care_plans')
      .insert({
        user_id: user.id,
        fhir_id: carePlanData.id,
        patient_fhir_id: patientFhirId,
        title: carePlanData.title || 'Untitled Care Plan',
        description: carePlanData.description,
        resource_data: carePlanData as any,
        period_start: carePlanData.period?.start,
        period_end: carePlanData.period?.end,
        status: carePlanData.status,
        intent: carePlanData.intent
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating FHIR care plan:', error);
      throw error;
    }

    return data;
  };

  // Fetch FHIR data
  const fetchFHIRObservations = async (patientFhirId?: string): Promise<DBFHIRObservation[]> => {
    if (!user) return [];

    let query = supabase
      .from('fhir_observations')
      .select('*')
      .eq('user_id', user.id)
      .order('effective_date_time', { ascending: false });

    if (patientFhirId) {
      query = query.eq('patient_fhir_id', patientFhirId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FHIR observations:', error);
      throw error;
    }

    return (data || []) as any;
  };

  const fetchFHIRMedicationRequests = async (patientFhirId?: string): Promise<DBFHIRMedicationRequest[]> => {
    if (!user) return [];

    let query = supabase
      .from('fhir_medication_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('authored_on', { ascending: false });

    if (patientFhirId) {
      query = query.eq('patient_fhir_id', patientFhirId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FHIR medication requests:', error);
      throw error;
    }

    return (data || []) as any;
  };

  const fetchFHIRDiagnosticReports = async (patientFhirId?: string): Promise<DBFHIRDiagnosticReport[]> => {
    if (!user) return [];

    let query = supabase
      .from('fhir_diagnostic_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('effective_date_time', { ascending: false });

    if (patientFhirId) {
      query = query.eq('patient_fhir_id', patientFhirId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FHIR diagnostic reports:', error);
      throw error;
    }

    return (data || []) as any;
  };

  const fetchFHIREncounters = async (patientFhirId?: string): Promise<DBFHIREncounter[]> => {
    if (!user) return [];

    let query = supabase
      .from('fhir_encounters')
      .select('*')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false });

    if (patientFhirId) {
      query = query.eq('patient_fhir_id', patientFhirId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FHIR encounters:', error);
      throw error;
    }

    return (data || []) as any;
  };

  const fetchFHIRCarePlans = async (patientFhirId?: string): Promise<DBFHIRCarePlan[]> => {
    if (!user) return [];

    let query = supabase
      .from('fhir_care_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (patientFhirId) {
      query = query.eq('patient_fhir_id', patientFhirId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FHIR care plans:', error);
      throw error;
    }

    return (data || []) as any;
  };

  // Load initial FHIR patient data
  useEffect(() => {
    const loadFHIRPatient = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const { data, error } = await supabase
          .from('fhir_patients')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        setFhirPatient(data as any);
      } catch (err) {
        console.error('Error loading FHIR patient:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadFHIRPatient();
  }, [user]);

  return {
    loading,
    error,
    fhirPatient,
    
    // FHIR resource creation
    ensureFHIRPatient,
    createFHIRObservation,
    createFHIRMedicationRequest,
    createFHIRDiagnosticReport,
    createFHIREncounter,
    createFHIRCarePlan,
    
    // FHIR data fetching
    fetchFHIRObservations,
    fetchFHIRMedicationRequests,
    fetchFHIRDiagnosticReports,
    fetchFHIREncounters,
    fetchFHIRCarePlans
  };
}