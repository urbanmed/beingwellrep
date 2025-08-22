import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Transform sections-based data to expected FHIR format
const transformSectionsToFHIRFormat = (data: any): any => {
  if (!data) return data;
  
  // If data already has the expected format, return as-is
  if (data.tests || data.medications || data.vitals) {
    return data;
  }
  
  // Transform sections to expected format based on report type
  if (data.sections && Array.isArray(data.sections)) {
    const reportType = data.reportType?.toLowerCase();
    
    if (reportType === 'lab' || reportType === 'lab_results') {
      // Extract lab tests from sections
      data.tests = [];
      data.sections.forEach(section => {
        if (section.content && Array.isArray(section.content)) {
          section.content.forEach(item => {
            if (item.name && item.value) {
              data.tests.push({
                name: item.name,
                value: item.value,
                unit: item.unit || '',
                referenceRange: item.referenceRange || item.normalRange || '',
                status: item.status || 'normal'
              });
            }
          });
        }
      });
      console.log(`Transformed ${data.tests.length} lab tests from sections`);
    }
    
    if (reportType === 'prescription' || reportType === 'pharmacy') {
      // Extract medications from sections
      data.medications = [];
      data.sections.forEach(section => {
        if (section.content && Array.isArray(section.content)) {
          section.content.forEach(item => {
            if (item.medication || item.name) {
              data.medications.push({
                name: item.medication || item.name,
                dosage: item.dosage || item.dose || '',
                frequency: item.frequency || '',
                duration: item.duration || '',
                instructions: item.instructions || ''
              });
            }
          });
        }
      });
      console.log(`Transformed ${data.medications.length} medications from sections`);
    }
    
    if (reportType === 'vitals' || reportType === 'vital_signs') {
      // Extract vitals from sections
      data.vitals = [];
      data.sections.forEach(section => {
        if (section.content && Array.isArray(section.content)) {
          section.content.forEach(item => {
            if (item.type && item.value) {
              data.vitals.push({
                type: item.type,
                value: item.value,
                unit: item.unit || '',
                timestamp: item.timestamp || data.recordDate || new Date().toISOString()
              });
            }
          });
        }
      });
      console.log(`Transformed ${data.vitals.length} vitals from sections`);
    }
  }
  
  return data;
};

// FHIR ID generation function
const generateFHIRId = (prefix: string = ''): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}-${random}`;
};

// Ensure FHIR Patient exists
const ensureFHIRPatient = async (supabaseClient: any, userId: string): Promise<string> => {
  // Check if patient already exists
  const { data: existingPatient } = await supabaseClient
    .from('fhir_patients')
    .select('fhir_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingPatient) {
    return existingPatient.fhir_id;
  }

  // Get user profile for patient data
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const patientFhirId = generateFHIRId('patient-');
  
  // Create basic FHIR Patient resource
  const fhirPatient = {
    resourceType: 'Patient',
    id: patientFhirId,
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

  // Add profile data if available
  if (profile) {
    if (profile.first_name || profile.last_name) {
      fhirPatient.name = [{
        use: 'official',
        family: profile.last_name || '',
        given: profile.first_name ? [profile.first_name] : []
      }];
    }

    if (profile.gender) {
      fhirPatient.gender = profile.gender.toLowerCase();
    }

    if (profile.date_of_birth) {
      fhirPatient.birthDate = profile.date_of_birth;
    }

    if (profile.phone_number) {
      fhirPatient.telecom = [{
        system: 'phone',
        value: profile.phone_number,
        use: 'mobile'
      }];
    }

    if (profile.abha_id) {
      fhirPatient.identifier.push({
        use: 'official',
        system: 'https://healthid.abdm.gov.in',
        value: profile.abha_id
      });
    }
  }

  // Insert FHIR Patient into database
  const { error } = await supabaseClient
    .from('fhir_patients')
    .insert({
      user_id: userId,
      fhir_id: patientFhirId,
      resource_data: fhirPatient
    });

  if (error) {
    throw new Error(`Failed to create FHIR Patient: ${error.message}`);
  }

  console.log('Created FHIR Patient:', patientFhirId);
  return patientFhirId;
};

// Create FHIR Observations from lab test data
const createFHIRObservationsFromLab = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string
): Promise<void> => {
  if (!parsedData.tests || !Array.isArray(parsedData.tests) || parsedData.tests.length === 0) {
    console.log('No tests found in lab data for backfill');
    return;
  }
  
  console.log(`Backfilling ${parsedData.tests.length} lab tests for FHIR creation`);

  for (let i = 0; i < parsedData.tests.length; i++) {
    const test = parsedData.tests[i];
    const observationId = generateFHIRId('obs-');

    const fhirObservation = {
      resourceType: 'Observation',
      id: observationId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Observation']
      },
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory',
          display: 'Laboratory'
        }]
      }],
      code: {
        text: test.name || 'Unknown Test'
      },
      subject: {
        reference: `Patient/${patientFhirId}`
      },
      effectiveDateTime: parsedData.collectionDate || parsedData.reportDate || new Date().toISOString()
    };

    // Add value
    if (test.value) {
      if (test.unit && !isNaN(parseFloat(test.value))) {
        fhirObservation.valueQuantity = {
          value: parseFloat(test.value),
          unit: test.unit,
          system: 'http://unitsofmeasure.org'
        };
      } else {
        fhirObservation.valueString = test.value;
      }
    }

    // Add reference range
    if (test.referenceRange) {
      fhirObservation.referenceRange = [{
        text: test.referenceRange
      }];
    }

    // Add interpretation based on status
    if (test.status) {
      const interpretationMap = {
        'normal': { code: 'N', display: 'Normal' },
        'high': { code: 'H', display: 'High' },
        'low': { code: 'L', display: 'Low' },
        'critical': { code: 'HH', display: 'Critical high' }
      };

      const interpretation = interpretationMap[test.status];
      if (interpretation) {
        fhirObservation.interpretation = [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: interpretation.code,
            display: interpretation.display
          }]
        }];
      }
    }

    // Get user ID from report
    const { data: report } = await supabaseClient
      .from('reports')
      .select('user_id')
      .eq('id', reportId)
      .single();

    // Insert into database
    const { error } = await supabaseClient
      .from('fhir_observations')
      .insert({
        user_id: report?.user_id,
        fhir_id: observationId,
        patient_fhir_id: patientFhirId,
        source_report_id: reportId,
        observation_type: 'lab_result',
        resource_data: fhirObservation,
        effective_date_time: fhirObservation.effectiveDateTime,
        status: 'final'
      });

    if (error) {
      console.error('Failed to create FHIR Observation during backfill:', error);
      throw error;
    } else {
      console.log('Backfilled FHIR Observation:', observationId);
    }
  }
};

// Create basic FHIR DiagnosticReport for general documents
const createFHIRDiagnosticReportFromGeneral = async (
  supabaseClient: any,
  parsedData: any,
  patientFhirId: string,
  reportId: string
): Promise<void> => {
  const diagnosticReportId = generateFHIRId('diag-report-');

  const fhirDiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: diagnosticReportId,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport']
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'GE',
        display: 'General'
      }]
    }],
    code: {
      text: parsedData.reportType || 'General Medical Document'
    },
    subject: {
      reference: `Patient/${patientFhirId}`
    },
    effectiveDateTime: parsedData.reportDate || parsedData.visitDate || new Date().toISOString()
  };

  // Add performer if available
  if (parsedData.provider || parsedData.facility) {
    fhirDiagnosticReport.performer = [];
    if (parsedData.provider) {
      fhirDiagnosticReport.performer.push({ display: parsedData.provider });
    }
    if (parsedData.facility) {
      fhirDiagnosticReport.performer.push({ display: parsedData.facility });
    }
  }

  // Get user ID from report
  const { data: report } = await supabaseClient
    .from('reports')
    .select('user_id')
    .eq('id', reportId)
    .single();

  // Insert into database
  const { error } = await supabaseClient
    .from('fhir_diagnostic_reports')
    .insert({
      user_id: report?.user_id,
      fhir_id: diagnosticReportId,
      patient_fhir_id: patientFhirId,
      source_report_id: reportId,
      report_type: parsedData.reportType || 'general',
      resource_data: fhirDiagnosticReport,
      effective_date_time: fhirDiagnosticReport.effectiveDateTime,
      status: 'final'
    });

  if (error) {
    console.error('Failed to create FHIR DiagnosticReport during backfill:', error);
    throw error;
  } else {
    console.log('Backfilled FHIR DiagnosticReport:', diagnosticReportId);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { batchSize = 50, userId = null } = await req.json()
    
    console.log('Starting FHIR backfill process...')

    // Get reports that are completed but have no FHIR resources
    let query = supabaseClient
      .from('reports')
      .select(`
        id, user_id, title, report_type, parsed_data, report_date,
        fhir_observations:fhir_observations!source_report_id(id),
        fhir_medication_requests:fhir_medication_requests!source_report_id(id),
        fhir_diagnostic_reports:fhir_diagnostic_reports!source_report_id(id)
      `)
      .eq('parsing_status', 'completed')
      .not('parsed_data', 'is', null)
      .limit(batchSize)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: reports, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch reports: ${fetchError.message}`)
    }

    if (!reports || reports.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No reports found that need FHIR backfill',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter reports that have no FHIR resources
    const reportsNeedingBackfill = reports.filter(report => 
      (!report.fhir_observations || report.fhir_observations.length === 0) &&
      (!report.fhir_medication_requests || report.fhir_medication_requests.length === 0) &&
      (!report.fhir_diagnostic_reports || report.fhir_diagnostic_reports.length === 0)
    )

    console.log(`Found ${reportsNeedingBackfill.length} reports needing FHIR backfill`)

    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const report of reportsNeedingBackfill) {
      try {
        console.log(`Processing report ${report.id} (${report.title})`)
        
        if (!report.parsed_data) {
          console.log(`Skipping report ${report.id}: No parsed data`)
          continue
        }

        // Transform the parsed data to FHIR format
        const transformedData = transformSectionsToFHIRFormat(report.parsed_data)
        
        // Ensure FHIR Patient exists
        const patientFhirId = await ensureFHIRPatient(supabaseClient, report.user_id)

        // Create appropriate FHIR resources based on report type and data content
        const reportType = transformedData.reportType?.toLowerCase() || report.report_type?.toLowerCase()
        
        if ((reportType === 'lab' || reportType === 'lab_results') && transformedData.tests?.length > 0) {
          await createFHIRObservationsFromLab(supabaseClient, transformedData, patientFhirId, report.id)
          console.log(`Created FHIR observations for ${transformedData.tests.length} lab tests`)
        } else {
          // Create a general diagnostic report
          await createFHIRDiagnosticReportFromGeneral(supabaseClient, transformedData, patientFhirId, report.id)
          console.log('Created general FHIR diagnostic report')
          
          // Check if there are lab-like data in sections that we can extract
          if (transformedData.sections?.length > 0) {
            const hasLabData = transformedData.sections.some(s => 
              s.content && s.content.some(c => c.name && c.value))
            
            if (hasLabData) {
              console.log('Found lab-like data in general document sections, creating observations...')
              const labData = transformSectionsToFHIRFormat({ ...transformedData, reportType: 'lab' })
              if (labData.tests?.length > 0) {
                await createFHIRObservationsFromLab(supabaseClient, labData, patientFhirId, report.id)
                console.log(`Created ${labData.tests.length} additional FHIR observations from general document`)
              }
            }
          }
        }

        successCount++
        console.log(`✅ Successfully processed report ${report.id}`)
        
      } catch (error) {
        errorCount++
        const errorMsg = `❌ Failed to process report ${report.id}: ${error.message}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const result = {
      success: true,
      totalReportsChecked: reports.length,
      reportsNeedingBackfill: reportsNeedingBackfill.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit errors in response
      message: `FHIR backfill completed: ${successCount} successful, ${errorCount} failed`
    }

    console.log('FHIR backfill process completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('FHIR backfill error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'FHIR backfill failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})